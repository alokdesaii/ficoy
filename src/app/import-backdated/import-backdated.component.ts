import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { BACKDATED_COLUMNS, BackdatedRow, parseCsv, TEMPLATE_CSV, uploads, validate } from '../backdated';
import { employees } from '../employees';
import { CURRENT_USER } from '../leaves';

type Checked = { line: number; row: BackdatedRow; errors: string[] };

@Component({
  selector: 'app-import-backdated',
  imports: [DecimalPipe],
  templateUrl: './import-backdated.component.html',
  styleUrl: './import-backdated.component.scss',
})
export class ImportBackdatedComponent {
  private router = inject(Router);
  columns = BACKDATED_COLUMNS;

  file = signal<File | null>(null);
  excel = signal(false);
  missing = signal<string[]>([]);
  checked = signal<Checked[]>([]);
  dragging = signal(false);
  showErrorsOnly = signal(false);

  valid = computed(() => this.checked().filter(c => !c.errors.length));
  invalid = computed(() => this.checked().filter(c => c.errors.length));
  visible = computed(() => this.showErrorsOnly() ? this.invalid() : this.checked());
  canImport = computed(() => !!this.file() && !this.missing().length && (this.excel() || this.valid().length > 0));

  name = (id: string) => employees().find(e => e.code === id)?.name;

  async take(f: File | undefined | null) {
    this.dragging.set(false);
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext ?? '')) { alert('Use a .csv, .xls or .xlsx file'); return; }
    if (f.size > 5 * 1024 * 1024) { alert('File must be 5MB or smaller'); return; }
    this.file.set(f); this.excel.set(ext !== 'csv'); this.missing.set([]); this.checked.set([]);
    if (ext === 'csv') {
      const res = validate(parseCsv(await f.text()), new Set(employees().map(e => e.code)));
      this.missing.set(res.missing); this.checked.set(res.rows);
    }
  }
  clear() { this.file.set(null); this.checked.set([]); this.missing.set([]); this.showErrorsOnly.set(false); }

  template() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
    a.download = 'backdated-payroll-template.csv'; a.click(); URL.revokeObjectURL(a.href);
  }

  // ponytail: Excel files are stored without rows here; the backend parses them on upload
  import() {
    if (!this.canImport()) return;
    uploads.update(list => [{ id: Math.max(0, ...list.map(u => u.id)) + 1, file: this.file()!.name, uploadedAt: new Date().toISOString(), by: CURRENT_USER,
      rows: this.valid().map(c => c.row) }, ...list]);
    this.router.navigateByUrl('/backdated-data-uploaded');
  }
}
