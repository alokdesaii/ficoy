import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { daysBetween, pips, PipStage, pipStage } from '../probation';
import { employees } from '../employees';
import { exportCsv } from '../csv';

const STAGES: PipStage[] = ['Awaiting Objectives', 'Active', 'Check-in Due', 'Outcome Due', 'Confirmed', 'Terminated'];

@Component({
  selector: 'app-pip-list',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './pip-list.component.html',
  styleUrl: './pip-list.component.scss',
})
export class PipListComponent {
  stages = STAGES;
  today = new Date().toISOString().slice(0, 10);
  stage = signal<PipStage | ''>(''); search = signal('');

  rows = computed(() => pips().map(p => {
    const e = employees().find(x => x.name === p.employee)!;
    const total = Math.max(1, daysBetween(p.start, p.end) + 1);
    const done = p.checkIns.filter(c => c.rmOn).length;
    const next = p.checkIns.find(c => !c.rmOn);
    return {
      p, e, stage: pipStage(p, this.today),
      progress: Math.min(1, Math.max(0, (daysBetween(p.start, this.today) + 1) / total)),
      daysLeft: daysBetween(this.today, p.end),
      met: p.objectives.filter(o => o.status === 'Met').length, risk: p.objectives.filter(o => o.status === 'At risk' || o.status === 'Not met').length,
      done, next, nextLate: !!next && next.due < this.today,
    };
  }));
  counts = computed(() => Object.fromEntries(STAGES.map(s => [s, this.rows().filter(r => r.stage === s).length])) as Record<PipStage, number>);
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.rows().filter(r => (!this.stage() || r.stage === this.stage()) && (!q || r.e.name.toLowerCase().includes(q))).sort((a, b) => a.p.end.localeCompare(b.p.end));
  });
  pick(s: PipStage) { this.stage.set(this.stage() === s ? '' : s); }
  initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  export() {
    exportCsv('pips', ['Employee', 'Reporting Manager', 'Start', 'End', 'Stage', 'Objectives Met', 'Objectives', 'Check-ins Done', 'Check-ins'],
      this.filtered().map(r => [r.e.name, r.e.manager, r.p.start, r.p.end, r.stage, r.met, r.p.objectives.length, r.done, r.p.checkIns.length]));
  }
}
