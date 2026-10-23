import { Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LetterKind, LetterTemplate, MERGE_FIELDS, render, saveTemplate, templates, unknownFields } from '../letters';
import { probations, probationSettings, reviewOf, timeline } from '../probation';
import { employees } from '../employees';
import { leaves } from '../leaves';
import { COMPANY } from '../payroll';

@Component({
  selector: 'app-letter-templates',
  imports: [FormsModule, DatePipe],
  templateUrl: './letter-templates.component.html',
  styleUrl: './letter-templates.component.scss',
})
export class LetterTemplatesComponent {
  company = COMPANY;
  today = new Date().toISOString().slice(0, 10);
  kind = signal<LetterKind>('confirmation');
  draft = signal<LetterTemplate>(structuredClone(templates()[0]));
  body = viewChild<ElementRef<HTMLTextAreaElement>>('body');

  fields = computed(() => MERGE_FIELDS.filter(f => !f.kinds || f.kinds.includes(this.kind())));
  dirty = computed(() => JSON.stringify(this.draft()) !== JSON.stringify(templates().find(t => t.kind === this.kind())));
  unknown = computed(() => [...new Set([...unknownFields(this.draft().subject), ...unknownFields(this.draft().body)])]);
  saved = signal(false);

  switchTo(k: LetterKind) {
    if (this.dirty() && !confirm('Discard unsaved changes to this template?')) return;
    this.kind.set(k); this.draft.set(structuredClone(templates().find(t => t.kind === k)!)); this.saved.set(false);
  }
  touch() { this.draft.update(d => ({ ...d })); this.saved.set(false); }
  insert(key: string) {
    const ta = this.body()?.nativeElement; const tag = `{{${key}}}`;
    const d = this.draft(); const at = ta ? ta.selectionStart : d.body.length;
    d.body = d.body.slice(0, at) + tag + d.body.slice(ta ? ta.selectionEnd : at);
    this.touch();
    setTimeout(() => { ta?.focus(); ta?.setSelectionRange(at + tag.length, at + tag.length); });
  }
  // ponytail: PUT /letter-templates/:kind once the endpoint is shared
  save() { if (this.unknown().length) return; saveTemplate(this.draft()); this.saved.set(true); }
  discard() { this.draft.set(structuredClone(templates().find(t => t.kind === this.kind())!)); }

  // preview data: any employee on probation, filled from their record
  names = computed(() => probations().map(p => p.employee));
  previewFor = signal('Narayan Chandra Barik');
  ctx = computed<Record<string, string>>(() => {
    const fmt = (d?: string) => d ? formatDate(d, 'd MMMM y', 'en') : '';
    const e = employees().find(x => x.name === this.previewFor())!;
    const p = probations().find(x => x.employee === e.name)!;
    const t = timeline(p, e.joined, leaves(), probationSettings(), this.today);
    const d = p.decisions?.at(-1); const rm = reviewOf(e.name, 'rm');
    const months = d?.extendMonths ?? rm?.extendMonths ?? 1;
    return {
      employee_name: e.name, first_name: e.name.split(' ')[0], employee_code: e.code, designation: e.designation, department: e.department,
      joining_date: fmt(e.joined), probation_end: fmt(t.end), letter_date: fmt(this.today),
      effective_date: fmt(d?.effectiveOn ?? t.end), new_end_date: fmt(p.extendedTo ?? t.end),
      extension_months: `${months} month${months > 1 ? 's' : ''}`, pip_focus: (rm?.pipFocus ?? 'Objectives agreed with your reporting manager').split('\n').map(l => '• ' + l).join('\n'),
      last_working_day: fmt(d?.lastWorkingDay ?? t.end), reason: d?.reason ?? rm?.reason ?? 'Performance did not meet the required standard.', rm_name: e.manager || 'Your reporting manager',
    };
  });
  subject = computed(() => render(this.draft().subject, this.ctx()));
  rendered = computed(() => render(this.draft().body, this.ctx()));
  print() { window.print(); }
}
