import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'savings-goal',
    loadComponent: () => import('./pages/savings-goal/savings-goal.page').then(m => m.SavingsGoalPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'withdraw',
    loadComponent: () => import('./pages/withdraw/withdraw.page').then(m => m.WithdrawPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing.page').then(m => m.LandingPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount',
    loadComponent: () => import('./pages/received-amount/received-amount-list.page').then(m => m.ReceivedAmountListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount/add',
    loadComponent: () => import('./pages/received-amount/received-amount-form.page').then(m => m.ReceivedAmountFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount/edit/:id',
    loadComponent: () => import('./pages/received-amount/received-amount-form.page').then(m => m.ReceivedAmountFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount/expenses/:receivedAmountId',
    loadComponent: () => import('./pages/received-amount/expense-list.page').then(m => m.ExpenseListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount/expense/add/:receivedAmountId',
    loadComponent: () => import('./pages/received-amount/expense-form.page').then(m => m.ExpenseFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'received-amount/expense/edit/:receivedAmountId/:expenseId',
    loadComponent: () => import('./pages/received-amount/expense-form.page').then(m => m.ExpenseFormPage),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
