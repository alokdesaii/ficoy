import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generated, Line, mpf, net, processedMonths, Salary, salaries, saveSalary, total } from '../payroll';
import { employees } from '../employees';
import { CURRENT_USER } from '../leaves';
import { exportCsv } from '../csv';
import { PayslipComponent } from '../payslip/payslip.component';

@Component({
  selector: 'app-monthly-payroll',
  imports: [StackTable, FormsModule, DatePipe, DecimalPipe, PayslipComponent],
  templateUrl: './monthly-payroll.component.html',
  styleUrl: './monthly-payroll.component.scss',
})
export class MonthlyPayrollComponent {
  total = total; net = net; me = CURRENT_USER;
  dept = (name: string) => employees().find(e => e.name === name)?.department ?? '—';
  thisMonth = new Date().toISOString().slice(0, 7);

  rows = salaries;
  totals = computed(() => ({ earn: this.rows().reduce((t, s) => t + total(s.earnings), 0), ded: this.rows().reduce((t, s) => t + total(s.deductions), 0) }));

  // my payslips by year
  years = computed(() => [...new Set(processedMonths().map(m => +m.slice(0, 4)))].concat(new Date().getFullYear()).filter((y, i, a) => a.indexOf(y) === i).sort());
  year = signal(new Date().getFullYear());
  myMonths = computed(() => [...new Set([...processedMonths(), ...Object.keys(generated()).filter(m => generated()[m].includes(CURRENT_USER))])]
    .filter(m => m.startsWith(String(this.year()))).sort().reverse());
  mine = computed(() => salaries().find(s => s.employee === CURRENT_USER));
  slip = signal<string | null>(null);

  // edit modal works on a copy so Cancel discards
  draft = signal<Salary | null>(null);
  tried = false;
  edit(s: Salary) { this.tried = false; this.draft.set(structuredClone(s)); }
  addLine(list: Line[]) { list.push({ label: '', amount: 0 }); }
  removeLine(list: Line[], i: number) { list.splice(i, 1); }
  autoMpf(d: Salary) {
    const m = d.deductions.find(l => l.label === 'Mandatory Provident Fund');
    if (m) m.amount = mpf(total(d.earnings));
  }
  invalid(d: Salary) { return [...d.earnings, ...d.deductions].some(l => !l.label.trim() || l.amount === null || l.amount < 0) || net(d) < 0; }
  save() {
    const d = this.draft()!; this.tried = true;
    if (this.invalid(d)) return;
    // ponytail: PUT /payroll/:employee once the endpoint is shared
    saveSalary(d); this.draft.set(null);
  }

  export() {
    exportCsv(`payroll-${this.thisMonth}`, ['Employee', 'Department', 'Earnings', 'Deductions', 'Net Salary'],
      this.rows().map(s => [s.employee, this.dept(s.employee), total(s.earnings).toFixed(2), total(s.deductions).toFixed(2), net(s).toFixed(2)]));
  }
}
