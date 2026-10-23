import { signal } from '@angular/core';

// ponytail: extra profile fields not on the employee list record; comes from GET /me once wired
export const profileExtras = signal({
  dob: '2000-04-14', gender: 'Female', bloodGroup: '', nationality: 'India', maritalStatus: '',
  company: 'Harbour and Hills Financial Services Limited', branch: 'Head Office', employmentType: 'Full-Time',
  current: { floor: '', unit: '', building: '', city: 'Patiala', state: 'Punjab', country: 'India', zip: '' },
  permanent: { floor: '', unit: '', building: '', city: 'Patiala', state: 'Punjab', country: 'India', zip: '' },
  updatedAt: '2026-10-17T14:37:00',
});

// session-only photo preview (data URL); real upload goes to the file API
export const photo = signal<string>('');

export const ID_TYPES = ['Passport', 'Visa', 'National ID', 'Government ID'];
export interface IdDoc { type: string; number: string; country: string; file: string; }
export const idDocs = signal<IdDoc[]>([{ type: 'National ID', number: 'HK0012345', country: 'Hong Kong', file: 'national-id.png' }]);
