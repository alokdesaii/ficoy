import { Component, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generate, isGenerated, net, salaries } from '../payroll';
import { employees } from '../employees';
import { PayslipComponent } from '../payslip/payslip.component';

@Component({
  selector: 'app-generate-payslips',
  imports: [FormsModule, DatePipe, DecimalPipe, PayslipComponent],
  templateUrl: './generate-payslips.component.html',
  styleUrl: './generate-payslips.component.scss',
})
export class GeneratePayslipsComponent {
  net = net;
  dept = (name: string) => employees().find(e => e.name === name)?.department ?? '—';

  // current month plus the previous five
  months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); return d.toISOString().slice(0, 7); });
  month = signal(this.months[0]);
  slip = signal<string | null>(null);
  confirmAll = signal(false);

  rows = computed(() => salaries().map(s => ({ s, done: isGenerated(this.month(), s.employee), payable: net(s) > 0 })));
  pending = computed(() => this.rows().filter(r => !r.done && r.payable));
  doneCount = computed(() => this.rows().filter(r => r.done).length);

  // ponytail: POST /payslips/generate once the endpoint is shared
  one(name: string) { generate(this.month(), [name]); }
  all() { generate(this.month(), this.pending().map(r => r.s.employee)); this.confirmAll.set(false); }
}
