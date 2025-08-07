import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { SavingsGoalService } from './savings-goal.service';
import { SyncService } from './sync.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

export interface SignInSyncStatus {
  isLoading: boolean;
  currentStep: string;
  progress: number;
  error?: string;
  completed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SignInSyncService {
  private syncStatusSubject = new BehaviorSubject<SignInSyncStatus>({
    isLoading: false,
    currentStep: '',
    progress: 0,
    completed: false
  });

  public syncStatus$ = this.syncStatusSubject.asObservable();

  constructor(
    private dataService: DataService,
    private savingsGoalService: SavingsGoalService,
    private syncService: SyncService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  /**
   * Comprehensive sign-in sync that handles:
   * 1. Loading all data from API
   * 2. Syncing unsynced local changes to API
   * 3. Resolving conflicts between local and API data
   * 4. Updating local storage with merged data
   */
  async performSignInSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - skipping sign-in sync');
      return;
    }

    if (!this.authService.currentUser) {
      console.log('No authenticated user - skipping sign-in sync');
      return;
    }

    this.updateSyncStatus({
      isLoading: true,
      currentStep: 'Starting synchronization...',
      progress: 0,
      completed: false
    });

    try {
      console.log('Starting comprehensive sign-in synchronization...');

      // Step 1: Sync unsynced local changes to API first
      await this.syncLocalChangesToApi();

      // Step 2: Load fresh data from API
      await this.loadAllDataFromApi();

      // Step 3: Perform final sync to ensure everything is up to date
      await this.performFinalSync();

      this.updateSyncStatus({
        isLoading: false,
        currentStep: 'Synchronization completed successfully',
        progress: 100,
        completed: true
      });

      console.log('Sign-in synchronization completed successfully');

    } catch (error) {
      console.error('Sign-in sync failed:', error);
      this.updateSyncStatus({
        isLoading: false,
        currentStep: 'Synchronization failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        completed: false
      });
      throw error;
    }
  }

  /**
   * Step 1: Sync any unsynced local changes to API first
   * This ensures we don't lose any offline changes
   */
  private async syncLocalChangesToApi(): Promise<void> {
    this.updateSyncStatus({
      isLoading: true,
      currentStep: 'Syncing local changes to server...',
      progress: 10
    });

    try {
      // Sync unsynced savings/withdrawal entries
      await this.dataService.syncUnsyncedEntries();
      
      // Sync unsynced goals
      await this.savingsGoalService.syncUnsyncedGoals();

      // Update net income if needed
      await this.syncNetIncomeIfNeeded();

      console.log('Local changes synced to API successfully');
    } catch (error) {
      console.error('Failed to sync local changes to API:', error);
      // Don't throw here - continue with loading from API
    }
  }

  /**
   * Step 2: Load all data from API and merge with local data
   */
  private async loadAllDataFromApi(): Promise<void> {
    this.updateSyncStatus({
      isLoading: true,
      currentStep: 'Loading data from server...',
      progress: 40
    });

    try {
      // Load user profile and update local user data
      await this.loadAndUpdateUserProfile();

      this.updateSyncStatus({
        currentStep: 'Loading savings data...',
        progress: 50
      });

      // Load savings entries from API
      await this.dataService.loadFromApi();

      this.updateSyncStatus({
        currentStep: 'Loading goals data...',
        progress: 70
      });

      // Load savings goals from API
      await this.savingsGoalService.loadFromApi();

      console.log('All data loaded from API successfully');
    } catch (error) {
      console.error('Failed to load data from API:', error);
      throw error;
    }
  }

  /**
   * Step 3: Perform final sync to ensure everything is consistent
   */
  private async performFinalSync(): Promise<void> {
    this.updateSyncStatus({
      isLoading: true,
      currentStep: 'Finalizing synchronization...',
      progress: 90
    });

    try {
      // Recalculate goal amounts based on actual entries
      await this.savingsGoalService.recalculateGoalAmounts();

      // Perform one final sync to ensure everything is up to date
      await this.syncService.performSync();

      console.log('Final sync completed successfully');
    } catch (error) {
      console.error('Failed to perform final sync:', error);
      // Don't throw here - the main sync was successful
    }
  }

  /**
   * Load user profile from API and update local user data
   */
  private async loadAndUpdateUserProfile(): Promise<void> {
    try {
      const response = await this.apiService.getUserProfile();
      if (response.success && response.data) {
        const userData = response.data.user || response.data;
        
        // Update the current user in AuthService
        const currentUser = this.authService.currentUser;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            ...userData,
            // Preserve local-only fields if they exist
            id: currentUser.id || userData.id
          };
          
          // Update user data in AuthService (this will also store it locally)
          await this.authService.updateProfile(updatedUser);
        }

        console.log('User profile updated from API');
      }
    } catch (error) {
      console.error('Failed to load user profile from API:', error);
      // Don't throw - continue with other sync operations
    }
  }

  /**
   * Sync net income if there are local changes
   */
  private async syncNetIncomeIfNeeded(): Promise<void> {
    try {
      const localNetIncome = await this.dataService.getNetIncome();
      const currentUser = this.authService.currentUser;
      
      if (currentUser && localNetIncome !== currentUser.net_income) {
        console.log(`Syncing net income: local=${localNetIncome}, user=${currentUser.net_income}`);
        await this.dataService.setNetIncome(localNetIncome);
      }
    } catch (error) {
      console.error('Failed to sync net income:', error);
      // Don't throw - continue with other operations
    }
  }

  /**
   * Get the current sync status
   */
  get currentSyncStatus(): SignInSyncStatus {
    return this.syncStatusSubject.value;
  }

  /**
   * Check if sync is currently in progress
   */
  get isSyncing(): boolean {
    return this.syncStatusSubject.value.isLoading;
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updates: Partial<SignInSyncStatus>): void {
    const currentStatus = this.syncStatusSubject.value;
    this.syncStatusSubject.next({ ...currentStatus, ...updates });
  }

  /**
   * Reset sync status
   */
  resetSyncStatus(): void {
    this.syncStatusSubject.next({
      isLoading: false,
      currentStep: '',
      progress: 0,
      completed: false
    });
  }

  /**
   * Force a complete re-sync (useful for manual refresh)
   */
  async forceCompleteSync(): Promise<void> {
    await this.performSignInSync();
  }
}