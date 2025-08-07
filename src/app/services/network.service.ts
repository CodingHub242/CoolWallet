import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    // Set initial status
    this.isOnlineSubject.next(navigator.onLine);

    // Listen for network changes
    window.addEventListener('online', () => {
      console.log('Network status changed: online');
      this.isOnlineSubject.next(true);
    });

    window.addEventListener('offline', () => {
      console.log('Network status changed: offline');
      this.isOnlineSubject.next(false);
    });
  }

  get isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  async getCurrentStatus(): Promise<boolean> {
    return navigator.onLine;
  }
}