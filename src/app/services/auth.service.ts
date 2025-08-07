import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Preferences } from '@capacitor/preferences';
import { SignInSyncService } from './sign-in-sync.service';

export interface User {
  id: number;
  name: string;
  email: string;
  net_income: number;
  profile_picture?: string;
  voice_notifications_enabled: boolean;
  reminder_frequency: string;
  theme: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  public authInitialized$: Observable<boolean> = this.authInitializedSubject.asObservable();
  private justLoggedInSubject = new BehaviorSubject<boolean>(false);
  public justLoggedIn$: Observable<boolean> = this.justLoggedInSubject.asObservable();

  private syncService: any;
  private signInSyncService: SignInSyncService | null = null;

  constructor(
    private apiService: ApiService,
    private injector: Injector
  ) {
    this.initializeAuth();
  }

  private async initializeAuth() {
    await this.checkAuthStatus();
    this.authInitializedSubject.next(true);
  }

  private getSyncService() {
    if (!this.syncService) {
      // Lazy load SyncService to avoid circular dependency
      this.syncService = this.injector.get('SyncService', null);
    }
    return this.syncService;
  }

  private getSignInSyncService(): SignInSyncService | null {
    if (!this.signInSyncService) {
      try {
        // Lazy load SignInSyncService to avoid circular dependency
        this.signInSyncService = this.injector.get(SignInSyncService);
      } catch (error) {
        console.error('Failed to get SignInSyncService:', error);
        return null;
      }
    }
    return this.signInSyncService;
  }

  private async checkAuthStatus() {
    try {
      const token = await this.apiService.getToken();
      if (token) {
        // Try to get user profile to verify token is still valid
        try {
          const response = await this.apiService.getUserProfile();
          if (response.success && response.data) {
            this.setCurrentUser(response.data.user || response.data);
            return;
          }
        } catch (error) {
          console.log('Token validation failed, but keeping user logged in for offline use');
        }
        
        // If we have a token but can't validate it (offline), keep user logged in
        // Try to get user data from local storage
        const userData = await this.getStoredUserData();
        if (userData) {
          this.setCurrentUser(userData);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't logout automatically - keep user logged in for offline use
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    net_income?: number;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiService.register(userData);
      
      if (response.success && response.data) {
        await this.apiService.setToken(response.data.token);
        this.setCurrentUser(response.data.user);
        
        // Mark that user just logged in so home page can perform sync
        this.justLoggedInSubject.next(true);
        
        // Don't perform sync here - it will be done on the home page after navigation
        // This allows for immediate navigation and better UX
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error?.error?.message || 'Registration failed. Please try again.' 
      };
    }
  }

  async login(credentials: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiService.login(credentials);
      
      if (response.success && response.data) {
        await this.apiService.setToken(response.data.token);
        
        // Store remember me preference
        if (credentials.rememberMe !== undefined) {
          await this.setRememberMePreference(credentials.rememberMe);
        }
        
        this.setCurrentUser(response.data.user);
        
        // Mark that user just logged in so home page can perform sync
        this.justLoggedInSubject.next(true);
        
        // Don't perform sync here - it will be done on the home page after navigation
        // This allows for immediate navigation and better UX
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error?.error?.message || 'Login failed. Please check your credentials.'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Try to logout from server if online
      await this.apiService.logout();
    } catch (error) {
      console.error('Server logout failed:', error);
    } finally {
      // Always clear local auth state
      await this.apiService.removeToken();
      this.setCurrentUser(null);
      
      // Clear sync queue on logout
      const syncService = this.getSyncService();
      if (syncService) {
        await syncService.clearSyncQueue();
      }
    }
  }

  async updateProfile(profileData: Partial<User>): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiService.updateUserProfile(profileData);
      
      if (response.success && response.data) {
        this.setCurrentUser(response.data);
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Profile update failed' };
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // If offline, queue for sync
      const syncService = this.getSyncService();
      if (syncService && !navigator.onLine) {
        await syncService.queueForSync({
          type: 'update',
          entity: 'user_profile',
          data: profileData
        });
        
        // Update local user data
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
          this.setCurrentUser({ ...currentUser, ...profileData });
        }
        
        return { success: true, message: 'Profile updated locally. Will sync when online.' };
      }
      
      return { 
        success: false, 
        message: error?.error?.message || 'Profile update failed. Please try again.' 
      };
    }
  }

  async updateNetIncome(netIncome: number): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiService.updateNetIncome(netIncome);
      
      if (response.success) {
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
          this.setCurrentUser({ ...currentUser, net_income: netIncome });
        }
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Net income update failed' };
      }
    } catch (error: any) {
      console.error('Net income update error:', error);
      
      // If offline, queue for sync
      const syncService = this.getSyncService();
      if (syncService && !navigator.onLine) {
        await syncService.queueForSync({
          type: 'update',
          entity: 'user_profile',
          data: { net_income: netIncome }
        });
        
        // Update local user data
        const currentUser = this.currentUserSubject.value;
        if (currentUser) {
          this.setCurrentUser({ ...currentUser, net_income: netIncome });
        }
        
        return { success: true, message: 'Net income updated locally. Will sync when online.' };
      }
      
      return { 
        success: false, 
        message: error?.error?.message || 'Net income update failed. Please try again.' 
      };
    }
  }

  private async setCurrentUser(user: User | null) {
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(!!user);
    
    // Store user data locally for offline access
    if (user) {
      await this.storeUserData(user);
    } else {
      await this.clearStoredUserData();
    }
  }

  private async storeUserData(user: User): Promise<void> {
    try {
      await Preferences.set({ key: 'current_user', value: JSON.stringify(user) });
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  private async getStoredUserData(): Promise<User | null> {
    try {
      const result = await Preferences.get({ key: 'current_user' });
      return result.value ? JSON.parse(result.value) : null;
    } catch (error) {
      console.error('Failed to get stored user data:', error);
      return null;
    }
  }

  private async clearStoredUserData(): Promise<void> {
    try {
      await Preferences.remove({ key: 'current_user' });
    } catch (error) {
      console.error('Failed to clear stored user data:', error);
    }
  }

  private async setRememberMePreference(rememberMe: boolean): Promise<void> {
    try {
      await Preferences.set({ key: 'remember_me', value: JSON.stringify(rememberMe) });
    } catch (error) {
      console.error('Failed to store remember me preference:', error);
    }
  }

  private async getRememberMePreference(): Promise<boolean> {
    try {
      const result = await Preferences.get({ key: 'remember_me' });
      return result.value ? JSON.parse(result.value) : true; // Default to true for better UX
    } catch (error) {
      console.error('Failed to get remember me preference:', error);
      return true;
    }
  }

  async getStoredRememberMe(): Promise<boolean> {
    return await this.getRememberMePreference();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  get authInitialized(): boolean {
    return this.authInitializedSubject.value;
  }

  /**
   * Perform comprehensive sign-in synchronization
   * This method handles fetching data from API and updating local storage
   */
  private async performSignInSync(): Promise<void> {
    try {
      console.log('Starting comprehensive sign-in sync...');
      
      const signInSyncService = this.getSignInSyncService();
      if (signInSyncService) {
        await signInSyncService.performSignInSync();
        console.log('Sign-in sync completed successfully');
      } else {
        console.warn('SignInSyncService not available, falling back to basic sync');
        // Fallback to basic sync if SignInSyncService is not available
        const syncService = this.getSyncService();
        if (syncService) {
          await syncService.forceSync();
        }
      }
    } catch (error) {
      console.error('Sign-in sync failed:', error);
      // Don't throw the error to prevent login failure
      // The user can still use the app with local data
      
      // Try fallback sync
      try {
        const syncService = this.getSyncService();
        if (syncService) {
          await syncService.forceSync();
        }
      } catch (fallbackError) {
        console.error('Fallback sync also failed:', fallbackError);
      }
    }
  }

  /**
   * Get the current sign-in sync status
   */
  getSignInSyncStatus() {
    const signInSyncService = this.getSignInSyncService();
    return signInSyncService ? signInSyncService.syncStatus$ : null;
  }

  /**
   * Check if sign-in sync is currently in progress
   */
  isSignInSyncInProgress(): boolean {
    const signInSyncService = this.getSignInSyncService();
    return signInSyncService ? signInSyncService.isSyncing : false;
  }

  /**
   * Force a complete re-sync (useful for manual refresh)
   */
  async forceCompleteSync(): Promise<void> {
    const signInSyncService = this.getSignInSyncService();
    if (signInSyncService) {
      await signInSyncService.forceCompleteSync();
    } else {
      // Fallback to basic sync
      const syncService = this.getSyncService();
      if (syncService) {
        await syncService.forceSync();
      }
    }
  }

  /**
   * Mark that sign-in sync has been completed
   */
  markSignInSyncCompleted(): void {
    this.justLoggedInSubject.next(false);
  }

  /**
   * Check if user just logged in and needs sync
   */
  get justLoggedIn(): boolean {
    return this.justLoggedInSubject.value;
  }
}