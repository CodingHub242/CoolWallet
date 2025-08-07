import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';

export interface SavingsEntry {
  type: 'deposit';
  netIncome: number;
  amountSaved: number;
  date: string;
  id: number;
  synced?: boolean;
  apiId?: number;
}

export interface WithdrawalEntry {
  type: 'withdrawal';
  amountWithdrawn: number;
  date: string;
  goalName?: string;
  id: number;
  synced?: boolean;
  apiId?: number;
}

export type HistoryEntry = SavingsEntry | WithdrawalEntry;

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private HISTORY_KEY = 'history';
  private NET_INCOME_KEY = 'netIncome';

  constructor(
    private apiService: ApiService,
    private syncService: SyncService,
    private authService: AuthService
  ) {}

  async set(key: string, value: any): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(value)
    });
  }

  async get(key: string): Promise<any> {
    const ret = await Preferences.get({ key });
    return JSON.parse(ret.value as string) || [];
  }

  async addHistoryEntry(entry: HistoryEntry): Promise<void> {
    // Always save locally first
    const history = await this.getHistory();
    entry.synced = false; // Mark as not synced
    history.push(entry);
    await this.set(this.HISTORY_KEY, history);

    // Try to sync with API if online
    if (navigator.onLine) {
      try {
        await this.syncEntryToApi(entry);
      } catch (error) {
        console.error('Failed to sync entry to API:', error);
        // Entry remains marked as unsynced and will be synced later
      }
    }
  }

  async updateHistoryEntry(entry: HistoryEntry): Promise<void> {
    // Update locally first
    let history = await this.getHistory();
    history = history.map(h => h.id === entry.id ? { ...entry, synced: false } : h);
    await this.set(this.HISTORY_KEY, history);

    // Trigger goal amount recalculation since entry was modified
    await this.triggerGoalRecalculation();

    // Try to sync with API if online
    if (navigator.onLine && entry.apiId) {
      try {
        await this.syncEntryUpdateToApi(entry);
      } catch (error) {
        console.error('Failed to sync entry update to API:', error);
      }
    }
  }

  async deleteHistoryEntry(id: number): Promise<void> {
    const history = await this.getHistory();
    const entryToDelete = history.find(h => h.id === id);
    
    // Remove from local storage
    const filteredHistory = history.filter(h => h.id !== id);
    await this.set(this.HISTORY_KEY, filteredHistory);

    // Trigger goal amount recalculation since entry was deleted
    await this.triggerGoalRecalculation();

    // Try to delete from API if online and entry was synced
    if (navigator.onLine && entryToDelete?.apiId) {
      try {
        if (entryToDelete.type === 'deposit') {
          await this.apiService.deleteSavingsEntry(entryToDelete.apiId);
        } else {
          await this.apiService.deleteWithdrawalEntry(entryToDelete.apiId);
        }
      } catch (error) {
        console.error('Failed to delete entry from API:', error);
      }
    }
  }

  async getHistory(): Promise<HistoryEntry[]> {
    return this.get(this.HISTORY_KEY);
  }

  async getTotalSavings(): Promise<number> {
    const history = await this.getHistory();
    let total = 0;
    for (const entry of history) {
      if (entry.type === 'deposit') {
        total += Number(entry.amountSaved);
      } else {
        total -= Number(entry.amountWithdrawn);
      }
    }
    return total;
  }

  async setNetIncome(income: number): Promise<void> {
    await this.set(this.NET_INCOME_KEY, income);
    
    // Try to sync with API if online
    if (navigator.onLine) {
      try {
        await this.apiService.updateNetIncome(income);
      } catch (error) {
        console.error('Failed to sync net income to API:', error);
      }
    }
  }

  async getNetIncome(): Promise<number> {
    const result = await this.get(this.NET_INCOME_KEY);
    return result || 0;
  }

  // Sync unsynced entries to API
  async syncUnsyncedEntries(): Promise<void> {
    if (!navigator.onLine) return;

    const history = await this.getHistory();
    const unsyncedEntries = history.filter(entry => !entry.synced);

    for (const entry of unsyncedEntries) {
      try {
        await this.syncEntryToApi(entry);
      } catch (error) {
        console.error('Failed to sync entry:', entry, error);
      }
    }
  }

  private async syncEntryToApi(entry: HistoryEntry): Promise<void> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      if (entry.type === 'deposit') {
        // Create savings entry directly via API (not through sync service to avoid double creation)
        const syncEntry = {
          s_user_id: currentUser.id,
          net_income: entry.netIncome,
          amount_saved: entry.amountSaved,
          notes: `Created from mobile app on ${new Date(entry.date).toLocaleString()}`
        };
        
        const response = await this.apiService.createSavingsEntry(syncEntry);
        if (response.success && response.data) {
          // Update local entry with API ID and mark as synced
          await this.markEntryAsSynced(entry.id, response.data.id);
        }
      } else {
        // Create withdrawal entry directly via API
        const withdrawalData = {
          s_user_id: currentUser.id,
          amount_withdrawn: entry.amountWithdrawn,
          reason: entry.goalName ? `Withdrawal from ${entry.goalName}` : 'General withdrawal',
          notes: `Created from mobile app on ${new Date(entry.date).toLocaleString()}`
        };
        
        const response = await this.apiService.createWithdrawalEntry(withdrawalData);
        if (response.success && response.data) {
          // Update local entry with API ID and mark as synced
          await this.markEntryAsSynced(entry.id, response.data.id);
        }
      }
    } catch (error) {
      console.error('Failed to sync entry to API:', error);
      throw error;
    }
  }

  private async syncEntryUpdateToApi(entry: HistoryEntry): Promise<void> {
    if (!entry.apiId) return;

    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      if (entry.type === 'deposit') {
        const updateData = {
          s_user_id: currentUser.id,
          net_income: entry.netIncome,
          amount_saved: entry.amountSaved,
          notes: `Updated from mobile app on ${new Date().toLocaleString()}`
        };
        
        const response = await this.apiService.updateSavingsEntry(entry.apiId, updateData);
        if (response.success) {
          await this.markEntryAsSynced(entry.id, entry.apiId);
        }
      } else {
        const updateData = {
          s_user_id: currentUser.id,
          amount_withdrawn: entry.amountWithdrawn,
          reason: entry.goalName ? `Withdrawal from ${entry.goalName}` : 'General withdrawal',
          notes: `Updated from mobile app on ${new Date().toLocaleString()}`
        };
        
        const response = await this.apiService.updateWithdrawalEntry(entry.apiId, updateData);
        if (response.success) {
          await this.markEntryAsSynced(entry.id, entry.apiId);
        }
      }
    } catch (error) {
      console.error('Failed to sync entry update to API:', error);
      throw error;
    }
  }

  private async markEntryAsSynced(localId: number, apiId: number): Promise<void> {
    const history = await this.getHistory();
    const updatedHistory = history.map(entry => 
      entry.id === localId 
        ? { ...entry, synced: true, apiId: apiId }
        : entry
    );
    await this.set(this.HISTORY_KEY, updatedHistory);
  }

  // Load data from API and merge with local data
  async loadFromApi(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      // Load savings entries from API
      const savingsResponse = await this.apiService.getSavingsEntries();
      if (savingsResponse.success && savingsResponse.data) {
        await this.mergeApiSavingsEntries(savingsResponse.data);
      }

      // Load withdrawal entries from API
      const withdrawalsResponse = await this.apiService.getWithdrawalEntries();
      if (withdrawalsResponse.success && withdrawalsResponse.data) {
        await this.mergeApiWithdrawalEntries(withdrawalsResponse.data);
      }

    } catch (error) {
      console.error('Failed to load data from API:', error);
    }
  }

  private async mergeApiSavingsEntries(apiEntries: any[]): Promise<void> {
    const localHistory = await this.getHistory();
    let hasChanges = false;
    
    for (const apiEntry of apiEntries) {
      // Check if we already have this entry locally by API ID
      const existingEntryByApiId = localHistory.find(entry => entry.apiId === apiEntry.id);
      
      // Also check by amount and date to catch potential duplicates without API ID
      const existingEntryByData = localHistory.find(entry =>
        entry.type === 'deposit' &&
        Math.abs((entry as SavingsEntry).amountSaved - apiEntry.amount_saved) < 0.01 &&
        new Date(entry.date).toDateString() === new Date(apiEntry.created_at).toDateString() &&
        !entry.apiId
      );
      
      if (!existingEntryByApiId && !existingEntryByData) {
        // Add new entry from API
        const newEntry: SavingsEntry = {
          type: 'deposit',
          netIncome: apiEntry.net_income || 0,
          amountSaved: apiEntry.amount_saved,
          date: apiEntry.created_at || new Date().toISOString(),
          id: Date.now() + Math.random(), // Generate unique local ID
          synced: true,
          apiId: apiEntry.id
        };
        localHistory.push(newEntry);
        hasChanges = true;
        console.log(`Added new savings entry from API: ${apiEntry.amount_saved} on ${apiEntry.created_at}`);
      } else if (existingEntryByApiId && existingEntryByApiId.type === 'deposit') {
        // Handle conflict resolution for existing entry with API ID
        const conflict = this.detectSavingsEntryConflict(existingEntryByApiId as SavingsEntry, apiEntry);
        if (conflict.hasConflict) {
          const resolvedEntry = this.resolveSavingsEntryConflict(existingEntryByApiId as SavingsEntry, apiEntry, conflict);
          if (resolvedEntry) {
            const index = localHistory.findIndex(entry => entry.id === existingEntryByApiId.id);
            if (index >= 0) {
              localHistory[index] = resolvedEntry;
              hasChanges = true;
              console.log(`Resolved conflict for savings entry: ${resolvedEntry.amountSaved}`);
            }
          }
        }
      } else if (existingEntryByData && !existingEntryByData.apiId && existingEntryByData.type === 'deposit') {
        // Update existing entry with API ID and resolve any conflicts
        existingEntryByData.apiId = apiEntry.id;
        existingEntryByData.synced = true;
        
        // Check for data conflicts and resolve them
        const conflict = this.detectSavingsEntryConflict(existingEntryByData as SavingsEntry, apiEntry);
        if (conflict.hasConflict) {
          const resolvedEntry = this.resolveSavingsEntryConflict(existingEntryByData as SavingsEntry, apiEntry, conflict);
          if (resolvedEntry) {
            const index = localHistory.findIndex(entry => entry.id === existingEntryByData.id);
            if (index >= 0) {
              localHistory[index] = resolvedEntry;
              console.log(`Linked and resolved conflict for savings entry: ${resolvedEntry.amountSaved}`);
            }
          }
        }
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await this.set(this.HISTORY_KEY, localHistory);
      console.log(`Merged ${apiEntries.length} savings entries from API`);
    }
  }

  private async mergeApiWithdrawalEntries(apiEntries: any[]): Promise<void> {
    const localHistory = await this.getHistory();
    let hasChanges = false;
    
    for (const apiEntry of apiEntries) {
      // Check if we already have this entry locally by API ID
      const existingEntryByApiId = localHistory.find(entry => entry.apiId === apiEntry.id);
      
      // Also check by amount and date to catch potential duplicates without API ID
      const existingEntryByData = localHistory.find(entry =>
        entry.type === 'withdrawal' &&
        Math.abs((entry as WithdrawalEntry).amountWithdrawn - apiEntry.amount_withdrawn) < 0.01 &&
        new Date(entry.date).toDateString() === new Date(apiEntry.created_at).toDateString() &&
        !entry.apiId
      );
      
      if (!existingEntryByApiId && !existingEntryByData) {
        // Add new entry from API
        const newEntry: WithdrawalEntry = {
          type: 'withdrawal',
          amountWithdrawn: apiEntry.amount_withdrawn,
          date: apiEntry.created_at || new Date().toISOString(),
          goalName: apiEntry.reason || 'Unknown',
          id: Date.now() + Math.random(), // Generate unique local ID
          synced: true,
          apiId: apiEntry.id
        };
        localHistory.push(newEntry);
        hasChanges = true;
        console.log(`Added new withdrawal entry from API: ${apiEntry.amount_withdrawn} on ${apiEntry.created_at}`);
      } else if (existingEntryByApiId && existingEntryByApiId.type === 'withdrawal') {
        // Handle conflict resolution for existing entry with API ID
        const conflict = this.detectWithdrawalEntryConflict(existingEntryByApiId as WithdrawalEntry, apiEntry);
        if (conflict.hasConflict) {
          const resolvedEntry = this.resolveWithdrawalEntryConflict(existingEntryByApiId as WithdrawalEntry, apiEntry, conflict);
          if (resolvedEntry) {
            const index = localHistory.findIndex(entry => entry.id === existingEntryByApiId.id);
            if (index >= 0) {
              localHistory[index] = resolvedEntry;
              hasChanges = true;
              console.log(`Resolved conflict for withdrawal entry: ${resolvedEntry.amountWithdrawn}`);
            }
          }
        }
      } else if (existingEntryByData && !existingEntryByData.apiId && existingEntryByData.type === 'withdrawal') {
        // Update existing entry with API ID and resolve any conflicts
        existingEntryByData.apiId = apiEntry.id;
        existingEntryByData.synced = true;
        
        // Check for data conflicts and resolve them
        const conflict = this.detectWithdrawalEntryConflict(existingEntryByData as WithdrawalEntry, apiEntry);
        if (conflict.hasConflict) {
          const resolvedEntry = this.resolveWithdrawalEntryConflict(existingEntryByData as WithdrawalEntry, apiEntry, conflict);
          if (resolvedEntry) {
            const index = localHistory.findIndex(entry => entry.id === existingEntryByData.id);
            if (index >= 0) {
              localHistory[index] = resolvedEntry;
              console.log(`Linked and resolved conflict for withdrawal entry: ${resolvedEntry.amountWithdrawn}`);
            }
          }
        }
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await this.set(this.HISTORY_KEY, localHistory);
      console.log(`Merged ${apiEntries.length} withdrawal entries from API`);
    }
  }

  // Get count of unsynced entries
  async getUnsyncedCount(): Promise<number> {
    const history = await this.getHistory();
    return history.filter(entry => !entry.synced).length;
  }

  // Trigger goal amount recalculation by calling the savings goal service
  private async triggerGoalRecalculation(): Promise<void> {
    try {
      // Import SavingsGoalService dynamically to avoid circular dependency
      const { SavingsGoalService } = await import('./savings-goal.service');
      const savingsGoalService = new SavingsGoalService(this, this.apiService, this.syncService, this.authService);
      
      // Recalculate goal amounts immediately
      await savingsGoalService.recalculateGoalAmounts();
      
      console.log('Goal amounts recalculated after entry modification');
    } catch (error) {
      console.error('Failed to trigger goal recalculation:', error);
    }
  }

  // Conflict detection and resolution methods

  /**
   * Detect conflicts between local and API savings entries
   */
  private detectSavingsEntryConflict(localEntry: SavingsEntry, apiEntry: any): { hasConflict: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    // Check for amount differences
    if (Math.abs(localEntry.amountSaved - apiEntry.amount_saved) > 0.01) {
      conflicts.push(`amount: local=${localEntry.amountSaved}, api=${apiEntry.amount_saved}`);
    }

    // Check for net income differences
    if (Math.abs(localEntry.netIncome - (apiEntry.net_income || 0)) > 0.01) {
      conflicts.push(`netIncome: local=${localEntry.netIncome}, api=${apiEntry.net_income || 0}`);
    }

    // Check for date differences (more than 1 minute apart)
    const localDate = new Date(localEntry.date);
    const apiDate = new Date(apiEntry.created_at || apiEntry.updated_at);
    if (Math.abs(localDate.getTime() - apiDate.getTime()) > 60000) {
      conflicts.push(`date: local=${localEntry.date}, api=${apiEntry.created_at || apiEntry.updated_at}`);
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Resolve conflicts between local and API savings entries
   * Strategy: API data takes precedence for synced entries, but preserve local changes for unsynced entries
   */
  private resolveSavingsEntryConflict(localEntry: SavingsEntry, apiEntry: any, conflict: { hasConflict: boolean; conflicts: string[] }): SavingsEntry | null {
    if (!conflict.hasConflict) {
      return null;
    }

    console.log(`Resolving savings entry conflict: ${conflict.conflicts.join(', ')}`);

    // If local entry is not synced, it means it has local changes that should be preserved
    if (!localEntry.synced) {
      console.log('Local entry has unsynced changes, preserving local data');
      return {
        ...localEntry,
        apiId: apiEntry.id,
        synced: false // Keep as unsynced to push changes to API later
      };
    }

    // If local entry is synced, API data takes precedence
    console.log('Local entry is synced, using API data');
    return {
      ...localEntry,
      amountSaved: apiEntry.amount_saved,
      netIncome: apiEntry.net_income || 0,
      date: apiEntry.updated_at || apiEntry.created_at || localEntry.date,
      synced: true,
      apiId: apiEntry.id
    };
  }

  /**
   * Detect conflicts between local and API withdrawal entries
   */
  private detectWithdrawalEntryConflict(localEntry: WithdrawalEntry, apiEntry: any): { hasConflict: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    // Check for amount differences
    if (Math.abs(localEntry.amountWithdrawn - apiEntry.amount_withdrawn) > 0.01) {
      conflicts.push(`amount: local=${localEntry.amountWithdrawn}, api=${apiEntry.amount_withdrawn}`);
    }

    // Check for goal name differences
    const localGoalName = localEntry.goalName || 'Unknown';
    const apiGoalName = apiEntry.reason || 'Unknown';
    if (localGoalName !== apiGoalName) {
      conflicts.push(`goalName: local=${localGoalName}, api=${apiGoalName}`);
    }

    // Check for date differences (more than 1 minute apart)
    const localDate = new Date(localEntry.date);
    const apiDate = new Date(apiEntry.created_at || apiEntry.updated_at);
    if (Math.abs(localDate.getTime() - apiDate.getTime()) > 60000) {
      conflicts.push(`date: local=${localEntry.date}, api=${apiEntry.created_at || apiEntry.updated_at}`);
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Resolve conflicts between local and API withdrawal entries
   * Strategy: API data takes precedence for synced entries, but preserve local changes for unsynced entries
   */
  private resolveWithdrawalEntryConflict(localEntry: WithdrawalEntry, apiEntry: any, conflict: { hasConflict: boolean; conflicts: string[] }): WithdrawalEntry | null {
    if (!conflict.hasConflict) {
      return null;
    }

    console.log(`Resolving withdrawal entry conflict: ${conflict.conflicts.join(', ')}`);

    // If local entry is not synced, it means it has local changes that should be preserved
    if (!localEntry.synced) {
      console.log('Local withdrawal entry has unsynced changes, preserving local data');
      return {
        ...localEntry,
        apiId: apiEntry.id,
        synced: false // Keep as unsynced to push changes to API later
      };
    }

    // If local entry is synced, API data takes precedence
    console.log('Local withdrawal entry is synced, using API data');
    return {
      ...localEntry,
      amountWithdrawn: apiEntry.amount_withdrawn,
      goalName: apiEntry.reason || 'Unknown',
      date: apiEntry.updated_at || apiEntry.created_at || localEntry.date,
      synced: true,
      apiId: apiEntry.id
    };
  }
}
