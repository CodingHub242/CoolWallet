import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { ApiService } from './api.service';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';

export interface SavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  primary: boolean;
  synced?: boolean;
  apiId?: number;
  updated_at?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SavingsGoalService {

  private GOALS_KEY = 'goals';

  constructor(
    private dataService: DataService,
    private apiService: ApiService,
    private syncService: SyncService,
    private authService: AuthService
  ) { }

  async addGoal(goal: SavingsGoal): Promise<void> {
    const goals = await this.getGoals();
    if (goal.primary) {
      goals.forEach(g => g.primary = false);
    }
    
    // Mark as unsynced initially
    goal.synced = false;
    goals.push(goal);
    await this.dataService.set(this.GOALS_KEY, goals);

    // Try to sync with API if online
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (isOnline) {
      try {
        await this.syncGoalToApi(goal);
      } catch (error) {
        console.error('Failed to sync goal to API:', error);
        // Goal remains marked as unsynced and will be synced later
      }
    }
  }

  async getGoals(): Promise<SavingsGoal[]> {
    return this.dataService.get(this.GOALS_KEY);
  }

  async updateGoal(updatedGoal: SavingsGoal): Promise<void> {
    const goals = await this.getGoals();
    if (updatedGoal.primary) {
      goals.forEach(g => g.primary = false);
    }
    
    const index = goals.findIndex(goal => goal.name === updatedGoal.name);
    if (index > -1) {
      // Mark as unsynced
      updatedGoal.synced = false;
      goals[index] = updatedGoal;
    }
    await this.dataService.set(this.GOALS_KEY, goals);

    // Try to sync with API if online
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (isOnline && updatedGoal.apiId) {
      try {
        await this.syncGoalUpdateToApi(updatedGoal);//update the primary goal with the new data
      } catch (error) {
        console.error('Failed to sync goal update to API:', error);
      }
    }
  }

  async deleteGoal(goalName: string): Promise<void> {
    const goals = await this.getGoals();
    const goalToDelete = goals.find(g => g.name === goalName);
    
    // Remove from local storage
    const filteredGoals = goals.filter(goal => goal.name !== goalName);
    await this.dataService.set(this.GOALS_KEY, filteredGoals);

    // Try to delete from API if online and goal was synced
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (isOnline && goalToDelete?.apiId) {
      try {
        await this.apiService.deleteSavingsGoal(goalToDelete.apiId);
      } catch (error) {
        console.error('Failed to delete goal from API:', error);
      }
    }
  }

  async setPrimaryGoal(goalName: string): Promise<void> {
    const goals = await this.getGoals();
    const targetGoal = goals.find(g => g.name === goalName);
    
    if (!targetGoal) {
      console.error('Target goal not found:', goalName);
      return;
    }
    
    // Update all goals - set primary status and mark as unsynced
    goals.forEach(g => {
      g.primary = g.name === goalName;
      g.synced = false; // Mark as unsynced since primary status changed
    });
    
    await this.dataService.set(this.GOALS_KEY, goals);

    // Try to sync primary goal status to API if online
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (isOnline && targetGoal.apiId) {
      try {
        console.log(`Setting goal ${goalName} (ID: ${targetGoal.apiId}) as primary via API`);
        
        // Use the dedicated setPrimaryGoal API endpoint
        const response = await this.apiService.setPrimaryGoal(targetGoal.apiId);
        
        if (response.success) {
          console.log('Successfully set primary goal via API');
          
          // Mark all goals as synced since the API call succeeded
          const updatedGoals = goals.map(goal => ({
            ...goal,
            synced: true
          }));
          
          await this.dataService.set(this.GOALS_KEY, updatedGoals);
        } else {
          console.error('Failed to set primary goal via API:', response.message);
          // Goals remain marked as unsynced and will be synced later
        }
      } catch (error) {
        console.error('Failed to set primary goal via API:', error);
        // Goals remain marked as unsynced and will be synced later
      }
    } else if (!isOnline) {
      console.log('Offline - primary goal status will be synced when online');
    } else if (!targetGoal.apiId) {
      console.log('Target goal has no API ID - will sync when goal is created on API');
    }
  }

  async getPrimaryGoal(): Promise<SavingsGoal | undefined> {
    // Check if we're online
    const isOnline = (window as any).navigator?.onLine ?? true;
    
    // If online, try to load fresh data from API
    if (isOnline) {
      try {
        await this.loadFromApi();
      } catch (error) {
        console.error('Failed to load goals from API in getPrimaryGoal:', error);
        // Continue with local data if API call fails
      }
    }
    
    const goals = await this.getGoals();
    //console.log(goals);
    return goals.find(g => g.primary);
  }

  // Sync unsynced goals to API
  async syncUnsyncedGoals(): Promise<void> {
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (!isOnline) return;

    const goals = await this.getGoals();
    const unsyncedGoals = goals.filter(goal => !goal.synced);

    console.log(`Syncing ${unsyncedGoals.length} unsynced goals to API`);

    for (const goal of unsyncedGoals) {
      try {
        if (goal.apiId) {
          // If this is a primary goal change, use the dedicated API endpoint
          if (goal.primary) {
            const currentPrimaryGoal = await this.getCurrentPrimaryGoalFromApi();
            if (!currentPrimaryGoal || currentPrimaryGoal.id !== goal.apiId) {
              console.log(`Setting goal ${goal.name} as primary via API`);
              const response = await this.apiService.setPrimaryGoal(goal.apiId);
              if (response.success) {
                await this.markGoalAsSynced(goal.name, goal.apiId);
                console.log(`Successfully set ${goal.name} as primary`);
                continue;
              }
            }
          }
          
          // Regular goal update
          await this.syncGoalUpdateToApi(goal);
        } else {
          // Create new goal
          await this.syncGoalToApi(goal);
        }
      } catch (error) {
        console.error('Failed to sync goal:', goal, error);
      }
    }
  }

  private async syncGoalToApi(goal: SavingsGoal): Promise<void> {
    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Create goal via sync service
      const syncGoal = {
        s_user_id: currentUser.id,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        is_primary: goal.primary
      };

      const syncSave = {
        s_user_id: currentUser.id,
        savings_goal_id: goal.apiId,
        amount_saved: goal.currentAmount,
      };
      
      await this.syncService.saveSavingsGoal(syncGoal);

      //await this.syncService.syncSavingsEntries();
      
      // Also try direct API call for immediate sync
      const response = await this.apiService.createSavingsGoal(syncGoal);
      if (response.success && response.data) {
        // Update local goal with API ID and mark as synced
        await this.markGoalAsSynced(goal.name, response.data.id);
      }
    } catch (error) {
      console.error('Failed to sync goal to API:', error);
      throw error;
    }
  }

  private async syncGoalUpdateToApi(goal: SavingsGoal): Promise<void> {
    if (!goal.apiId) return;

    try {
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const updateData = {
        s_user_id: currentUser.id,
        name: goal.name,
        target_amount: goal.targetAmount,
        current_amount: goal.currentAmount,
        is_primary: goal.primary
      };
      
      const response = await this.apiService.updateSavingsGoal(goal.apiId, updateData);
      if (response.success) {
        await this.markGoalAsSynced(goal.name, goal.apiId);
      }
    } catch (error) {
      console.error('Failed to sync goal update to API:', error);
      throw error;
    }
  }

  private async markGoalAsSynced(goalName: string, apiId: number): Promise<void> {
    const goals = await this.getGoals();
    const updatedGoals = goals.map(goal => 
      goal.name === goalName 
        ? { ...goal, synced: true, apiId: apiId }
        : goal
    );
    await this.dataService.set(this.GOALS_KEY, updatedGoals);
  }

  // Load goals from API and merge with local goals
  async loadFromApi(): Promise<void> {
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (!isOnline) return;

    try {
      const response = await this.apiService.getSavingsGoals();
      if (response.success && response.data) {
        await this.mergeApiGoals(response.data);
      }
    } catch (error) {
      console.error('Failed to load goals from API:', error);
    }
  }

  private async mergeApiGoals(apiGoals: any[]): Promise<void> {
    const localGoals = await this.getGoals();
    
    for (const apiGoal of apiGoals) {
      // Check if we already have this goal locally
      const existingGoal = localGoals.find(goal => goal.apiId === apiGoal.id);
      
      if (!existingGoal) {
        // Add new goal from API
        const newGoal: SavingsGoal = {
          name: apiGoal.name,
          targetAmount: apiGoal.target_amount,
          currentAmount: apiGoal.current_amount,
          primary: apiGoal.is_primary,
          synced: true,
          apiId: apiGoal.id
        };
        localGoals.push(newGoal);
      } else {
        // Update existing goal if API version is newer
        if (new Date(apiGoal.updated_at) > new Date(existingGoal.updated_at || 0)) {
          existingGoal.targetAmount = apiGoal.target_amount;
          existingGoal.currentAmount = apiGoal.current_amount;
          existingGoal.primary = apiGoal.is_primary;
          existingGoal.synced = true;
          existingGoal.updated_at = apiGoal.updated_at;
          existingGoal.created_at = apiGoal.created_at;
        }
      }
    }
    
    await this.dataService.set(this.GOALS_KEY, localGoals);
  }

  // Get count of unsynced goals
  async getUnsyncedCount(): Promise<number> {
    const goals = await this.getGoals();
    return goals.filter(goal => !goal.synced).length;
  }

  // Recalculate goal amounts based on actual entries
  async recalculateGoalAmounts(): Promise<void> {
    try {
      console.log('Recalculating goal amounts based on entries...');
      
      const goals = await this.getGoals();
      const history = await this.dataService.getHistory();
      
      console.log('Current goals:', goals.map(g => ({ name: g.name, current: g.currentAmount, primary: g.primary })));
      console.log('History entries:', history.length);
      
      // For this app, all savings go to the primary goal
      // and withdrawals can come from any goal
      const primaryGoal = goals.find(g => g.primary);
      
      if (!primaryGoal) {
        console.log('No primary goal found, skipping recalculation');
        return;
      }
      
      // Calculate total savings (all deposits go to primary goal)
      let totalSavings = 0;
      let totalWithdrawals = 0;
      
      history.forEach(entry => {
        if (entry.type === 'deposit') {
          totalSavings += Number(entry.amountSaved);
          console.log(`Adding deposit: ${entry.amountSaved}, total: ${totalSavings}`);
        } else if (entry.type === 'withdrawal') {
          totalWithdrawals += Number(entry.amountWithdrawn);
          console.log(`Adding withdrawal: ${entry.amountWithdrawn}, total: ${totalWithdrawals}`);
        }
      });
      
      const calculatedAmount = Math.max(0, totalSavings - totalWithdrawals);
      console.log(`Calculated amount for primary goal: ${calculatedAmount} (savings: ${totalSavings}, withdrawals: ${totalWithdrawals})`);
      
      // Update primary goal if amount is different
      // if (Math.abs(primaryGoal.currentAmount - calculatedAmount) > 0.01) {
       if (Math.abs(primaryGoal.currentAmount) > 0.01) {
        console.log(`Updating primary goal ${primaryGoal.name}: ${primaryGoal.currentAmount} -> ${calculatedAmount}`);
        
        // Update the primary goal with new amount
        const updatedPrimaryGoal = {
          ...primaryGoal,
          currentAmount: calculatedAmount,
          synced: false,
          needs_sync: true
        };
        
        const updatedGoals = goals.map(goal => {
          if (goal.primary) {
            return updatedPrimaryGoal;
          }
          return goal;
        });
        
        await this.dataService.set(this.GOALS_KEY, updatedGoals);
        console.log('Primary goal amount recalculated and updated locally');
        
        // Immediately sync to API if online
        const isOnline = (window as any).navigator?.onLine ?? true;
        if (isOnline) {
          try {
            console.log('Syncing updated goal to API...');
            await this.updateGoal(updatedPrimaryGoal);
            console.log('Goal successfully synced to API');
          } catch (error) {
            console.error('Failed to sync updated goal to API:', error);
            // Goal remains marked as unsynced and will be synced later
          }
        } else {
          console.log('Offline - goal will be synced when online');
        }
      } else {
        console.log('Primary goal amount is already correct, no update needed');
      }
      
    } catch (error) {
      console.error('Failed to recalculate goal amounts:', error);
    }
  
  }

  /**
   * Get current primary goal from API to check if it needs to be updated
   */
  private async getCurrentPrimaryGoalFromApi(): Promise<any> {
    try {
      const response = await this.apiService.getPrimaryGoal();
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get current primary goal from API:', error);
      return null;
    }
  }

  private getGoalId(goalName: string): number {
    // Simple hash function to generate consistent IDs for goal names
    let hash = 0;
    for (let i = 0; i < goalName.length; i++) {
      const char = goalName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
