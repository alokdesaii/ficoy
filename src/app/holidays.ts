import { signal } from '@angular/core';

export const HOLIDAY_TYPES = ['Public Holidays', 'National Holidays', 'Gov Holidays'];
export interface Holiday { id: number; from: string; to: string; name: string; type: string; }

// ponytail: 2026 HK public holidays mirroring UAT; replace with the holidays API
export const holidays = signal<Holiday[]>([
  ['2026-01-01', 'The first day of January'], ['2026-02-17', 'Lunar New Year’s Day'],
  ['2026-02-18', 'The second day of Lunar New Year'], ['2026-02-19', 'The third day of Lunar New Year'],
  ['2026-04-03', 'Good Friday'], ['2026-04-04', 'The day following Good Friday'],
  ['2026-04-06', 'The day following Ching Ming Festival'], ['2026-04-07', 'The day following Easter Monday'],
  ['2026-05-01', 'Labour Day'], ['2026-05-25', 'The day following the Birthday of the Buddha'],
  ['2026-06-19', 'Tuen Ng Festival'], ['2026-07-01', 'Hong Kong Special Administrative Region Establishment Day'],
  ['2026-09-26', 'The day following the Chinese Mid-Autumn Festival'], ['2026-10-01', 'National Day'],
  ['2026-10-19', 'The day following Chung Yeung Festival'], ['2026-12-25', 'Christmas Day'],
  ['2026-12-26', 'The first weekday after Christmas Day'],
].map(([d, name], i) => ({ id: i + 1, from: d, to: d, name, type: 'Public Holidays' })));
