import { computed, signal } from '@angular/core';
import { EventKey, milestones, pips, probations, probationSettings, Role, timeline } from './probation';
import { Copy, copyFor } from './notification-copy';
export { copyFor } from './notification-copy';
import { employees } from './employees';
import { CURRENT_USER, leaves } from './leaves';

type Ctx = Record<string, string>;

// ── in-app feed for the signed-in user (HR, and RM for their reports) ──
export interface Note { id: string; event: EventKey; role: Role; date: string; employee: string; code: string; link: string; copy: Copy; }
const fmt = (d?: string) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const readIds = signal(new Set<string>(['seed-read']));
export const feed = computed<Note[]>(() => {
  const today = new Date().toISOString().slice(0, 10), s = probationSettings();
  const out: Note[] = [];
  for (const p of probations()) {
    const e = employees().find(x => x.name === p.employee); if (!e) continue;
    const t = timeline(p, e.joined, leaves(), s, today);
    if (t.exempt) continue;
    const role: Role = e.manager === CURRENT_USER ? 'RM' : 'HR';
    const missing = [!p.employeeReviewOn && 'self review', !p.rmReviewOn && 'RM review'].filter(Boolean).join(' and ') || 'nothing';
    const ctx: Ctx = { name: e.name, designation: e.designation, start: fmt(t.start), end: fmt(t.end), reviewOpens: fmt(t.reviewOpens),
      daysLeft: String(Math.max(0, t.daysLeft)), overdue: String(-t.daysLeft), missing, months: String(s.durations[p.type]),
      reviews: `${p.employeeReviewOn ? 'Self ✓' : 'Self pending'} · ${p.rmReviewOn ? 'RM ✓' : 'RM pending'}`,
      effective: fmt(p.decisions?.at(-1)?.effectiveOn ?? p.decidedOn), newEnd: fmt(p.extendedTo), days: String(t.adj.days),
      outcome: p.outcome ?? '', every: String(s.pipCheckpointEveryDays), today: fmt(today), lastDay: fmt(p.decisions?.at(-1)?.lastWorkingDay) };
    for (const m of milestones(p, t, s, today)) {
      if (!m.event || !m.done || !s.recipients[m.event].includes(role) || m.date < '2026-08-01') continue;
      const link = m.event.startsWith('pip') || m.event === 'extended' ? `/probation/pip/${e.code}` : `/probation/view/${e.code}`;
      out.push({ id: `${e.code}-${m.event}-${m.date}-${m.label}`, event: m.event, role, date: m.date, employee: e.name, code: e.code, link, copy: copyFor(m.event, role, ctx) });
    }
    const pip = pips().find(x => x.employee === e.name && !x.outcome);
    const due = pip?.checkIns.find(c => !c.rmOn && c.due <= today);
    if (pip && due) out.push({ id: `${e.code}-pipcheck-${due.due}`, event: 'pipCheckpoint', role, date: due.due, employee: e.name, code: e.code, link: `/probation/pip/${e.code}`, copy: copyFor('pipCheckpoint', role, { ...ctx, due: fmt(due.due) }) });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
});
export const unread = computed(() => feed().filter(n => !readIds().has(n.id)));
export const markRead = (ids: string[]) => readIds.update(s => new Set([...s, ...ids]));
// "needs action" = something the signed-in user has to do
export const actionable = (n: Note) => ['overdue', 'reviewOpen', 'pipCheckpoint', 'letterApproval', 'reminder'].includes(n.event) || (n.event === 'pipStarted' && n.role === 'RM');
