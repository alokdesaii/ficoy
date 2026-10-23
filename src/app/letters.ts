import { signal } from '@angular/core';

export type LetterKind = 'confirmation' | 'extension' | 'termination';
export interface LetterTemplate { kind: LetterKind; name: string; subject: string; body: string; signatory: string; signatoryTitle: string; needsApproval: boolean; updatedAt: string; }

export const MERGE_FIELDS: { key: string; label: string; kinds?: LetterKind[] }[] = [
  { key: 'employee_name', label: 'Employee name' }, { key: 'first_name', label: 'First name' }, { key: 'employee_code', label: 'Employee code' },
  { key: 'designation', label: 'Designation' }, { key: 'department', label: 'Department' }, { key: 'joining_date', label: 'Joining date' },
  { key: 'probation_end', label: 'Probation end date' }, { key: 'effective_date', label: 'Effective date' }, { key: 'letter_date', label: 'Letter date' },
  { key: 'new_end_date', label: 'New end date', kinds: ['extension'] }, { key: 'extension_months', label: 'Extension length', kinds: ['extension'] },
  { key: 'pip_focus', label: 'PIP focus areas', kinds: ['extension'] },
  { key: 'last_working_day', label: 'Last working day', kinds: ['termination'] }, { key: 'reason', label: 'Reason', kinds: ['termination'] },
  { key: 'rm_name', label: 'Reporting manager' },
];

// {{key}} → value; unknown keys stay visible so a typo is easy to spot
export const render = (text: string, ctx: Record<string, string>) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => ctx[k] ?? m);
export const unknownFields = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).filter(k => !MERGE_FIELDS.some(f => f.key === k));

// ponytail: default wording; replace with GET/PUT /letter-templates once wired. HR/legal should review the copy.
export const templates = signal<LetterTemplate[]>([
  { kind: 'confirmation', name: 'Confirmation Letter', subject: 'Confirmation of Employment',
    body: `Dear {{first_name}},\n\nWe are pleased to confirm that you have successfully completed your probation as {{designation}} in the {{department}} department.\n\nYour employment is confirmed with effect from {{effective_date}}. All other terms and conditions of your employment remain unchanged.\n\nThank you for your contribution so far. We look forward to your continued success with us.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: false, updatedAt: '2026-10-01' },
  { kind: 'extension', name: 'Extension Letter', subject: 'Extension of Probation Period',
    body: `Dear {{first_name}},\n\nFollowing your probation review, your probation period as {{designation}} has been extended by {{extension_months}}. Your probation will now end on {{new_end_date}}.\n\nDuring this period you will follow a Performance Improvement Plan focusing on:\n{{pip_focus}}\n\n{{rm_name}} will hold regular check-ins with you. We are committed to supporting you through this period.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: true, updatedAt: '2026-10-01' },
  { kind: 'termination', name: 'Termination Letter', subject: 'Termination of Employment During Probation',
    body: `Dear {{first_name}},\n\nFurther to your probation review, we regret to inform you that your employment as {{designation}} will not be confirmed.\n\nReason: {{reason}}\n\nYour employment will end with effect from {{effective_date}}. Your last working day will be {{last_working_day}}. Your final settlement will be processed with the next payroll cycle.\n\nPlease return all company property to HR on or before your last working day.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: true, updatedAt: '2026-10-01' },
]);
export function saveTemplate(t: LetterTemplate) { templates.update(l => l.map(x => x.kind === t.kind ? { ...t, updatedAt: new Date().toISOString().slice(0, 10) } : x)); }
