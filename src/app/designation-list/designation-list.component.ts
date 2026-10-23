import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Designation, designations } from '../designations';
import { employees } from '../employees';

const PAGE = 10;

@Component({
  selector: 'app-designation-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './designation-list.component.html',
  styleUrl: './designation-list.component.scss',
})
export class DesignationListComponent {
  search = signal('');
  page = signal(1);
  toDelete = signal<Designation | null>(null);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return designations()
      .filter(d => !q || d.department.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
      .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
  });
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  rows = computed(() => this.filtered().slice((this.page() - 1) * PAGE, this.page() * PAGE));
  from = computed(() => this.filtered().length ? (this.page() - 1) * PAGE + 1 : 0);
  to = computed(() => Math.min(this.page() * PAGE, this.filtered().length));

  onSearch(q: string) { this.search.set(q); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }
  inUse = (d: Designation) => employees().filter(e => e.department === d.department && e.designation === d.name).length;

  confirmDelete() {
    const d = this.toDelete();
    designations.update(list => list.filter(x => x !== d));
    this.toDelete.set(null);
    this.go(this.page());
  }
}
