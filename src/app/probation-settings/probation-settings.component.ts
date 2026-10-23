import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addDays, DEFAULT_SETTINGS, EMPLOYMENT_TYPES, EventKey, EVENTS, probationEnd, ProbationSettings, probationSettings, Role, ROLES } from '../probation';
import { LEAVE_TYPES } from '../leaves';

type Tab = 'general' | 'reviews' | 'pip' | 'leave' | 'notify';

@Component({
  selector: 'app-probation-settings',
  imports: [FormsModule, DatePipe],
  templateUrl: './probation-settings.component.html',
  styleUrl: './probation-settings.component.scss',
})
export class ProbationSettingsComponent {
  tabs: { k: Tab; t: string; i: string }[] = [
    { k: 'general', t: 'General', i: 'fa-solid fa-sliders' },
    { k: 'reviews', t: 'Reviews & Ratings', i: 'fa-regular fa-star' },
    { k: 'pip', t: 'Extension & PIP', i: 'fa-solid fa-route' },
    { k: 'leave', t: 'Leave Adjustment', i: 'fa-regular fa-calendar-minus' },
    { k: 'notify', t: 'Reminders & Notifications', i: 'fa-regular fa-bell' },
  ];
  tab = signal<Tab>('general');
  types = EMPLOYMENT_TYPES; leaveTypes = LEAVE_TYPES; events = EVENTS; roles = ROLES;

  d = signal<ProbationSettings>(structuredClone(probationSettings()));
  saved = signal(false);
  dirty = computed(() => JSON.stringify(this.d()) !== JSON.stringify(probationSettings()));
  touch() { this.d.update(v => ({ ...v })); this.saved.set(false); }

  // worked example so HR can see what the numbers mean
  sampleJoin = '2026-01-15';
  example = computed(() => {
    const v = this.d(), months = v.durations['Full Time'] ?? 0;
    if (!months) return null;
    const end = probationEnd(this.sampleJoin, months);
    return { end, reviewOpens: addDays(end, -v.reviewOpensDaysBefore), reminders: [...v.reminderDays].sort((a, b) => b - a).map(n => addDays(end, -n)) };
  });

  errors = computed(() => {
    const v = this.d(), e: string[] = [];
    if (v.extendAtOrAbove >= v.confirmAtOrAbove) e.push('The extension threshold must be lower than the confirmation threshold.');
    if (v.confirmAtOrAbove > v.scale.length || v.extendAtOrAbove < 1) e.push(`Thresholds must sit within the 1–${v.scale.length} rating scale.`);
    if (!v.criteria.filter(c => c.trim()).length) e.push('Add at least one review criterion.');
    if (v.scale.some(s => !s.trim())) e.push('Every rating level needs a label.');
    const shortest = Math.min(...Object.values(v.durations).filter(Boolean)) * 28;
    if (v.reviewOpensDaysBefore >= shortest) e.push('The review opens before the probation even starts for the shortest duration.');
    if (v.reminderDays.some(n => n < 0 || n >= shortest)) e.push('Reminder days must fall inside the probation period.');
    if (v.pipCheckpointEveryDays > v.pipDurationDays) e.push('PIP checkpoints must be no longer than the PIP itself.');
    return e;
  });

  // list editors
  newCriterion = ''; newReminder: number | null = null;
  addCriterion() { const c = this.newCriterion.trim(); if (c && !this.d().criteria.includes(c)) { this.d().criteria.push(c); this.newCriterion = ''; this.touch(); } }
  removeCriterion(i: number) { this.d().criteria.splice(i, 1); this.touch(); }
  moveCriterion(i: number, dir: -1 | 1) { const c = this.d().criteria; [c[i], c[i + dir]] = [c[i + dir], c[i]]; this.touch(); }
  addReminder() { const n = Number(this.newReminder); if (n >= 0 && !this.d().reminderDays.includes(n)) { this.d().reminderDays.push(n); this.d().reminderDays.sort((a, b) => b - a); this.newReminder = null; this.touch(); } }
  removeReminder(n: number) { this.d().reminderDays = this.d().reminderDays.filter(x => x !== n); this.touch(); }
  toggleLeave(t: string) { const l = this.d().leaveTypes; this.d().leaveTypes = l.includes(t) ? l.filter(x => x !== t) : [...l, t]; this.touch(); }
  has(e: EventKey, r: Role) { return this.d().recipients[e].includes(r); }
  toggleRecipient(e: EventKey, r: Role) { const l = this.d().recipients[e]; this.d().recipients[e] = l.includes(r) ? l.filter(x => x !== r) : [...l, r]; this.touch(); }

  // ponytail: PUT /probation/settings once the endpoint is shared
  save() { if (this.errors().length) return; probationSettings.set(structuredClone(this.d())); this.saved.set(true); }
  discard() { this.d.set(structuredClone(probationSettings())); }
  restoreDefaults() { this.d.set(structuredClone(DEFAULT_SETTINGS)); this.saved.set(false); }
}
