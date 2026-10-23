import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

interface Shift { name: string; start: string; end: string; grace: number; }
const pad = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'app-shift-timing',
  imports: [ReactiveFormsModule],
  templateUrl: './shift-timing.component.html',
  styleUrl: './shift-timing.component.scss',
})
export class ShiftTimingComponent {
  private fb = inject(FormBuilder);

  shiftNames = ['Morning Shift', 'General Shift 1', 'General Shift 2', 'General Shift 3', 'Evening Shift', 'Night Shift'];
  hours = Array.from({ length: 12 }, (_, i) => pad(i + 1));
  minutes = Array.from({ length: 60 }, (_, i) => pad(i));

  // ponytail: mock rows mirror UAT; replace with the shifts API
  shifts = signal<Shift[]>([
    { name: 'Morning Shift', start: '07:00 AM', end: '04:00 PM', grace: 15 },
    { name: 'Evening Shift', start: '10:00 AM', end: '07:00 PM', grace: 15 },
    { name: 'General Shift 1', start: '08:00 AM', end: '05:00 PM', grace: 15 },
    { name: 'General Shift 2', start: '09:00 AM', end: '06:00 PM', grace: 15 },
  ]);
  editing = signal<Shift | null>(null);
  toDelete = signal<Shift | null>(null);

  private blank = { shiftName: '', startHour: '09', startMinute: '00', startAmpm: 'AM', endHour: '06', endMinute: '00', endAmpm: 'PM', grace: 15 };
  form = this.fb.nonNullable.group({
    shiftName: ['', Validators.required],
    startHour: '09', startMinute: '00', startAmpm: 'AM',
    endHour: '06', endMinute: '00', endAmpm: 'PM',
    grace: [15, [Validators.required, Validators.min(0), Validators.max(120)]],
  });

  edit(s: Shift) {
    const [sh, sm, sa] = s.start.split(/[: ]/);
    const [eh, em, ea] = s.end.split(/[: ]/);
    this.editing.set(s);
    this.form.setValue({ shiftName: s.name, startHour: sh, startMinute: sm, startAmpm: sa, endHour: eh, endMinute: em, endAmpm: ea, grace: s.grace });
  }

  reset() { this.editing.set(null); this.form.reset(this.blank); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const row: Shift = { name: v.shiftName, start: `${v.startHour}:${v.startMinute} ${v.startAmpm}`, end: `${v.endHour}:${v.endMinute} ${v.endAmpm}`, grace: v.grace };
    const old = this.editing();
    this.shifts.update(list => old ? list.map(s => s === old ? row : s) : [...list, row]);
    this.reset();
  }

  confirmDelete() {
    const s = this.toDelete();
    this.shifts.update(list => list.filter(x => x !== s));
    if (this.editing() === s) this.reset();
    this.toDelete.set(null);
  }
}
