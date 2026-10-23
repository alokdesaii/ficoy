import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { milestones, Milestone, pips, pipStage, probations, probationSettings, reviewOf, timeline } from '../probation';
import { employees } from '../employees';
import { CURRENT_USER, leaves } from '../leaves';

// employee-facing wording for the timeline
const FRIENDLY: Partial<Record<Milestone['kind'], string>> = { start: 'Your probation started', review: 'Your self review opened', end: 'Probation ends' };

@Component({
  selector: 'app-my-probation',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './my-probation.component.html',
  styleUrl: './my-probation.component.scss',
})
export class MyProbationComponent {
  today = new Date().toISOString().slice(0, 10);
  s = probationSettings;
  // ponytail: HR preview switch; with real login this is always the signed-in employee
  isHr = true;
  viewAs = signal(CURRENT_USER === 'Suchi Thakur' ? 'Narayan Chandra Barik' : CURRENT_USER);
  people = computed(() => probations().map(p => p.employee));

  e = computed(() => employees().find(x => x.name === this.viewAs())!);
  p = computed(() => probations().find(x => x.employee === this.viewAs()));
  t = computed(() => this.p() ? timeline(this.p()!, this.e().joined, leaves(), this.s(), this.today) : null);
  pip = computed(() => pips().find(x => x.employee === this.viewAs() && !x.outcome));
  self = computed(() => reviewOf(this.viewAs(), 'self'));
  decided = computed(() => !!this.p()?.outcome);
  first = computed(() => this.viewAs().split(' ')[0]);

  steps = computed(() => {
    const p = this.p(), t = this.t(); if (!p || !t) return [];
    const short = (d?: string) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    return milestones(p, t, this.s(), this.today)
      .filter(m => m.kind !== 'reminder' && !(m.kind === 'review' && m.label.startsWith('Overdue')))
      .map(m => {
        const self = m.kind === 'submitted' && m.label.startsWith('Self');
        const [label, desc, icon] =
          m.kind === 'start' ? ['Probation started', `Your ${this.s().durations[p.type]}-month probation as ${this.e().designation} began.`, 'fa-solid fa-flag'] :
          m.kind === 'leave' ? [m.label.split(' · ')[0], `Approved leave moved your end date to ${short(t.end)}.`, 'fa-regular fa-calendar-minus'] :
          m.kind === 'review' ? ['Self review opened', `You had until ${short(p.extendedTo ? t.adjustedEnd : t.end)} to reflect and rate yourself.`, 'fa-regular fa-clipboard'] :
          m.kind === 'submitted' ? (self ? ['Self review submitted', 'Thanks! Your manager and HR can now see it.', 'fa-solid fa-check'] : ['Manager review submitted', `${this.e().manager || 'Your manager'} completed their review.`, 'fa-solid fa-user-check']) :
          m.kind === 'extension' ? ['Probation extended', `Extended with a PIP. New end date ${short(p.extendedTo)}.`, 'fa-solid fa-route'] :
          m.kind === 'outcome' ? [m.label, m.label === 'Confirmed' ? 'Welcome aboard permanently!' : 'Please read your letter from HR.', 'fa-solid fa-gavel'] :
          [m.label.replace('Probation ends', 'Probation ends'), m.done ? 'Your probation period ended.' : 'HR decides the outcome around this date.', 'fa-solid fa-flag-checkered'];
        return { ...m, label, desc, icon };
      });
  });
  // where "today" sits along the stepper (index of the first upcoming step)
  nowAt = computed(() => { const i = this.steps().findIndex(s => !s.done); return i < 0 ? this.steps().length : i; });
  lineFill = computed(() => { const n = this.steps().length; return n < 2 ? 0 : Math.min(100, Math.max(0, (this.nowAt() - 0.5) / (n - 1) * 100)); });

  // ring geometry
  pct = computed(() => this.decided() ? 1 : this.t()?.progress ?? 0);
  dash = computed(() => `${(this.pct() * 2 * Math.PI * 52).toFixed(1)} ${(2 * Math.PI * 52).toFixed(1)}`);

  status = computed(() => {
    const p = this.p(), t = this.t(); if (!p || !t) return { tone: 'info', title: '', text: '' };
    if (p.outcome === 'Confirmed') return { tone: 'ok', title: 'You\'re confirmed 🎉', text: `Your employment was confirmed on ${fmt(p.decidedOn)}.` };
    if (p.outcome === 'Terminated') return { tone: 'bad', title: 'Your probation has closed', text: 'Please read your letter from HR for next steps.' };
    if (p.extendedTo) return { tone: 'pip', title: 'Your probation was extended', text: `It now ends on ${fmt(p.extendedTo)}. Your Performance Improvement Plan is below.` };
    if (t.stage === 'In Probation') return { tone: 'info', title: 'You\'re on track', text: `Your self review opens on ${fmt(t.reviewOpens)}. Nothing to do yet.` };
    if (!p.employeeReviewOn) return { tone: 'warn', title: t.daysLeft < 0 ? 'Your self review is overdue' : 'Time for your self review', text: t.daysLeft < 0 ? 'Please submit it as soon as possible so HR can complete your probation.' : `Please submit it before ${fmt(t.end)}.` };
    return { tone: 'info', title: 'Review submitted, thank you', text: 'Your manager and HR will review it. You\'ll be notified of the outcome.' };
  });
  todos = computed(() => {
    const out: { text: string; link: unknown[]; cta: string; due?: string }[] = [];
    const p = this.p(), t = this.t(); if (!p || !t || p.outcome) return out;
    if (!p.extendedTo && !p.employeeReviewOn && t.stage !== 'In Probation') out.push({ text: 'Complete your self review', link: ['/probation/review/self', this.e().code], cta: 'Start', due: t.end });
    const next = this.pip()?.checkIns.find(c => !c.selfOn);
    if (this.pip()?.objectivesApprovedOn && next) out.push({ text: 'Share your PIP progress update', link: ['/probation/pip', this.e().code], cta: 'Update', due: next.due });
    return out;
  });
}
const fmt = (d?: string) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
