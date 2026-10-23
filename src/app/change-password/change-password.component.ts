import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  current = signal(''); pw = signal(''); confirm = signal('');
  showCurrent = signal(false); show = signal(false); showConfirm = signal(false);
  tried = signal(false); done = signal(false);

  rules = computed(() => {
    const p = this.pw();
    return [
      { label: 'At least 8 characters', ok: p.length >= 8 },
      { label: 'An uppercase letter', ok: /[A-Z]/.test(p) },
      { label: 'A lowercase letter', ok: /[a-z]/.test(p) },
      { label: 'A number', ok: /\d/.test(p) },
      { label: 'A symbol (e.g. ! @ #)', ok: /[^A-Za-z0-9]/.test(p) },
    ];
  });
  score = computed(() => this.rules().filter(r => r.ok).length);
  strength = computed(() => !this.pw() ? '' : this.score() <= 2 ? 'Weak' : this.score() <= 4 ? 'Fair' : 'Strong');
  matches = computed(() => !!this.confirm() && this.confirm() === this.pw());
  reused = computed(() => !!this.pw() && this.pw() === this.current());
  valid = computed(() => !!this.current() && this.score() === 5 && !this.reused() && this.matches());

  submit() {
    this.tried.set(true);
    if (!this.valid()) return;
    // ponytail: POST /auth/change-password once the endpoint is shared
    // ponytail: the server must verify the current password; the client only checks it's filled in
    this.done.set(true); this.current.set(''); this.pw.set(''); this.confirm.set(''); this.tried.set(false);
  }
}
