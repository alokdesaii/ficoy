// run: node scripts/mpf-check.mjs — checks the payroll money rules in src/app/payroll.ts (Node 24 strips TS types)
import assert from 'node:assert';
const { mpf, hkdInWords } = await import('../src/app/payroll.ts');

// HK MPF: none below 7,100, 5% otherwise, capped at 1,500
assert.equal(mpf(7099), 0);
assert.equal(mpf(7100), 355);
assert.equal(mpf(22000), 1100);
assert.equal(mpf(30000), 1500);
assert.equal(mpf(32000), 1500);

// amount in words on payslips
assert.equal(hkdInWords(30500), 'Thirty Thousand Five Hundred Hong Kong Dollars Only');
assert.equal(hkdInWords(28903.23), 'Twenty Eight Thousand Nine Hundred Three Hong Kong Dollars and Twenty Three Cents Only');
assert.equal(hkdInWords(1000000), 'One Million Hong Kong Dollars Only');
assert.equal(hkdInWords(0), 'Zero Hong Kong Dollars Only');
console.log('payroll checks ok');

// backdated import parsing/validation (src/app/backdated.ts)
const { parseCsv, validate, TEMPLATE_CSV } = await import('../src/app/backdated.ts');
assert.deepEqual(parseCsv('a,"b,c","d ""q"""\r\n1,2,3\n'), [['a', 'b,c', 'd "q"'], ['1', '2', '3']]);
const ok = validate(parseCsv(TEMPLATE_CSV), new Set(['0010', '0009']));
assert.deepEqual(ok.missing, []);
assert.equal(ok.rows.filter(r => r.errors.length).length, 0);
const bad = validate(parseCsv('Payroll Period,Employee Id,Gross Salary (A),No Of Days,No Of Days Worked,Total Salary\nJan 2026,999,x,31,40,1\n'), new Set(['0010']));
assert.equal(bad.rows[0].errors.length, 4); // period, id, gross, worked>days
assert.deepEqual(validate(parseCsv('Payroll Period,Employee Id\n'), new Set()).missing.length, 4);
console.log('backdated checks ok');
const bd = await import('../src/app/backdated.ts');
const r = { period: 'December 2025', employeeId: '0010', gross: 31000, days: 31, worked: 29, total: 29000 };
assert.equal(bd.dailyWage(r), 1000); assert.equal(bd.lwpDays(r), 2); assert.equal(bd.lwpDeduction(r), 2000);
console.log('lwp checks ok');
