import { StackTable } from '../stack-table';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { inScope, probations, probationSettings, Stage, timeline } from '../probation';
import { employees } from '../employees';
import { departments } from '../departments';
import { leaves } from '../leaves';
import { exportCsv } from '../csv';

const STAGES: Stage[] = ['Objectives Pending', 'In Probation', 'Review Due', 'Overdue', 'Extended', 'Awaiting Approval', 'Confirmed', 'Terminated', 'Closed'];

@Component({
  selector: 'app-probation-list',
  imports: [StackTable, FormsModule, DatePipe, RouterLink],
  templateUrl: './probation-list.component.html',
  styleUrl: './probation-list.component.scss',
})
export class ProbationListComponent {
  stages = STAGES; departments = departments;
  today = new Date().toISOString().slice(0, 10);

  rows = computed(() => probations().filter(inScope).map(p => {
    const e = employees().find(x => x.name === p.employee)!;
    return { p, e, t: timeline(p, e.joined, probationSettings(), this.today) };
  }).filter(r => !r.t.exempt));

  counts = computed(() => Object.fromEntries(STAGES.map(s => [s, this.rows().filter(r => r.t.stage === s).length])) as Record<Stage, number>);

  // dashboard KPI cards deep-link here with ?stage=
  private router = inject(Router);
  viewAll() { this.stage.set(''); this.search.set(''); this.dept.set(''); this.within.set(0); this.router.navigate([], { queryParams: {}, replaceUrl: true }); }
  private q = inject(ActivatedRoute).snapshot.queryParamMap.get('stage');
  stage = signal<Stage | ''>((STAGES as string[]).includes(this.q ?? '') ? this.q as Stage : ''); search = signal(''); dept = signal(''); within = signal(0);
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const open = (s: Stage) => s !== 'Confirmed' && s !== 'Terminated';
    return this.rows()
      .filter(r => (!this.stage() || r.t.stage === this.stage()) && (!q || r.e.name.toLowerCase().includes(q) || r.e.code.includes(q)) &&
        (!this.dept() || r.e.department === this.dept()) && (!this.within() || (open(r.t.stage) && r.t.daysLeft <= this.within())))
      // open probations first, soonest ending first
      .sort((a, b) => Number(!open(a.t.stage)) - Number(!open(b.t.stage)) || a.t.end.localeCompare(b.t.end));
  });
  get filtering() { return !!(this.stage() || this.search() || this.dept() || this.within()); }
  clear() { this.stage.set(''); this.search.set(''); this.dept.set(''); this.within.set(0); }
  pickStage(s: Stage) { this.stage.set(this.stage() === s ? '' : s); }

  initials = (n: string) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  left(n: number) { return n === 0 ? 'Ends today' : n > 0 ? `${n} day${n === 1 ? '' : 's'} left` : `${-n} day${n === -1 ? '' : 's'} overdue`; }

  export() {
    exportCsv('probations', ['Employee', 'Code', 'Department', 'Reporting Manager', 'Employment Type', 'Start', 'Original End', 'Current End', 'Stage', 'RM Review'],
      this.filtered().map(r => [r.e.name, r.e.code, r.e.department, r.e.manager, r.p.type, r.t.start, r.t.baseEnd, r.t.end, r.t.stage, r.p.rmReviewOn ?? '']));
  }
}
