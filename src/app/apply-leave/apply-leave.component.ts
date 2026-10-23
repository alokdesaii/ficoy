import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { balance, CREDIT_TYPES, CURRENT_USER, leaveDays, leaves, overlaps, Session } from '../leaves';

@Component({
  selector: 'app-apply-leave',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './apply-leave.component.html',
  styleUrl: './apply-leave.component.scss',
})
export class ApplyLeaveComponent {
  types = CREDIT_TYPES.map(t => ({ name: t, left: () => balance(CURRENT_USER, t) }));
  today = new Date().toISOString().slice(0, 10);

  type = signal(''); session = signal<Session | ''>(''); from = signal(''); to = signal('');
  reason = ''; file = ''; tried = signal(false); done = signal<{ days: number; type: string } | null>(null);

  half = computed(() => this.session() === 'First Half' || this.session() === 'Second Half');
  sick = computed(() => this.type() === 'Sick Leave');
  left = computed(() => this.type() ? balance(CURRENT_USER, this.type()) : 0);
  days = computed(() => this.from() && this.to() && this.session() && this.to() >= this.from() ? leaveDays(this.from(), this.to(), this.session() as Session) : 0);
  clash = computed(() => this.from() && this.to() ? overlaps(CURRENT_USER, this.from(), this.to()) : undefined);

  error = computed(() => {
    if (!this.type() || !this.session() || !this.from() || !this.to()) return 'Fill in all required fields';
    if (this.to() < this.from()) return 'To date must be on or after the from date';
    if (!this.days()) return 'The selected range has no working days';
    if (this.days() > this.left()) return `Only ${this.left()} day(s) of ${this.type()} available`;
    if (this.clash()) return 'You already have leave in this period';
    if (this.sick() && !this.file) return 'Upload a medical certificate for sick leave';
    return '';
  });

  setFrom(v: string) { this.from.set(v); if (this.half() || (this.to() && this.to() < v)) this.to.set(v); }
  setSession(v: Session | '') { this.session.set(v); if (this.half() && this.from()) this.to.set(this.from()); }
  pick(input: HTMLInputElement) {
    const f = input.files?.[0];
    this.file = f && f.size <= 5 * 1024 * 1024 ? f.name : '';
    if (f && !this.file) alert('File must be 5MB or smaller');
  }

  submit() {
    this.tried.set(true);
    if (this.error()) return;
    // ponytail: POST /leaves once the endpoint is shared
    leaves.update(list => [...list, {
      id: Math.max(0, ...list.map(l => l.id)) + 1, employee: CURRENT_USER, type: this.type(), session: this.session() as Session,
      from: this.from(), to: this.to(), reason: this.reason.trim(), document: this.file, status: 'Pending',
      adminComment: '', requestedOn: this.today, history: [],
    }]);
    this.done.set({ days: this.days(), type: this.type() });
    this.reset();
  }
  reset() { this.type.set(''); this.session.set(''); this.from.set(''); this.to.set(''); this.reason = ''; this.file = ''; this.tried.set(false); }
}
