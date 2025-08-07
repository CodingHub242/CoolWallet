import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SavingsGoalPage } from './savings-goal.page';

describe('SavingsGoalPage', () => {
  let component: SavingsGoalPage;
  let fixture: ComponentFixture<SavingsGoalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SavingsGoalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
