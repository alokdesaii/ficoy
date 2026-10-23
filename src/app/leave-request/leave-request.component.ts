import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { decideLeave, Leave, leaveDays, leaves, LEAVE_STATUSES } from '../leaves';

@Component({
  selector: 'app-leave-request',
  imports: [StackTable, FormsModule, DatePipe],
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss',
})
export class LeaveRequestComponent {
  statuses = LEAVE_STATUSES;
  days = (l: Leave) => leaveDays(l.from, l.to, l.session);
  search = signal(''); from = signal(''); to = signal(''); status = signal('');
  size = signal(10); page = signal(1);
  open = signal<Leave | null>(null);
  comment = '';

  // leave overlaps the [from, to] filter window
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return leaves()
      .filter(l => (!q || l.employee.toLowerCase().includes(q)) &&
        (!this.from() || l.to >= this.from()) && (!this.to() || l.from <= this.to()) &&
        (!this.status() || l.status === this.status()))
      .sort((a, b) => Number(!this.actionable(a)) - Number(!this.actionable(b)) || b.from.localeCompare(a.from)); // actionable first
  });
  pendingCount = computed(() => leaves().filter(l => l.status === 'Pending' || l.status === 'Cancel Requested').length);
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  get filtering() { return !!(this.search() || this.from() || this.to() || this.status()); }
  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  clear() { [this.search, this.from, this.to, this.status].forEach(s => s.set('')); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }
  actionable = (l: Leave) => l.status === 'Pending' || l.status === 'Cancel Requested';

  view(l: Leave) { this.open.set(l); this.comment = l.adminComment; }
  // ponytail: PATCH /leaves/:id once the endpoint is shared
  act(approve: boolean) { decideLeave(this.open()!, approve, this.comment.trim()); this.open.set(null); }
  // ponytail: documents are mock names; preview/download wire up to the file API
  doc(l: Leave, mode: 'preview' | 'download') { alert(`${mode === 'preview' ? 'Preview' : 'Download'}: ${l.document} (available once the file API is connected)`); }
}
