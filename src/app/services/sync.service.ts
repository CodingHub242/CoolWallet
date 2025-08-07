import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncing: boolean;
}

export interface SavingsGoal {
  id?: number;
  user_id?: number;
  s_user_id?: number;
  name: string;
  target_amount: number;
  current_amount: number;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
  local_id?: string;
  needs_sync?: boolean;
  synced?: boolean;
  apiId?: number;
}

export interface SavingsEntry {
  id?: number;
  user_id?: number;
  s_user_id?: number;
  savings_goal_id?: number;
  net_income: number;
  amount_saved: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  local_id?: string;
  needs_sync?: boolean;
  synced?: boolean;
  apiId?: number;
}

export interface WithdrawalEntry {
  id?: number;
  user_id?: number;
  s_user_id?: number;
  savings_goal_id?: number;
  amount_withdrawn: number;
  reason?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  local_id?: string;
  needs_sync?: boolean;
  synced?: boolean;
  apiId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private syncInterval: any;
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    syncing: false
  });

  public syncStatus$ = this.syncStatusSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.startSyncTimer();
    this.setupNetworkListeners();
    this.loadInitialData();
  }

  private async loadInitialData() {
    // Load data from API on service initialization
    setTimeout(async () => {
      if (navigator.onLine) {
        try {
          await this.loadAllDataFromApi();
        } catch (error) {
          console.error('Failed to load initial data from API:', error);
        }
      }
    }, 5000); // Wait 5 seconds after app start
  }

  private startSyncTimer() {
    // Sync every 5 minutes (300,000 milliseconds)
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 300000);

    // Initial sync after 10 seconds
    setTimeout(() => {
      this.performSync();
    }, 10000);
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.updateSyncStatus({ isOnline: true });
      this.performSync();
    });

    window.addEventListener('offline', () => {
      this.updateSyncStatus({ isOnline: false });
    });
  }

  private updateSyncStatus(updates: Partial<SyncStatus>) {
    const currentStatus = this.syncStatusSubject.value;
    this.syncStatusSubject.next({ ...currentStatus, ...updates });
  }

  async performSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - skipping sync');
      return;
    }

    const currentStatus = this.syncStatusSubject.value;
    if (currentStatus.syncing) {
      console.log('Sync already in progress');
      return;
    }

    this.updateSyncStatus({ syncing: true });

    try {
      console.log('Starting data synchronization...');
      
      // Sync savings entries first (they affect goal amounts)
      await this.syncSavingsEntries();
      
      // Sync withdrawal entries
      await this.syncWithdrawalEntries();
      
      // Recalculate goal amounts based on actual entries
      await this.recalculateGoalAmounts();
      
      // Sync savings goals (after amounts are recalculated)
      await this.syncSavingsGoals();

      // Update last sync time
      this.updateSyncStatus({
        lastSync: new Date(),
        syncing: false,
        pendingChanges: await this.getPendingChangesCount()
      });

      console.log('Synchronization completed successfully');

    } catch (error) {
      console.error('Sync failed:', error);
      this.updateSyncStatus({ syncing: false });
    }
  }

  private async syncSavingsGoals(): Promise<void> {
    try {
      console.log('Syncing savings goals...');
      
      // Get local savings goals
      const localGoalsResult = await Preferences.get({ key: 'savings_goals' });
      const localGoals: SavingsGoal[] = localGoalsResult.value ? JSON.parse(localGoalsResult.value) : [];
      
      // Get remote savings goals
      const response = await this.apiService.getSavingsGoals();
      const remoteGoals: SavingsGoal[] = response.success ? response.data : [];

      // Create a map of remote goals by ID for efficient lookup
      const remoteGoalsMap = new Map(remoteGoals.map(goal => [goal.id, goal]));
      
      // Process local goals that need syncing
      const updatedLocalGoals: SavingsGoal[] = [];
      
      for (const localGoal of localGoals) {
        if (localGoal.needs_sync && !localGoal.synced) {
          try {
            console.log(`Syncing goal: ${localGoal.name} (ID: ${localGoal.id}, current_amount: ${localGoal.current_amount})`);
            
            if (localGoal.id && remoteGoalsMap.has(localGoal.id)) {
              // Update existing goal on remote
              const updateData = {
                name: localGoal.name,
                target_amount: localGoal.target_amount,
                current_amount: localGoal.current_amount,
                is_primary: localGoal.is_primary
              };
              
              console.log('Updating goal on remote with data:', updateData);
              const updateResponse = await this.apiService.updateSavingsGoal(localGoal.id, updateData);
              if (updateResponse.success) {
                localGoal.needs_sync = false;
                localGoal.synced = true;
                localGoal.updated_at = new Date().toISOString();
                console.log(`Goal ${localGoal.name} successfully updated on remote`);
              } else {
                console.error('Failed to update goal on remote:', updateResponse);
              }
            } else if (!localGoal.id) {
              // Create new goal on remote
              const createData = {
                name: localGoal.name,
                target_amount: localGoal.target_amount,
                current_amount: localGoal.current_amount,
                is_primary: localGoal.is_primary
              };
              
              console.log('Creating new goal on remote with data:', createData);
              const createResponse = await this.apiService.createSavingsGoal(createData);
              if (createResponse.success && createResponse.data) {
                localGoal.id = createResponse.data.id;
                localGoal.needs_sync = false;
                localGoal.synced = true;
                localGoal.created_at = createResponse.data.created_at;
                localGoal.updated_at = createResponse.data.updated_at;
                console.log(`Goal ${localGoal.name} successfully created on remote with ID: ${localGoal.id}`);
              } else {
                console.error('Failed to create goal on remote:', createResponse);
              }
            }
          } catch (error) {
            console.error('Failed to sync goal:', localGoal, error);
          }
        }
        updatedLocalGoals.push(localGoal);
      }

      // Add remote goals that don't exist locally
      for (const remoteGoal of remoteGoals) {
        const existsLocally = updatedLocalGoals.some(local => local.id === remoteGoal.id);
        if (!existsLocally) {
          updatedLocalGoals.push({
            ...remoteGoal,
            needs_sync: false,
            synced: true
          });
        }
      }

      // Save updated local goals
      await Preferences.set({ key: 'savings_goals', value: JSON.stringify(updatedLocalGoals) });
      console.log('Savings goals sync completed');

    } catch (error) {
      console.error('Failed to sync savings goals:', error);
    }
  }

  public async syncSavingsEntries(): Promise<void> {
    try {
      console.log('Syncing savings entries...');
      
      // Get local savings entries
      const localEntriesResult = await Preferences.get({ key: 'savings_entries' });
      const localEntries: SavingsEntry[] = localEntriesResult.value ? JSON.parse(localEntriesResult.value) : [];
      
      // Get remote savings entries
      const response = await this.apiService.getSavingsEntries();
      const remoteEntries: SavingsEntry[] = response.success ? response.data : [];

      // Create a map of remote entries by ID for efficient lookup
      const remoteEntriesMap = new Map(remoteEntries.map(entry => [entry.id, entry]));
      
      // Process local entries that need syncing
      const updatedLocalEntries: SavingsEntry[] = [];
      
      for (const localEntry of localEntries) {
        if (localEntry.needs_sync && !localEntry.synced) {
          try {
            if (localEntry.id && remoteEntriesMap.has(localEntry.id)) {
              // Update existing entry on remote
              const updateData = {
                net_income: localEntry.net_income,
                amount_saved: localEntry.amount_saved,
                savings_goal_id: localEntry.savings_goal_id,
                notes: localEntry.notes
              };
              
              const updateResponse = await this.apiService.updateSavingsEntry(localEntry.id, updateData);
              if (updateResponse.success) {
                localEntry.needs_sync = false;
                localEntry.synced = true;
                localEntry.updated_at = new Date().toISOString();
              }
            } else if (!localEntry.id) {
              // Create new entry on remote
              const currentUser = this.authService.currentUser;
              if (!currentUser) {
                console.error('No authenticated user found');
                continue;
              }
              
              const createData = {
                s_user_id: currentUser.id,
                net_income: localEntry.net_income,
                amount_saved: localEntry.amount_saved,
                savings_goal_id: localEntry.savings_goal_id,
                notes: localEntry.notes
              };
              
              const createResponse = await this.apiService.createSavingsEntry(createData);
              if (createResponse.success && createResponse.data) {
                localEntry.id = createResponse.data.id;
                localEntry.needs_sync = false;
                localEntry.synced = true;
                localEntry.created_at = createResponse.data.created_at;
                localEntry.updated_at = createResponse.data.updated_at;
              }
            }
          } catch (error) {
            console.error('Failed to sync entry:', localEntry, error);
          }
        }
        updatedLocalEntries.push(localEntry);
      }

      // Add remote entries that don't exist locally
      for (const remoteEntry of remoteEntries) {
        const existsLocally = updatedLocalEntries.some(local => local.id === remoteEntry.id);
        if (!existsLocally) {
          updatedLocalEntries.push({
            ...remoteEntry,
            needs_sync: false,
            synced: true
          });
        }
      }

      // Save updated local entries
      await Preferences.set({ key: 'savings_entries', value: JSON.stringify(updatedLocalEntries) });
      console.log('Savings entries sync completed');

    } catch (error) {
      console.error('Failed to sync savings entries:', error);
    }
  }

  private async syncWithdrawalEntries(): Promise<void> {
    try {
      console.log('Syncing withdrawal entries...');
      
      // Get local withdrawal entries
      const localEntriesResult = await Preferences.get({ key: 'withdrawal_entries' });
      const localEntries: WithdrawalEntry[] = localEntriesResult.value ? JSON.parse(localEntriesResult.value) : [];
      
      // Get remote withdrawal entries
      const response = await this.apiService.getWithdrawalEntries();
      const remoteEntries: WithdrawalEntry[] = response.success ? response.data : [];

      // Create a map of remote entries by ID for efficient lookup
      const remoteEntriesMap = new Map(remoteEntries.map(entry => [entry.id, entry]));
      
      // Process local entries that need syncing
      const updatedLocalEntries: WithdrawalEntry[] = [];
      
      for (const localEntry of localEntries) {
        if (localEntry.needs_sync && !localEntry.synced) {
          try {
            if (localEntry.id && remoteEntriesMap.has(localEntry.id)) {
              // Update existing entry on remote
              const updateData = {
                amount_withdrawn: localEntry.amount_withdrawn,
                savings_goal_id: localEntry.savings_goal_id,
                reason: localEntry.reason,
                notes: localEntry.notes
              };
              
              const updateResponse = await this.apiService.updateWithdrawalEntry(localEntry.id, updateData);
              if (updateResponse.success) {
                localEntry.needs_sync = false;
                localEntry.synced = true;
                localEntry.updated_at = new Date().toISOString();
              }
            } else if (!localEntry.id) {
              // Create new entry on remote
              const currentUser = this.authService.currentUser;
              if (!currentUser) {
                console.error('No authenticated user found');
                continue;
              }
              
              const createData = {
                s_user_id: currentUser.id,
                amount_withdrawn: localEntry.amount_withdrawn,
                savings_goal_id: localEntry.savings_goal_id,
                reason: localEntry.reason,
                notes: localEntry.notes
              };
              
              const createResponse = await this.apiService.createWithdrawalEntry(createData);
              if (createResponse.success && createResponse.data) {
                localEntry.id = createResponse.data.id;
                localEntry.needs_sync = false;
                localEntry.synced = true;
                localEntry.created_at = createResponse.data.created_at;
                localEntry.updated_at = createResponse.data.updated_at;
              }
            }
          } catch (error) {
            console.error('Failed to sync withdrawal entry:', localEntry, error);
          }
        }
        updatedLocalEntries.push(localEntry);
      }

      // Add remote entries that don't exist locally
      for (const remoteEntry of remoteEntries) {
        const existsLocally = updatedLocalEntries.some(local => local.id === remoteEntry.id);
        if (!existsLocally) {
          updatedLocalEntries.push({
            ...remoteEntry,
            needs_sync: false,
            synced: true
          });
        }
      }

      // Save updated local entries
      await Preferences.set({ key: 'withdrawal_entries', value: JSON.stringify(updatedLocalEntries) });
      console.log('Withdrawal entries sync completed');

    } catch (error) {
      console.error('Failed to sync withdrawal entries:', error);
    }
  }

  private async recalculateGoalAmounts(): Promise<void> {
    try {
      console.log('SyncService: Delegating goal recalculation to SavingsGoalService...');
      
      // Instead of duplicating logic, delegate to the SavingsGoalService
      // which has the correct business logic for this app
      const { SavingsGoalService } = await import('./savings-goal.service');
      const { DataService } = await import('./data.service');
      
      const dataService = new DataService(this.apiService, this, this.authService);
      const savingsGoalService = new SavingsGoalService(dataService, this.apiService, this, this.authService);
      
      await savingsGoalService.recalculateGoalAmounts();
      
      console.log('SyncService: Goal recalculation completed');
      
    } catch (error) {
      console.error('SyncService: Failed to recalculate goal amounts:', error);
    }
  }

  // Local data management methods
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const result = await Preferences.get({ key: 'savings_goals' });
    return result.value ? JSON.parse(result.value) : [];
  }

  async saveSavingsGoal(goal: SavingsGoal): Promise<void> {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      goal.s_user_id = currentUser.id;
    }
    
    const goals = await this.getSavingsGoals();
    goal.needs_sync = true;
    goal.synced = false;
    goal.updated_at = new Date().toISOString();
    
    if (goal.id) {
      const index = goals.findIndex(g => g.id === goal.id);
      if (index >= 0) {
        goals[index] = goal;
      } else {
        goals.push(goal);
      }
    } else {
      goal.local_id = Date.now().toString();
      goals.push(goal);
    }
    
    await Preferences.set({ key: 'savings_goals', value: JSON.stringify(goals) });
    this.updatePendingChangesCount();
  }

  async deleteSavingsGoal(goalId: number): Promise<void> {
    const goals = await this.getSavingsGoals();
    const index = goals.findIndex(g => g.id === goalId);
    
    if (index >= 0) {
      goals.splice(index, 1);
      await Preferences.set({ key: 'savings_goals', value: JSON.stringify(goals) });
      
      // Try to delete from remote if online
      if (navigator.onLine) {
        try {
          await this.apiService.deleteSavingsGoal(goalId);
        } catch (error) {
          console.error('Failed to delete goal from remote:', error);
        }
      }
    }
  }

  async getSavingsEntries(): Promise<SavingsEntry[]> {
    const result = await Preferences.get({ key: 'savings_entries' });
    return result.value ? JSON.parse(result.value) : [];
  }

  async saveSavingsEntry(entry: SavingsEntry): Promise<void> {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      entry.s_user_id = currentUser.id;
    }
    
    const entries = await this.getSavingsEntries();
    entry.needs_sync = true;
    entry.synced = false;
    entry.updated_at = new Date().toISOString();
    
    if (entry.id) {
      const index = entries.findIndex(e => e.id === entry.id);
      if (index >= 0) {
        entries[index] = entry;
      } else {
        entries.push(entry);
      }
    } else {
      entry.local_id = Date.now().toString();
      entries.push(entry);
    }
    
    await Preferences.set({ key: 'savings_entries', value: JSON.stringify(entries) });
    this.updatePendingChangesCount();
  }

  async getWithdrawalEntries(): Promise<WithdrawalEntry[]> {
    const result = await Preferences.get({ key: 'withdrawal_entries' });
    return result.value ? JSON.parse(result.value) : [];
  }

  async saveWithdrawalEntry(entry: WithdrawalEntry): Promise<void> {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      entry.s_user_id = currentUser.id;
    }
    
    const entries = await this.getWithdrawalEntries();
    entry.needs_sync = true;
    entry.synced = false;
    entry.updated_at = new Date().toISOString();
    
    if (entry.id) {
      const index = entries.findIndex(e => e.id === entry.id);
      if (index >= 0) {
        entries[index] = entry;
      } else {
        entries.push(entry);
      }
    } else {
      entry.local_id = Date.now().toString();
      entries.push(entry);
    }
    
    await Preferences.set({ key: 'withdrawal_entries', value: JSON.stringify(entries) });
    this.updatePendingChangesCount();
  }

  async deleteWithdrawalEntry(entryId: number): Promise<void> {
    const entries = await this.getWithdrawalEntries();
    const index = entries.findIndex(e => e.id === entryId);
    
    if (index >= 0) {
      entries.splice(index, 1);
      await Preferences.set({ key: 'withdrawal_entries', value: JSON.stringify(entries) });
      
      // Try to delete from remote if online
      if (navigator.onLine) {
        try {
          await this.apiService.deleteWithdrawalEntry(entryId);
        } catch (error) {
          console.error('Failed to delete withdrawal entry from remote:', error);
        }
      }
    }
  }

  async deleteSavingsEntry(entryId: number): Promise<void> {
    const entries = await this.getSavingsEntries();
    const index = entries.findIndex(e => e.id === entryId);
    
    if (index >= 0) {
      entries.splice(index, 1);
      await Preferences.set({ key: 'savings_entries', value: JSON.stringify(entries) });
      
      // Try to delete from remote if online
      if (navigator.onLine) {
        try {
          await this.apiService.deleteSavingsEntry(entryId);
        } catch (error) {
          console.error('Failed to delete entry from remote:', error);
        }
      }
    }
  }

  private async getPendingChangesCount(): Promise<number> {
    try {
      // Get pending count from data service and savings goal service
      const { DataService } = await import('./data.service');
      const { SavingsGoalService } = await import('./savings-goal.service');
      
      const dataService = new DataService(this.apiService, this, this.authService);
      const savingsGoalService = new SavingsGoalService(dataService, this.apiService, this, this.authService);
      
      const [unsyncedEntries, unsyncedGoals] = await Promise.all([
        dataService.getUnsyncedCount(),
        savingsGoalService.getUnsyncedCount()
      ]);
      
      return unsyncedEntries + unsyncedGoals;
    } catch (error) {
      console.error('Failed to get pending changes count:', error);
      return 0;
    }
  }

  private async updatePendingChangesCount(): Promise<void> {
    const count = await this.getPendingChangesCount();
    this.updateSyncStatus({ pendingChanges: count });
  }

  // Load all data from API and merge with local data
  private async loadAllDataFromApi(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      console.log('Loading data from API...');
      // This method will be called by the data service and savings goal service
      // to load their respective data from the API
    } catch (error) {
      console.error('Failed to load data from API:', error);
    }
  }

  // Sync local changes to API
  private async syncLocalChangesToApi(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      console.log('Syncing local changes to API...');
      // This method will be called by the data service and savings goal service
      // to sync their respective unsynced data to the API
    } catch (error) {
      console.error('Failed to sync local changes to API:', error);
    }
  }

  // Force sync method
  async forceSync(): Promise<void> {
    await this.performSync();
  }

  // Cleanup method
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}