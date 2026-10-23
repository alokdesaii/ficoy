import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceRow, attendance, hours, regularizations } from '../attendance';
import { employees } from '../employees';
import { exportCsv } from '../csv';

@Component({
  selector: 'app-attendance-history',
  imports: [StackTable, FormsModule, DatePipe],
  templateUrl: './attendance-history.component.html',
  styleUrl: './attendance-history.component.scss',
})
export class AttendanceHistoryComponent {
  hours = hours;
  names = computed(() => employees().map(e => e.name).sort());

  from = signal(''); to = signal(''); employee = signal(''); status = signal(''); punctuality = signal('');
  size = signal(10); page = signal(1);

  filtered = computed(() => attendance()
    .filter(r =>
      (!this.from() || r.date >= this.from()) && (!this.to() || r.date <= this.to()) &&
      (!this.employee() || r.employee === this.employee()) &&
      (!this.status() || r.status === this.status()) &&
      (!this.punctuality() || r.punctuality === this.punctuality()))
    .sort((a, b) => b.date.localeCompare(a.date) || a.employee.localeCompare(b.employee)));
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  get filtering() { return !!(this.from() || this.to() || this.employee() || this.status() || this.punctuality()); }
  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  clear() { [this.from, this.to, this.employee, this.status, this.punctuality].forEach(s => s.set('')); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }

  // regularization modal
  // ponytail: quota is a mock; the real one comes from the regularization API
  remaining = signal(4);
  reg = signal<AttendanceRow | null>(null);
  form = { date: '', in: '', out: '', note: '', file: '' };
  tried = false;
  open(r: AttendanceRow) { this.reg.set(r); this.tried = false; this.form = { date: r.date, in: r.checkIn, out: r.checkOut, note: '', file: '' }; }
  submit() {
    this.tried = true;
    if (!this.form.date || !this.form.note.trim() || (this.form.in && this.form.out && this.form.out <= this.form.in)) return;
    // ponytail: POST /attendance/regularization once the endpoint is shared
    const r = this.reg()!;
    regularizations.update(list => [...list, {
      id: Math.max(0, ...list.map(x => x.id)) + 1, date: this.form.date, employee: r.employee,
      checkIn: this.form.in, checkOut: this.form.out, note: this.form.note.trim(), file: this.form.file, status: 'Pending', adminComment: '',
    }]);
    this.remaining.update(n => n - 1);
    this.reg.set(null);
  }
  pick(input: HTMLInputElement) {
    const f = input.files?.[0];
    this.form.file = f && f.size <= 5 * 1024 * 1024 ? f.name : '';
    if (f && !this.form.file) alert('File must be 5MB or smaller');
  }

  export() {
    exportCsv('attendance', ['Date', 'Employee Name', 'Check-In', 'Check-Out', 'Total Hours', 'Status', 'Punctuality', 'Remarks'],
      this.filtered().map(r => [r.date, r.employee, r.checkIn, r.checkOut, hours(r), r.status, r.punctuality, r.remarks]));
  }

}
