import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://ecg.codepps.online/api'; // Change this to your Laravel backend URL
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  async getToken(): Promise<string | null> {
    const result = await Preferences.get({ key: this.TOKEN_KEY });
    return result.value;
  }

  async setToken(token: string): Promise<void> {
    await Preferences.set({ key: this.TOKEN_KEY, value: token });
  }

  async removeToken(): Promise<void> {
    await Preferences.remove({ key: this.TOKEN_KEY });
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { headers })
      .pipe(catchError(this.handleError))
      .toPromise() as Promise<ApiResponse<T>>;
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, { headers })
      .pipe(catchError(this.handleError))
      .toPromise() as Promise<ApiResponse<T>>;
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, data, { headers })
      .pipe(catchError(this.handleError))
      .toPromise() as Promise<ApiResponse<T>>;
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${endpoint}`, { headers })
      .pipe(catchError(this.handleError))
      .toPromise() as Promise<ApiResponse<T>>;
  }

  // Authentication endpoints
  async register(userData: any): Promise<ApiResponse> {
    return this.post('/register', userData);
  }

  async login(credentials: any): Promise<ApiResponse> {
    return this.post('/loginUser', credentials);
  }

  async logout(): Promise<ApiResponse> {
    return this.post('/user/logout', {});
  }

  // User endpoints
  async getUserProfile(): Promise<ApiResponse> {
    return this.get('/user/profile');
  }

  async updateUserProfile(data: any): Promise<ApiResponse> {
    return this.put('/user/profile', data);
  }

  async getDashboard(): Promise<ApiResponse> {
    return this.get('/user/dashboard');
  }

  async getHistory(): Promise<ApiResponse> {
    return this.get('/user/history');
  }

  async updateNetIncome(netIncome: number): Promise<ApiResponse> {
    return this.put('/user/net-income', { net_income: netIncome });
  }

  // Savings Goals endpoints
  async getSavingsGoals(): Promise<ApiResponse> {
    return this.get('/savings-goals');
  }

  async createSavingsGoal(goal: any): Promise<ApiResponse> {
    return this.post('/savings-goals', goal);
  }

  async updateSavingsGoal(id: number, goal: any): Promise<ApiResponse> {
    return this.put(`/savings-goals/${id}`, goal);
  }

  async deleteSavingsGoal(id: number): Promise<ApiResponse> {
    return this.delete(`/savings-goals/${id}`);
  }

  async setPrimaryGoal(id: number): Promise<ApiResponse> {
    return this.put(`/savings-goals/${id}/set-primary`, {});
  }

  async getPrimaryGoal(): Promise<ApiResponse> {
    return this.get('/savings-goals/primary');
  }

  // Savings Entries endpoints
  async getSavingsEntries(): Promise<ApiResponse> {
    return this.get('/savings-entries');
  }

  async createSavingsEntry(entry: any): Promise<ApiResponse> {
    return this.post('/savings-entries', entry);
  }

  async updateSavingsEntry(id: number, entry: any): Promise<ApiResponse> {
    return this.put(`/savings-entries/${id}`, entry);
  }

  async deleteSavingsEntry(id: number): Promise<ApiResponse> {
    return this.delete(`/savings-entries/${id}`);
  }

  async getTotalSavings(): Promise<ApiResponse> {
    return this.get('/savings-entries/total-savings');
  }

  // Withdrawal Entries endpoints
  async getWithdrawalEntries(): Promise<ApiResponse> {
    return this.get('/withdrawal-entries');
  }

  async createWithdrawalEntry(entry: any): Promise<ApiResponse> {
    return this.post('/withdrawal-entries', entry);
  }

  async updateWithdrawalEntry(id: number, entry: any): Promise<ApiResponse> {
    return this.put(`/withdrawal-entries/${id}`, entry);
  }

  async deleteWithdrawalEntry(id: number): Promise<ApiResponse> {
    return this.delete(`/withdrawal-entries/${id}`);
  }
}