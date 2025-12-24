import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';

@Component({
  standalone: true,
  selector: 'app-auth-debug',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Auth Debug</h2>

    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
      <button (click)="refresh()">Refresh (cookie)</button>
      <button (click)="me()">Me (Bearer)</button>
      <button (click)="logout()">Logout (cookie)</button>
      <button (click)="clearToken()">Clear token</button>
    </div>

    <label style="display:block; margin-bottom:6px;">Access token (in-memory)</label>
    <textarea
      [ngModel]="tokenInput()"
      (ngModelChange)="tokenInput.set($event)"
      rows="6"
      style="width:100%; font-family: monospace;"
    ></textarea>

    <div style="margin-top:8px;">
      <button (click)="setToken()">Set token</button>
      <span style="margin-left:12px;"
        >Current token: {{ authState.accessToken() ? 'SET' : 'NULL' }}</span
      >
    </div>

    <h3 style="margin-top:16px;">Result</h3>
    <pre style="white-space: pre-wrap;">{{ result() }}</pre>
  `,
})
export class AuthDebugComponent {
  tokenInput = signal('');
  result = signal('');

  constructor(public readonly authState: AuthStateService, private readonly api: AuthApiService) {}

  setToken(): void {
    const t = this.tokenInput().trim();
    this.authState.setAccessToken(t.length ? t : null);
    this.result.set('Token updated.');
  }

  clearToken(): void {
    this.authState.setAccessToken(null);
    this.tokenInput.set('');
    this.result.set('Token cleared.');
  }

  refresh(): void {
    this.api.refresh().subscribe({
      next: (r) => {
        this.authState.setAccessToken(r.Token);
        this.tokenInput.set(r.Token);
        this.result.set(`Refresh OK\nToken length: ${r.Token.length}`);
      },
      error: (e) => this.result.set(`Refresh FAILED\n${this.pretty(e)}`),
    });
  }

  me(): void {
    const t = this.authState.accessToken();
    if (!t) {
      this.result.set('No access token set.');
      return;
    }

    this.api.me(t).subscribe({
      next: (r) => this.result.set(`Me OK\nAccountId: ${r.accountId}`),
      error: (e) => this.result.set(`Me FAILED\n${this.pretty(e)}`),
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        this.authState.setAccessToken(null);
        this.tokenInput.set('');
        this.result.set('Logout OK (cookie deleted).');
      },
      error: (e) => this.result.set(`Logout FAILED\n${this.pretty(e)}`),
    });
  }

  private pretty(e: any): string {
    return JSON.stringify(
      { status: e?.status, statusText: e?.statusText, error: e?.error },
      null,
      2
    );
  }
}
