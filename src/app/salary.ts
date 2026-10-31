import { signal } from '@angular/core';
import { employees } from './employees';

export interface SalaryLine { type: string; amount: number | null; }
export interface SalaryRevision { code: string; effective: string; basic: number; earnings: SalaryLine[]; deductions: SalaryLine[]; }

const total = (l: SalaryLine[]) => l.reduce((t, x) => t + (Number(x.amount) || 0), 0);
export const gross = (r: SalaryRevision) => r.basic + total(r.earnings);
export const net = (r: SalaryRevision) => gross(r) - total(r.deductions);
export const sumLines = total;

// ponytail: in-memory mock; replace with GET/POST /employees/:id/salary-revisions
export const salaryRevisions = signal<SalaryRevision[]>([
  ...employees().map(e => ({ code: e.code, effective: e.joined, basic: 28000, earnings: [{ type: 'Transport Allowance', amount: 1500 }], deductions: [] })),
  { code: '0010', effective: '2026-04-01', basic: 32000, earnings: [{ type: 'Transport Allowance', amount: 1500 }, { type: 'Meal Allowance', amount: 800 }], deductions: [{ type: 'Other Deductions', amount: 300 }] },
]);

// newest first
export const revisionsFor = (code: string | undefined) =>
  salaryRevisions().filter(r => r.code === code).sort((a, b) => b.effective.localeCompare(a.effective));

// the revision in force today; later-dated ones are scheduled
export const currentRevision = (code: string | undefined, today = new Date().toISOString().slice(0, 10)) =>
  revisionsFor(code).find(r => r.effective <= today);

export const addRevision = (r: SalaryRevision) => salaryRevisions.update(l => [...l.filter(x => !(x.code === r.code && x.effective === r.effective)), r]);
