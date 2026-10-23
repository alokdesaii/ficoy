import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatDate } from '@angular/common';
import { EVENTS, milestones, pips, pipStage, probationLog, probations, probationSettings, timeline } from '../probation';
import { employees } from '../employees';
import { departments } from '../departments';
import { leaves } from '../leaves';
import { exportCsv } from '../csv';

type Key = 'upcoming' | 'pending' | 'pip' | 'outcomes' | 'notifications' | 'audit';
interface Col { h: string; k: string; num?: boolean; }
interface Report { rows: Record<string, string | number>[]; cols: Col[]; summary: string; date: string; }

const REPORTS: { k: Key; t: string; i: string; d: string }[] = [
  { k: 'upcoming', t: 'Upcoming End Dates', i: 'fa-regular fa-calendar', d: 'Open probations by end date' },
  { k: 'pending', t: 'Pending Reviews', i: 'fa-regular fa-clipboard', d: 'Reviews not yet submitted' },
  { k: 'pip', t: 'Extensions & PIPs', i: 'fa-solid fa-route', d: 'Extended probations and PIP status' },
  { k: 'outcomes', t: 'Final Outcomes', i: 'fa-solid fa-gavel', d: 'Confirmations, extensions, terminations' },
  { k: 'notifications', t: 'Notification History', i: 'fa-regular fa-bell', d: 'Everything sent, to whom' },
  { k: 'audit', t: 'Audit Log', i: 'fa-solid fa-clock-rotate-left', d: 'Manual actions by people' },
];

@Component({
  selector: 'app-probation-reports',
  imports: [StackTable, FormsModule, RouterLink],
  templateUrl: './probation-reports.component.html',
  styleUrl: './probation-reports.component.scss',
})
export class ProbationReportsComponent {
  reports = REPORTS; departments = departments;
  today = new Date().toISOString().slice(0, 10);
  key = signal<Key>('upcoming');
  from = signal(''); to = signal(''); dept = signal('');

  private base = computed(() => probations().map(p => {
    const e = employees().find(x => x.name === p.employee)!;
    return { p, e, t: timeline(p, e.joined, leaves(), probationSettings(), this.today) };
  }).filter(r => !r.t.exempt && (!this.dept() || r.e.department === this.dept())));
  inRange = (d?: string) => !!d && (!this.from() || d >= this.from()) && (!this.to() || d <= this.to());
  fmt = (d?: string) => d ? formatDate(d, 'dd MMM y', 'en') : '—';

  report = computed<Report>(() => {
    const s = probationSettings(), rows = this.base();
    switch (this.key()) {
      case 'upcoming': {
        const r = rows.filter(x => !x.p.outcome && this.inRange(x.t.end)).sort((a, b) => a.t.end.localeCompare(b.t.end));
        return { date: 'end date', cols: [{ h: 'Employee', k: 'name' }, { h: 'Department', k: 'dept' }, { h: 'RM', k: 'rm' }, { h: 'End date', k: 'end' }, { h: 'Days left', k: 'left', num: true }, { h: 'Leave adj.', k: 'adj', num: true }, { h: 'Stage', k: 'stage' }],
          rows: r.map(x => ({ name: x.e.name, code: x.e.code, dept: x.e.department, rm: x.e.manager || '—', end: this.fmt(x.t.end), left: x.t.daysLeft, adj: x.t.adj.days ? `+${x.t.adj.days}` : '—', stage: x.t.stage })),
          summary: `${r.length} open · ${r.filter(x => x.t.daysLeft >= 0 && x.t.daysLeft <= 30).length} ending within 30 days · ${r.filter(x => x.t.daysLeft < 0).length} overdue` };
      }
      case 'pending': {
        const r = rows.filter(x => !x.p.outcome && !x.p.extendedTo && x.t.stage !== 'In Probation' && (!x.p.employeeReviewOn || !x.p.rmReviewOn) && this.inRange(x.t.end));
        return { date: 'due date', cols: [{ h: 'Employee', k: 'name' }, { h: 'RM', k: 'rm' }, { h: 'Due', k: 'end' }, { h: 'Self review', k: 'self' }, { h: 'RM review', k: 'rmr' }, { h: 'Overdue by', k: 'over', num: true }],
          rows: r.map(x => ({ name: x.e.name, code: x.e.code, rm: x.e.manager || '—', end: this.fmt(x.t.end), self: x.p.employeeReviewOn ? 'Submitted' : 'Pending', rmr: x.p.rmReviewOn ? 'Submitted' : 'Pending', over: x.t.daysLeft < 0 ? `${-x.t.daysLeft} days` : '—' })),
          summary: `${r.length} probations waiting · ${r.filter(x => !x.p.employeeReviewOn).length} self and ${r.filter(x => !x.p.rmReviewOn).length} RM reviews outstanding` };
      }
      case 'pip': {
        const r = pips().map(p => ({ p, e: employees().find(x => x.name === p.employee)! })).filter(x => (!this.dept() || x.e.department === this.dept()) && this.inRange(x.p.start));
        return { date: 'PIP start', cols: [{ h: 'Employee', k: 'name' }, { h: 'PIP period', k: 'period' }, { h: 'Objectives met', k: 'met', num: true }, { h: 'Check-ins', k: 'ci', num: true }, { h: 'Avg rating', k: 'avg', num: true }, { h: 'Status', k: 'stage' }],
          rows: r.map(x => { const rt = x.p.checkIns.map(c => c.rmRating).filter((v): v is number => !!v); return { name: x.e.name, code: x.e.code, period: `${this.fmt(x.p.start)} – ${this.fmt(x.p.end)}`, met: `${x.p.objectives.filter(o => o.status === 'Met').length}/${x.p.objectives.length}`, ci: `${x.p.checkIns.filter(c => c.rmOn).length}/${x.p.checkIns.length}`, avg: rt.length ? (rt.reduce((a, b) => a + b, 0) / rt.length).toFixed(1) : '—', stage: pipStage(x.p, this.today) }; }),
          summary: `${r.length} PIPs · ${r.filter(x => !x.p.outcome).length} active · ${r.filter(x => x.p.outcome === 'Confirmed').length} confirmed · ${r.filter(x => x.p.outcome === 'Terminated').length} terminated` };
      }
      case 'outcomes': {
        const r = rows.flatMap(x => {
          const ds = (x.p.decisions ?? []).map(d => ({ out: d.outcome === 'Confirm' ? 'Confirmed' : d.outcome === 'Extend' ? 'Extended' : 'Terminated', on: d.decidedOn, eff: d.effectiveOn, by: d.by, over: d.overrideReason ? 'Yes' : 'No' }));
          if (!ds.length && x.p.outcome) ds.push({ out: x.p.outcome, on: x.p.decidedOn!, eff: x.p.decidedOn!, by: 'HR', over: 'No' });
          if (!ds.some(d => d.out === 'Extended') && x.p.extendedTo) ds.push({ out: 'Extended', on: x.t.adjustedEnd, eff: x.t.adjustedEnd, by: 'HR', over: 'No' });
          return ds.filter(d => this.inRange(d.on)).map(d => ({ name: x.e.name, code: x.e.code, dept: x.e.department, ...d }));
        }).sort((a, b) => b.on.localeCompare(a.on));
        return { date: 'decision date', cols: [{ h: 'Employee', k: 'name' }, { h: 'Department', k: 'dept' }, { h: 'Outcome', k: 'out' }, { h: 'Decided', k: 'onF' }, { h: 'Effective', k: 'effF' }, { h: 'By', k: 'by' }, { h: 'Overrode RM', k: 'over' }],
          rows: r.map(x => ({ ...x, onF: this.fmt(x.on), effF: this.fmt(x.eff) })),
          summary: `${r.filter(x => x.out === 'Confirmed').length} confirmed · ${r.filter(x => x.out === 'Extended').length} extended · ${r.filter(x => x.out === 'Terminated').length} terminated` };
      }
      case 'notifications': {
        const label = (k: string) => EVENTS.find(e => e.key === k)?.label ?? k;
        const r = rows.flatMap(x => milestones(x.p, x.t, s, this.today).filter(m => m.event && m.done && this.inRange(m.date))
          .map(m => ({ date: m.date, name: x.e.name, code: x.e.code, ev: label(m.event!), to: s.recipients[m.event!].join(', '), ch: [s.channels.inApp && 'In-app', s.channels.email && 'Email'].filter(Boolean).join(' + '), st: 'Delivered' })))
          .sort((a, b) => b.date.localeCompare(a.date));
        return { date: 'sent date', cols: [{ h: 'Sent', k: 'dateF' }, { h: 'Employee', k: 'name' }, { h: 'Event', k: 'ev' }, { h: 'Recipients', k: 'to' }, { h: 'Channels', k: 'ch' }, { h: 'Status', k: 'st' }],
          rows: r.map(x => ({ ...x, dateF: this.fmt(x.date) })), summary: `${r.length} notifications sent` };
      }
      case 'audit': {
        const r = probationLog().filter(l => this.inRange(l.at.slice(0, 10)) && (!this.dept() || employees().find(e => e.name === l.employee)?.department === this.dept()));
        return { date: 'action date', cols: [{ h: 'When', k: 'when' }, { h: 'By', k: 'by' }, { h: 'Employee', k: 'name' }, { h: 'Action', k: 'action' }],
          rows: r.map(l => ({ when: formatDate(l.at, 'dd MMM y, hh:mm a', 'en'), by: l.by, name: l.employee, code: employees().find(e => e.name === l.employee)?.code ?? '', action: l.action })),
          summary: `${r.length} manual actions recorded this session` };
      }
    }
  });

  title = computed(() => REPORTS.find(r => r.k === this.key())!.t);
  clear() { this.from.set(''); this.to.set(''); this.dept.set(''); }
  export() { const r = this.report(); exportCsv(`probation-${this.key()}`, r.cols.map(c => c.h), r.rows.map(x => r.cols.map(c => String(x[c.k] ?? '')))); }
  tone(v: unknown) {
    const s = String(v);
    return /Overdue|Pending|Check-in Due|Outcome Due|Review Due/.test(s) ? 'warn' : /Terminated/.test(s) ? 'bad' : /Confirmed|Submitted|Delivered|Met/.test(s) ? 'ok' : /Extended|PIP|Active/.test(s) ? 'pip' : /In Probation|Awaiting/.test(s) ? 'info' : '';
  }
  isTag = (k: string) => ['stage', 'self', 'rmr', 'out', 'st'].includes(k);
}
