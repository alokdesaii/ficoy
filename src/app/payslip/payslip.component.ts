import { Component, computed, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { COMPANY, hkdInWords, net, salaryOf, total } from '../payroll';
import { employees } from '../employees';
import { leaveDays, leaves } from '../leaves';

// shared payslip modal (Monthly Payroll Summary + Generate Payslips); mirrors the UAT payslip layout
@Component({
  selector: 'app-payslip',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './payslip.component.html',
  styleUrl: './payslip.component.scss',
})
export class PayslipComponent {
  employee = input.required<string>();
  month = input.required<string>(); // YYYY-MM
  closed = output();

  company = COMPANY; total = total; net = net; words = hkdInWords;
  e = computed(() => employees().find(e => e.name === this.employee()));
  s = computed(() => salaryOf(this.employee()));
  monthDate = computed(() => new Date(this.month() + '-01'));
  days = computed(() => { const d = this.monthDate(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); });

  // approved leave days of a type that fall in this month
  private taken(type: string) {
    return leaves().filter(l => l.employee === this.employee() && l.type === type && (l.status === 'Approved' || l.status === 'Cancel Rejected') && l.from.startsWith(this.month()))
      .reduce((t, l) => t + leaveDays(l.from, l.to, l.session), 0);
  }
  sick = computed(() => this.taken('Sick Leave'));
  lop = computed(() => this.taken('Leave Without Pay (LWP)'));

  // ponytail: browser print → "Save as PDF"; swap for a server PDF if signing is needed
  print() { window.print(); }
}
