import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  showPassword = false;
  form = this.fb.nonNullable.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
  });

  step: 'login' | 'otp' = 'login';
  otp = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  // ponytail: no API yet, backend team owns auth
  submit() { this.step = 'otp'; }
  submitOtp() { this.router.navigateByUrl('/home'); }
}
