import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Holiday, holidays, HOLIDAY_TYPES } from '../holidays';

@Component({
  selector: 'app-company-holidays',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './company-holidays.component.html',
  styleUrl: './company-holidays.component.scss',
})
export class CompanyHolidaysComponent {
  types = HOLIDAY_TYPES;
  today = new Date().toISOString().slice(0, 10);
  year = signal(new Date().getFullYear());
  mode = signal<'list' | 'form'>('list');
  editing = signal<Holiday | null>(null);
  toDelete = signal<Holiday | null>(null);

  rows = computed(() => holidays().filter(h => h.from.startsWith(String(this.year()))).sort((a, b) => a.from.localeCompare(b.from)));
  next = computed(() => this.rows().find(h => h.to >= this.today));
  past = (h: Holiday) => h.to < this.today;

  form = inject(FormBuilder).nonNullable.group({
    from: ['', Validators.required], to: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(80)]], type: ['Public Holidays', Validators.required],
  });
  bad(k: 'from' | 'to' | 'name' | 'type') { const c = this.form.controls[k]; return c.invalid && c.touched; }
  get rangeBad() { const { from, to } = this.form.value; return !!from && !!to && to < from; }

  add() { this.editing.set(null); this.form.reset({ from: '', to: '', name: '', type: 'Public Holidays' }); this.mode.set('form'); }
  edit(h: Holiday) { this.editing.set(h); this.form.setValue({ from: h.from, to: h.to, name: h.name, type: h.type }); this.mode.set('form'); }
  setFrom(v: string) { const to = this.form.controls.to; if (!to.value || to.value < v) to.setValue(v); }

  save() {
    if (this.form.invalid || this.rangeBad) { this.form.markAllAsTouched(); return; }
    const v = { ...this.form.getRawValue(), name: this.form.controls.name.value.trim() };
    const old = this.editing();
    // ponytail: POST/PUT /holidays once the endpoint is shared
    holidays.update(list => old ? list.map(h => h === old ? { ...h, ...v } : h) : [...list, { id: Math.max(0, ...list.map(h => h.id)) + 1, ...v }]);
    this.year.set(+v.from.slice(0, 4));
    this.mode.set('list');
  }

  confirmDelete() { const h = this.toDelete(); holidays.update(list => list.filter(x => x !== h)); this.toDelete.set(null); }
}
