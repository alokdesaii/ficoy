import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { findEmployee } from '../employees';
import { SalaryTimelineComponent } from '../salary-timeline/salary-timeline.component';

@Component({
  selector: 'app-employee-view',
  imports: [RouterLink, DatePipe, SalaryTimelineComponent],
  templateUrl: './employee-view.component.html',
  styleUrl: './employee-view.component.scss',
})
export class EmployeeViewComponent {
  e = findEmployee(inject(ActivatedRoute).snapshot.paramMap.get('code'));
  initials = this.e?.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
