import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Leave, leaveDays, leaves, LEAVE_TYPES, LEAVE_STATUSES } from '../leaves';
import { exportCsv } from '../csv';

@Component({
  selector: 'app-leave-history',
  imports: [FormsModule, DatePipe],
  templateUrl: './leave-history.component.html',
  styleUrl: './leave-history.component.scss',
})
export class LeaveHistoryComponent {
  statuses = LEAVE_STATUSES;
  types = LEAVE_TYPES;
  days = (l: Leave) => leaveDays(l.from, l.to, l.session);
  decidedBy = (l: Leave) => l.status === 'Pending' || l.status === 'Cancel Requested' ? '' : l.history[0]?.by ?? '';

  search = signal(''); from = signal(''); to = signal(''); type = signal(''); status = signal('');
  size = signal(10); page = signal(1);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return leaves()
      .filter(l => (!q || l.employee.toLowerCase().includes(q)) &&
        (!this.from() || l.to >= this.from()) && (!this.to() || l.from <= this.to()) &&
        (!this.type() || l.type === this.type()) && (!this.status() || l.status === this.status()))
      .sort((a, b) => b.from.localeCompare(a.from));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  get filtering() { return !!(this.search() || this.from() || this.to() || this.type() || this.status()); }
  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  clear() { [this.search, this.from, this.to, this.type, this.status].forEach(s => s.set('')); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }

  // ponytail: documents are mock names; preview wires up to the file API
  preview(l: Leave) { alert(`Preview: ${l.document} (available once the file API is connected)`); }

  export() {
    exportCsv('leave-history', ['Employee Name', 'Leave Type', 'Session', 'From', 'To', 'Days', 'Status', 'Decision Maker', 'Comment', 'Requested On'],
      this.filtered().map(l => [l.employee, l.type, l.session, l.from, l.to, this.days(l), l.status, this.decidedBy(l), l.adminComment, l.requestedOn]));
  }
}
