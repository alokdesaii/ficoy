import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addDays, average, decide, EventKey, extendTo, log, probations, probationSettings, Recommendation, reviewOf, RM_QUESTIONS, Role, SELF_QUESTIONS, suggest, timeline } from '../probation';
import { employees } from '../employees';
import { CURRENT_USER, leaves } from '../leaves';

@Component({
  selector: 'app-probation-decision',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './probation-decision.component.html',
  styleUrl: './probation-decision.component.scss',
})
export class ProbationDecisionComponent {
  private router = inject(Router);
  code = inject(ActivatedRoute).snapshot.paramMap.get('code');
  today = new Date().toISOString().slice(0, 10);
  s = probationSettings;
  selfQ = SELF_QUESTIONS; rmQ = RM_QUESTIONS;
  outcomes: Recommendation[] = ['Confirm', 'Extend', 'Terminate'];

  e = computed(() => employees().find(x => x.code === this.code));
  p = computed(() => probations().find(x => x.employee === this.e()?.name));
  t = computed(() => this.p() && this.e() ? timeline(this.p()!, this.e()!.joined, leaves(), this.s(), this.today) : null);
  self = computed(() => this.e() ? reviewOf(this.e()!.name, 'self') : undefined);
  rm = computed(() => this.e() ? reviewOf(this.e()!.name, 'rm') : undefined);
  selfAvg = computed(() => this.self()?.submittedOn ? average(this.self()!, this.s().criteria) : 0);
  rmAvg = computed(() => this.rm()?.submittedOn ? average(this.rm()!, this.s().criteria) : 0);
  suggested = computed(() => this.rmAvg() ? suggest(this.rmAvg(), this.s()) : undefined);
  rmRec = computed(() => this.rm()?.submittedOn ? this.rm()!.recommendation : undefined);

  missing = computed(() => [!this.self()?.submittedOn && 'self review', !this.rm()?.submittedOn && 'RM review'].filter(Boolean) as string[]);
  blocked = computed(() => this.s().blockDecisionUntilBothReviews && this.missing().length > 0);
  closed = computed(() => !!this.p()?.outcome || !!this.p()?.extendedTo);
  canExtend = computed(() => (this.p()?.decisions ?? []).filter(d => d.outcome === 'Extend').length < this.s().maxExtensions);

  // form
  outcome = signal<Recommendation | null>(null);
  effective = signal(''); months = signal(1); lastDay = signal(''); reason = ''; override = ''; note = '';
  tried = signal(false); confirming = signal(false);
  monthsList = computed(() => Array.from({ length: this.s().maxExtensionMonths }, (_, i) => i + 1));
  newEnd = computed(() => this.t() ? extendTo(this.t()!.end, this.months()) : '');
  overriding = computed(() => !!this.outcome() && !!this.rmRec() && this.outcome() !== this.rmRec());

  pick(o: Recommendation) {
    if (o === 'Extend' && !this.canExtend()) return;
    if (this.overrideLocked(o)) return;
    this.outcome.set(o);
    const end = this.t()!.end;
    this.effective.set(o === 'Confirm' ? addDays(end, 1) : end);
    this.lastDay.set(o === 'Terminate' ? end : '');
    if (o === 'Extend') this.months.set(this.rm()?.extendMonths ?? 1);
  }
  overrideLocked = (o: Recommendation) => !this.s().hrCanOverride && !!this.rmRec() && o !== this.rmRec();

  // plain method: reads template-bound plain fields (reason/override), which a computed wouldn't track
  errors() {
    const e: string[] = [];
    if (!this.outcome()) e.push('Choose an outcome');
    if (this.outcome() && !this.effective()) e.push('Set the effective date');
    if (this.outcome() === 'Terminate' && !this.reason.trim()) e.push('Give the termination reason');
    if (this.outcome() === 'Terminate' && this.lastDay() && this.lastDay() > this.effective()) e.push('Last working day must be on or before the effective date');
    if (this.overriding() && !this.override.trim()) e.push(`Explain why you're overriding the RM's recommendation`);
    return e;
  }
  errs = () => this.errors();
  touch() { /* template hook; errors() is recomputed on every check */ }

  eventFor = (o: Recommendation): EventKey => o === 'Confirm' ? 'confirmed' : o === 'Extend' ? 'extended' : 'terminated';
  recipients = computed(() => this.outcome() ? this.s().recipients[this.eventFor(this.outcome()!)] : []);
  who(r: Role) { const e = this.e()!; return r === 'Employee' ? e.name : r === 'RM' ? (e.manager || 'No RM') : r === 'HR' ? 'HR Team' : 'Payroll Team'; }

  submit() { this.tried.set(true); if (this.errs().length) return; this.confirming.set(true); }
  confirm() {
    const o = this.outcome()!, e = this.e()!;
    decide(e.name, {
      outcome: o, effectiveOn: o === 'Extend' ? this.t()!.end : this.effective(), decidedOn: this.today, by: CURRENT_USER,
      rmRecommendation: this.rmRec(), overrideReason: this.overriding() ? this.override.trim() : undefined,
      extendMonths: o === 'Extend' ? this.months() : undefined, lastWorkingDay: o === 'Terminate' ? this.lastDay() : undefined,
      reason: o === 'Terminate' ? this.reason.trim() : undefined, note: this.note.trim() || undefined,
    });
    log(e.name, CURRENT_USER, o === 'Extend' ? `Extended probation by ${this.months()} month(s) to ${this.newEnd()} with a PIP` : `${o === 'Confirm' ? 'Confirmed' : 'Terminated'} effective ${this.effective()}${this.overriding() ? ' (overrode RM)' : ''}`);
    this.confirming.set(false);
    this.router.navigate(['/probation/view', this.code]);
  }
}
