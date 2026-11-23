import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { addDays, approve, Approver, chainFor, nextApprover, sendBack, takeOver, setApplicable, setHrRecord, viewRole, actor, closeOnExit, setDuration, INITIAL_MEETING_DAYS, setInitialMeeting, deliveryFailed, EVENTS, hodOf, log, reopen, reviewerOf, milestones, Milestone, probationLog, probations, probationSettings, Role, timeline } from '../probation';
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
  t = computed(() => this.p() && this.e() ? timeline(this.p()!, this.e()!.joined, this.s(), this.today) : null);
  ms = computed(() => this.p() && this.t() ? milestones(this.p()!, this.t()!, this.s(), this.today) : []);
  next = computed(() => this.ms().find(m => !m.done));
  closed = computed(() => !!this.p()?.outcome);
  reviewer = computed(() => this.p() ? reviewerOf(this.p()!) : '');
  hod = computed(() => this.e() ? hodOf(this.e()!.name) : '');
  canHandToHod = computed(() => !!this.hod() && !this.p()?.reviewer && this.hod() !== this.e()?.manager && this.hod() !== this.e()?.name);

  // HR actions: hand to HOD (RM unavailable), close on exit, reopen a decision
  action = signal<'hod' | 'exit' | 'reopen' | 'initial' | 'back' | 'duration' | 'admin' | 'applicable' | 'hr' | null>(null);
  held: 'Yes' | 'No' = 'Yes'; recvBy = ''; issuedOn = ''; actMonths = 0; actReason = ''; actDate = ''; actTried = false; objectives = ''; development = '';
  ask(a: 'hod' | 'exit' | 'reopen' | 'initial' | 'back' | 'duration' | 'admin' | 'applicable' | 'hr') { this.actMonths = a === 'duration' ? this.t()!.months : 0; this.held = 'Yes'; const h = this.p()?.hr; this.recvBy = h?.receivedBy ?? actor(); this.issuedOn = h?.issuedOn ?? ''; this.actReason = ''; this.actDate = this.today; this.actTried = false; this.objectives = ''; this.development = ''; this.action.set(a); }
  meetingDue = computed(() => this.t() ? addDays(this.t()!.start, INITIAL_MEETING_DAYS - 1) : '');
  act() {
    this.actTried = true;
    const a = this.action(), why = this.actReason.trim(), name = this.e()!.name;
    if (a === 'initial') {
      if (!this.actDate || (this.held === 'Yes' && (!this.objectives.trim() || !this.development.trim()))) return;
      setInitialMeeting(name, { held: this.held, objectives: this.objectives.trim(), development: this.development.trim(), on: this.actDate, by: actor() });
      return this.action.set(null);
    }
    if (a === 'hr') { if (!this.recvBy.trim() || !this.actDate) return; setHrRecord(name, actor(), { receivedBy: this.recvBy.trim(), receivedOn: this.actDate, issuedOn: this.issuedOn || undefined }); return this.action.set(null); }
    if (!why || (a === 'exit' && !this.actDate)) return;
    if (a === 'hod' || a === 'admin') takeOver(name, actor(), a === 'hod' ? 'HOD' : 'Admin', why);
    else if (a === 'applicable') setApplicable(name, actor(), !this.t()!.applicable, why);
    else if (a === 'exit') closeOnExit(name, CURRENT_USER, this.actDate, why);
    else if (a === 'duration') setDuration(name, actor(), this.actMonths, why);
    else if (a === 'back') sendBack(name, actor(), why);
    else reopen(name, actor(), why, this.actMonths || undefined);   // final list: HR reopens / corrects
    this.action.set(null);
  }

  // approval chain (HR Q37): RM submits → HOD (when different) → Admin
  // ponytail: mock user approves as whoever is next; with real login only that HOD / Admin sees the buttons
  chain = computed(() => this.e() ? chainFor(this.e()!.name) : []);
  approvedBy = (r: Approver) => this.p()?.pending?.approved.find(a => a.role === r);
  approveLabel = computed(() => { const p = this.p(); if (!p?.pending) return ''; const n = nextApprover(p); return n === p.pending.chain.at(-1) ? `Approve as ${n} & Issue Letter` : `Approve as ${n} & Send to Admin`; });
  approveNow() { approve(this.e()!.name, actor(), this.today); }
  // role-based action items (final list §3); everything else is view-only
  role = viewRole;
  isAdmin = computed(() => viewRole() === 'Admin');
  canApprove = computed(() => { const p = this.p(); const n = p ? nextApprover(p) : undefined; return !!n && (viewRole() === 'Admin' || (viewRole() === 'HOD' && n === 'HOD')); });
  canReview = computed(() => viewRole() === 'Admin' || (viewRole() === 'RM' && this.reviewer() === actor()) || (viewRole() === 'HOD' && this.p()?.reviewer === actor()));

  // notifications = milestones that fire an event and have happened
  label = (k: string) => EVENTS.find(e => e.key === k)?.label ?? k;
  who(r: Role) { const e = this.e()!; return r === 'Employee' ? e.name : r === 'RM' ? (this.reviewer() || 'No RM') : r === 'HOD' ? (this.hod() || 'No HOD') : r === 'HR' ? 'HR Team' : 'Payroll Team'; }
  sent = computed(() => this.ms().filter(m => m.event && m.done && this.s().recipients[m.event].length).map(m => ({ m, failed: deliveryFailed(this.p()!, m),
    to: this.s().recipients[m.event!].filter(r => r !== 'HOD' || (this.hod() && this.hod() !== this.reviewer())) })).reverse());   // HOD only when different from the RM
  channels = computed(() => [this.s().channels.inApp && 'In-app', this.s().channels.email && 'Email'].filter(Boolean).join(' + ') || 'No channel');

  audit = computed(() => {
    const name = this.e()?.name;
    const system = this.ms().filter(m => m.done).map(m => ({ at: m.date, by: m.kind === 'submitted' ? this.e()!.manager : m.kind === 'outcome' || m.kind === 'extension' ? 'Admin' : m.kind === 'approval' ? 'Approver' : 'System', action: m.label }));
    const manual = probationLog().filter(l => l.employee === name).map(l => ({ at: l.at, by: l.by, action: l.action }));
    return [...manual, ...system].sort((a, b) => b.at.localeCompare(a.at));
  });

  resent = signal<string | null>(null);
  // ponytail: POST /notifications/:id/resend once the endpoint is shared
  resend(m: Milestone) {
    log(this.e()!.name, actor(), `Resent "${this.label(m.event!)}" notification`);
    this.resent.set(m.date + m.label); setTimeout(() => this.resent.set(null), 2500);
  }
  remind() { log(this.e()!.name, actor(), `Sent a manual review reminder to ${this.reviewer() || 'the RM'}`); this.resent.set('remind'); setTimeout(() => this.resent.set(null), 2500); }

  icon(k: Milestone['kind']) {
    return { start: 'fa-solid fa-flag', meeting: 'fa-solid fa-handshake', reminder: 'fa-regular fa-bell', review: 'fa-regular fa-clipboard', submitted: 'fa-solid fa-check', approval: 'fa-solid fa-stamp', end: 'fa-solid fa-flag-checkered', extension: 'fa-solid fa-route', outcome: 'fa-solid fa-gavel' }[k];
  }
  initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  left(n: number) { return n === 0 ? 'Ends today' : n > 0 ? `${n} days left` : `${-n} days overdue`; }
}
