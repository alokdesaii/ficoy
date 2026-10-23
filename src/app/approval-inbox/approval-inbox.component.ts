import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CURRENT_USER, decideLeave, Leave, leaveDays, leaves, LEAVE_TYPES } from '../leaves';
import { employees } from '../employees';
import { departments } from '../departments';

@Component({
  selector: 'app-approval-inbox',
  imports: [StackTable, FormsModule, DatePipe],
  templateUrl: './approval-inbox.component.html',
  styleUrl: './approval-inbox.component.scss',
})
export class ApprovalInboxComponent {
  types = LEAVE_TYPES;
  departments = departments;
  days = (l: Leave) => leaveDays(l.from, l.to, l.session);
  dept = (name: string) => employees().find(e => e.name === name)?.department ?? '—';

  search = signal(''); department = signal(''); type = signal(''); from = signal(''); to = signal('');
  open = signal<Leave | null>(null);
  comment = '';
  done = signal(0);

  // direct reports' requests that need this manager's action
  private reports = computed(() => new Set(employees().filter(e => e.manager === CURRENT_USER).map(e => e.name)));
  inbox = computed(() => leaves().filter(l => this.reports().has(l.employee) && (l.status === 'Pending' || l.status === 'Cancel Requested')));
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.inbox()
      .filter(l => (!q || l.employee.toLowerCase().includes(q)) && (!this.department() || this.dept(l.employee) === this.department()) &&
        (!this.type() || l.type === this.type()) && (!this.from() || l.to >= this.from()) && (!this.to() || l.from <= this.to()))
      .sort((a, b) => a.from.localeCompare(b.from)); // soonest first
  });

  get filtering() { return !!(this.search() || this.department() || this.type() || this.from() || this.to()); }
  clear() { [this.search, this.department, this.type, this.from, this.to].forEach(s => s.set('')); }

  view(l: Leave) { this.open.set(l); this.comment = ''; }
  // ponytail: PATCH /leaves/:id once the endpoint is shared
  act(l: Leave, approve: boolean, comment = '') { decideLeave(l, approve, comment.trim(), CURRENT_USER); this.done.update(n => n + 1); this.open.set(null); }
}
