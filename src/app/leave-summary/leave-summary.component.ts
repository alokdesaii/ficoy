import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CURRENT_USER, summary } from '../leaves';

@Component({
  selector: 'app-leave-summary',
  imports: [RouterLink],
  templateUrl: './leave-summary.component.html',
  styleUrl: './leave-summary.component.scss',
})
export class LeaveSummaryComponent {
  s = computed(() => summary(CURRENT_USER));
  pct = (n: number, of: number) => of ? Math.min(100, (n / of) * 100) : 0;
}
