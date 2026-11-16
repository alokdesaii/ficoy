import type { EventKey, Role } from './probation';

type Ctx = Record<string, string>;
export interface Copy { title: string; body: string; cta: string; tone: 'info' | 'warn' | 'ok' | 'bad' | 'pip'; icon: string; }

// one table of wording per event and recipient; email + in-app + designs all read from here
// ponytail: copy is a first draft for HR to edit; move to the notification-templates API later
const C: Record<EventKey, { tone: Copy['tone']; icon: string; cta: string; text: Partial<Record<Role, [string, string]>> & { default: [string, string] } }> = {
  started: { tone: 'info', icon: 'fa-solid fa-flag', cta: 'View probation', text: {
    Employee: ['Welcome! Your probation has started', 'Your {months}-month probation runs from {start} to {end}. Your manager reviews it from {reviewOpens}.'],
    default: ['{name} started probation', '{name} ({designation}) is on probation from {start} to {end}.'] } },
  reminder: { tone: 'warn', icon: 'fa-regular fa-bell', cta: 'View probation', text: {
    Employee: ['Your probation ends in {daysLeft} days', 'Your probation ends on {end}. Your manager will complete your review before then.'],
    RM: ['{name}\'s probation ends in {daysLeft} days', 'Please complete your RM review for {name} before {end}.'],
    default: ['{name}\'s probation ends in {daysLeft} days', 'Probation ends on {end}. Reviews: {reviews}.'] } },
  reviewOpen: { tone: 'info', icon: 'fa-regular fa-clipboard', cta: 'Start review', text: {
    Employee: ['Your probation review has started', 'Your manager is reviewing your probation, due by {end}.'],
    RM: ['Review {name}\'s probation', 'The review window for {name} is open until {end}.'],
    default: ['Review opened for {name}', 'The RM review is due by {end}.'] } },
  reviewSubmitted: { tone: 'ok', icon: 'fa-solid fa-check', cta: 'View review', text: {
    default: ['RM review submitted for {name}', 'The recommendation is ready for a decision.'] } },
  overdue: { tone: 'bad', icon: 'fa-solid fa-triangle-exclamation', cta: 'Chase reviews', text: {
    RM: ['Overdue: review for {name}', 'Probation ended on {end}. Please submit your RM review today.'],
    default: ['Overdue: {name}\'s probation review', 'Probation ended {overdue} days ago. Still waiting on: {missing}.'] } },
  confirmed: { tone: 'ok', icon: 'fa-solid fa-circle-check', cta: 'View record', text: {
    Employee: ['Congratulations, you\'re confirmed!', 'Your employment is confirmed from {effective}. Your confirmation letter is attached.'],
    Payroll: ['Confirmed: {name}', 'Update employment status to Permanent from {effective}.'],
    default: ['{name} has been confirmed', 'Confirmed from {effective}.'] } },
  extended: { tone: 'pip', icon: 'fa-solid fa-route', cta: 'View probation', text: {
    Employee: ['Your probation has been extended', 'Your probation now ends on {newEnd}. Your manager will review you again before then.'],
    Payroll: ['Probation extended: {name}', 'Status stays Probation until {newEnd}.'],
    default: ['{name}\'s probation was extended', 'New end date {newEnd}. The RM reviews again before then.'] } },
  terminated: { tone: 'bad', icon: 'fa-solid fa-circle-xmark', cta: 'View record', text: {
    Employee: ['An update on your employment', 'Please read the attached letter. HR will contact you about next steps.'],
    Payroll: ['Termination: {name}', 'Process the final settlement. Last working day {lastDay}.'],
    default: ['{name} will not be confirmed', 'Employment ends {effective}.'] } },
  leaveAdjusted: { tone: 'pip', icon: 'fa-regular fa-calendar-minus', cta: 'View timeline', text: {
    Employee: ['Your probation end date moved', 'Approved leave added {days} days. Your probation now ends on {end}.'],
    default: ['{name}\'s probation was adjusted', '{days} days of leave added. New end date {end}.'] } },
  deliveryFailed: { tone: 'bad', icon: 'fa-solid fa-envelope-circle-check', cta: 'Resend', text: {
    default: ['Email to {name} failed', 'A probation reminder bounced. Check the address and resend it.'] } },
  letterIssued: { tone: 'ok', icon: 'fa-regular fa-envelope-open', cta: 'Open letter', text: {
    Employee: ['You have a new letter from HR', 'Your {letter} letter is ready to view and download.'],
    default: ['{letter} letter issued to {name}', 'Sent on {today}.'] } },
};

export const fill = (t: string, ctx: Ctx) => t.replace(/\{(\w+)\}/g, (m, k) => ctx[k] ?? m);
export function copyFor(event: EventKey, role: Role, ctx: Ctx): Copy {
  const c = C[event]; const [title, body] = c.text[role] ?? c.text.default;
  return { title: fill(title, ctx), body: fill(body, ctx), cta: c.cta, tone: c.tone, icon: c.icon };
}

