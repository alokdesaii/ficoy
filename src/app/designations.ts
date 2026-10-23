import { signal } from '@angular/core';

export interface Designation { id: number; department: string; name: string; }

// ponytail: in-memory mock; replace with a DesignationService over the API
export const designations = signal<Designation[]>([
  ['Human Resources', 'HR Manager'], ['Human Resources', 'HR Executive'], ['Human Resources', 'Administrator'],
  ['IT', 'Senior Developer'], ['IT', 'Developer'], ['IT', 'Tech Lead'],
  ['Sales', 'Sales Executive'], ['Operations', 'Operations Manager'],
  ['Test', 'QA Engineer'], ['Payments', 'Payments Analyst'],
  ['IT', 'Software Engineer'], ['Sales', 'Sales Manager'], ['Operations', 'Operations Executive'], ['ADMIN HR', 'Office Administrator'],
].map(([department, name], i) => ({ id: i + 1, department, name })));

export const findDesignation = (id: string | null) => designations().find(d => String(d.id) === id);
