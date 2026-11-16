import { signal } from '@angular/core';

export type LetterKind = 'confirmation' | 'extension' | 'termination';
export interface LetterTemplate { kind: LetterKind; name: string; subject: string; body: string; signatory: string; signatoryTitle: string; needsApproval: boolean; updatedAt: string; }

export const MERGE_FIELDS: { key: string; label: string; kinds?: LetterKind[] }[] = [
  { key: 'employee_name', label: 'Employee name' }, { key: 'first_name', label: 'First name' }, { key: 'employee_code', label: 'Employee code' },
  { key: 'designation', label: 'Designation' }, { key: 'department', label: 'Department' }, { key: 'joining_date', label: 'Joining date' },
  { key: 'probation_end', label: 'Probation end date' }, { key: 'effective_date', label: 'Effective date' }, { key: 'letter_date', label: 'Letter date' },
  { key: 'new_end_date', label: 'New end date', kinds: ['extension'] }, { key: 'extension_months', label: 'Extension length', kinds: ['extension'] },
  { key: 'improvement_areas', label: 'Areas to improve', kinds: ['extension'] },
  { key: 'last_working_day', label: 'Last working day', kinds: ['termination'] }, { key: 'reason', label: 'Reason', kinds: ['termination'] },
  { key: 'rm_name', label: 'Reporting manager' }, { key: 'company_name', label: 'Company name' },
  { key: 'probation_months', label: 'Probation length (months)' }, { key: 'review_date', label: 'Review date', kinds: ['extension'] },
];

// {{key}} → value; unknown keys stay visible so a typo is easy to spot
export const render = (text: string, ctx: Record<string, string>) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => ctx[k] ?? m);
export const unknownFields = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).filter(k => !MERGE_FIELDS.some(f => f.key === k));

// ponytail: default wording; replace with GET/PUT /letter-templates once wired. HR/legal should review the copy.
export const templates = signal<LetterTemplate[]>([
  // confirmation + extension: HR's Templates.docx wording
  { kind: 'confirmation', name: 'Confirmation Letter', subject: 'Confirmation of Employment – {{employee_name}}',
    body: `Dear {{employee_name}},\n\nWe are pleased to inform you that you have successfully completed your probationary period with {{company_name}}.\n\nBased on your performance and contributions over the past {{probation_months}} months, your appointment as {{designation}} is now confirmed, effective {{effective_date}}.\n\nAll other terms and conditions of your employment agreement remain unchanged.\n\nWe appreciate your contribution and hope that you will continue to strive for better results.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: false, updatedAt: '2026-10-01' },
  { kind: 'extension', name: 'Extension Letter', subject: 'Notice of Probationary Period Extension – {{employee_name}}',
    body: `Dear {{employee_name}},\n\nPlease be noted, your initial probationary period of {{probation_months}} months was set to conclude on {{probation_end}}.\n\nFollowing your performance review on {{review_date}}, we have decided to extend your probationary period by an additional {{extension_months}}, moving your new completion date to {{new_end_date}}.\n\nDuring this period, your manager, {{rm_name}}, will support your progress and provide guidance. A final review will take place on or before {{new_end_date}} to determine whether your position will be confirmed.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: true, updatedAt: '2026-10-01' },
  { kind: 'termination', name: 'Termination Letter', subject: 'Termination of Employment During Probation',
    body: `Dear {{first_name}},\n\nFurther to your probation review, we regret to inform you that your employment as {{designation}} will not be confirmed.\n\nReason: {{reason}}\n\nYour employment will end with effect from {{effective_date}}. Your last working day will be {{last_working_day}}. Your final settlement will be processed with the next payroll cycle.\n\nPlease return all company property to HR on or before your last working day.`,
    signatory: 'Suchi Thakur', signatoryTitle: 'HR Manager', needsApproval: true, updatedAt: '2026-10-01' },
]);
export function saveTemplate(t: LetterTemplate) { templates.update(l => l.map(x => x.kind === t.kind ? { ...t, updatedAt: new Date().toISOString().slice(0, 10) } : x)); }
