import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { acknowledge, addDays, milestones, probations, probationSettings, timeline } from '../probation';
import { employees } from '../employees';
import { CURRENT_USER, leaves } from '../leaves';

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
  t = computed(() => this.p() ? timeline(this.p()!, this.e().joined, this.s(), this.today) : null);
  ack() { acknowledge(this.viewAs(), this.today); }
  decided = computed(() => !!this.p()?.outcome);
  first = computed(() => this.viewAs().split(' ')[0]);

  steps = computed(() => {
    const p = this.p(), t = this.t(); if (!p || !t) return [];
    const short = (d?: string) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    return milestones(p, t, this.s(), this.today)
      .filter(m => m.kind !== 'reminder' && m.kind !== 'approval' && m.event !== 'formSent' && !(m.kind === 'review' && m.label.startsWith('Overdue')))
      .map(m => {
        const [label, desc, icon] =
          m.kind === 'start' ? ['Probation started', `Your ${t.months}-month probation as ${this.e().designation} began.`, 'fa-solid fa-flag'] :
          m.kind === 'meeting' ? [p.initial?.held === 'Yes' ? 'Objectives agreed' : 'Initial meeting', p.initial?.held === 'Yes' ? `You and ${p.initial!.by} agreed your objectives and development plan.` : 'Your manager sets your objectives within your first week.', 'fa-solid fa-handshake'] :
          m.kind === 'review' ? ['Manager review opened', `${this.e().manager || 'Your manager'} reviews your probation before ${short(addDays(m.date, this.s().reviewOpensDaysBefore))}.`, 'fa-regular fa-clipboard'] :
          m.kind === 'submitted' ? ['Manager review submitted', `${this.e().manager || 'Your manager'} completed their review.`, 'fa-solid fa-user-check'] :
          m.kind === 'extension' ? ['Probation extended', `New end date ${short(p.extendedTo)}. Your manager reviews you again before then.`, 'fa-solid fa-route'] :
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
    if (p.outcome === 'Closed') return { tone: 'bad', title: 'Your probation has closed', text: `Closed with your exit on ${fmt(p.exitOn)}.` };
    if (p.outcome === 'Terminated') return { tone: 'bad', title: 'Your probation has closed', text: 'Please read your letter from HR for next steps.' };
    if (p.extendedTo && !p.rmReviewOn) return { tone: 'pip', title: 'Your probation was extended', text: `It now ends on ${fmt(p.extendedTo)}. ${this.e().manager || 'Your manager'} will review you again before then.` };
    if (t.stage === 'In Probation') return { tone: 'info', title: 'You\'re on track', text: `${this.e().manager || 'Your manager'} reviews your probation from ${fmt(t.reviewOpens)}. Nothing for you to do.` };
    // HR Q39: approval statuses are Admin-only; the employee just sees the review is complete
    if (!p.rmReviewOn) return { tone: 'warn', title: 'Your probation review is under way', text: `${this.e().manager || 'Your manager'} is completing your review, ${t.daysLeft < 0 ? 'which was due' : 'due by'} ${fmt(t.end)}.` };
    return { tone: 'info', title: 'Your review is complete', text: 'You\'ll be notified of the outcome.' };
  });
}
const fmt = (d?: string) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
