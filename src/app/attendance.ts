import { signal } from '@angular/core';
import { employees } from './employees';

export type Status = 'Present' | 'Absent' | 'Half Day' | 'OnLeave';
export interface AttendanceRow {
  date: string; employee: string; checkIn: string; checkOut: string;
  status: Status; punctuality: '' | 'OnTime' | 'Late' | 'EarlyLeaving'; remarks: string;
}

// ponytail: deterministic mock for the last 7 days; replace with the attendance API
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };
const samples: Omit<AttendanceRow, 'date' | 'employee'>[] = [
  { checkIn: '09:02', checkOut: '18:05', status: 'Present', punctuality: 'OnTime', remarks: '' },
  { checkIn: '09:41', checkOut: '18:10', status: 'Present', punctuality: 'Late', remarks: '' },
  { checkIn: '', checkOut: '', status: 'Absent', punctuality: '', remarks: 'Auto - No Clock-In' },
  { checkIn: '15:16', checkOut: '', status: 'Absent', punctuality: 'Late', remarks: 'Auto - Missing Clock-Out' },
  { checkIn: '09:00', checkOut: '13:30', status: 'Half Day', punctuality: 'EarlyLeaving', remarks: '' },
  { checkIn: '', checkOut: '', status: 'OnLeave', punctuality: '', remarks: '' },
];
export const attendance = signal<AttendanceRow[]>(
  Array.from({ length: 7 }, (_, d) => employees().map((e, i) => ({ date: day(d), employee: e.name, ...samples[(i * 7 + d * 3) % samples.length] }))).flat()
);

export const hours = (r: AttendanceRow) => {
  if (!r.checkIn || !r.checkOut) return '';
  const [a, b] = [r.checkIn, r.checkOut].map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
  const m = b - a; return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};

export interface Regularization {
  id: number; date: string; employee: string; checkIn: string; checkOut: string;
  note: string; file: string; status: 'Pending' | 'Approved' | 'Rejected'; adminComment: string;
}

// ponytail: mock requests; replace with the regularization API
export const regularizations = signal<Regularization[]>([
  [day(4), 'Narayan Chandra Barik', '', '', 'Missed clock-in, was at client site'],
  [day(5), 'NC Barik', '09:05', '18:00', 'Biometric device was down'],
  [day(5), 'NC Barik', '', '18:10', 'Forgot to clock in'],
  [day(10), 'Suchi Thakur', '15:36', '', 'Left early for a medical appointment'],
].map(([date, employee, checkIn, checkOut, note], i) => ({
  id: i + 1, date, employee, checkIn, checkOut, note, file: '', adminComment: '',
  status: i === 3 ? 'Rejected' : 'Pending',
}) as Regularization));

export const rowFor = (r: { date: string; employee: string }) => attendance().find(a => a.date === r.date && a.employee === r.employee);

export function decide(req: Regularization, status: 'Approved' | 'Rejected', adminComment: string) {
  regularizations.update(list => list.map(r => r.id === req.id ? { ...r, status, adminComment } : r));
  if (status === 'Approved') {
    attendance.update(list => list.map(a => a.date === req.date && a.employee === req.employee
      ? { ...a, checkIn: req.checkIn || a.checkIn, checkOut: req.checkOut || a.checkOut, status: 'Present', remarks: 'Regularized' } : a));
  }
}
