import { signal } from '@angular/core';

export interface Line { label: string; amount: number; }
export interface Salary { employee: string; earnings: Line[]; deductions: Line[]; }

export const COMPANY = {
  name: 'Harbour & Hills',
  address: ['Suite No 1604 & 05, 16 Floor, Tower 3, China Hong Kong City,', 'China Ferry Terminal, 33 Canton Road, Tsim Sha Tsui, Kowloon,', 'Hong Kong'],
};

// HK MPF: 5% of relevant income, none below HK$7,100/month, capped at HK$1,500 (income ≥ HK$30,000)
export const mpf = (income: number) => income < 7100 ? 0 : Math.min(Math.round(income * 0.05 * 100) / 100, 1500);

// "Thirty Thousand Five Hundred Hong Kong Dollars and Twenty Cents Only"
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const under1000 = (n: number): string => [n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' : '', n % 100 < 20 ? ONES[n % 100] : TENS[Math.floor(n % 100 / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')].filter(Boolean).join(' ');
export function words(n: number): string {
  if (!n) return 'Zero';
  const parts: string[] = [];
  for (const [v, name] of [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']] as const) {
    const chunk = Math.floor(n / v) % 1000;
    if (chunk) parts.push(under1000(chunk) + (name ? ' ' + name : ''));
  }
  return parts.join(' ');
}
export function hkdInWords(amount: number) {
  const dollars = Math.floor(amount), cents = Math.round((amount - dollars) * 100);
  return `${words(dollars)} Hong Kong Dollars${cents ? ` and ${words(cents)} Cents` : ''} Only`;
}

export const total = (lines: Line[]) => lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
export const net = (s: Salary) => total(s.earnings) - total(s.deductions);

const make = (employee: string, basic: number, lwp = 0, sick = 0, bonus = 0): Salary => ({
  employee,
  earnings: [{ label: 'Basic Salary', amount: basic }, { label: 'Bonus', amount: bonus }],
  deductions: [{ label: 'Mandatory Provident Fund', amount: mpf(basic + bonus) }, { label: 'Leave Without Pay', amount: lwp }, { label: 'Sick Leave Deduction', amount: sick }],
});

// ponytail: mock mirroring UAT amounts; replace with the payroll API
export const salaries = signal<Salary[]>([
  make('Suchi Thakur', 32000), make('Pardeep Kumar', 32000, 1596.77), make('Narayan Chandra Barik', 22000),
  make('NC Barik', 22000), make('Nar Barik', 30000), make('Test Firsteho', 0), make('Test Firsteru', 0),
  make('TestAdmin Test', 30000), make('TestEmployee TestLastName', 22000),
]);

export const salaryOf = (employee: string) => salaries().find(s => s.employee === employee);
export function saveSalary(s: Salary) { salaries.update(list => list.map(x => x.employee === s.employee ? s : x)); }

// processed months (YYYY-MM) — a payslip exists for each employee for these
export const processedMonths = signal(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);

// payslips generated per month (YYYY-MM → employee names); past processed months count as fully generated
export const generated = signal<Record<string, string[]>>({});
export const isGenerated = (month: string, employee: string) =>
  processedMonths().includes(month) || (generated()[month] ?? []).includes(employee);
export function generate(month: string, names: string[]) {
  generated.update(g => ({ ...g, [month]: [...new Set([...(g[month] ?? []), ...names])] }));
}
