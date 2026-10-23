import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { actionable, feed, markRead, Note, readIds, unread } from '../notifications';
import { EVENTS } from '../probation';

type View = 'all' | 'unread' | 'action';

@Component({
  selector: 'app-notification-centre',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './notification-centre.component.html',
  styleUrl: './notification-centre.component.scss',
})
export class NotificationCentreComponent {
  events = EVENTS; actionable = actionable;
  view = signal<View>('all'); type = signal('');
  today = new Date().toISOString().slice(0, 10);
  yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  counts = computed(() => ({ all: feed().length, unread: unread().length, action: feed().filter(actionable).length }));
  list = computed(() => feed().filter(n =>
    (this.view() !== 'unread' || !readIds().has(n.id)) && (this.view() !== 'action' || actionable(n)) && (!this.type() || n.event === this.type())));
  groups = computed(() => {
    const g: { label: string; items: Note[] }[] = [];
    for (const n of this.list()) {
      const label = n.date === this.today ? 'Today' : n.date === this.yesterday ? 'Yesterday' : n.date >= addDaysIso(this.today, -7) ? 'Earlier this week' : monthLabel(n.date);
      (g.at(-1)?.label === label ? g.at(-1)! : (g.push({ label, items: [] }), g.at(-1)!)).items.push(n);
    }
    return g;
  });

  count = (k: string) => this.counts()[k as View];
  isRead = (id: string) => readIds().has(id);
  toggle(n: Note) { readIds.update(s => { const x = new Set(s); x.has(n.id) ? x.delete(n.id) : x.add(n.id); return x; }); }
  open(n: Note) { markRead([n.id]); }
  markAll() { markRead(feed().map(n => n.id)); }
}
const addDaysIso = (d: string, n: number) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);
const monthLabel = (d: string) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
