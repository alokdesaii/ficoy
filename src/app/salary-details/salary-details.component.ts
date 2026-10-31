import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { findEmployee } from '../employees';
import { addRevision, currentRevision } from '../salary';

interface Line { type: string; amount: number | null; }
const sum = (lines: Line[]) => lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);

@Component({
  selector: 'app-salary-details',
  imports: [FormsModule, RouterLink, DecimalPipe, NgTemplateOutlet],
  templateUrl: './salary-details.component.html',
  styleUrl: './salary-details.component.scss',
})
export class SalaryDetailsComponent {
  private router = inject(Router);
  e = findEmployee(inject(ActivatedRoute).snapshot.paramMap.get('code'));

  // ponytail: UAT earning-type list is empty; these stand in until the master-data API is shared
  earningTypes = ['House Rent Allowance', 'Transport Allowance', 'Meal Allowance', 'Bonus', 'Other Earnings'];
  deductionTypes = ['Other Deductions'];

  private cur = currentRevision(this.e?.code);
  effective = signal(new Date().toISOString().slice(0, 10));
  basic = signal<number | null>(this.cur?.basic ?? null);
  earnings = signal<Line[]>(this.cur?.earnings.map(l => ({ ...l })) ?? []);
  deductions = signal<Line[]>(this.cur?.deductions.map(l => ({ ...l })) ?? []);
  mpfEligible = signal(false);
  mpfStart = signal('');
  submitted = signal(false);

  totalEarnings = computed(() => (Number(this.basic()) || 0) + sum(this.earnings()));
  totalDeductions = computed(() => sum(this.deductions()));

  add(list: typeof this.earnings) { list.update(l => [...l, { type: '', amount: null }]); }
  remove(list: typeof this.earnings, i: number) { list.update(l => l.filter((_, j) => j !== i)); }
  touch(list: typeof this.earnings) { list.update(l => [...l]); } // recompute totals after ngModel edits

  // a type can be picked once per list
  taken(lines: Line[], i: number) { return new Set(lines.filter((_, j) => j !== i).map(l => l.type)); }

  get invalid() {
    const badLine = (l: Line) => !l.type || l.amount === null || l.amount < 0;
    return !this.basic() || !this.effective() || this.earnings().some(badLine) || this.deductions().some(badLine) || (this.mpfEligible() && !this.mpfStart());
  }

  save() {
    this.submitted.set(true);
    if (this.invalid) return;
    // ponytail: MPF flags stay local until the salary-revisions endpoint is shared
    addRevision({ code: this.e!.code, effective: this.effective(), basic: Number(this.basic()), earnings: this.earnings(), deductions: this.deductions() });
    this.router.navigate(['/employeeview', this.e?.code]);
  }
}
