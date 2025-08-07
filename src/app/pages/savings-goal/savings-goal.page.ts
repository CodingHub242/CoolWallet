import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SavingsGoal, SavingsGoalService } from '../../services/savings-goal.service';
import { SettingsService } from '../../services/settings.service';
import { SyncService, SavingsGoal as SyncSavingsGoal } from '../../services/sync.service';
import { SyncStatusComponent } from '../../components/sync-status/sync-status.component';

@Component({
  selector: 'app-savings-goal',
  templateUrl: './savings-goal.page.html',
  styleUrls: ['./savings-goal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, SyncStatusComponent]
})
export class SavingsGoalPage implements OnInit {

  goals: SavingsGoal[] = [];
  newGoal: SavingsGoal = { name: '', targetAmount: 0, currentAmount: 0, primary: false };
  profilePicture: string | undefined;

  constructor(
    private savingsGoalService: SavingsGoalService,
    private settingsService: SettingsService,
    private syncService: SyncService
  ) { }

  ngOnInit() {
    this.loadGoals();
    this.loadProfilePicture();
  }

  ionViewWillEnter() {
    this.loadProfilePicture();
  }

  async loadGoals() {
    // Load from savings goal service (which handles API sync automatically)
    this.goals = await this.savingsGoalService.getGoals();
  }

  async addGoal() {
    // Save using savings goal service - it will handle API sync automatically
    await this.savingsGoalService.addGoal(this.newGoal);
    
    this.newGoal = { name: '', targetAmount: 0, currentAmount: 0, primary: false };
    this.loadGoals();
  }

  async deleteGoal(goalName: string) {
    // Delete using savings goal service - it will handle API sync automatically
    await this.savingsGoalService.deleteGoal(goalName);
    this.loadGoals();
  }

  async setPrimary(goalName: string) {
    // Update using savings goal service - it will handle API sync automatically
    await this.savingsGoalService.setPrimaryGoal(goalName);
    this.loadGoals();
  }
  async loadProfilePicture() {
    const settings = await this.settingsService.getSettings();
    this.profilePicture = settings.profilePicture;
  }
}
