import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { average, decide, effectiveFor, log, probations, reviewerOf, probationSettings, Recommendation, Review, reviewOf, RM_QUESTIONS, saveReview, suggest, timeline } from '../probation';
import { employees } from '../employees';
import { leaves } from '../leaves';

// RM-only review (HR: no self assessment); route /probation/review/:code
@Component({
  selector: 'app-probation-review',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './probation-review.component.html',
  styleUrl: './probation-review.component.scss',
})
export class ProbationReviewComponent {
  private router = inject(Router);
  private params = inject(ActivatedRoute).snapshot.paramMap;
  code = this.params.get('code');
  today = new Date().toISOString().slice(0, 10);
  s = probationSettings;
  questions = RM_QUESTIONS;
  outcomes: Recommendation[] = ['Confirm', 'Extend', 'Terminate'];

  e = computed(() => employees().find(x => x.code === this.code));
  p = computed(() => probations().find(x => x.employee === this.e()?.name));
  t = computed(() => this.p() && this.e() ? timeline(this.p()!, this.e()!.joined, leaves(), this.s(), this.today) : null);
  open = computed(() => !!this.t() && this.today >= this.t()!.reviewOpens);

  // working copy: saved draft or blank
  r = signal<Review>(this.blank());
  private blank(): Review {
    const name = employees().find(x => x.code === this.code)?.name ?? '';
    return structuredClone(reviewOf(name, 'rm')) ?? { employee: name, by: 'rm', ratings: {}, notes: {}, answers: {} };
  }
  empty = (v: string | undefined) => !v?.trim();
  locked = computed(() => !!this.r().submittedOn);

  // suggested outcome from the Settings thresholds
  suggested = computed(() => suggest(this.avg(), this.s()));
  canExtend = computed(() => (this.p()?.extendedTo ? 1 : 0) < this.s().maxExtensions);
  reviewer = computed(() => this.p() ? reviewerOf(this.p()!) : '');
  closed = computed(() => !!this.p()?.outcome);
  months = computed(() => Array.from({ length: this.s().maxExtensionMonths }, (_, i) => i + 1));
  recommend(o: Recommendation) {
    if (this.locked() || (o === 'Extend' && !this.canExtend())) return;
    this.r.update(r => ({ ...r, recommendation: o, extendMonths: o === 'Extend' ? (r.extendMonths ?? 1) : undefined }));
  }

  rated = computed(() => this.s().criteria.filter(c => this.r().ratings[c]).length);
  avg = computed(() => average(this.r(), this.s().criteria));
  needsNote = (c: string) => !!this.r().ratings[c] && this.r().ratings[c] <= this.s().commentRequiredAtOrBelow;
  showNote = signal(new Set<string>());
  // form rules: details when any area needs improvement, further action when objectives weren't met
  needed = (k: string) => k === 'improve' ? this.s().criteria.some(c => this.needsNote(c)) : k === 'action' ? this.r().objectivesMet === 'No' : false;
  setMet(v: 'Yes' | 'No') { if (!this.locked()) this.r.update(r => ({ ...r, objectivesMet: v })); }

  missing = computed(() => {
    const r = this.r(), m: string[] = [];
    const unrated = this.s().criteria.filter(c => !r.ratings[c]);
    if (unrated.length) m.push(`Rate ${unrated.length} more criteri${unrated.length === 1 ? 'on' : 'a'}`);
    const noNote = this.s().criteria.filter(c => this.needsNote(c) && !r.notes[c]?.trim());
    if (noNote.length) m.push(`Explain low ratings for ${noNote.join(', ')}`);
    if (!r.objectivesMet) m.push('Say whether the objectives were met');
    const q = this.questions.filter(x => this.needed(x.key) && !r.answers[x.key]?.trim());
    if (q.length) m.push(`Answer ${q.length} required question${q.length === 1 ? '' : 's'}`);
    if (!r.recommendation) m.push('Choose an outcome');
    if (r.recommendation === 'Extend' && !r.extensionFocus?.trim()) m.push('Say what must improve during the extension');
    if (r.recommendation === 'Terminate' && !r.reason?.trim()) m.push('Give a reason for recommending termination');
    return m;
  });

  tried = signal(false); confirming = signal(false); savedMsg = signal('');
  rate(c: string, n: number) { if (this.locked()) return; this.r.update(r => ({ ...r, ratings: { ...r.ratings, [c]: n } })); }
  touch() { this.r.update(r => ({ ...r })); }
  toggleNote(c: string) { this.showNote.update(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; }); }

  // ponytail: PUT /probations/:id/review once the endpoint is shared
  draft() { this.r.set(saveReview(this.r(), false)); this.savedMsg.set('Draft saved'); setTimeout(() => this.savedMsg.set(''), 2000); }
  submit() { this.tried.set(true); if (this.missing().length) { document.querySelector('.missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } this.confirming.set(true); }
  confirm() {
    // ponytail: POST /probations/:id/decision; the RM's submission is the final decision
    const r = saveReview(this.r(), true), o = r.recommendation!, name = this.e()!.name, today = this.today;
    this.r.set(r);
    log(name, this.reviewer(), `RM review submitted · ${o}${o === 'Extend' ? ` by ${r.extendMonths} month(s)` : ''}, effective ${effectiveFor(o, this.t()!.end, today)}`);
    decide(name, { outcome: o, effectiveOn: effectiveFor(o, this.t()!.end, today), decidedOn: today, by: this.reviewer(),
      extendMonths: o === 'Extend' ? r.extendMonths : undefined, lastWorkingDay: o === 'Terminate' ? today : undefined,
      reason: o === 'Terminate' ? r.reason : o === 'Extend' ? r.extensionFocus : undefined });
    this.confirming.set(false);
    this.router.navigate(['/probation/view', this.code]);
  }
}
