import { StackTable } from '../stack-table';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Employee, employees } from '../employees';

@Component({
  selector: 'app-employee-list',
  imports: [StackTable, FormsModule, RouterLink],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
})
export class EmployeeListComponent {
  employees = employees;

  departments = ['Human Resources', 'IT', 'Sales', 'Operations', 'Test', 'Payments', 'ADMIN HR'];
  search = signal('');
  department = signal('');
  toDelete = signal<Employee | null>(null);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.employees().filter(e =>
      (!q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)) &&
      (!this.department() || e.department === this.department()));
  });

  initials(name: string) { return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase(); }

  confirmDelete() {
    const e = this.toDelete();
    this.employees.update(list => list.filter(x => x !== e));
    this.toDelete.set(null);
  }
}
