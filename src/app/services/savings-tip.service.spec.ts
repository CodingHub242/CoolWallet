import { TestBed } from '@angular/core/testing';

import { SavingsTipService } from './savings-tip.service';

describe('SavingsTipService', () => {
  let service: SavingsTipService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavingsTipService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
