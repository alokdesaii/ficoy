import { Component, OnDestroy, computed, signal } from '@angular/core';
import { holidays } from '../holidays';
import { CURRENT_USER, summary } from '../leaves';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Modal = 'policy' | 'birthdays' | 'holidays' | 'onLeave' | null;

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnDestroy {
  now = signal(new Date());
  private timer = setInterval(() => this.now.set(new Date()), 1000);
  modal = signal<Modal>(null);
  year = 2026;

  // ponytail: mock data mirroring UAT; swap for API services when backend lands
  leave = computed(() => summary(CURRENT_USER));
  birthdays: { date: string; name: string }[] = [];
  onLeave = ['Narayan Barik'];
  policies = [{ name: 'Fef', type: 'E', effectiveFrom: '11-Sep-2026' }];
  newPolicy = { name: '', type: '', effectiveFrom: '' };
  holidays = computed(() => holidays().map(h => ({ date: new Date(h.from), name: h.name })).sort((a, b) => +a.date - +b.date));
  nextHoliday = computed(() => this.holidays().find(h => h.date >= new Date()));

  isPast(d: Date) { return d < new Date(); }
  addPolicy() {
    this.policies.push({ ...this.newPolicy });
    this.newPolicy = { name: '', type: '', effectiveFrom: '' };
    this.modal.set(null);
  }
  removePolicy(i: number) { this.policies.splice(i, 1); }
  ngOnDestroy() { clearInterval(this.timer); }
}
