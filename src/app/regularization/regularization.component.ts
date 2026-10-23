import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { decide, hours, Regularization, regularizations, rowFor } from '../attendance';

@Component({
  selector: 'app-regularization',
  imports: [FormsModule, DatePipe],
  templateUrl: './regularization.component.html',
  styleUrl: './regularization.component.scss',
})
export class RegularizationComponent {
  status = signal('');
  size = signal(10);
  page = signal(1);
  open = signal<Regularization | null>(null);
  comment = '';
  rowFor = rowFor;
  gross = (r: Regularization) => hours({ checkIn: r.checkIn, checkOut: r.checkOut } as never);

  filtered = computed(() => regularizations()
    .filter(r => !this.status() || r.status === this.status())
    .sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || b.date.localeCompare(a.date)));
  pending = computed(() => regularizations().filter(r => r.status === 'Pending').length);
  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.size())));
  rows = computed(() => this.filtered().slice((this.page() - 1) * this.size(), this.page() * this.size()));
  first = computed(() => this.filtered().length ? (this.page() - 1) * this.size() + 1 : 0);
  last = computed(() => Math.min(this.page() * this.size(), this.filtered().length));

  set<T>(s: { set(v: T): void }, v: T) { s.set(v); this.page.set(1); }
  go(p: number) { this.page.set(Math.min(this.pages(), Math.max(1, p))); }
  review(r: Regularization) { this.open.set(r); this.comment = r.adminComment; }

  // ponytail: PATCH /attendance/regularization/:id once the endpoint is shared
  act(status: 'Approved' | 'Rejected') {
    decide(this.open()!, status, this.comment.trim());
    this.open.set(null);
  }
}
