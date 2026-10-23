import { signal } from '@angular/core';

export const BACKDATED_COLUMNS = ['Payroll Period', 'Employee Id', 'Gross Salary (A)', 'No Of Days', 'No Of Days Worked', 'Total Salary'];
export interface BackdatedRow { period: string; employeeId: string; gross: number; days: number; worked: number; total: number; }
export interface Upload { id: number; file: string; uploadedAt: string; by: string; rows: BackdatedRow[]; }

// ponytail: in-memory; replace with POST /payroll/backdated + GET for the uploaded list
export const uploads = signal<Upload[]>([{
  id: 1, file: 'backdated-2025.csv', uploadedAt: '2026-09-02T10:15:00', by: 'Suchi Thakur',
  rows: [
    { period: 'November 2025', employeeId: '0010', gross: 30000, days: 30, worked: 30, total: 30000 },
    { period: 'December 2025', employeeId: '0010', gross: 30000, days: 31, worked: 29, total: 28064.52 },
    { period: 'December 2025', employeeId: '0009', gross: 28000, days: 31, worked: 31, total: 28000 },
  ],
}]);

// derived figures shown in Backdated Data Uploaded
export const dailyWage = (r: BackdatedRow) => r.days ? r.gross / r.days : 0;
export const lwpDays = (r: BackdatedRow) => Math.max(0, r.days - r.worked);
export const lwpDeduction = (r: BackdatedRow) => Math.round(dailyWage(r) * lwpDays(r) * 100) / 100;

// minimal CSV: commas, double-quoted fields, "" escapes, CRLF/LF
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const daysIn = (period: string) => { const [m, y] = period.split(' '); return new Date(+y, MONTHS.indexOf(m) + 1, 0).getDate(); };

// returns one entry per data row: parsed values + human-readable problems
export function validate(table: string[][], knownIds: Set<string>) {
  const [head = [], ...data] = table;
  const norm = (s: string) => s.trim().toLowerCase();
  const idx = BACKDATED_COLUMNS.map(c => head.findIndex(h => norm(h) === norm(c)));
  const missing = BACKDATED_COLUMNS.filter((_, i) => idx[i] < 0);
  if (missing.length) return { missing, rows: [] };
  const rows = data.map((r, line) => {
    const get = (i: number) => (r[idx[i]] ?? '').trim();
    const num = (i: number) => Number(get(i).replace(/,/g, ''));
    const row: BackdatedRow = { period: get(0), employeeId: get(1), gross: num(2), days: num(3), worked: num(4), total: num(5) };
    const errors: string[] = [];
    if (!/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(row.period)) errors.push('Period must look like "January 2024"');
    else if (row.days !== daysIn(row.period)) errors.push(`${row.period} has ${daysIn(row.period)} days`);
    if (!knownIds.has(row.employeeId)) errors.push(`Unknown employee ID "${row.employeeId}"`);
    const numeric = [['gross', 2], ['days', 3], ['worked', 4], ['total', 5]] as const;
    for (const [k, col] of numeric)
      if (get(col) === '' || !Number.isFinite(row[k]) || row[k] < 0) errors.push(`${BACKDATED_COLUMNS[col]} must be a number`);
    if (row.worked > row.days) errors.push('Days worked exceeds days in period');
    return { line: line + 2, row, errors };
  });
  return { missing, rows };
}

export const TEMPLATE_CSV = BACKDATED_COLUMNS.join(',') + '\nJanuary 2026,0010,32000,31,31,32000\nFebruary 2026,0009,32000,28,26,29714.29\n';
