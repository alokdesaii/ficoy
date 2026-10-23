import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CREDIT_TYPES, creditFor, setCredit, summary } from '../leaves';
import { employees } from '../employees';

@Component({
  selector: 'app-leave-config',
  imports: [FormsModule],
  templateUrl: './leave-config.component.html',
  styleUrl: './leave-config.component.scss',
})
export class LeaveConfigComponent {
  types = CREDIT_TYPES;
  names = computed(() => employees().map(e => e.name).sort());

  employee = signal(''); type = signal(''); days = signal<number | null>(null);
  tried = signal(false); saved = signal('');
  filter = signal('');

  current = computed(() => this.employee() && this.type() ? creditFor(this.employee(), this.type()) : null);
  used = computed(() => {
    if (!this.employee() || !this.type()) return 0;
    const r = summary(this.employee()).rows.find(r => r.type === this.type());
    return r ? r.used + r.pending : 0;
  });
  error = computed(() => {
    if (!this.employee() || !this.type() || this.days() === null) return 'Fill in all required fields';
    const d = Number(this.days());
    if (d < 0 || d > 365 || (d * 2) % 1) return 'Enter 0–365 days, in steps of 0.5';
    if (d < this.used()) return `Can't go below ${this.used()} — already used or pending`;
    return '';
  });

  rows = computed(() => employees()
    .filter(e => !this.filter() || e.name === this.filter())
    .map(e => ({ name: e.name, s: summary(e.name) })));

  pickType(t: string) { this.type.set(t); this.days.set(this.current()); }
  edit(name: string) {
    this.employee.set(name); this.type.set(this.types[0]); this.days.set(this.current()); this.saved.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  reset() { this.employee.set(''); this.type.set(''); this.days.set(null); this.tried.set(false); }
  save() {
    this.tried.set(true);
    if (this.error()) return;
    // ponytail: PUT /leave-credits once the endpoint is shared
    setCredit(this.employee(), this.type(), Number(this.days()));
    this.saved.set(`${this.type()} for ${this.employee()} set to ${this.days()} days`);
    this.reset();
  }
}
