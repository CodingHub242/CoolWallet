import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { DataService } from '../../services/data.service';
import { SavingsGoal, SavingsGoalService } from '../../services/savings-goal.service';
import { NotificationService } from '../../services/notification.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-withdraw',
  templateUrl: './withdraw.page.html',
  styleUrls: ['./withdraw.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class WithdrawPage implements OnInit {

  amountToWithdraw: number | undefined;
  totalSavings = 0;
  savingsGoals: SavingsGoal[] = [];
  selectedGoal: string = 'general';
  profilePicture: string | undefined;

  constructor(
    private dataService: DataService,
    private savingsGoalService: SavingsGoalService,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
    this.loadProfilePicture();
  }

  async ionViewWillEnter() {
    this.totalSavings = await this.dataService.getTotalSavings();
    this.savingsGoals = await this.savingsGoalService.getGoals();
    this.loadProfilePicture();
  }

  async withdraw() {
    if (this.amountToWithdraw && this.amountToWithdraw > 0 && this.amountToWithdraw <= this.getAvailableBalance()) {
      await this.dataService.addHistoryEntry({
        type: 'withdrawal',
        amountWithdrawn: this.amountToWithdraw,
        date: new Date().toISOString(),
        goalName: this.selectedGoal === 'general' ? undefined : this.selectedGoal,
        id: Date.now()
      });

      if (this.selectedGoal !== 'general') {
        const goal = this.savingsGoals.find(g => g.name === this.selectedGoal);
        if (goal) {
          goal.currentAmount -= this.amountToWithdraw;
          await this.savingsGoalService.updateGoal(goal);
        }
      }

      this.notificationService.speak(`You have withdrawn ${this.amountToWithdraw} cedis.`);
      this.navCtrl.back();
    } else {
      // TODO: show an alert for the error
    }
  }

  getAvailableBalance(): number {
    if (this.selectedGoal === 'general') {
      return this.totalSavings;
    }

    const goal = this.savingsGoals.find(g => g.name === this.selectedGoal);
    return goal ? goal.currentAmount : 0;
  }
  async loadProfilePicture() {
    const settings = await this.settingsService.getSettings();
    this.profilePicture = settings.profilePicture;
  }
}