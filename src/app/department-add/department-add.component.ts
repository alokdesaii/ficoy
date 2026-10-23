import { Component, computed, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { departments, findDepartment, LOCATIONS } from '../departments';
import { employees } from '../employees';

@Component({
  selector: 'app-department-add',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './department-add.component.html',
})
export class DepartmentAddComponent {
  private router = inject(Router);
  editing = findDepartment(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  locations = LOCATIONS;
  heads = computed(() => employees().map(e => e.name).sort((a, b) => a.localeCompare(b)));

  private unique = (c: AbstractControl) => {
    const name = String(c.value ?? '').trim().toLowerCase();
    return departments().some(d => d !== this.editing && d.name.toLowerCase() === name) ? { duplicate: true } : null;
  };

  form = inject(FormBuilder).nonNullable.group({
    name: [this.editing?.name ?? '', [Validators.required, Validators.maxLength(60), this.unique]],
    head: this.editing?.head ?? '',
    location: this.editing?.location ?? '',
  });

  get name() { return this.form.controls.name; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = { ...this.form.getRawValue(), name: this.name.value.trim() };
    // ponytail: POST/PUT /departments once the endpoint is shared
    departments.update(list => this.editing
      ? list.map(d => d === this.editing ? { ...d, ...v } : d)
      : [...list, { id: Math.max(0, ...list.map(d => d.id)) + 1, ...v }]);
    const old = this.editing?.name;
    if (old && old !== v.name) employees.update(list => list.map(e => e.department === old ? { ...e, department: v.name } : e));
    this.router.navigateByUrl('/departmentlist');
  }
}
