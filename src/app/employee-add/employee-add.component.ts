import { Component, ElementRef, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { findEmployee } from '../employees';
import { departments } from '../departments';
import { designations } from '../designations';
import { NgTemplateOutlet } from '@angular/common';

export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'select' | 'file';
  req?: boolean;
  options?: string[];
  ph?: string;
}

// ponytail: Intl region names instead of a hand-kept 140-country array
const regions = new Intl.DisplayNames(['en'], { type: 'region' });
const COUNTRIES = Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + (i / 26 | 0), 65 + (i % 26)))
  .filter(code => !['EU', 'EZ', 'UN', 'QO', 'AC', 'CP', 'DG', 'EA', 'IC', 'TA', 'XK'].includes(code))
  .map(code => { try { return regions.of(code)!; } catch { return ''; } })
  .filter(n => n && n.length > 2 && !/Unknown|Outlying|Pseudo/.test(n))
  .filter((n, i, a) => a.indexOf(n) === i)
  .sort();

const address: Field[] = [
  { name: 'floor', label: 'Floor', ph: 'Enter floor' },
  { name: 'blockOrUnit', label: 'Block / Unit', ph: 'Enter block / unit' },
  { name: 'buildingName', label: 'Building Name', req: true, ph: 'Enter building name' },
  { name: 'streetNameOrNumber', label: 'Street Name / Number', ph: 'Enter street name / number' },
  { name: 'stateName', label: 'State', req: true, ph: 'Enter state' },
  { name: 'cityName', label: 'City', req: true, ph: 'Enter city' },
  { name: 'countryName', label: 'Country', type: 'select', req: true, options: COUNTRIES, ph: 'Select country' },
  { name: 'zipCode', label: 'Zip Code', ph: 'Enter zip code' },
];

@Component({
  selector: 'app-employee-add',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './employee-add.component.html',
  styleUrl: './employee-add.component.scss',
})
export class EmployeeAddComponent {
  private fb = inject(FormBuilder);
  private host = inject(ElementRef<HTMLElement>);
  private router = inject(Router);
  // same form serves /employeeadd and /employeeedit/:code (UAT does the same)
  editing = findEmployee(inject(ActivatedRoute).snapshot.paramMap.get('code'));

  // ponytail: dropdown data mirrors UAT; comes from master-data APIs later
  personal: Field[] = [
    { name: 'firstName', label: 'First Name', req: true, ph: 'Enter first name' },
    { name: 'middleName', label: 'Middle Name', ph: 'Enter middle name' },
    { name: 'lastName', label: 'Last Name', req: true, ph: 'Enter last name' },
    { name: 'email', label: 'Email', type: 'email', req: true, ph: 'Enter email' },
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', req: true },
    { name: 'nationality', label: 'Nationality', type: 'select', req: true, options: COUNTRIES, ph: 'Select nationality' },
    { name: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], ph: 'Select blood group' },
    { name: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'], ph: 'Select marital status' },
    { name: 'physicallyHandicapped', label: 'Physically Handicapped', type: 'select', options: ['Yes', 'No'], ph: 'Select' },
    { name: 'fatherName', label: 'Father Name', ph: 'Enter father name' },
    { name: 'motherName', label: 'Mother Name', ph: 'Enter mother name' },
    { name: 'jobTitlePrimary', label: 'Job Title (Primary)', ph: 'Enter job title' },
    { name: 'workerType', label: 'Worker Type', type: 'select', req: true, options: ['Permanent', 'Contract'], ph: 'Select worker type' },
    { name: 'timeType', label: 'Time Type', type: 'select', req: true, options: ['Full Time', 'Part Time'], ph: 'Select time type' },
    { name: 'shiftId', label: 'Shift', type: 'select', req: true, ph: 'Select shift', options: [
      'Morning Shift (07:00 AM - 04:00 PM)', 'Evening Shift (10:00 AM - 07:00 PM)',
      'General Shift 1 (08:00 AM - 05:00 PM)', 'General Shift 2 (09:00 AM - 06:00 PM)'] },
    { name: 'gender', label: 'Gender', type: 'select', req: true, options: ['Male', 'Female', 'Other'], ph: 'Select gender' },
    { name: 'mobile', label: 'Mobile', type: 'tel', req: true, ph: 'Enter mobile number' },
    { name: 'dateOfJoining', label: 'Date of Joining', type: 'date', req: true },
    { name: 'roleId', label: 'Role', type: 'select', req: true, options: ['Admin', 'Manager', 'Employee'], ph: 'Select role' },
    { name: 'reportingManagerId', label: 'Reporting Manager', type: 'select', req: true, ph: 'Select reporting manager',
      options: ['Suchi Thakur', 'Pardeep Kumar', 'Narayan Barik'] },
    { name: 'departmentId', label: 'Department', type: 'select', req: true, ph: 'Select department',
      options: departments().map(d => d.name) },
    { name: 'designationId', label: 'Designation', type: 'select', req: true, ph: 'Select designation' },
    { name: 'branch', label: 'Branch', type: 'select', options: ['Head Office'], ph: 'Select branch' },
    { name: 'employeeNumber', label: 'Employee Code', req: true, ph: 'Enter employee code' },
  ];
  address = address;
  visa: Field[] = [
    { name: 'visaType', label: 'Visa Type', type: 'select', req: true, options: ['Work Visa', 'Student Visa', 'Tourist Visa', 'Business Visa'], ph: 'Select visa type' },
    { name: 'visaNumber', label: 'Visa Number', req: true, ph: 'Enter visa number' },
    { name: 'issuingCountry', label: 'Issuing Country', type: 'select', req: true, options: COUNTRIES, ph: 'Select country' },
    { name: 'issueDate', label: 'Issue Date', type: 'date' },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date', req: true },
    { name: 'visaStatus', label: 'Visa Status', type: 'select', options: ['Valid', 'Expired', 'Pending', 'Cancelled', 'Rejected'], ph: 'Select visa status' },
    { name: 'file', label: 'Upload Visa', type: 'file', req: true },
  ];
  passport: Field[] = [
    { name: 'number', label: 'Passport Number', ph: 'Enter passport number' },
    { name: 'country', label: 'Country of Issue', type: 'select', options: COUNTRIES, ph: 'Select country' },
    { name: 'place', label: 'Place of Issue', ph: 'Enter place of issue' },
    { name: 'issueDate', label: 'Issue Date', type: 'date' },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { name: 'file', label: 'Upload Passport', type: 'file' },
  ];
  nationalId: Field[] = [
    { name: 'number', label: 'National ID Number', req: true, ph: 'Enter national ID number' },
    { name: 'country', label: 'Country', type: 'select', req: true, options: COUNTRIES, ph: 'Select country' },
    { name: 'issueDate', label: 'Issue Date', type: 'date' },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { name: 'file', label: 'Upload National ID', type: 'file', req: true },
  ];
  govId: Field[] = [
    { name: 'type', label: 'ID Type', type: 'select', options: ['Driving License', 'Voter ID', 'Tax ID', 'Other'], ph: 'Select ID type' },
    { name: 'number', label: 'ID Number', ph: 'Enter ID number' },
    { name: 'authority', label: 'Issuing Authority', ph: 'Enter issuing authority' },
    { name: 'issueDate', label: 'Issue Date', type: 'date' },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
    { name: 'file', label: 'Upload Document', type: 'file' },
  ];
  bank: Field[] = [
    { name: 'accountHolderName', label: 'Account Holder Name', ph: 'Enter account holder name' },
    { name: 'bankName', label: 'Bank Name', ph: 'Enter bank name' },
    { name: 'bankAccountNumber', label: 'Bank Account Number', req: true, ph: 'Enter account number' },
    { name: 'bankCode', label: 'Bank Code', req: true, ph: 'Enter bank code' },
  ];

  private group = (fields: Field[]) => this.fb.nonNullable.group(Object.fromEntries(fields.map(f => [
    f.name, [f.name === 'branch' ? 'Head Office' : '', f.req ? (f.type === 'email' ? [Validators.required, Validators.email] : Validators.required) : []],
  ])));

  form = this.fb.nonNullable.group({
    personal: this.group(this.personal),
    current: this.group(address),
    sameAddress: false,
    permanent: this.group(address),
    visaApplicable: 'no',
    visa: this.group(this.visa),
    passport: this.group(this.passport),
    nationalId: this.group(this.nationalId),
    govId: this.group(this.govId),
    bank: this.group(this.bank),
  });
  files: Record<string, string> = {};

  get visaOn() { return this.form.controls.visaApplicable.value === 'yes'; }

  constructor() {
    if (this.editing) {
      const e = this.editing;
      const [firstName, ...rest] = e.name.split(' ');
      this.form.controls.personal.patchValue({
        firstName, lastName: rest.join(' '), email: e.email, mobile: e.mobile, employeeNumber: e.code,
        departmentId: e.department, reportingManagerId: e.manager, dateOfJoining: e.joined, jobTitlePrimary: e.designation, designationId: e.designation,
      });
    }
    const { visa, passport, current, permanent, sameAddress, visaApplicable, personal } = this.form.controls;
    personal.controls['departmentId'].valueChanges.subscribe(() => personal.controls['designationId'].setValue(''));
    visa.disable();

    // visa on → visa fields active and passport becomes mandatory (matches UAT)
    visaApplicable.valueChanges.subscribe(v => {
      v === 'yes' ? visa.enable() : visa.disable();
      for (const k of ['number', 'country', 'issueDate', 'expiryDate', 'file'] as const) {
        const c = passport.controls[k];
        c.setValidators(v === 'yes' ? Validators.required : null);
        c.updateValueAndValidity();
      }
    });

    sameAddress.valueChanges.subscribe(same => {
      if (same) { permanent.setValue(current.getRawValue()); permanent.disable(); } else permanent.enable();
    });
    current.valueChanges.subscribe(() => { if (sameAddress.value) permanent.setValue(current.getRawValue()); });
  }

  optionsFor(f: Field) {
    if (f.name !== 'designationId') return f.options;
    const dept = this.form.controls.personal.controls['departmentId'].value;
    return designations().filter(d => d.department === dept).map(d => d.name);
  }

  isReq(group: string, f: Field) {
    return f.req || (group === 'passport' && this.visaOn && f.name !== 'place');
  }

  invalid(group: string, name: string) {
    const c = this.form.get([group, name]);
    return !!c && c.invalid && c.touched;
  }

  pick(group: string, name: string, input: HTMLInputElement) {
    const file = input.files?.[0];
    this.files[group + name] = file?.name ?? '';
    const c = this.form.get([group, name])!;
    c.setValue(file?.name ?? '');
    c.markAsTouched();
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => this.host.nativeElement.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    // ponytail: POST /employees once the backend endpoint is shared
    console.log(this.form.getRawValue());
    if (this.editing) this.router.navigate(['/employeeview', this.editing.code]);
  }
}
