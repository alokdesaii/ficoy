import { Component, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BackdatedRow, dailyWage, lwpDays, lwpDeduction, uploads } from '../backdated';
import { employees } from '../employees';
import { exportCsv } from '../csv';

interface Item { key: string; uploadId: number; row: BackdatedRow; createdOn: string; name: string; }

@Component({
  selector: 'app-backdated-uploaded',
  imports: [FormsModule, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './backdated-uploaded.component.html',
  styleUrl: './backdated-uploaded.component.scss',
})
export class BackdatedUploadedComponent {
  daily = dailyWage; lwp = lwpDays; lwpAmt = lwpDeduction;
  search = signal(''); size = signal(25); page = signal(1);
  toDelete = signal<Item | null>(null);

  items = computed<Item[]>(() => uploads().flatMap(u => u.rows.map((row, i) => ({
    key: `${u.id}-${i}`, uploadId: u.id, row, createdOn: u.uploadedAt,
    name: employees().find(e => e.code === row.employeeId)?.name ?? row.employeeId,
  }))));
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.items().filter(i => !q || i.name.toLowerCase().includes(q) || i.row.employeeId.includes(q) || i.row.period.toLowerCase().includes(q));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }

  // ponytail: DELETE /payroll/backdated/:id once the endpoint is shared
  confirmDelete() {
    const it = this.toDelete()!;
    uploads.update(list => list.map(u => u.id !== it.uploadId ? u : { ...u, rows: u.rows.filter(r => r !== it.row) }).filter(u => u.rows.length));
    this.toDelete.set(null); this.go(this.page());
  }

  export() {
    exportCsv('backdated-payroll', ['Employee', 'Employee Id', 'Period', 'Gross Salary', 'No. of Days', 'Days Worked', 'Sick Leave', 'Leave Without Pay', 'Average Daily Wage', 'LWP Deduction', 'Total Salary', 'Created On'],
      this.filtered().map(i => [i.name, i.row.employeeId, i.row.period, i.row.gross, i.row.days, i.row.worked, 0, lwpDays(i.row), dailyWage(i.row).toFixed(2), lwpDeduction(i.row).toFixed(2), i.row.total, i.createdOn.slice(0, 10)]));
  }
}
