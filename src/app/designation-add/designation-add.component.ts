import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { departments } from '../departments';
import { designations, findDesignation } from '../designations';

@Component({
  selector: 'app-designation-add',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './designation-add.component.html',
})
export class DesignationAddComponent {
  private router = inject(Router);
  editing = findDesignation(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  departments = departments;

  // same name may exist in different departments, not twice in one
  private unique = (g: AbstractControl) => {
    const { department, name } = g.value;
    const n = String(name ?? '').trim().toLowerCase();
    return designations().some(d => d !== this.editing && d.department === department && d.name.toLowerCase() === n) ? { duplicate: true } : null;
  };

  form = inject(FormBuilder).nonNullable.group({
    department: [this.editing?.department ?? '', Validators.required],
    name: [this.editing?.name ?? '', [Validators.required, Validators.maxLength(60)]],
  }, { validators: this.unique });

  bad(name: 'department' | 'name') { const c = this.form.controls[name]; return c.invalid && c.touched; }
  get dup() { return this.form.hasError('duplicate') && this.form.controls.name.touched; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = { ...this.form.getRawValue(), name: this.form.controls.name.value.trim() };
    // ponytail: POST/PUT /designations once the endpoint is shared
    designations.update(list => this.editing
      ? list.map(d => d === this.editing ? { ...d, ...v } : d)
      : [...list, { id: Math.max(0, ...list.map(d => d.id)) + 1, ...v }]);
    this.router.navigateByUrl('/designation-list');
  }
}
