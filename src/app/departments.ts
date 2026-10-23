import { signal } from '@angular/core';

export interface Department { id: number; name: string; head: string; location: string; }

export const LOCATIONS = ['Hong Kong', 'India', 'USA', 'Australia'];

// ponytail: in-memory mock mirroring UAT; replace with a DepartmentService over the API
export const departments = signal<Department[]>([
  [2, 'Human Resources', 'Suchi Thakur', 'India'],
  [4, 'IT', '', 'USA'],
  [5, 'Sales', '', 'Australia'],
  [6, 'Operations', '', 'USA'],
  [29, 'Test', '', 'Hong Kong'],
  [31, 'Payments', '', 'Hong Kong'],
  [32, 'TestHK', '', 'Hong Kong'],
  [33, 'ADMIN HR', 'Suchi Thakur', 'Hong Kong'],
  [34, 'Test & QA', '', 'India'],
].map(([id, name, head, location]) => ({ id, name, head, location }) as Department));

export const findDepartment = (id: string | null) => departments().find(d => String(d.id) === id);
