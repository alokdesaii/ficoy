import { signal } from '@angular/core';
import { departments } from './departments';
import { employees } from './employees';

// ── settings ─────────────────────────────────────────────────────────────
// ponytail: every default below is a placeholder answer to the HR query sheet
// (modules/probation/probation_work_flow_query.xlsx); swap for GET/PUT /probation/settings
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time', 'Contract'];
export const ROLES = ['Employee', 'RM', 'HOD', 'HR', 'Admin', 'Payroll'] as const;
export type Role = typeof ROLES[number];

export const EVENTS = [
  { key: 'started', label: 'Probation started' },
  { key: 'initiated', label: 'Probation initiated (initial meeting held)' },
  { key: 'approved', label: 'Outcome approved' },
  { key: 'formSent', label: 'Probation form sent to RM' },
  { key: 'ended', label: 'Probation end date reached' },
  { key: 'reminder', label: 'Probation ending reminder' },
  { key: 'reviewOpen', label: 'Review opened' },
  { key: 'reviewSubmitted', label: 'Review submitted' },
  { key: 'overdue', label: 'Review overdue (escalation)' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'extended', label: 'Extended' },
  { key: 'terminated', label: 'Terminated' },
  { key: 'approvalNeeded', label: 'Outcome awaiting approval' },
  { key: 'sentBack', label: 'Outcome sent back to RM' },
  { key: 'corrected', label: 'Outcome reopened by HR' },
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
  recipients: Record<EventKey, Role[]>;
  channels: { inApp: boolean; email: boolean };
}

const all: Role[] = ['Employee', 'RM', 'HOD', 'HR'];   // HR: HOD only when different from the RM
export const DEFAULT_SETTINGS: ProbationSettings = {
  durations: { 'Full Time': 3, 'Part Time': 3, 'Contract': 3 },   // HR Q06: everyone, rehires included
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
  recipients: {
    started: all, initiated: all, approved: all, formSent: ['RM'], ended: all, reminder: all, reviewOpen: all, reviewSubmitted: ['RM', 'HOD', 'HR'], overdue: ['RM', 'HOD', 'HR'],
    confirmed: all, extended: all, terminated: [],          // HR: no notifications for termination
    approvalNeeded: ['HOD', 'Admin'], sentBack: ['RM', 'HR'], corrected: all, letterIssued: ['Employee', 'HR'], deliveryFailed: ['HR'],
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
  extendMonths?: number; lastWorkingDay?: string; reason?: string; note?: string; approvedOn?: string;
}
export interface Probation {
  employee: string;
  decisions?: Decision[];
  type: string;                      // employment type
  outcome?: Outcome; decidedOn?: string;
  extendedTo?: string;
  rmReviewOn?: string;
  reviewer?: string; reviewerRole?: 'HOD' | 'Admin';   // exception takeover when the RM is unavailable
  initial?: InitialMeeting;          // Appendix F Part 1
  ackOn?: string;                    // employee acknowledged the RM review (form sign-off)
  exitOn?: string; exitReason?: string;
  months?: number;                   // HR Q04: per-employee exception to the type's duration
  cycle?: number;                    // HR Q33: a rehire gets a new record, numbered 2, 3…
  reopenedOn?: string;               // HR correction → notifies
  applicable?: boolean;              // false = HR/Admin exempted this employee (rare)
  hr?: { receivedBy: string; receivedOn: string; issuedOn?: string };   // Outcome Confirmation Form, HR processing
  pending?: { d: Decision; chain: Approver[]; approved: { role: Approver; by: string; on: string }[] };   // outcome waiting on the approval chain
}
export type Approver = 'HOD' | 'Admin';
export interface InitialMeeting { held: 'Yes' | 'No'; objectives: string; development: string; on: string; by: string; }
// final list: one extension, never past 6 months from joining
export const MAX_TOTAL_MONTHS = 6;
export const INITIAL_MEETING_DAYS = 7;   // People SOP 8.3: within 1 week of starting
export type Stage = 'In Probation' | 'Review Due' | 'Overdue' | 'Extended' | 'Awaiting Approval' | 'Confirmed' | 'Terminated' | 'Closed' | 'Not Applicable';

// ponytail: mock records keyed by employee; replace with GET /probations
export const probations = signal<Probation[]>([
  { employee: 'Suchi Thakur', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2025-04-08' },
  { employee: 'Pardeep Kumar', type: 'Full Time', initial: { held: 'Yes', objectives: 'Deliver sprint commitments on time\nReview pull requests within 1 working day', development: 'Code review workshop', on: '2026-04-24', by: 'Suchi Thakur' }, extendedTo: '2026-10-31', decisions: [{ outcome: 'Extend', effectiveOn: '2026-07-19', decidedOn: '2026-07-16', by: 'Suchi Thakur', extendMonths: 3, reason: 'Delivery and review turnaround below expectations' }] },
  { employee: 'Narayan Chandra Barik', type: 'Full Time', initial: { held: 'Yes', objectives: 'Ship the leave module API end to end\nClose 90% of sprint tickets on time', development: 'Angular and NestJS onboarding course; pair with Pardeep for the first month', on: '2026-07-30', by: 'Suchi Thakur' } },
  { employee: 'NC Barik', type: 'Full Time' },
  { employee: 'Nar Barik', type: 'Full Time', cycle: 2 },
  { employee: 'Test Firsteho', type: 'Part Time' },
  { employee: 'Test Firsteru', type: 'Full Time', outcome: 'Terminated', decidedOn: '2026-06-01', rmReviewOn: '2026-05-25', initial: { held: 'Yes', objectives: 'Process payroll inputs by the 20th each month', development: 'Payroll system training', on: '2026-03-06', by: 'Narayan Chandra Barik' } },
  { employee: 'TestAdmin Test', type: 'Full Time', initial: { held: 'Yes', objectives: 'Own user access requests within 1 working day\nDocument the admin runbook', development: 'Security awareness training', on: '2026-10-06', by: 'Narayan Chandra Barik' } },
  { employee: 'TestEmployee TestLastName', type: 'Full Time', outcome: 'Confirmed', decidedOn: '2026-09-15', rmReviewOn: '2026-09-04', ackOn: '2026-09-05', initial: { held: 'Yes', objectives: 'Run the onboarding checklist for new joiners', development: 'HRMS admin training', on: '2026-06-19', by: 'Narayan Chandra Barik' } },
]);

// HR Q05/Q20 + call: probation ends on the actual date; leave, holidays and weekends never move it
export function timeline(p: Probation, joined: string, s: ProbationSettings, today: string) {
  const months = p.months ?? s.durations[p.type] ?? 0;
  const baseEnd = probationEnd(joined, months || 0);
  const end = p.extendedTo ?? baseEnd;
  const reviewOpens = addDays(end, -s.reviewOpensDaysBefore);
  const stage: Stage = p.applicable === false ? 'Not Applicable' : p.outcome ?? (p.pending ? 'Awaiting Approval' : today < reviewOpens ? (p.extendedTo ? 'Extended' : 'In Probation') : today <= end ? 'Review Due' : 'Overdue');
  const total = Math.max(1, daysBetween(joined, end) + 1);
  const elapsed = Math.min(total, Math.max(0, daysBetween(joined, today) + 1));
  return { start: joined, months, baseEnd, end, reviewOpens, stage, daysLeft: daysBetween(today, end), progress: elapsed / total, exempt: !months, applicable: p.applicable !== false };
}

// ── milestones, notifications, audit ─────────────────────────────────────
export interface Milestone { date: string; label: string; kind: 'start' | 'meeting' | 'reminder' | 'review' | 'submitted' | 'approval' | 'end' | 'extension' | 'outcome'; event?: EventKey; done: boolean; note?: string; }

// everything that has happened / will happen, in date order; notification events are attached where one is sent
export function milestones(p: Probation, t: ReturnType<typeof timeline>, s: ProbationSettings, today: string): Milestone[] {
  const m: Milestone[] = [{ date: t.start, label: 'Probation started', kind: 'start', event: 'started', done: true },
    // call notes: Ficoy sends the RM the probation (initial meeting) form on joining, to complete within a week
    { date: t.start, label: `Probation form sent to RM · complete within ${INITIAL_MEETING_DAYS} days`, kind: 'meeting', event: 'formSent', done: true }];
  const closed = !!p.outcome;
  const due = addDays(t.start, INITIAL_MEETING_DAYS - 1);
  m.push(p.initial?.held === 'No' ? { date: p.initial.on, label: 'Initial discussion not held yet', kind: 'meeting', done: false, note: `noted by ${p.initial.by}` } : p.initial ? { date: p.initial.on, label: 'Initial meeting · objectives set', kind: 'meeting', event: 'initiated', done: true, note: `by ${p.initial.by}` }
    : { date: due, label: 'Initial meeting due · objectives and development plan', kind: 'meeting', done: closed });
  // one RM review cycle per end date; an extension runs a second cycle against the new end
  const cycle = (end: string, current: boolean) => {
    for (const n of s.reminderDays) { const d = addDays(end, -n); if (d >= t.start) m.push({ date: d, label: `Reminder · ${n} days before end`, kind: 'reminder', event: 'reminder', done: d <= today || closed || !current }); }
    const open = addDays(end, -s.reviewOpensDaysBefore);
    m.push({ date: open, label: 'RM review opened', kind: 'review', event: 'reviewOpen', done: open <= today || closed || !current });
  };
  cycle(t.baseEnd, !p.extendedTo);
  m.push({ date: t.baseEnd, label: p.extendedTo ? 'Original end date' : 'Probation ends', kind: 'end', event: p.extendedTo ? undefined : 'ended', done: t.baseEnd <= today || closed });
  if (p.extendedTo) {
    const ext = p.decisions?.find(d => d.outcome === 'Extend');
    m.push({ date: addDays(t.baseEnd, 1), label: 'Probation extended', kind: 'extension', event: 'extended', done: true, note: `New end ${p.extendedTo}${ext?.extendMonths ? ` · ${ext.extendMonths} month(s)` : ''}` });
    cycle(p.extendedTo, true);
    m.push({ date: p.extendedTo, label: 'Extended probation ends', kind: 'end', event: 'ended', done: p.extendedTo <= today || closed });
  }
  if (p.rmReviewOn) m.push({ date: p.rmReviewOn, label: 'RM review submitted', kind: 'submitted', event: 'reviewSubmitted', done: true });
  if (p.pending) {
    const done = p.pending.approved.map(a => a.role), next = p.pending.chain.find(r => !done.includes(r));
    for (const a of p.pending.approved) m.push({ date: a.on, label: `${a.role} approved · ${p.pending.d.outcome}`, kind: 'approval', done: true, note: `by ${a.by}` });
    m.push({ date: today, label: `Awaiting ${next} approval · ${p.pending.d.outcome}`, kind: 'approval', event: 'approvalNeeded', done: true });
  }
  if (p.reopenedOn) m.push({ date: p.reopenedOn, label: 'HR reopened the decision for correction', kind: 'outcome', event: 'corrected', done: true });
  if (p.ackOn) m.push({ date: p.ackOn, label: 'Employee acknowledged the review', kind: 'submitted', done: true });
  // termination: no automated notification
  for (const d of p.decisions ?? []) if (d.approvedOn && d.outcome !== 'Terminate') m.push({ date: d.approvedOn, label: `Outcome approved · ${d.outcome}`, kind: 'approval', event: 'approved', done: true });
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
  reviewDate?: string;                      // Appendix F: date of the review discussion
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


// ── decision: the RM submits, then HOD (when different from the RM) and Admin approve (HR Q37) ──
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
  // final list: employee record updates immediately; only termination touches payroll
  // ponytail: mock record update; replace with PATCH /employees/:id + payroll event
  if (d.outcome === 'Confirm') { employees.update(l => l.map(e => e.name === employee ? { ...e, status: 'Permanent' } : e)); log(employee, 'System', `Employee record updated · Permanent from ${d.effectiveOn}`); }
  if (d.outcome === 'Terminate') { employees.update(l => l.map(e => e.name === employee ? { ...e, status: 'Terminated', active: false } : e)); log(employee, 'System', `Employee record set inactive · payroll notified for final settlement (last day ${d.lastWorkingDay ?? d.effectiveOn})`); }
}

// effective dates from the HR answers: confirm = day after the end date, terminate = immediately, extend runs from the end date
export function effectiveFor(o: Recommendation, end: string, today: string) { return o === 'Confirm' ? addDays(end, 1) : o === 'Terminate' ? today : end; }

// the RM on the profile reviews; HR can hand it to the department head when the RM is unavailable
export const hodOf = (employee: string) => departments().find(d => d.name === employees().find(e => e.name === employee)?.department)?.head || '';
export const reviewerOf = (p: Probation) => p.reviewer || employees().find(e => e.name === p.employee)?.manager || '';

// ── role views ─────────────────────────────────────────────────────────
// ponytail: demo "view as" switch until real login; each role is played by a fixed mock user
export type ViewRole = 'Admin' | 'RM' | 'HOD' | 'Employee';
export const VIEW_AS: Record<ViewRole, string> = { Admin: 'Suchi Thakur', RM: 'Narayan Chandra Barik', HOD: 'Pardeep Kumar', Employee: 'NC Barik' };
export const viewRole = signal<ViewRole>('Admin');
export const actor = () => VIEW_AS[viewRole()];
// RM: their reportees · HOD: their department · Employee: themself · Admin: everyone
export function inScope(p: Probation) {
  const me = actor(), e = employees().find(x => x.name === p.employee);
  switch (viewRole()) {
    case 'Admin': return true;
    case 'RM': return e?.manager === me || p.reviewer === me;
    case 'HOD': return hodOf(p.employee) === me || p.reviewer === me;
    default: return p.employee === me;
  }
}

// exception: HOD or Admin takes over the review when the RM is unavailable; actor and reason are logged
export function takeOver(employee: string, by: string, role: 'HOD' | 'Admin', why: string) {
  const who = role === 'HOD' ? hodOf(employee) : by;
  probations.update(l => l.map(p => p.employee === employee ? { ...p, reviewer: who, reviewerRole: role } : p));
  log(employee, by, `Exception · review taken over by ${role} ${who} · ${why}`);
}
export function setApplicable(employee: string, by: string, on: boolean, why: string) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, applicable: on ? undefined : false } : p));
  log(employee, by, `Exception · probation marked ${on ? 'applicable' : 'not applicable'} · ${why}`);
}
export function setHrRecord(employee: string, by: string, hr: NonNullable<Probation['hr']>) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, hr } : p));
  log(employee, by, `Outcome Confirmation Form · received by ${hr.receivedBy} on ${hr.receivedOn}${hr.issuedOn ? ` · issued ${hr.issuedOn}` : ''}`);
}
// final list: months left for the one extension so the total stays within 6 months of joining
export const extensionRoom = (t: { months: number }, s: ProbationSettings) => Math.max(0, Math.min(s.maxExtensionMonths, MAX_TOTAL_MONTHS - t.months));

export const chainFor = (employee: string): Approver[] => {
  const p = probations().find(x => x.employee === employee), rm = p ? reviewerOf(p) : '', hod = hodOf(employee);
  return hod && hod !== rm && hod !== employee ? ['HOD', 'Admin'] : ['Admin'];
};
// ponytail: POST /probations/:id/decision → approval queue once the endpoint is shared
export function submitOutcome(employee: string, d: Decision) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, pending: { d, chain: chainFor(employee), approved: [] } } : p));
}
export const nextApprover = (p: Probation) => p.pending?.chain.find(r => !p.pending!.approved.some(a => a.role === r));
export function approve(employee: string, by: string, today: string) {
  const p = probations().find(x => x.employee === employee); if (!p?.pending) return;
  const role = nextApprover(p)!, approved = [...p.pending.approved, { role, by, on: today }];
  log(employee, by, `${role} approved · ${p.pending.d.outcome}`);
  if (approved.length < p.pending.chain.length) { probations.update(l => l.map(x => x.employee === employee ? { ...x, pending: { ...p.pending!, approved } } : x)); return; }
  const d = p.pending.d;
  probations.update(l => l.map(x => x.employee === employee ? { ...x, pending: undefined } : x));
  decide(employee, { ...d, decidedOn: today, approvedOn: today });
}
// HR Q36: a rejection returns the review to the RM for revision
export function sendBack(employee: string, by: string, why: string) {
  const role = nextApprover(probations().find(x => x.employee === employee)!);
  probations.update(l => l.map(p => p.employee === employee ? { ...p, pending: undefined, rmReviewOn: undefined } : p));
  reviews.update(l => l.map(r => r.employee === employee ? { ...r, submittedOn: undefined } : r));
  log(employee, by, `${role} sent back to the RM · ${why}`);
}

// final list: HR reopens / corrects a finalised decision: back to the RM review, audit kept; an extension's new end date is not changed
export function reopen(employee: string, by: string, why: string, months?: number) {
  probations.update(l => l.map(p => p.employee !== employee ? p : { ...p, months: months ?? p.months, reopenedOn: new Date().toISOString().slice(0, 10), outcome: undefined, decidedOn: undefined, rmReviewOn: undefined, ackOn: undefined, exitOn: undefined, exitReason: undefined }));
  reviews.update(l => l.map(r => r.employee === employee ? { ...r, submittedOn: undefined } : r));
  log(employee, by, `HR reopened for correction${months ? ` · duration corrected to ${months} months` : ''} · ${why} · Employee, RM and HR notified`);
}

export function setDuration(employee: string, by: string, months: number, why: string) {
  probations.update(l => l.map(p => p.employee === employee ? { ...p, months } : p));
  log(employee, by, `Probation duration changed to ${months} months · ${why}`);
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
