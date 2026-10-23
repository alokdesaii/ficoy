import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { average, log, probations, probationSettings, Recommendation, Review, ReviewBy, reviewOf, RM_QUESTIONS, saveReview, SELF_QUESTIONS, suggest, timeline } from '../probation';
import { employees } from '../employees';
import { leaves } from '../leaves';

// one form for both sides of the two-way review; route /probation/review/:by/:code
@Component({
  selector: 'app-probation-review',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './probation-review.component.html',
  styleUrl: './probation-review.component.scss',
})
export class ProbationReviewComponent {
  private router = inject(Router);
  private params = inject(ActivatedRoute).snapshot.paramMap;
  by = this.params.get('by') as ReviewBy;
  code = this.params.get('code');
  today = new Date().toISOString().slice(0, 10);
  s = probationSettings;
  questions = this.by === 'rm' ? RM_QUESTIONS : SELF_QUESTIONS;
  selfQuestions = SELF_QUESTIONS;
  outcomes: Recommendation[] = ['Confirm', 'Extend', 'Terminate'];

  e = computed(() => employees().find(x => x.code === this.code));
  p = computed(() => probations().find(x => x.employee === this.e()?.name));
  t = computed(() => this.p() && this.e() ? timeline(this.p()!, this.e()!.joined, leaves(), this.s(), this.today) : null);
  open = computed(() => !!this.t() && (this.today >= this.t()!.reviewOpens || !!this.p()!.extendedTo));

  // working copy: saved draft or blank
  r = signal<Review>(this.blank());
  private blank(): Review {
    const name = employees().find(x => x.code === this.code)?.name ?? '';
    return structuredClone(reviewOf(name, this.by)) ?? { employee: name, by: this.by, ratings: {}, notes: {}, answers: {} };
  }
  empty = (v: string | undefined) => !v?.trim();
  locked = computed(() => !!this.r().submittedOn);

  // RM side: the employee's own review for comparison, and the suggested outcome
  self = computed(() => this.by === 'rm' && this.e() ? reviewOf(this.e()!.name, 'self') : undefined);
  selfIn = computed(() => !!this.self()?.submittedOn);
  suggested = computed(() => suggest(this.avg(), this.s()));
  canExtend = computed(() => (this.p()?.extendedTo ? 1 : 0) < this.s().maxExtensions);
  months = computed(() => Array.from({ length: this.s().maxExtensionMonths }, (_, i) => i + 1));
  recommend(o: Recommendation) {
    if (this.locked() || (o === 'Extend' && !this.canExtend())) return;
    this.r.update(r => ({ ...r, recommendation: o, extendMonths: o === 'Extend' ? (r.extendMonths ?? 1) : undefined }));
  }
  avgOf = (r: Review) => average(r, this.s().criteria);
  gap = (c: string) => { const a = this.r().ratings[c], b = this.self()?.ratings[c]; return a && b ? a - b : 0; };

  rated = computed(() => this.s().criteria.filter(c => this.r().ratings[c]).length);
  avg = computed(() => average(this.r(), this.s().criteria));
  needsNote = (c: string) => !!this.r().ratings[c] && this.r().ratings[c] <= this.s().commentRequiredAtOrBelow;
  showNote = signal(new Set<string>());

  missing = computed(() => {
    const r = this.r(), m: string[] = [];
    const unrated = this.s().criteria.filter(c => !r.ratings[c]);
    if (unrated.length) m.push(`Rate ${unrated.length} more criteri${unrated.length === 1 ? 'on' : 'a'}`);
    const noNote = this.s().criteria.filter(c => this.needsNote(c) && !r.notes[c]?.trim());
    if (noNote.length) m.push(`Explain low ratings for ${noNote.join(', ')}`);
    const q = this.questions.filter(x => x.required && !r.answers[x.key]?.trim());
    if (q.length) m.push(`Answer ${q.length} required question${q.length === 1 ? '' : 's'}`);
    if (this.by === 'rm') {
      if (!r.recommendation) m.push('Choose a recommended outcome');
      if (r.recommendation === 'Extend' && !r.pipFocus?.trim() && this.s().pipRequiredOnExtension) m.push('Add PIP focus areas for the extension');
      if (r.recommendation === 'Terminate' && !r.reason?.trim()) m.push('Give a reason for recommending termination');
    }
    return m;
  });

  tried = signal(false); confirming = signal(false); savedMsg = signal('');
  rate(c: string, n: number) { if (this.locked()) return; this.r.update(r => ({ ...r, ratings: { ...r.ratings, [c]: n } })); }
  touch() { this.r.update(r => ({ ...r })); }
  toggleNote(c: string) { this.showNote.update(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; }); }

  // ponytail: PUT /probations/:id/reviews/:by once the endpoint is shared
  draft() { this.r.set(saveReview(this.r(), false)); this.savedMsg.set('Draft saved'); setTimeout(() => this.savedMsg.set(''), 2000); }
  submit() { this.tried.set(true); if (this.missing().length) { document.querySelector('.missing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } this.confirming.set(true); }
  confirm() {
    this.r.set(saveReview(this.r(), true));
    log(this.e()!.name, this.by === 'self' ? this.e()!.name : this.e()!.manager, `${this.by === 'self' ? 'Self' : 'RM'} review submitted`);
    this.confirming.set(false);
    this.router.navigate(['/probation/view', this.code]);
  }
}
