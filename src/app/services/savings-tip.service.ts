import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SavingsTipService {

  private tips = [
    "Automate your savings. Set up automatic transfers to your savings account each payday.",
    "Create a budget and stick to it. Tracking your spending is the first step to saving more.",
    "Cancel unused subscriptions. Every little bit counts!",
    "Pack your own lunch instead of buying it. You'll be surprised how much you save.",
    "Brew your own coffee at home. That daily latte adds up!",
    "Look for generic brands instead of name brands. The quality is often just as good for a lower price.",
    "Set a savings goal. Having a target to work towards can be a great motivator.",
    "Use the 30-day rule. If you want to make a non-essential purchase, wait 30 days. You may find you no longer want it.",
    "Unsubscribe from marketing emails to reduce temptation.",
    "Find free ways to have fun. Look for free events in your community, or enjoy outdoor activities."
  ];

  constructor() { }

  getTip(netIncome: number, amountSaved: number): string {
    const savingsPercentage = (amountSaved / netIncome) * 100;

    if (savingsPercentage > 20) {
      return "You're saving over 20% of your income! That's fantastic! Keep up the great work.";
    } else if (savingsPercentage > 10) {
      return "You're doing a great job saving. To save even more, try to identify one or two areas where you can cut back.";
    } else if (savingsPercentage > 0) {
      return "It's great that you're saving. A good goal to aim for is saving at least 10% of your income.";
    } else {
      return this.getRandomTip();
    }
  }

  getRandomTip(): string {
    const randomIndex = Math.floor(Math.random() * this.tips.length);
    return this.tips[randomIndex];
  }
}
