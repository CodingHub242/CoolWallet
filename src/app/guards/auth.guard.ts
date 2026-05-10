import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // If auth is already initialized, check immediately
    if (this.authService.authInitialized) {
      return this.checkAuth(state);
    }
    
    // Wait for auth to initialize, then check
    return this.authService.authInitialized$.pipe(
      take(1),
      map(() => true),
      map(() => this.checkAuth(state))
    );
  }
  
  private checkAuth(state: RouterStateSnapshot): boolean | UrlTree {
    if (this.authService.isAuthenticated) {
      return true;
    } else {
      // Store the URL attempting to access for redirect after login
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }
  }
}
