import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface ReceivedAmount {
  id: number;
  user_id: number;
  amount: number;
  date_received: string;
  is_loan: boolean;
  lender?: string;
  loan_status?: 'pending' | 'partially_paid' | 'paid';
  total_expenses?: number;
  remaining_amount?: number;
  expenses?: Expense[];
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;
  received_amount_id: number;
  name: string;
  amount: number;
  date: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceivedAmountService {
  constructor(private apiService: ApiService) {}

  // Received Amounts methods
  async getReceivedAmounts(filters?: { month?: number; year?: number }) {
    return this.apiService.getReceivedAmounts(filters);
  }

  async createReceivedAmount(amountData: any) {
    return this.apiService.createReceivedAmount(amountData);
  }

  async getReceivedAmount(id: number) {
    return this.apiService.getReceivedAmount(id);
  }

  async updateReceivedAmount(id: number, amountData: any) {
    return this.apiService.updateReceivedAmount(id, amountData);
  }

  async deleteReceivedAmount(id: number) {
    return this.apiService.deleteReceivedAmount(id);
  }

  // Expenses methods
  async getExpenses(receivedAmountId: number) {
    return this.apiService.getExpenses(receivedAmountId);
  }

  async createExpense(receivedAmountId: number, expenseData: any) {
    return this.apiService.createExpense(receivedAmountId, expenseData);
  }

  async getExpense(receivedAmountId: number, expenseId: number) {
    return this.apiService.getExpense(receivedAmountId, expenseId);
  }

  async updateExpense(receivedAmountId: number, expenseId: number, expenseData: any) {
    return this.apiService.updateExpense(receivedAmountId, expenseId, expenseData);
  }

  async deleteExpense(receivedAmountId: number, expenseId: number) {
    return this.apiService.deleteExpense(receivedAmountId, expenseId);
  }
}