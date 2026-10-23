import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Department, departments, LOCATIONS } from '../departments';
import { employees } from '../employees';

@Component({
  selector: 'app-department-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss',
})
export class DepartmentListComponent {
  departments = departments;
  locations = LOCATIONS;
  heads = computed(() => employees().map(e => e.name));

  search = signal('');
  head = signal('');
  location = signal('');
  viewing = signal<Department | null>(null);
  toDelete = signal<Department | null>(null);

  count = (d: Department) => employees().filter(e => e.department === d.name).length;

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.departments().filter(d =>
      (!q || d.name.toLowerCase().includes(q)) &&
      (!this.head() || d.head === this.head()) &&
      (!this.location() || d.location === this.location()));
  });

  get filtering() { return !!(this.search() || this.head() || this.location()); }
  clear() { this.search.set(''); this.head.set(''); this.location.set(''); }

  confirmDelete() {
    const d = this.toDelete();
    this.departments.update(list => list.filter(x => x !== d));
    this.toDelete.set(null);
  }
}
