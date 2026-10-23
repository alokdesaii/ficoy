import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { copyFor } from '../notification-copy';
import { EventKey, EVENTS, probationSettings, Role, ROLES } from '../probation';

const GROUPS: { title: string; keys: EventKey[] }[] = [
  { title: 'Probation', keys: ['started', 'reminder', 'leaveAdjusted'] },
  { title: 'Reviews', keys: ['reviewOpen', 'reviewSubmitted', 'overdue'] },
  { title: 'Outcomes', keys: ['confirmed', 'extended', 'terminated'] },
  { title: 'PIP', keys: ['pipStarted', 'pipCheckpoint', 'pipOutcome'] },
  { title: 'Letters', keys: ['letterApproval', 'letterIssued'] },
];

// fixed sample so every design reads realistically
const SAMPLE = {
  name: 'Narayan Chandra Barik', designation: 'Developer', start: '25 Jul 2026', end: '29 Oct 2026', reviewOpens: '29 Sep 2026', daysLeft: '7',
  overdue: '3', missing: 'RM review', months: '3', reviews: 'Self ✓ · RM pending', effective: '30 Oct 2026', newEnd: '29 Nov 2026', days: '5',
  outcome: 'Confirmed', every: '30', today: '19 Oct 2026', lastDay: '29 Oct 2026', due: '17 Oct 2026', letter: 'Confirmation',
};

@Component({
  selector: 'app-notification-designs',
  imports: [RouterLink],
  templateUrl: './notification-designs.component.html',
  styleUrl: './notification-designs.component.scss',
})
export class NotificationDesignsComponent {
  groups = GROUPS; roles = ROLES; s = probationSettings; sample = SAMPLE;
  label = (k: EventKey) => EVENTS.find(e => e.key === k)!.label;
  event = signal<EventKey>('reminder');
  role = signal<Role>('Employee');
  width = signal<'desktop' | 'mobile'>('desktop');

  recipients = computed(() => this.s().recipients[this.event()]);
  sent = computed(() => this.recipients().includes(this.role()));
  copy = computed(() => copyFor(this.event(), this.role(), SAMPLE));
  greeting = computed(() => this.role() === 'Employee' ? 'Hi Narayan,' : this.role() === 'RM' ? 'Hi Suchi,' : this.role() === 'HR' ? 'Hi HR team,' : 'Hi Payroll team,');
  // key facts card shown in the email under the message
  facts = computed<[string, string][]>(() => {
    const e = this.event();
    const base: [string, string][] = this.role() === 'Employee' ? [] : [['Employee', SAMPLE.name], ['Designation', SAMPLE.designation]];
    if (e.startsWith('pip')) return [...base, ['PIP period', '30 Oct – 29 Nov 2026'], ['Next check-in', SAMPLE.due]];
    if (e === 'confirmed') return [...base, ['Confirmed from', SAMPLE.effective]];
    if (e === 'extended') return [...base, ['New end date', SAMPLE.newEnd], ['Extension', '1 month with PIP']];
    if (e === 'terminated') return [...base, ['Effective', SAMPLE.effective], ['Last working day', SAMPLE.lastDay]];
    if (e.startsWith('letter')) return [...base, ['Letter', SAMPLE.letter]];
    return [...base, ['Probation', `${SAMPLE.start} – ${SAMPLE.end}`], ['Reviews', SAMPLE.reviews]];
  });
  pick(k: EventKey) { this.event.set(k); if (!this.recipients().includes(this.role())) this.role.set(this.recipients()[0] ?? 'HR'); }
}
