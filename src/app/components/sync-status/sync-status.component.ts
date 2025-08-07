import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { SyncService, SyncStatus } from '../../services/sync.service';
import { Subscription } from 'rxjs';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'app-sync-status',
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.scss']
})
export class SyncStatusComponent implements OnInit, OnDestroy {
  syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingChanges: 0,
    syncing: false
  };

  private syncSubscription?: Subscription;

  constructor(private syncService: SyncService) {}

  ngOnInit() {
    this.syncSubscription = this.syncService.syncStatus$.subscribe(
      status => this.syncStatus = status
    );
  }

  ngOnDestroy() {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }

  async forceSync() {
    await this.syncService.forceSync();
  }

  getStatusColor(): string {
    if (!this.syncStatus.isOnline) return 'danger';
    if (this.syncStatus.syncing) return 'warning';
    if (this.syncStatus.pendingChanges > 0) return 'warning';
    return 'success';
  }

  getStatusText(): string {
    if (!this.syncStatus.isOnline) return 'Offline';
    if (this.syncStatus.syncing) return 'Syncing...';
    if (this.syncStatus.pendingChanges > 0) return `${this.syncStatus.pendingChanges} pending`;
    return 'Synced';
  }

  getLastSyncText(): string {
    if (!this.syncStatus.lastSync) return 'Never';
    
    const now = new Date();
    const lastSync = new Date(this.syncStatus.lastSync);
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}