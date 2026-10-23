import { signal } from '@angular/core';

// ── settings ─────────────────────────────────────────────────────────────
// ponytail: every default below is a placeholder answer to the HR query sheet
// (modules/probation/probation_work_flow_query.xlsx); swap for GET/PUT /probation/settings
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract'];
export const ROLES = ['Employee', 'RM', 'HR', 'Payroll'] as const;
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
  { key: 'pipStarted', label: 'PIP started' },
  { key: 'pipCheckpoint', label: 'PIP checkpoint due' },
  { key: 'pipOutcome', label: 'PIP outcome' },
  { key: 'leaveAdjusted', label: 'Timeline adjusted for leave' },
  { key: 'letterApproval', label: 'Letter awaiting approval' },
  { key: 'letterIssued', label: 'Letter issued' },
] as const;
export type EventKey = typeof EVENTS[number]['key'];

export interface ProbationSettings {
  durations: Record<string, number>;          // months per employment type; 0 = exempt
  startOn: 'joining' | 'onboarding';
  reviewOpensDaysBefore: number;
  reminderDays: number[];                      // days before end date
  escalateEveryDays: number;                   // after end date, until reviews are in
  blockDecisionUntilBothReviews: boolean;
  scale: string[];                             // labels for 1..n
  criteria: string[];
  commentRequiredAtOrBelow: number;
  confirmAtOrAbove: number;                    // average rating
  extendAtOrAbove: number;                     // below this → terminate
  hrCanOverride: boolean;
  maxExtensions: number;
  maxExtensionMonths: number;
  pipRequiredOnExtension: boolean;
  pipDurationDays: number;
  pipCheckpointEveryDays: number;
  leaveTypes: string[];                        // leave that pushes the end date
  leaveMinConsecutiveDays: number;
  leaveBasis: 'calendar' | 'working';
  recipients: Record<EventKey, Role[]>;
  channels: { inApp: boolean; email: boolean };
}

const all: Role[] = ['Employee', 'RM', 'HR'];
export const DEFAULT_SETTINGS: ProbationSettings = {
  durations: { 'Full Time': 3, 'Part Time': 3, 'Contract': 0 },
  startOn: 'joining',
  reviewOpensDaysBefore: 30,
  reminderDays: [30, 15, 7],
  escalateEveryDays: 1,
  blockDecisionUntilBothReviews: true,
  scale: ['Unsatisfactory', 'Needs Improvement', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding'],
  criteria: ['Job Knowledge', 'Quality of Work', 'Productivity', 'Communication', 'Teamwork', 'Attendance & Punctuality'],
  commentRequiredAtOrBelow: 2,
  confirmAtOrAbove: 3.5,
  extendAtOrAbove: 2.5,
  hrCanOverride: true,
  maxExtensions: 1,
  maxExtensionMonths: 3,
  pipRequiredOnExtension: true,
  pipDurationDays: 60,
  pipCheckpointEveryDays: 30,
  leaveTypes: ['Leave Without Pay (LWP)', 'Sick Leave'],
  leaveMinConsecutiveDays: 5,
  leaveBasis: 'calendar',
  recipients: {
    started: all, reminder: all, reviewOpen: all, reviewSubmitted: ['RM', 'HR'], overdue: ['RM', 'HR'],
    confirmed: [...all, 'Payroll'], extended: [...all, 'Payroll'], terminated: [...all, 'Payroll'],
    pipStarted: all, pipCheckpoint: all, pipOutcome: [...all, 'Payroll'], leaveAdjusted: all,
    letterApproval: ['HR'], letterIssued: ['Employee', 'HR', 'Payroll'],
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
export type Outcome = 'Confirmed' | 'Terminated';
export interface Decision {
  outcome: Recommendation; effectiveOn: string; decidedOn: string; by: string;
  rmRecommendation?: Recommendation; overrideReason?: string;
  extendMonths?: number; lastWorkingDay?: string; reason?: string; note?: string;
}
export interface Probation {
  employee: string;
  decisions?: Decision[];
  type: string;                      // employment type
  outcome?: Outcome; decidedOn?: string;
  extendedTo?: string; pip?: boolean;
  employeeReviewOn?: string; rmReviewOn?: string;
}
export type Stage = 'In Probation' | 'Review Due' | 'Overdue' | 'Extended · PIP' | 'Confirmed' | 'Terminated';

// ponytail: mock records keyed by employee; replace with GET /probations
export const probations = signal<Probation[]>([
  { employee: 'Suchi Thakur', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2025-04-08' },
  { employee: 'Pardeep Kumar', type: 'Full Time', extendedTo: '2026-10-31', pip: true, employeeReviewOn: '2026-07-10', rmReviewOn: '2026-07-14' },
  { employee: 'Narayan Chandra Barik', type: 'Full Time', employeeReviewOn: '2026-10-05' },
  { employee: 'NC Barik', type: 'Full Time' },
  { employee: 'Nar Barik', type: 'Full Time' },
  { employee: 'Test Firsteho', type: 'Part Time', employeeReviewOn: '2026-10-12' },
  { employee: 'Test Firsteru', type: 'Full Time', outcome: 'Terminated', decidedOn: '2026-06-01', employeeReviewOn: '2026-05-20', rmReviewOn: '2026-05-25' },
  { employee: 'TestAdmin Test', type: 'Full Time' },
  { employee: 'TestEmployee TestLastName', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2026-09-15', employeeReviewOn: '2026-09-01', rmReviewOn: '2026-09-04' },
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
  const stage: Stage = p.outcome ?? (p.extendedTo ? 'Extended · PIP' : today < reviewOpens ? 'In Probation' : today <= end ? 'Review Due' : 'Overdue');
  const total = Math.max(1, daysBetween(joined, end) + 1);
  const elapsed = Math.min(total, Math.max(0, daysBetween(joined, today) + 1));
  return { start: joined, baseEnd, adjustedEnd, end, reviewOpens, adj, stage, daysLeft: daysBetween(today, end), progress: elapsed / total, exempt: !months };
}

// ── milestones, notifications, audit ─────────────────────────────────────
export interface Milestone { date: string; label: string; kind: 'start' | 'reminder' | 'review' | 'submitted' | 'leave' | 'end' | 'extension' | 'outcome'; event?: EventKey; done: boolean; note?: string; }

// everything that has happened / will happen, in date order; notification events are attached where one is sent
export function milestones(p: Probation, t: ReturnType<typeof timeline>, s: ProbationSettings, today: string): Milestone[] {
  const m: Milestone[] = [{ date: t.start, label: 'Probation started', kind: 'start', event: 'started', done: true }];
  for (const l of t.adj.items) m.push({ date: l.to, label: `${l.type} · ${l.days} day${l.days === 1 ? '' : 's'} added`, kind: 'leave', event: 'leaveAdjusted', done: l.to <= today });
  const closed = !!p.outcome;
  const base = p.extendedTo ? t.adjustedEnd : t.end;               // first review cycle runs against the pre-extension end
  for (const n of s.reminderDays) { const d = addDays(base, -n); if (d >= t.start) m.push({ date: d, label: `Reminder · ${n} days before end`, kind: 'reminder', event: 'reminder', done: d <= today || closed }); }
  m.push({ date: addDays(base, -s.reviewOpensDaysBefore), label: 'Reviews opened', kind: 'review', event: 'reviewOpen', done: addDays(base, -s.reviewOpensDaysBefore) <= today || closed });
  if (p.employeeReviewOn) m.push({ date: p.employeeReviewOn, label: 'Self review submitted', kind: 'submitted', event: 'reviewSubmitted', done: true });
  if (p.rmReviewOn) m.push({ date: p.rmReviewOn, label: 'RM review submitted', kind: 'submitted', event: 'reviewSubmitted', done: true });
  m.push({ date: base, label: p.extendedTo ? 'Original end date' : 'Probation ends', kind: 'end', done: base <= today || closed });
  if (p.extendedTo) {
    m.push({ date: addDays(base, 1), label: 'Extended with PIP', kind: 'extension', event: 'extended', done: true, note: `New end ${p.extendedTo}` });
    m.push({ date: p.extendedTo, label: 'Extended probation ends', kind: 'end', done: p.extendedTo <= today });
  }
  if (p.outcome) m.push({ date: p.decidedOn!, label: p.outcome, kind: 'outcome', event: p.outcome === 'Confirmed' ? 'confirmed' : 'terminated', done: true });
  if (!closed && t.daysLeft < 0) m.push({ date: today, label: `Overdue · escalated to HR every ${s.escalateEveryDays} day(s)`, kind: 'review', event: 'overdue', done: true });
  return m.sort((a, b) => a.date.localeCompare(b.date));
}

export interface LogEntry { employee: string; at: string; by: string; action: string; }
// ponytail: manual actions (resends etc.); system events are derived from milestones until the API returns a real audit log
export const probationLog = signal<LogEntry[]>([]);
export function log(employee: string, by: string, action: string) {
  probationLog.update(l => [{ employee, at: new Date().toISOString(), by, action }, ...l]);
}

// ── reviews ──────────────────────────────────────────────────────────────
export type ReviewBy = 'self' | 'rm';
export type Recommendation = 'Confirm' | 'Extend' | 'Terminate';
export interface Review {
  employee: string; by: ReviewBy;
  ratings: Record<string, number>;          // criterion → 1..n
  notes: Record<string, string>;            // criterion → comment
  answers: Record<string, string>;          // open questions
  recommendation?: Recommendation;          // RM only
  extendMonths?: number; pipFocus?: string; reason?: string; // RM only, depending on recommendation
  savedAt?: string; submittedOn?: string;
}
export const SELF_QUESTIONS = [
  { key: 'achievements', label: 'Key achievements during probation', required: true },
  { key: 'challenges', label: 'Challenges you faced and how you handled them', required: true },
  { key: 'support', label: 'Support or training you need', required: false },
  { key: 'goals', label: 'Goals for the next 6 months', required: true },
];

export const RM_QUESTIONS = [
  { key: 'strengths', label: 'Strengths observed during probation', required: true },
  { key: 'improve', label: 'Areas that need improvement', required: true },
];
// rating average → suggested outcome, from the Settings thresholds
export const suggest = (avg: number, s: Pick<ProbationSettings, 'confirmAtOrAbove' | 'extendAtOrAbove'>): Recommendation =>
  avg >= s.confirmAtOrAbove ? 'Confirm' : avg >= s.extendAtOrAbove ? 'Extend' : 'Terminate';

// ponytail: mock submitted reviews matching the probation records; replace with GET/PUT /probations/:id/reviews
const filled = (n: number, crit: string[]) => Object.fromEntries(crit.map((c, i) => [c, Math.max(1, Math.min(5, n + (i % 2 ? 0 : 1) - (i === 3 ? 1 : 0)))]));
export const reviews = signal<Review[]>([
  ['Narayan Chandra Barik', 'self', 4, '2026-10-05'], ['Pardeep Kumar', 'self', 3, '2026-07-10'], ['Pardeep Kumar', 'rm', 2, '2026-07-14'],
  ['Test Firsteho', 'self', 4, '2026-10-12'], ['TestEmployee TestLastName', 'self', 4, '2026-09-01'], ['TestEmployee TestLastName', 'rm', 4, '2026-09-04'],
].map(([employee, by, n, submittedOn]) => ({
  employee: employee as string, by: by as ReviewBy, ratings: filled(n as number, DEFAULT_SETTINGS.criteria), notes: {},
  answers: { achievements: 'Delivered assigned work on time and took over two additional modules.', challenges: 'Ramp-up on internal tools; paired with a senior colleague.', support: '', goals: 'Lead one module end to end.' },
  recommendation: by === 'rm' ? ((n as number) >= 4 ? 'Confirm' : 'Extend') : undefined, submittedOn: submittedOn as string,
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
  if (submit) probations.update(list => list.map(p => p.employee !== r.employee ? p : { ...p, [r.by === 'self' ? 'employeeReviewOn' : 'rmReviewOn']: next.submittedOn }));
  return next;
}


// ── HR decision ──────────────────────────────────────────────────────────
export function extendTo(currentEnd: string, months: number) { return probationEnd(addDays(currentEnd, 1), months); }

// ponytail: POST /probations/:id/decision once the endpoint is shared
export function decide(employee: string, d: Decision) {
  probations.update(list => list.map(p => {
    if (p.employee !== employee) return p;
    const decisions = [...(p.decisions ?? []), d];
    if (d.outcome === 'Extend') {
      const end = extendTo(d.effectiveOn, d.extendMonths!);
      if (probationSettings().pipRequiredOnExtension)
        createPip(employee, addDays(d.effectiveOn, 1), end, reviewOf(employee, 'rm')?.pipFocus, probationSettings().pipCheckpointEveryDays);
      return { ...p, decisions, extendedTo: end, pip: true };
    }
    return { ...p, decisions, outcome: d.outcome === 'Confirm' ? 'Confirmed' : 'Terminated', decidedOn: d.decidedOn };
  }));
}

// ── PIP ──────────────────────────────────────────────────────────────────
export interface PipObjective { title: string; measure: string; status: 'Not started' | 'On track' | 'At risk' | 'Met' | 'Not met'; }
export interface PipCheckIn { due: string; selfOn?: string; selfNote?: string; rmOn?: string; rmRating?: number; rmNote?: string; }
export interface Pip {
  employee: string; start: string; end: string;
  objectives: PipObjective[]; objectivesApprovedOn?: string;
  checkIns: PipCheckIn[];
  outcome?: 'Confirmed' | 'Terminated'; decidedOn?: string;
}
export type PipStage = 'Awaiting Objectives' | 'Active' | 'Check-in Due' | 'Outcome Due' | 'Confirmed' | 'Terminated';

// check-ins every N days from the start; the last one falls on the PIP end
export function checkInDates(start: string, end: string, every: number) {
  const out: string[] = [];
  for (let d = addDays(start, every - 1); d < end; d = addDays(d, every)) out.push(d);
  out.push(end);
  return out;
}

export function pipStage(p: Pip, today: string): PipStage {
  if (p.outcome) return p.outcome;
  if (!p.objectivesApprovedOn) return 'Awaiting Objectives';
  if (today >= p.end) return 'Outcome Due';
  return p.checkIns.some(c => c.due <= today && !c.rmOn) ? 'Check-in Due' : 'Active';
}

export function createPip(employee: string, start: string, end: string, focus: string | undefined, every: number) {
  const objectives: PipObjective[] = (focus ?? '').split(/\n|;/).map(t => t.trim()).filter(Boolean)
    .map(title => ({ title, measure: '', status: 'Not started' }));
  pips.update(l => [...l.filter(x => x.employee !== employee), { employee, start, end, objectives, checkIns: checkInDates(start, end, every).map(due => ({ due })) }]);
}

// ponytail: mock PIP for the extended probation; replace with GET /pips
export const pips = signal<Pip[]>([{
  employee: 'Pardeep Kumar', start: '2026-07-20', end: '2026-10-31',
  objectives: [
    { title: 'Deliver sprint commitments on time', measure: '90% of tickets closed within the sprint', status: 'On track' },
    { title: 'Improve code review turnaround', measure: 'Reviews completed within 1 working day', status: 'At risk' },
    { title: 'Document the payments module', measure: 'Runbook reviewed and approved by RM', status: 'Met' },
  ],
  objectivesApprovedOn: '2026-07-24',
  checkIns: [
    { due: '2026-08-18', selfOn: '2026-08-17', rmOn: '2026-08-19', rmRating: 3, rmNote: 'Steady progress on delivery.' },
    { due: '2026-09-17', selfOn: '2026-09-16', rmOn: '2026-09-18', rmRating: 3, rmNote: 'Reviews still slow.' },
    { due: '2026-10-17', selfOn: '2026-10-16', selfNote: 'Closed 9 of 10 sprint tickets; reviews now same-day.' },
    { due: '2026-10-31' },
  ],
}]);

// ponytail: PUT/POST /pips/:id/* once the endpoints are shared
export function updatePip(employee: string, fn: (p: Pip) => Pip) { pips.update(l => l.map(p => p.employee === employee ? fn(structuredClone(p)) : p)); }

// PIP outcome closes the PIP and the probation it extended
export function closePip(employee: string, outcome: 'Confirmed' | 'Terminated', on: string, by: string, reason?: string) {
  updatePip(employee, p => ({ ...p, outcome, decidedOn: on }));
  probations.update(l => l.map(p => p.employee !== employee ? p : {
    ...p, outcome, decidedOn: on,
    decisions: [...(p.decisions ?? []), { outcome: outcome === 'Confirmed' ? 'Confirm' : 'Terminate', effectiveOn: on, decidedOn: on, by, reason, note: 'PIP outcome' }],
  }));
}
