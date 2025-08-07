import { TestBed } from '@angular/core/testing';

import { SavingsGoalService } from './savings-goal.service';

describe('SavingsGoalService', () => {
  let service: SavingsGoalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavingsGoalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
