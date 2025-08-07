# Offline-First Synchronization Setup Guide

This guide explains how to integrate the offline-first synchronization system with your existing Ionic Angular savings wallet app and Laravel backend.

## Overview

The synchronization system provides:
- **Offline-first operation**: App works fully offline, storing data locally
- **Automatic sync**: When online, changes sync automatically with the Laravel backend
- **Conflict resolution**: Server data takes precedence during sync
- **Queue management**: Failed sync attempts are retried automatically
- **Real-time status**: Users can see sync status and force manual sync

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ionic App     │    │  Sync Service   │    │ Laravel Backend │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Local Storage│ │◄──►│ │ Sync Queue  │ │◄──►│ │  Database   │ │
│ │(Capacitor)  │ │    │ │             │ │    │ │  (MySQL)    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   UI Pages  │ │    │ │Network Check│ │    │ │ API Routes  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Installation Steps

### 1. Update Main Configuration

The HttpClient provider has been configured in `src/main.ts`. Make sure your main.ts file includes:

```typescript
import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicModule.forRoot({})),
    provideRouter(routes),
    provideHttpClient(), // This provides HttpClient
  ],
});
```

### 2. Service Dependencies

The services will be automatically injected when needed. No additional configuration is required as they use Angular's dependency injection system.

### 3. Update Service Dependencies

The existing services have been updated to integrate with the sync system. Make sure to inject the SyncService in the constructors where it's been added:

- `DataService` - now queues history entries for sync
- `SavingsGoalService` - now queues goal changes for sync  
- `SettingsService` - now queues settings changes for sync

### 4. Configure API Base URL

Update the base URL in `src/app/services/api.service.ts`:

```typescript
private baseUrl = 'https://your-laravel-backend.com/api'; // Change this
```

### 5. Add Sync Status Component

Add the sync status component to your main pages (like home page):

```html
<!-- In src/app/home/home.page.html -->
<ion-header>
  <ion-toolbar>
    <!-- existing header content -->
  </ion-toolbar>
</ion-header>

<ion-content>
  <!-- Add sync status at the top -->
  <app-sync-status></app-sync-status>
  
  <!-- existing content -->
</ion-content>
```

Import the component:

```typescript
// In src/app/home/home.page.ts
import { SyncStatusComponent } from '../components/sync-status/sync-status.component';

@Component({
  // ...
  imports: [
    // existing imports
    SyncStatusComponent
  ]
})
```

### 6. Update Laravel Backend

Ensure your Laravel backend is running with:

1. **Database migrations**: Run the migrations created
```bash
php artisan migrate
```

2. **Sanctum setup**: Install and configure Laravel Sanctum
```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

3. **CORS configuration**: Update `config/cors.php` to allow your Ionic app
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:8100', 'capacitor://localhost'],
```

## Usage Examples

### 1. User Authentication

```typescript
// Login
const result = await this.authService.login({
  email: 'user@example.com',
  password: 'password'
});

if (result.success) {
  // User logged in, sync will start automatically
  console.log('Login successful');
} else {
  console.error('Login failed:', result.message);
}
```

### 2. Working with Savings Goals

```typescript
// Add a goal (works offline)
await this.savingsGoalService.addGoal({
  name: 'Emergency Fund',
  targetAmount: 10000,
  currentAmount: 0,
  primary: true
});
// Will sync automatically when online
```

### 3. Adding Savings Entries

```typescript
// Add savings (works offline)
await this.dataService.addHistoryEntry({
  type: 'deposit',
  netIncome: 5000,
  amountSaved: 500,
  date: new Date().toISOString(),
  id: Date.now()
});
// Will sync automatically when online
```

### 4. Manual Sync

```typescript
// Force sync manually
await this.syncService.forcSync();
```

### 5. Monitor Sync Status

```typescript
// Subscribe to sync status
this.syncService.syncStatus$.subscribe(status => {
  console.log('Sync status:', status);
  console.log('Pending items:', status.pendingItems);
  console.log('Is syncing:', status.isSyncing);
  console.log('Errors:', status.errors);
});
```

## How It Works

### Offline Operation
1. User performs actions (add goal, save money, etc.)
2. Data is stored locally using Capacitor Preferences
3. Actions are queued for sync when online
4. App continues to work normally

### Online Synchronization
1. Network service detects internet connection
2. Sync service automatically starts synchronization
3. Local changes are pushed to Laravel backend
4. Server data is pulled and merged locally
5. Conflicts are resolved (server wins)

### Conflict Resolution
- **Server Wins**: Server data takes precedence during sync
- **Timestamps**: Could be enhanced to use timestamps for smarter merging
- **User Notification**: Sync errors are shown to users

## Data Flow

### Creating Data (Offline)
```
User Action → Local Storage → Sync Queue → (When Online) → Laravel API → Database
```

### Syncing Data (Online)
```
Laravel API ← Sync Service ← Sync Queue
     ↓
Local Storage ← Data Merge ← API Response
```

## Monitoring and Debugging

### Sync Status Component
- Shows current sync status (online/offline/syncing/errors)
- Displays last sync time
- Shows pending items count
- Allows manual sync trigger

### Console Logging
The services include comprehensive logging:
- Network status changes
- Sync operations
- API calls
- Error handling

### Storage Keys
Data is stored using these keys:
- `sync_queue` - Pending sync operations
- `last_sync_time` - Last successful sync timestamp
- `server_id_map` - Maps local IDs to server IDs
- `auth_token` - Authentication token
- `app_settings` - User settings
- `history` - Transaction history
- `goals` - Savings goals

## Best Practices

### 1. Error Handling
Always handle both online and offline scenarios:

```typescript
try {
  await this.savingsGoalService.addGoal(goal);
  // Success - works both online and offline
} catch (error) {
  // Handle error appropriately
  console.error('Failed to add goal:', error);
}
```

### 2. User Feedback
Show sync status to users:
- Use the SyncStatusComponent
- Show offline indicators
- Display sync progress

### 3. Data Validation
Validate data both client-side and server-side:
- Client validation for immediate feedback
- Server validation for data integrity

### 4. Testing
Test both scenarios:
- Online operation with immediate sync
- Offline operation with queued sync
- Network transitions (online ↔ offline)

## Troubleshooting

### Common Issues

1. **Sync not working**
   - Check network connectivity
   - Verify API base URL
   - Check authentication token
   - Review Laravel CORS settings

2. **Data conflicts**
   - Check server logs
   - Review sync queue items
   - Verify data mapping functions

3. **Performance issues**
   - Monitor sync queue size
   - Check sync frequency settings
   - Review data payload sizes

### Debug Commands

```typescript
// Check sync status
console.log(this.syncService.getSyncStatus());

// Clear sync queue (for testing)
await this.syncService.clearSyncQueue();

// Check network status
console.log(this.networkService.isOnline);

// Check authentication
console.log(this.authService.isAuthenticated);
```

## Security Considerations

1. **Authentication**: All API calls require valid tokens
2. **Data Isolation**: Users can only access their own data
3. **Validation**: Server-side validation prevents invalid data
4. **HTTPS**: Use HTTPS in production
5. **Token Management**: Tokens are stored securely using Capacitor

## Production Deployment

### Frontend (Ionic)
1. Update API base URL to production server
2. Build for production: `ionic build --prod`
3. Deploy to app stores or web hosting

### Backend (Laravel)
1. Configure production database
2. Set up proper CORS for your domain
3. Enable HTTPS
4. Configure proper error logging
5. Set up monitoring for API endpoints

This offline-first synchronization system ensures your savings wallet app works seamlessly both online and offline, providing a great user experience regardless of network conditions.