import { signal } from '@angular/core';

export interface Employee {
  name: string; email: string; code: string; department: string; manager: string;
  location: string; active: boolean; designation: string; joined: string; mobile: string; nationalId: string;
  documents: { type: string; file: string }[];
}

// varied joining dates so probation shows every stage (today ≈ Oct 2026)
const JOINED = ['2025-01-08', '2026-04-20', '2026-07-25', '2026-07-10', '2026-09-01', '2026-08-10', '2026-03-02', '2026-10-01', '2026-06-15'];

// ponytail: in-memory mock shared by list/view/edit; replace with an EmployeeService over the API
export const employees = signal<Employee[]>([
  ['Suchi Thakur', 'suchi.thakur@harbourandhills.com', '0010', 'Human Resources', '', 'HR Manager'],
  ['Pardeep Kumar', 'pardeep.kumar@harbourandhills.com', '0009', 'IT', 'Suchi Thakur', 'Senior Developer'],
  ['Narayan Chandra Barik', 'narayan.barik@harbourandhills.com', '10', 'IT', 'Suchi Thakur', 'Developer'],
  ['NC Barik', 'ncbarik@gmail.com', '012', 'Test', 'Narayan Chandra Barik', 'QA Engineer'],
  ['Nar Barik', 'barik.narayan@gmail.com', '013', 'IT', 'Pardeep Kumar', 'Developer'],
  ['Test Firsteho', 'vinay.yadav@harbourandhills.com', 'EMP11991', 'Human Resources', 'Nar Barik', 'HR Executive'],
  ['Test Firsteru', 'sarub69@gmail.com', 'EMP03192', 'Human Resources', 'Narayan Chandra Barik', 'HR Executive'],
  ['TestAdmin Test', 'sarub69b@gmail.com', 'EMP76071', 'Human Resources', 'Narayan Chandra Barik', 'Administrator'],
  ['TestEmployee TestLastName', 'sarub69c@gmail.com', 'EMP000244', 'Human Resources', 'Narayan Chandra Barik', 'HR Executive'],
].map(([name, email, code, department, manager, designation], i) => ({
  name, email, code, department, manager, designation,
  location: 'India', active: true, joined: JOINED[i], mobile: '+91 98765 43210', nationalId: 'HK' + code.replace(/\D/g, '').padStart(7, '0'),
  documents: [{ type: 'National ID', file: 'national-id.png' }, { type: 'Visa', file: 'visa.png' }, { type: 'Passport', file: 'passport.png' }],
})));

export const findEmployee = (code: string | null) => employees().find(e => e.code === code);
