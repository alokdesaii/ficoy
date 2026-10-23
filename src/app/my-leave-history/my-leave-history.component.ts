import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CURRENT_USER, Leave, leaveDays, leaves, LEAVE_STATUSES, LEAVE_TYPES, LeaveStatus } from '../leaves';

@Component({
  selector: 'app-my-leave-history',
  imports: [StackTable, FormsModule, DatePipe, RouterLink],
  templateUrl: './my-leave-history.component.html',
  styleUrl: './my-leave-history.component.scss',
})
export class MyLeaveHistoryComponent {
  types = LEAVE_TYPES; statuses = LEAVE_STATUSES;
  today = new Date().toISOString().slice(0, 10);
  days = (l: Leave) => leaveDays(l.from, l.to, l.session);

  from = signal(''); to = signal(''); type = signal(''); status = signal('');
  size = signal(10); page = signal(1);
  toCancel = signal<Leave | null>(null);

  mine = computed(() => leaves().filter(l => l.employee === CURRENT_USER));
  filtered = computed(() => this.mine()
    .filter(l => (!this.from() || l.to >= this.from()) && (!this.to() || l.from <= this.to()) &&
      (!this.type() || l.type === this.type()) && (!this.status() || l.status === this.status()))
    .sort((a, b) => b.from.localeCompare(a.from)));
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  get filtering() { return !!(this.from() || this.to() || this.type() || this.status()); }
  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  clear() { [this.from, this.to, this.type, this.status].forEach(s => s.set('')); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }

  // pending → withdrawn immediately; approved & not yet started → needs HR to approve the cancellation
  canCancel = (l: Leave) => l.status === 'Pending' || (l.status === 'Approved' && l.from > this.today);

  confirmCancel() {
    const l = this.toCancel()!;
    const status: LeaveStatus = l.status === 'Pending' ? 'Pending Cancelled' : 'Cancel Requested';
    // ponytail: POST /leaves/:id/cancel once the endpoint is shared
    leaves.update(list => list.map(x => x.id === l.id ? { ...x, status, history: [{ status, at: new Date().toISOString(), by: CURRENT_USER }, ...x.history] } : x));
    this.toCancel.set(null);
  }
}
