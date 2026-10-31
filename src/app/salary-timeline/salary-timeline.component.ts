import { Component, computed, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { currentRevision, gross, net, revisionsFor, sumLines } from '../salary';

// shared by Employee View (HR) and My Profile (ESS)
@Component({
  selector: 'app-salary-timeline',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './salary-timeline.component.html',
  styleUrl: './salary-timeline.component.scss',
})
export class SalaryTimelineComponent {
  code = input<string>();
  revisions = computed(() => revisionsFor(this.code()));
  current = computed(() => currentRevision(this.code()));
  today = new Date().toISOString().slice(0, 10);
  open = signal<string | null>(null); // one breakdown open at a time
  toggle(d: string) { this.open.update(o => (o === d ? null : d)); }
  gross = gross; net = net; sumLines = sumLines;
}
