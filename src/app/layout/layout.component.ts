import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { theme, toggleTheme } from '../theme';
import { photo } from '../profile';
import { feed, markRead, readIds, unread } from '../notifications';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private router = inject(Router);
  title = inject(Title);
  today = new Date();
  theme = theme;
  toggleTheme = toggleTheme;
  collapsed = false;
  profileOpen = false;
  bellOpen = false;
  feed = feed; unread = unread;
  isRead = (id: string) => readIds().has(id);
  openNote(id: string) { markRead([id]); this.bellOpen = false; }
  markAll() { markRead(unread().map(n => n.id)); }
  userName = 'Suchi Thakur';
  photo = photo;
  initials = this.userName.split(' ').map(p => p[0]).join('');

  open: string | null = null;

  // ponytail: unbuilt pages fall through the '**' route back to /home until cloned
  menu: { label: string; icon: string; fa?: string; link?: string; children?: { label: string; link: string; soon?: boolean }[] }[] = [
    { label: 'Dashboard', icon: 'home-icon.svg', link: '/home' },
    { label: 'Employee Management', icon: 'employees-icon.svg', children: [
      { label: 'Create Employee', link: '/employeeadd' },
      { label: 'Employee List', link: '/employeelist' },
      { label: 'Shift Timing', link: '/shifttiming' },
    ] },
    { label: 'Department', icon: 'department-icon.svg', children: [
      { label: 'Department List', link: '/departmentlist' },
      { label: 'Add Department', link: '/departmentadd' },
      { label: 'Organisation Chart', link: '/organisationchart' },
      { label: 'Add Designation', link: '/add-designation' },
      { label: 'Designation List', link: '/designation-list' },
    ] },
    { label: 'Attendance', icon: 'calender-icn.svg', children: [
      { label: 'Attendance History', link: '/attendancehistory' },
      { label: 'Regularization Requests', link: '/attendanceregularization' },
    ] },
    { label: 'Leave Management', icon: 'leavemgmt-icn.svg', children: [
      { label: 'Leave Request', link: '/leaverequest' },
      { label: 'Leave History', link: '/leavehistory' },
      { label: 'Apply Leave', link: '/myleaveapply' },
      { label: 'Company Holidays', link: '/companyholidays' },
      { label: 'Calendar View', link: '/calenderview' },
      { label: 'My Leave History (ESS)', link: '/myleavehistory' },
      { label: 'My Leave Summary Overview', link: '/leavesummaryoverview' },
      { label: 'Approval Inbox', link: '/approvalinbox' },
      { label: 'Leave Configuration', link: '/leaveconfiguration' },
    ] },
    { label: 'Payroll Processing', icon: 'payroll-icn.svg', children: [
      { label: 'Monthly Payroll Summary', link: '/monthlypayrollsummary' },
      { label: 'Generate Payslips', link: '/generatepayslips' },
      { label: 'Import Backdated Payroll', link: '/importbackdatedpayroll' },
      { label: 'Backdated Data Uploaded', link: '/backdated-data-uploaded' },
    ] },
    // ponytail: probation pages are added here as each phase ships
    { label: 'Probation', icon: '', fa: 'fa-solid fa-user-clock', children: [
      { label: 'Probation Dashboard', link: '/probation' },
      { label: 'My Probation', link: '/probation/me' },
      { label: 'Probation List', link: '/probation/list' },
      { label: 'PIP List', link: '/probation/pip' },
      { label: 'Letter Templates', link: '/probation/letters', soon: true },
      { label: 'Notification Designs', link: '/probation/notification-designs', soon: true },
      { label: 'Reports', link: '/probation/reports', soon: true },
      { label: 'Probation Settings', link: '/probation/settings', soon: true },
    ] },
  ];

  get crumbs() {
    const url = this.router.url.split('?')[0];
    if (url.startsWith('/probation/view/')) return ['Probation', 'Probation List', 'Probation Detail'];
    if (/^\/probation\/pip\/./.test(url)) return ['Probation', 'PIP List', 'PIP Plan'];
    if (url.startsWith('/probation/decide/')) return ['Probation', 'Probation List', 'Probation Decision'];
    if (url.startsWith('/probation/review/')) return ['Probation', 'Probation List', url.includes('/self/') ? 'Self Review' : 'RM Review'];
    if (/^\/(employee(view|edit)|updatesalarydetails)\//.test(url)) return ['Employee Management', 'Employee List', this.title.getTitle()];
    for (const m of this.menu) {
      const c = m.children?.find(c => url === c.link || url.startsWith(c.link + '/'));
      if (c) return [m.label, this.title.getTitle() ?? c.label];
    }
    return [this.title.getTitle()];
  }

  isSectionActive(m: { label: string; children?: { link: string }[] }) {
    return !!m.children?.some(c => this.router.url.startsWith(c.link)) || (m.label === 'Employee Management' && /^\/(employee|updatesalarydetails)/.test(this.router.url)) || (m.label === 'Probation' && this.router.url.startsWith('/probation'));
  }

  constructor() {
    this.open = this.menu.find(m => this.isSectionActive(m))?.label ?? null;
  }

  logout() { this.router.navigateByUrl('/login'); }
}
