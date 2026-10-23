import { signal } from '@angular/core';

export const LEAVE_TYPES = ['Casual Leave (CL)', 'Sick Leave', 'Leave Without Pay (LWP)', 'Maternity Leave', 'Paternity Leave', 'Comp Off'];

// ponytail: yearly entitlement mock; real balances come from the leave-config API
export const ENTITLEMENT: Record<string, number> = { 'Casual Leave (CL)': 20, 'Sick Leave': 10, 'Maternity Leave': 0, 'Paternity Leave': 0, 'Comp Off': 0 };
export const CREDIT_TYPES = Object.keys(ENTITLEMENT);
// per-employee overrides set in Leave Configuration; missing entries fall back to ENTITLEMENT
export const credits = signal<Record<string, Record<string, number>>>({});
export const creditFor = (employee: string, type: string) => credits()[employee]?.[type] ?? ENTITLEMENT[type] ?? 0;
export function setCredit(employee: string, type: string, days: number) {
  credits.update(c => ({ ...c, [employee]: { ...c[employee], [type]: days } }));
}
export const CURRENT_USER = 'Suchi Thakur';

const counts = (st: LeaveStatus) => st === 'Pending' || st === 'Approved' || st === 'Cancel Requested' || st === 'Cancel Rejected';
export function balance(employee: string, type: string) {
  const used = leaves().filter(l => l.employee === employee && l.type === type && counts(l.status))
    .reduce((t, l) => t + leaveDays(l.from, l.to, l.session), 0);
  return creditFor(employee, type) - used;
}
// per-type summary for one employee; only types with an entitlement are listed
export function summary(employee: string) {
  const sum = (type: string, sts: LeaveStatus[]) => leaves().filter(l => l.employee === employee && l.type === type && sts.includes(l.status))
    .reduce((t, l) => t + leaveDays(l.from, l.to, l.session), 0);
  const rows = CREDIT_TYPES.map(type => [type, creditFor(employee, type)] as const).filter(([, n]) => n > 0).map(([type, entitled]) => {
    const used = sum(type, ['Approved', 'Cancel Rejected']), pending = sum(type, ['Pending', 'Cancel Requested']);
    return { type, entitled, used, pending, remaining: entitled - used - pending };
  });
  const total = rows.reduce((t, r) => t + r.entitled, 0), taken = rows.reduce((t, r) => t + r.used, 0);
  return { rows, total, taken, pending: rows.reduce((t, r) => t + r.pending, 0), remaining: rows.reduce((t, r) => t + r.remaining, 0) };
}

export const overlaps = (employee: string, from: string, to: string) =>
  leaves().find(l => l.employee === employee && counts(l.status) && l.from <= to && l.to >= from);
export type Session = 'Full Day' | 'First Half' | 'Second Half';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancel Requested' | 'Cancel Approved' | 'Cancel Rejected' | 'Pending Cancelled';
export const LEAVE_STATUSES: LeaveStatus[] = ['Pending', 'Approved', 'Rejected', 'Cancel Requested', 'Cancel Approved', 'Cancel Rejected', 'Pending Cancelled'];

export interface Leave {
  id: number; employee: string; type: string; session: Session; from: string; to: string;
  reason: string; document: string; status: LeaveStatus; adminComment: string; requestedOn: string;
  history: { status: string; at: string; by: string }[];
}

// working days between two ISO dates, Sat/Sun excluded; half-day sessions count 0.5
export function leaveDays(from: string, to: string, session: Session) {
  if (session !== 'Full Day') return 0.5;
  let n = 0;
  for (let d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) if (d.getDay() % 6) n++;
  return n;
}

// ponytail: mock mirroring UAT; replace with the leave API
export const leaves = signal<Leave[]>(([
  ['Pardeep Kumar', 'Sick Leave', 'Full Day', '2026-11-16', '2026-11-18', 'Fever', 'medical-certificate.pdf'],
  ['Pardeep Kumar', 'Sick Leave', 'Full Day', '2026-11-09', '2026-11-11', 'Flu', 'doctor-note.pdf'],
  ['Pardeep Kumar', 'Leave Without Pay (LWP)', 'Full Day', '2026-11-04', '2026-11-04', 'Personal work', ''],
  ['Narayan Chandra Barik', 'Casual Leave (CL)', 'Full Day', '2026-11-02', '2026-11-03', 'Family function', ''],
  ['NC Barik', 'Casual Leave (CL)', 'Full Day', '2026-10-09', '2026-10-12', 'Travel', ''],
  ['Nar Barik', 'Leave Without Pay (LWP)', 'Full Day', '2026-10-23', '2026-10-26', 'Moving house', ''],
  ['Suchi Thakur', 'Casual Leave (CL)', 'First Half', '2026-09-29', '2026-09-29', 'Bank visit', ''],
  ['Suchi Thakur', 'Casual Leave (CL)', 'Full Day', '2026-10-08', '2026-10-09', 'Family trip', '', 'Approved'],
  ['Suchi Thakur', 'Sick Leave', 'Full Day', '2026-10-27', '2026-10-27', 'Check-up', 'appointment.pdf'],
  ['Pardeep Kumar', 'Casual Leave (CL)', 'Second Half', '2026-08-05', '2026-08-05', 'Parent-teacher meeting', ''],
  ['Test Firsteru', 'Sick Leave', 'Second Half', '2026-08-04', '2026-08-04', 'Dental appointment', 'dental-receipt.png', 'Cancel Requested'],
  ['TestAdmin Test', 'Casual Leave (CL)', 'Full Day', '2026-09-14', '2026-09-15', 'Wedding', '', 'Approved'],
  ['Test Firsteho', 'Sick Leave', 'Full Day', '2026-09-02', '2026-09-02', 'Migraine', '', 'Rejected'],
  ['Narayan Chandra Barik', 'Casual Leave (CL)', 'Full Day', '2026-08-20', '2026-08-21', 'Plans changed', '', 'Cancel Approved'],
  ['Nar Barik', 'Sick Leave', 'Full Day', '2026-08-12', '2026-08-12', 'Cold', 'clinic-slip.pdf', 'Pending Cancelled'],
  ['Narayan Chandra Barik', 'Sick Leave', 'Full Day', '2026-09-07', '2026-09-11', 'Hospitalised — dengue', 'discharge-summary.pdf', 'Approved'],
] as const).map(([employee, type, session, from, to, reason, document, status = 'Pending'], i) => ({
  id: i + 1, employee, type, session, from, to, reason, document, status, requestedOn: new Date(new Date(from).getTime() - 5 * 864e5).toISOString().slice(0, 10), adminComment: status === 'Rejected' ? 'Insufficient sick leave balance' : '',
  history: [{ status: 'Approved', at: '2026-09-15T15:43:01', by: 'Suchi Thakur' }],
}) as Leave));

export function decideLeave(l: Leave, approve: boolean, comment: string, by = 'Suchi Thakur') {
  // a cancel request resolves to Cancel Approved / Cancel Rejected (UAT naming)
  const status: LeaveStatus = l.status === 'Cancel Requested' ? (approve ? 'Cancel Approved' : 'Cancel Rejected') : (approve ? 'Approved' : 'Rejected');
  leaves.update(list => list.map(x => x.id === l.id
    ? { ...x, status, adminComment: comment, history: [{ status, at: new Date().toISOString(), by }, ...x.history] } : x));
}
