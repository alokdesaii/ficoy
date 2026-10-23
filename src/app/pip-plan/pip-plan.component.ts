import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { closePip, daysBetween, log, PipCheckIn, PipObjective, pips, pipStage, probationSettings, updatePip } from '../probation';
import { employees } from '../employees';
import { CURRENT_USER } from '../leaves';

@Component({
  selector: 'app-pip-plan',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './pip-plan.component.html',
  styleUrl: './pip-plan.component.scss',
})
export class PipPlanComponent {
  code = inject(ActivatedRoute).snapshot.paramMap.get('code');
  today = new Date().toISOString().slice(0, 10);
  s = probationSettings;
  statuses: PipObjective['status'][] = ['Not started', 'On track', 'At risk', 'Met', 'Not met'];

  e = computed(() => employees().find(x => x.code === this.code));
  p = computed(() => pips().find(x => x.employee === this.e()?.name));
  stage = computed(() => this.p() ? pipStage(this.p()!, this.today) : null);
  approved = computed(() => !!this.p()?.objectivesApprovedOn);
  closed = computed(() => !!this.p()?.outcome);
  daysLeft = computed(() => this.p() ? daysBetween(this.today, this.p()!.end) : 0);
  progress = computed(() => { const p = this.p(); if (!p) return 0; const t = daysBetween(p.start, p.end) + 1; return Math.min(1, Math.max(0, (daysBetween(p.start, this.today) + 1) / t)); });
  met = computed(() => this.p()?.objectives.filter(o => o.status === 'Met').length ?? 0);
  avgRating = computed(() => { const r = (this.p()?.checkIns ?? []).map(c => c.rmRating).filter((x): x is number => !!x); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0; });

  // objectives (draft until HR approves)
  newObj = { title: '', measure: '' };
  addObjective() {
    const t = this.newObj.title.trim(); if (!t) return;
    updatePip(this.e()!.name, p => ({ ...p, objectives: [...p.objectives, { title: t, measure: this.newObj.measure.trim(), status: 'Not started' }] }));
    this.newObj = { title: '', measure: '' };
  }
  editObjective(i: number, patch: Partial<PipObjective>) { updatePip(this.e()!.name, p => { p.objectives[i] = { ...p.objectives[i], ...patch }; return p; }); }
  removeObjective(i: number) { updatePip(this.e()!.name, p => { p.objectives.splice(i, 1); return p; }); }
  canApprove = computed(() => (this.p()?.objectives.length ?? 0) > 0 && this.p()!.objectives.every(o => o.title.trim() && o.measure.trim()));
  approve() {
    updatePip(this.e()!.name, p => ({ ...p, objectivesApprovedOn: this.today }));
    log(this.e()!.name, CURRENT_USER, `Approved ${this.p()!.objectives.length} PIP objectives`);
  }

  // check-ins
  open = signal<number | null>(null);
  form = { self: '', rating: 0, note: '', statuses: [] as PipObjective['status'][] };
  startCheckIn(i: number) {
    const c = this.p()!.checkIns[i];
    this.form = { self: '', rating: c.rmRating ?? 0, note: c.rmNote ?? '', statuses: this.p()!.objectives.map(o => o.status) };
    this.open.set(i);
  }
  isDue = (c: PipCheckIn) => c.due <= this.today;
  canOpen = (i: number) => this.approved() && !this.closed() && !this.p()!.checkIns[i].rmOn && this.p()!.checkIns.slice(0, i).every(c => c.rmOn);
  saveSelf(i: number) {
    if (!this.form.self.trim()) return;
    updatePip(this.e()!.name, p => { p.checkIns[i] = { ...p.checkIns[i], selfOn: this.today, selfNote: this.form.self.trim() }; return p; });
    log(this.e()!.name, this.e()!.name, `Submitted PIP check-in update (${this.p()!.checkIns[i].due})`);
    this.form.self = '';
  }
  saveRm(i: number) {
    if (!this.form.rating || !this.form.note.trim()) return;
    updatePip(this.e()!.name, p => {
      p.checkIns[i] = { ...p.checkIns[i], rmOn: this.today, rmRating: this.form.rating, rmNote: this.form.note.trim() };
      p.objectives = p.objectives.map((o, j) => ({ ...o, status: this.form.statuses[j] ?? o.status }));
      return p;
    });
    log(this.e()!.name, this.e()!.manager, `Recorded PIP check-in (${this.p()!.checkIns[i].due}) · rating ${this.form.rating}`);
    this.open.set(null);
  }
  selfNote = (c: PipCheckIn) => c.selfNote;

  // final outcome
  outcome = signal<'Confirmed' | 'Terminated' | null>(null); reason = ''; tried = signal(false); confirming = signal(false);
  outcomeReady = computed(() => this.approved() && !this.closed() && (this.stage() === 'Outcome Due' || this.p()!.checkIns.every(c => c.rmOn)));
  decide() { this.tried.set(true); if (!this.outcome() || (this.outcome() === 'Terminated' && !this.reason.trim())) return; this.confirming.set(true); }
  confirm() {
    closePip(this.e()!.name, this.outcome()!, this.today, CURRENT_USER, this.reason.trim() || undefined);
    log(this.e()!.name, CURRENT_USER, `PIP outcome: ${this.outcome()}`);
    this.confirming.set(false);
  }
}
