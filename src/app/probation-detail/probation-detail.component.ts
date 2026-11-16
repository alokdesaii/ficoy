import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { addDays, assignToHod, closeOnExit, INITIAL_MEETING_DAYS, setInitialMeeting, deliveryFailed, EVENTS, hodOf, log, reopen, reviewerOf, milestones, Milestone, probationLog, probations, probationSettings, Role, timeline } from '../probation';
import { employees } from '../employees';
import { CURRENT_USER, leaves } from '../leaves';

type Tab = 'timeline' | 'notifications' | 'audit';

@Component({
  selector: 'app-probation-detail',
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './probation-detail.component.html',
  styleUrl: './probation-detail.component.scss',
})
export class ProbationDetailComponent {
  today = new Date().toISOString().slice(0, 10);
  code = inject(ActivatedRoute).snapshot.paramMap.get('code');
  s = probationSettings;
  tab = signal<Tab>('timeline');

  e = computed(() => employees().find(x => x.code === this.code));
  p = computed(() => probations().find(x => x.employee === this.e()?.name));
  t = computed(() => this.p() && this.e() ? timeline(this.p()!, this.e()!.joined, leaves(), this.s(), this.today) : null);
  ms = computed(() => this.p() && this.t() ? milestones(this.p()!, this.t()!, this.s(), this.today) : []);
  next = computed(() => this.ms().find(m => !m.done));
  closed = computed(() => !!this.p()?.outcome);
  reviewer = computed(() => this.p() ? reviewerOf(this.p()!) : '');
  hod = computed(() => this.e() ? hodOf(this.e()!.name) : '');
  canHandToHod = computed(() => !!this.hod() && !this.p()?.reviewer && this.hod() !== this.e()?.manager && this.hod() !== this.e()?.name);

  // HR actions: hand to HOD (RM unavailable), close on exit, reopen a decision
  action = signal<'hod' | 'exit' | 'reopen' | 'initial' | null>(null);
  actReason = ''; actDate = ''; actTried = false; objectives = ''; development = '';
  ask(a: 'hod' | 'exit' | 'reopen' | 'initial') { this.actReason = ''; this.actDate = this.today; this.actTried = false; this.objectives = ''; this.development = ''; this.action.set(a); }
  meetingDue = computed(() => this.t() ? addDays(this.t()!.start, INITIAL_MEETING_DAYS - 1) : '');
  act() {
    this.actTried = true;
    const a = this.action(), why = this.actReason.trim(), name = this.e()!.name;
    if (a === 'initial') {
      if (!this.objectives.trim() || !this.development.trim() || !this.actDate) return;
      setInitialMeeting(name, { objectives: this.objectives.trim(), development: this.development.trim(), on: this.actDate, by: this.reviewer() || CURRENT_USER });
      return this.action.set(null);
    }
    if (!why || (a === 'exit' && !this.actDate)) return;
    if (a === 'hod') assignToHod(name, CURRENT_USER, why);
    else if (a === 'exit') closeOnExit(name, CURRENT_USER, this.actDate, why);
    else reopen(name, CURRENT_USER, why);
    this.action.set(null);
  }

  // notifications = milestones that fire an event and have happened
  label = (k: string) => EVENTS.find(e => e.key === k)?.label ?? k;
  who(r: Role) { const e = this.e()!; return r === 'Employee' ? e.name : r === 'RM' ? (this.reviewer() || 'No RM') : r === 'HOD' ? (this.hod() || 'No HOD') : r === 'HR' ? 'HR Team' : 'Payroll Team'; }
  sent = computed(() => this.ms().filter(m => m.event && m.done && this.s().recipients[m.event].length).map(m => ({ m, failed: deliveryFailed(this.p()!, m),
    to: this.s().recipients[m.event!].filter(r => r !== 'HOD' || (this.hod() && this.hod() !== this.reviewer())) })).reverse());   // HOD only when different from the RM
  channels = computed(() => [this.s().channels.inApp && 'In-app', this.s().channels.email && 'Email'].filter(Boolean).join(' + ') || 'No channel');

  audit = computed(() => {
    const name = this.e()?.name;
    const system = this.ms().filter(m => m.done).map(m => ({ at: m.date, by: m.kind === 'submitted' ? this.e()!.manager : m.kind === 'outcome' || m.kind === 'extension' ? 'HR' : 'System', action: m.label }));
    const manual = probationLog().filter(l => l.employee === name).map(l => ({ at: l.at, by: l.by, action: l.action }));
    return [...manual, ...system].sort((a, b) => b.at.localeCompare(a.at));
  });

  resent = signal<string | null>(null);
  // ponytail: POST /notifications/:id/resend once the endpoint is shared
  resend(m: Milestone) {
    log(this.e()!.name, CURRENT_USER, `Resent "${this.label(m.event!)}" notification`);
    this.resent.set(m.date + m.label); setTimeout(() => this.resent.set(null), 2500);
  }
  remind() { log(this.e()!.name, CURRENT_USER, `Sent a manual review reminder to ${this.reviewer() || 'the RM'}`); this.resent.set('remind'); setTimeout(() => this.resent.set(null), 2500); }

  icon(k: Milestone['kind']) {
    return { start: 'fa-solid fa-flag', meeting: 'fa-solid fa-handshake', reminder: 'fa-regular fa-bell', review: 'fa-regular fa-clipboard', submitted: 'fa-solid fa-check', leave: 'fa-regular fa-calendar-minus', end: 'fa-solid fa-flag-checkered', extension: 'fa-solid fa-route', outcome: 'fa-solid fa-gavel' }[k];
  }
  initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  left(n: number) { return n === 0 ? 'Ends today' : n > 0 ? `${n} days left` : `${-n} days overdue`; }
}
