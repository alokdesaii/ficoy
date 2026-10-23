import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { holidays } from '../holidays';
import { CURRENT_USER, leaves } from '../leaves';

interface Cell { iso: string; day: number; inMonth: boolean; weekend: boolean; today: boolean; holiday?: string; leave?: { type: string; status: string; half: boolean }; }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const LIVE = ['Pending', 'Approved', 'Cancel Requested', 'Cancel Rejected'];

@Component({
  selector: 'app-calendar-view',
  imports: [DatePipe],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss',
})
export class CalendarViewComponent {
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // ponytail: shift comes from the employee record once wired to the API
  shift = '09:00 AM – 06:00 PM';
  todayIso = iso(new Date());
  view = signal<'month' | 'year'>('month');
  cursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  private holidayMap = computed(() => {
    const m = new Map<string, string>();
    for (const h of holidays()) for (let d = new Date(h.from); iso(d) <= h.to; d.setDate(d.getDate() + 1)) m.set(iso(d), h.name);
    return m;
  });
  private leaveMap = computed(() => {
    const m = new Map<string, Cell['leave']>();
    for (const l of leaves().filter(l => l.employee === CURRENT_USER && LIVE.includes(l.status)))
      for (let d = new Date(l.from); iso(d) <= l.to; d.setDate(d.getDate() + 1))
        m.set(iso(d), { type: l.type, status: l.status === 'Approved' || l.status === 'Cancel Rejected' ? 'Approved' : 'Pending', half: l.session !== 'Full Day' });
    return m;
  });

  monthCells(first: Date): Cell[] {
    const start = new Date(first); start.setDate(1 - first.getDay());
    const weeks = Math.ceil((first.getDay() + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = iso(d);
      return { iso: k, day: d.getDate(), inMonth: d.getMonth() === first.getMonth(), weekend: d.getDay() % 6 === 0,
        today: k === this.todayIso, holiday: this.holidayMap().get(k), leave: this.leaveMap().get(k) };
    });
  }

  cells = computed(() => this.monthCells(this.cursor()));
  months = computed(() => Array.from({ length: 12 }, (_, m) => {
    const first = new Date(this.cursor().getFullYear(), m, 1);
    return { first, cells: this.monthCells(first) };
  }));
  stats = computed(() => {
    const inMonth = this.cells().filter(c => c.inMonth);
    return { holidays: inMonth.filter(c => c.holiday).length, leave: inMonth.filter(c => c.leave).reduce((t, c) => t + (c.leave!.half ? 0.5 : 1), 0),
      working: inMonth.filter(c => !c.weekend && !c.holiday).length };
  });

  move(n: number) {
    const c = this.cursor();
    this.cursor.set(this.view() === 'month' ? new Date(c.getFullYear(), c.getMonth() + n, 1) : new Date(c.getFullYear() + n, c.getMonth(), 1));
  }
  today() { const t = new Date(); this.cursor.set(new Date(t.getFullYear(), t.getMonth(), 1)); }
  openMonth(first: Date) { this.cursor.set(first); this.view.set('month'); }
  isCurrent = computed(() => { const c = this.cursor(), t = new Date(); return c.getFullYear() === t.getFullYear() && (this.view() === 'year' || c.getMonth() === t.getMonth()); });
}
