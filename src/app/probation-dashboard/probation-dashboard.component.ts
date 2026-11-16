import { Component, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addDays, milestones, probations, probationSettings, timeline } from '../probation';
import { employees } from '../employees';
import { leaves } from '../leaves';

interface Action { kind: 'overdue'; name: string; code: string; detail: string; link: string; cta: string; }

@Component({
  selector: 'app-probation-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './probation-dashboard.component.html',
  styleUrl: './probation-dashboard.component.scss',
})
export class ProbationDashboardComponent {
  today = new Date().toISOString().slice(0, 10);
  year = this.today.slice(0, 4);

  rows = computed(() => probations().map(p => {
    const e = employees().find(x => x.name === p.employee)!;
    return { p, e, t: timeline(p, e.joined, leaves(), probationSettings(), this.today) };
  }).filter(r => !r.t.exempt));
  open = computed(() => this.rows().filter(r => !r.p.outcome));

  kpi = computed(() => {
    const decidedThisYear = this.rows().flatMap(r => (r.p.decisions ?? []).filter(d => d.decidedOn.startsWith(this.year)).map(d => d.outcome))
      .concat(this.rows().filter(r => r.p.outcome && r.p.outcome !== 'Closed' && !r.p.decisions?.length && r.p.decidedOn?.startsWith(this.year)).map(r => r.p.outcome === 'Confirmed' ? 'Confirm' as const : 'Terminate' as const))
      // seed records extended before decisions were tracked
      .concat(this.rows().filter(r => r.p.extendedTo?.startsWith(this.year) && !r.p.decisions?.some(d => d.outcome === 'Extend')).map(() => 'Extend' as const));
    const confirmed = decidedThisYear.filter(o => o === 'Confirm').length, total = decidedThisYear.length;
    return {
      onProbation: this.open().length,
      reviewDue: this.open().filter(r => r.t.stage === 'Review Due').length,
      overdue: this.open().filter(r => r.t.stage === 'Overdue').length,
      extended: this.open().filter(r => r.p.extendedTo).length,
      confirmed, rate: total ? Math.round(confirmed / total * 100) : 0, decided: total,
      outcomes: { Confirm: confirmed, Extend: decidedThisYear.filter(o => o === 'Extend').length, Terminate: decidedThisYear.filter(o => o === 'Terminate').length },
    };
  });

  actions = computed<Action[]>(() => {
    const a: Action[] = [];
    for (const r of this.open()) {
      const ext = r.p.extendedTo ? ' (extended)' : '';
      if (r.t.stage === 'Overdue' && !r.p.rmReviewOn) a.push({ kind: 'overdue', name: r.e.name, code: r.e.code, detail: `${-r.t.daysLeft} days overdue · waiting on RM review${ext}`, link: `/probation/view/${r.e.code}`, cta: 'Chase' });
    }
    return a;
  });

  endingSoon = computed(() => this.open().filter(r => r.t.daysLeft >= 0 && r.t.daysLeft <= 30).sort((a, b) => a.t.daysLeft - b.t.daysLeft));

  upcoming = computed(() => {
    const until = addDays(this.today, 60);
    return this.open().flatMap(r => milestones(r.p, r.t, probationSettings(), this.today)
      .filter(m => !m.done && m.date <= until).map(m => ({ ...m, name: r.e.name, code: r.e.code })))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  });
  pct = (n: number) => this.kpi().decided ? n / this.kpi().decided * 100 : 0;
  initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
