import { signal } from '@angular/core';
import { departments } from './departments';
import { employees } from './employees';

// ── settings ─────────────────────────────────────────────────────────────
// ponytail: every default below is a placeholder answer to the HR query sheet
// (modules/probation/probation_work_flow_query.xlsx); swap for GET/PUT /probation/settings
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract'];
export const ROLES = ['Employee', 'RM', 'HOD', 'HR', 'Payroll'] as const;
export type Role = typeof ROLES[number];

export const EVENTS = [
  { key: 'started', label: 'Probation started' },
  { key: 'reminder', label: 'Probation ending reminder' },
  { key: 'reviewOpen', label: 'Review opened' },
  { key: 'reviewSubmitted', label: 'Review submitted' },
  { key: 'overdue', label: 'Review overdue (escalation)' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'extended', label: 'Extended' },
  { key: 'terminated', label: 'Terminated' },
  { key: 'leaveAdjusted', label: 'Timeline adjusted for leave' },
  { key: 'letterIssued', label: 'Letter issued' },
  { key: 'deliveryFailed', label: 'Notification failed to deliver' },
] as const;
export type EventKey = typeof EVENTS[number]['key'];

export interface ProbationSettings {
  durations: Record<string, number>;          // months per employment type; 0 = exempt
  startOn: 'joining' | 'onboarding';
  reviewOpensDaysBefore: number;
  reminderDays: number[];                      // days before end date
  escalateEveryDays: number;                   // after end date, until reviews are in
  scale: string[];                             // labels for 1..n
  criteria: string[];
  commentRequiredAtOrBelow: number;
  confirmAtOrAbove: number;                    // average rating
  extendAtOrAbove: number;                     // below this → terminate
  maxExtensions: number;
  maxExtensionMonths: number;
  leaveTypes: string[];                        // leave that pushes the end date
  leaveMinConsecutiveDays: number;
  leaveBasis: 'calendar' | 'working';
  recipients: Record<EventKey, Role[]>;
  channels: { inApp: boolean; email: boolean };
}

const all: Role[] = ['Employee', 'RM', 'HOD', 'HR'];   // HR: HOD only when different from the RM
export const DEFAULT_SETTINGS: ProbationSettings = {
  durations: { 'Full Time': 3, 'Part Time': 3, 'Contract': 0 },
  startOn: 'joining',
  reviewOpensDaysBefore: 10,
  reminderDays: [10, 7],
  escalateEveryDays: 1,
  // Appendix F - Probation Objective Form
  scale: ['Improvement Required', 'Satisfactory', 'Good', 'Excellent'],
  criteria: ['Quality and accuracy of work', 'Efficiency', 'Attendance', 'Time keeping', 'Work relationships (teamwork and interpersonal skills)', 'Competency in the role'],
  commentRequiredAtOrBelow: 1,
  confirmAtOrAbove: 2,
  extendAtOrAbove: 1.5,
  maxExtensions: 1,
  maxExtensionMonths: 3,
  leaveTypes: ['Leave Without Pay (LWP)', 'Sick Leave'],
  leaveMinConsecutiveDays: 5,
  leaveBasis: 'calendar',
  recipients: {
    started: all, reminder: all, reviewOpen: all, reviewSubmitted: ['RM', 'HOD', 'HR'], overdue: ['RM', 'HOD', 'HR'],
    confirmed: all, extended: all, terminated: [],          // HR: no notifications for termination
    leaveAdjusted: all, letterIssued: ['Employee', 'HR'], deliveryFailed: ['HR'],
  },
  channels: { inApp: true, email: true },
};
export const probationSettings = signal<ProbationSettings>(structuredClone(DEFAULT_SETTINGS));

// ── date rules ───────────────────────────────────────────────────────────
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };

// joining date counts as day 1: 15 Jan + 3 months → 14 Apr. Short months clamp: 31 Jan + 1 month → 28/29 Feb.
export function probationEnd(joined: string, months: number) {
  const j = parse(joined);
  const target = new Date(j.getFullYear(), j.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(j.getDate(), lastDay));
  if (target.getDate() === j.getDate()) target.setDate(target.getDate() - 1); // same day-of-month → previous day
  return iso(target);
}

export const daysBetween = (a: string, b: string) => Math.round((+parse(b) - +parse(a)) / 864e5);

// ── records ──────────────────────────────────────────────────────────────
export type Outcome = 'Confirmed' | 'Terminated' | 'Closed';   // Closed = employee left during probation
export interface Decision {
  outcome: Recommendation; effectiveOn: string; decidedOn: string; by: string;
  extendMonths?: number; lastWorkingDay?: string; reason?: string; note?: string;
}
export interface Probation {
  employee: string;
  decisions?: Decision[];
  type: string;                      // employment type
  outcome?: Outcome; decidedOn?: string;
  extendedTo?: string;
  rmReviewOn?: string;
  reviewer?: string;                 // set when HR hands the review to the HOD
  initial?: InitialMeeting;          // Appendix F Part 1
  ackOn?: string;                    // employee acknowledged the RM review (form sign-off)
  exitOn?: string; exitReason?: string;
}
export interface InitialMeeting { objectives: string; development: string; on: string; by: string; }
export const INITIAL_MEETING_DAYS = 7;   // People SOP 8.3: within 1 week of starting
export type Stage = 'In Probation' | 'Review Due' | 'Overdue' | 'Extended' | 'Confirmed' | 'Terminated' | 'Closed';

// ponytail: mock records keyed by employee; replace with GET /probations
export const probations = signal<Probation[]>([
  { employee: 'Suchi Thakur', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2025-04-08' },
  { employee: 'Pardeep Kumar', type: 'Full Time', initial: { objectives: 'Deliver sprint commitments on time\nReview pull requests within 1 working day', development: 'Code review workshop', on: '2026-04-24', by: 'Suchi Thakur' }, extendedTo: '2026-10-31', decisions: [{ outcome: 'Extend', effectiveOn: '2026-07-19', decidedOn: '2026-07-16', by: 'Suchi Thakur', extendMonths: 3, reason: 'Delivery and review turnaround below expectations' }] },
  { employee: 'Narayan Chandra Barik', type: 'Full Time', initial: { objectives: 'Ship the leave module API end to end\nClose 90% of sprint tickets on time', development: 'Angular and NestJS onboarding course; pair with Pardeep for the first month', on: '2026-07-30', by: 'Suchi Thakur' } },
  { employee: 'NC Barik', type: 'Full Time' },
  { employee: 'Nar Barik', type: 'Full Time' },
  { employee: 'Test Firsteho', type: 'Part Time' },
  { employee: 'Test Firsteru', type: 'Full Time', outcome: 'Terminated', decidedOn: '2026-06-01', rmReviewOn: '2026-05-25', initial: { objectives: 'Process payroll inputs by the 20th each month', development: 'Payroll system training', on: '2026-03-06', by: 'Narayan Chandra Barik' } },
  { employee: 'TestAdmin Test', type: 'Full Time', initial: { objectives: 'Own user access requests within 1 working day\nDocument the admin runbook', development: 'Security awareness training', on: '2026-10-06', by: 'Narayan Chandra Barik' } },
  { employee: 'TestEmployee TestLastName', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2026-09-15', rmReviewOn: '2026-09-04', ackOn: '2026-09-05', initial: { objectives: 'Run the onboarding checklist for new joiners', development: 'HRMS admin training', on: '2026-06-19', by: 'Narayan Chandra Barik' } },
]);

export interface LeaveLike { employee: string; type: string; from: string; to: string; status: string; }

// approved leave of an eligible type, at least N consecutive days, overlapping the probation → days added
export function leaveAdjustment(employee: string, start: string, baseEnd: string, leaves: LeaveLike[], s: ProbationSettings) {
  const eligible = leaves.filter(l => l.employee === employee && s.leaveTypes.includes(l.type) &&
    (l.status === 'Approved' || l.status === 'Cancel Rejected') && l.from <= baseEnd && l.to >= start);
  const items = eligible.map(l => {
    const from = l.from < start ? start : l.from, to = l.to > baseEnd ? baseEnd : l.to;
    let days = daysBetween(from, to) + 1;
    if (s.leaveBasis === 'working') { days = 0; for (let d = from; d <= to; d = addDays(d, 1)) if (parse(d).getDay() % 6) days++; }
    return { from, to, type: l.type, days };
  }).filter(x => daysBetween(x.from, x.to) + 1 >= s.leaveMinConsecutiveDays);
  return { items, days: items.reduce((t, x) => t + x.days, 0) };
}

export function timeline(p: Probation, joined: string, leaves: LeaveLike[], s: ProbationSettings, today: string) {
  const months = s.durations[p.type] ?? 0;
  const baseEnd = probationEnd(joined, months || 0);
  const adj = leaveAdjustment(p.employee, joined, baseEnd, leaves, s);
  const adjustedEnd = addDays(baseEnd, adj.days);
  const end = p.extendedTo ?? adjustedEnd;
  const reviewOpens = addDays(end, -s.reviewOpensDaysBefore);
  const stage: Stage = p.outcome ?? (today < reviewOpens ? (p.extendedTo ? 'Extended' : 'In Probation') : today <= end ? 'Review Due' : 'Overdue');
  const total = Math.max(1, daysBetween(joined, end) + 1);
  const elapsed = Math.min(total, Math.max(0, daysBetween(joined, today) + 1));
  return { start: joined, baseEnd, adjustedEnd, end, reviewOpens, adj, stage, daysLeft: daysBetween(today, end), progress: elapsed / total, exempt: !months };
}

// ── milestones, notifications, audit ─────────────────────────────────────
export interface Milestone { date: string; label: string; kind: 'start' | 'meeting' | 'reminder' | 'review' | 'submitted' | 'leave' | 'end' | 'extension' | 'outcome'; event?: EventKey; done: boolean; note?: string; }

// everything that has happened / will happen, in date order; notification events are attached where one is sent
export function milestones(p: Probation, t: ReturnType<typeof timeline>, s: ProbationSettings, today: string): Milestone[] {
  const m: Milestone[] = [{ date: t.start, label: 'Probation started', kind: 'start', event: 'started', done: true }];
  for (const l of t.adj.items) m.push({ date: l.to, label: `${l.type} · ${l.days} day${l.days === 1 ? '' : 's'} added`, kind: 'leave', event: 'leaveAdjusted', done: l.to <= today });
  const closed = !!p.outcome;
  const due = addDays(t.start, INITIAL_MEETING_DAYS - 1);
  m.push(p.initial ? { date: p.initial.on, label: 'Initial meeting · objectives set', kind: 'meeting', done: true, note: `by ${p.initial.by}` }
    : { date: due, label: 'Initial meeting due · objectives and development plan', kind: 'meeting', done: closed });
  // one RM review cycle per end date; an extension runs a second cycle against the new end
  const cycle = (end: string, current: boolean) => {
    for (const n of s.reminderDays) { const d = addDays(end, -n); if (d >= t.start) m.push({ date: d, label: `Reminder · ${n} days before end`, kind: 'reminder', event: 'reminder', done: d <= today || closed || !current }); }
    const open = addDays(end, -s.reviewOpensDaysBefore);
    m.push({ date: open, label: 'RM review opened', kind: 'review', event: 'reviewOpen', done: open <= today || closed || !current });
  };
  cycle(t.adjustedEnd, !p.extendedTo);
  m.push({ date: t.adjustedEnd, label: p.extendedTo ? 'Original end date' : 'Probation ends', kind: 'end', done: t.adjustedEnd <= today || closed });
  if (p.extendedTo) {
    const ext = p.decisions?.find(d => d.outcome === 'Extend');
    m.push({ date: addDays(t.adjustedEnd, 1), label: 'Probation extended', kind: 'extension', event: 'extended', done: true, note: `New end ${p.extendedTo}${ext?.extendMonths ? ` · ${ext.extendMonths} month(s)` : ''}` });
    cycle(p.extendedTo, true);
    m.push({ date: p.extendedTo, label: 'Extended probation ends', kind: 'end', done: p.extendedTo <= today || closed });
  }
  if (p.rmReviewOn) m.push({ date: p.rmReviewOn, label: 'RM review submitted', kind: 'submitted', event: 'reviewSubmitted', done: true });
  if (p.ackOn) m.push({ date: p.ackOn, label: 'Employee acknowledged the review', kind: 'submitted', done: true });
  if (p.outcome) m.push({ date: p.decidedOn!, label: p.outcome === 'Closed' ? `Closed · employee exit on ${p.exitOn}` : p.outcome, kind: 'outcome', event: p.outcome === 'Confirmed' ? 'confirmed' : p.outcome === 'Terminated' ? 'terminated' : undefined, done: true, note: p.exitReason });
  if (!closed && t.daysLeft < 0) m.push({ date: today, label: `Overdue · RM reminded every ${s.escalateEveryDays === 1 ? 'day' : s.escalateEveryDays + ' days'}, HR escalates by email`, kind: 'review', event: 'overdue', done: true });
  return m.sort((a, b) => a.date.localeCompare(b.date));
}

// ponytail: mock bounce — reminders to a non-company mailbox fail; replace with delivery status from the mail API
export const deliveryFailed = (p: Probation, m: Milestone) =>
  m.event === 'reminder' && !employees().find(e => e.name === p.employee)?.email.endsWith('@harbourandhills.com');

export interface LogEntry { employee: string; at: string; by: string; action: string; }
// ponytail: manual actions (resends etc.); system events are derived from milestones until the API returns a real audit log
export const probationLog = signal<LogEntry[]>([]);
export function log(employee: string, by: string, action: string) {
  probationLog.update(l => [{ employee, at: new Date().toISOString(), by, action }, ...l]);
}

// ── reviews ──────────────────────────────────────────────────────────────
export type ReviewBy = 'rm';                // HR: no self assessment for probation
export type Recommendation = 'Confirm' | 'Extend' | 'Terminate';
export interface Review {
  employee: string; by: ReviewBy;
  ratings: Record<string, number>;          // criterion → 1..n
  notes: Record<string, string>;            // criterion → comment
  answers: Record<string, string>;          // open questions
  recommendation?: Recommendation;          // RM only
  extendMonths?: number; extensionFocus?: string; reason?: string; // depending on recommendation
  objectivesMet?: 'Yes' | 'No';
  savedAt?: string; submittedOn?: string;
}
// Appendix F Part 2/3; 'improve' is required once any area is rated at the lowest level, 'action' when objectives were not met
export const RM_QUESTIONS = [
  { key: 'improve', label: 'Where performance, conduct or attendance needs improvement: details, and how it will be addressed', required: false },
  { key: 'action', label: 'If the objectives were not met, what further action is required?', required: false },
];
// rating average → suggested outcome, from the Settings thresholds
export const suggest = (avg: number, s: Pick<ProbationSettings, 'confirmAtOrAbove' | 'extendAtOrAbove'>): Recommendation =>
  avg >= s.confirmAtOrAbove ? 'Confirm' : avg >= s.extendAtOrAbove ? 'Extend' : 'Terminate';

// ponytail: mock submitted reviews matching the probation records; replace with GET/PUT /probations/:id/reviews
const filled = (n: number, crit: string[]) => Object.fromEntries(crit.map((c, i) => [c, Math.max(1, Math.min(4, n + (i % 2 ? 0 : 1) - (i === 3 ? 1 : 0)))]));
export const reviews = signal<Review[]>([
  ['Test Firsteru', 'rm', 1, '2026-05-25'], ['TestEmployee TestLastName', 'rm', 3, '2026-09-04'],
].map(([employee, by, n, submittedOn]) => ({
  employee: employee as string, by: by as ReviewBy, ratings: filled(n as number, DEFAULT_SETTINGS.criteria), notes: {},
  answers: (n as number) >= 3 ? {} as Record<string, string> : { improve: 'Repeated late arrivals and missed deadlines despite two discussions.', action: 'Not confirmed.' },
  objectivesMet: (n as number) >= 3 ? 'Yes' as const : 'No' as const,
  recommendation: (n as number) >= 3 ? 'Confirm' : (n as number) >= 2 ? 'Extend' : 'Terminate', submittedOn: submittedOn as string,
})));
export const reviewOf = (employee: string, by: ReviewBy) => reviews().find(r => r.employee === employee && r.by === by);
export const average = (r: Pick<Review, 'ratings'>, criteria: string[]) => {
  const v = criteria.map(c => r.ratings[c]).filter(Boolean);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100 : 0;
};
export function saveReview(r: Review, submit: boolean) {
  const now = new Date().toISOString();
  const next: Review = { ...r, savedAt: now, submittedOn: submit ? now.slice(0, 10) : r.submittedOn };
  reviews.update(list => [...list.filter(x => !(x.employee === r.employee && x.by === r.by)), next]);
  if (submit) probations.update(list => list.map(p => p.employee !== r.employee ? p : { ...p, rmReviewOn: next.submittedOn }));
  return next;
}


// ── decision: the RM's submitted review is the decision (HR: RM is the final authority) ──
export function extendTo(currentEnd: string, months: number) { return probationEnd(addDays(currentEnd, 1), months); }

// ponytail: POST /probations/:id/decision once the endpoint is shared
export function decide(employee: string, d: Decision) {
  probations.update(list => list.map(p => {
    if (p.employee !== employee) return p;
    const decisions = [...(p.decisions ?? []), d];
    if (d.outcome === 'Extend') {
      // the RM reviews again before the new end date; the first review stays on the decision record
      reviews.update(l => l.map(r => r.employee === employee ? { ...r, submittedOn: undefined, recommendation: undefined } : r));
      return { ...p, decisions, extendedTo: extendTo(d.effectiveOn, d.extendMonths!), rmReviewOn: undefined };
    }
    return { ...p, decisions, outcome: d.outcome === 'Confirm' ? 'Confirmed' : 'Terminated', decidedOn: d.decidedOn };
  }));
}

// effective dates from the HR answers: confirm = day after the end date, terminate = immediately, extend runs from the end date
export function effectiveFor(o: Recommendation, end: string, today: string) { return o === 'Confirm' ? addDays(end, 1) : o === 'Terminate' ? today : end; }

// the RM on the profile reviews; HR can hand it to the department head when the RM is unavailable
export const hodOf = (employee: string) => departments().find(d => d.name === employees().find(e => e.name === employee)?.department)?.head || '';
export const reviewerOf = (p: Probation) => p.reviewer || employees().find(e => e.name === p.employee)?.manager || '';

export function assignToHod(employee: string, by: string, why: string) {
  const hod = hodOf(employee);
  probations.update(l => l.map(p => p.employee === employee ? { ...p, reviewer: hod } : p));
  log(employee, by, `Review reassigned to HOD ${hod} · ${why}`);
}

// HR corrects a decision: back to the RM review, audit kept; an extension's new end date is not changed
export function reopen(employee: string, by: string, why: string) {
  probations.update(l => l.map(p => p.employee !== employee ? p : { ...p, outcome: undefined, decidedOn: undefined, rmReviewOn: undefined, ackOn: undefined, exitOn: undefined, exitReason: undefined }));
  reviews.update(l => l.map(r => r.employee === employee ? { ...r, submittedOn: undefined } : r));
  log(employee, by, `Reopened for correction · ${why}`);
}

export function setInitialMeeting(employee: string, m: InitialMeeting) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, initial: m } : p));
  log(employee, m.by, 'Initial meeting recorded · objectives and development plan set');
}
export function acknowledge(employee: string, on: string) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, ackOn: on } : p));
  log(employee, employee, 'Acknowledged the probation review');
}

export function closeOnExit(employee: string, by: string, exitOn: string, reason: string) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, outcome: 'Closed', decidedOn: exitOn, exitOn, exitReason: reason } : p));
  log(employee, by, `Closed · employee exit on ${exitOn} · ${reason}`);
}
