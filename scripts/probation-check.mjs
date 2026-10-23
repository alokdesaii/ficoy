// run: node scripts/probation-check.mjs — probation date rules in src/app/probation.ts
import assert from 'node:assert';
const { probationEnd, addDays, daysBetween } = await import('../src/app/probation.ts');
assert.equal(probationEnd('2026-01-15', 3), '2026-04-14');
assert.equal(probationEnd('2026-01-01', 3), '2026-03-31');
assert.equal(probationEnd('2026-01-31', 1), '2026-02-28');   // clamp to short month
assert.equal(probationEnd('2028-01-31', 1), '2028-02-29');   // leap year
assert.equal(probationEnd('2026-11-30', 3), '2027-02-28');   // year rollover + clamp
assert.equal(addDays('2026-02-27', 3), '2026-03-02');
assert.equal(daysBetween('2026-10-01', '2026-10-31'), 30);
console.log('probation checks ok');

const p = await import('../src/app/probation.ts');
const s = structuredClone(p.DEFAULT_SETTINGS);
const sick = [{ employee: 'A', type: 'Sick Leave', from: '2026-09-07', to: '2026-09-11', status: 'Approved' }];
assert.equal(p.leaveAdjustment('A', '2026-07-25', '2026-10-24', sick, s).days, 5);                       // 5 calendar days
assert.equal(p.leaveAdjustment('A', '2026-07-25', '2026-10-24', [{ ...sick[0], to: '2026-09-10' }], s).days, 0); // 4 days < min 5
assert.equal(p.leaveAdjustment('A', '2026-07-25', '2026-10-24', [{ ...sick[0], status: 'Cancel Approved' }], s).days, 0); // cancelled → no shift
assert.equal(p.leaveAdjustment('A', '2026-07-25', '2026-10-24', sick, { ...s, leaveBasis: 'working' }).days, 5);      // Mon–Fri
const t = p.timeline({ employee: 'A', type: 'Full Time' }, '2026-07-25', sick, s, '2026-10-18');
assert.equal(t.baseEnd, '2026-10-24'); assert.equal(t.end, '2026-10-29'); assert.equal(t.stage, 'Review Due');
assert.equal(p.timeline({ employee: 'B', type: 'Full Time' }, '2026-07-10', [], s, '2026-10-18').stage, 'Overdue');
assert.equal(p.timeline({ employee: 'C', type: 'Full Time' }, '2026-09-01', [], s, '2026-10-18').stage, 'In Probation');
console.log('probation timeline checks ok');

const sick2 = [{ employee: 'A', type: 'Sick Leave', from: '2026-09-07', to: '2026-09-11', status: 'Approved' }];
const pr = { employee: 'A', type: 'Full Time', employeeReviewOn: '2026-10-05' };
const tl = p.timeline(pr, '2026-07-25', sick2, s, '2026-10-18');
const ms = p.milestones(pr, tl, s, '2026-10-18');
assert.deepEqual(ms.map(x => x.date), [...ms.map(x => x.date)].sort());                  // sorted
assert.equal(ms.find(x => x.kind === 'end').date, '2026-10-29');                           // leave-adjusted
assert.equal(ms.filter(x => x.kind === 'reminder').length, 3);
assert.equal(ms.find(x => x.label.startsWith('Reminder · 7')).done, false);                // 22 Oct still ahead
assert.ok(ms.some(x => x.kind === 'leave' && x.label.includes('5 days')));
console.log('probation milestone checks ok');
assert.equal(p.average({ ratings: { a: 4, b: 3, c: 5 } }, ['a', 'b', 'c']), 4);
assert.equal(p.average({ ratings: { a: 4 } }, ['a', 'b']), 4);   // unrated criteria ignored
console.log('review checks ok');
assert.equal(p.suggest(3.5, s), 'Confirm'); assert.equal(p.suggest(3.49, s), 'Extend'); assert.equal(p.suggest(2.5, s), 'Extend'); assert.equal(p.suggest(2.49, s), 'Terminate');
console.log('suggest checks ok');
assert.equal(p.extendTo('2026-10-29', 1), '2026-11-29');   // day after end + 1 month
assert.equal(p.extendTo('2026-10-31', 3), '2027-01-31');
console.log('decision checks ok');
assert.deepEqual(p.checkInDates('2026-07-20', '2026-10-31', 30), ['2026-08-18', '2026-09-17', '2026-10-17', '2026-10-31']);
assert.deepEqual(p.checkInDates('2026-11-01', '2026-11-20', 30), ['2026-11-20']);   // shorter than one interval
const pipBase = { employee: 'X', start: '2026-07-20', end: '2026-10-31', objectives: [], checkIns: [{ due: '2026-10-17' }, { due: '2026-10-31' }] };
assert.equal(p.pipStage(pipBase, '2026-10-19'), 'Awaiting Objectives');
assert.equal(p.pipStage({ ...pipBase, objectivesApprovedOn: '2026-07-24' }, '2026-10-19'), 'Check-in Due');
assert.equal(p.pipStage({ ...pipBase, objectivesApprovedOn: '2026-07-24' }, '2026-10-31'), 'Outcome Due');
console.log('pip checks ok');
const L = await import('../src/app/letters.ts');
assert.equal(L.render('Dear {{first_name}}, from {{ effective_date }}', { first_name: 'Ana', effective_date: '1 Nov 2026' }), 'Dear Ana, from 1 Nov 2026');
assert.equal(L.render('{{nope}}', {}), '{{nope}}');                 // unknown stays visible
assert.deepEqual(L.unknownFields('{{first_name}} {{frist_name}}'), ['frist_name']);
console.log('letter checks ok');
const N = await import('../src/app/notification-copy.ts');
const c = N.copyFor('reminder', 'Employee', { daysLeft: '7', end: '29 Oct 2026' });
assert.equal(c.title, 'Your probation ends in 7 days'); assert.ok(c.body.includes('29 Oct 2026'));
assert.equal(N.copyFor('pipOutcome', 'RM', { name: 'Ana', outcome: 'Confirmed' }).title, 'PIP outcome for Ana');   // falls back to default copy
assert.equal(N.fill('{a} {b}', { a: 'x' }), 'x {b}');
console.log('notification copy checks ok');
