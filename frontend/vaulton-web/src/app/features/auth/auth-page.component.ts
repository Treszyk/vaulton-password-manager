import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';

@Component({
  standalone: true,
  selector: 'app-auth-page',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Register</h2>

    <div style="margin-bottom:8px;">
      AccountId: <code>{{ accountId() || '(loading...)' }}</code>
      <button style="margin-left:8px;" (click)="refreshAccountId()">New</button>
    </div>

    <div style="margin-top:12px;">
      <label>Password</label><br />
      <input
        style="width:420px;"
        type="password"
        [ngModel]="password()"
        (ngModelChange)="password.set($event)"
      />
    </div>

    <div style="margin-top:12px;">
      <label>KdfMode</label><br />
      <select [ngModel]="kdfMode()" (ngModelChange)="kdfMode.set(+$event)">
        <option [value]="0">0</option>
        <option [value]="1">1</option>
        <option [value]="2">2</option>
      </select>
    </div>

    <div style="margin-top:12px;">
      <button (click)="register()" [disabled]="!accountId() || !password().length">Register</button>
      <button style="margin-left:8px;" (click)="clear()">Clear UI</button>
    </div>

    <h3 style="margin-top:16px;">Result</h3>
    <pre style="white-space: pre-wrap;">{{ result() }}</pre>

    <h3 *ngIf="loginBodyForSwagger()" style="margin-top:16px;">Login body for Swagger</h3>
    <pre *ngIf="loginBodyForSwagger()" style="white-space: pre-wrap;">{{
      loginBodyForSwagger()
    }}</pre>
  `,
})
export class AuthPageComponent {
  accountId = signal<string>('');
  password = signal<string>('');
  kdfMode = signal<number>(1);
  result = signal<string>('');
  loginBodyForSwagger = signal<string>('');

  constructor(private readonly api: AuthApiService, private readonly crypto: AuthCryptoService) {
    this.refreshAccountId();
  }

  refreshAccountId(): void {
    this.result.set('');
    this.loginBodyForSwagger.set('');
    this.api.preRegister().subscribe({
      next: (r) => this.accountId.set(r.AccountId),
      error: (e) => this.result.set(`Pre-register FAILED\n${this.pretty(e)}`),
    });
  }

  register(): void {
    const accountId = this.accountId();
    const password = this.password();
    const kdfMode = this.kdfMode();

    this.crypto
      .buildRegister(accountId, password, kdfMode)
      .then(({ registerBody, loginBodyForSwagger }) => {
        this.api.register(registerBody).subscribe({
          next: () => {
            this.result.set('Register OK');
            this.loginBodyForSwagger.set(loginBodyForSwagger);
            this.password.set('');
          },
          error: (e) => this.result.set(`Register FAILED\n${this.pretty(e)}`),
        });
      })
      .catch((e) => this.result.set(`Build FAILED\n${String(e)}`));
  }

  clear(): void {
    this.result.set('');
    this.loginBodyForSwagger.set('');
    this.password.set('');
  }

  private pretty(e: any): string {
    return JSON.stringify(
      { status: e?.status, statusText: e?.statusText, error: e?.error },
      null,
      2
    );
  }
}
