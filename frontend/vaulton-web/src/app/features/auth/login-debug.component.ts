import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthStateService } from '../../core/auth/auth-state.service';

@Component({
  selector: 'app-login-debug',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <div class="space-y-1">
        <label class="block text-xs font-semibold text-white/60 uppercase tracking-widest pl-1"
          >Account ID</label
        >
        <input
          [(ngModel)]="accountId"
          type="text"
          class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
          placeholder="e.g. user@example.com"
        />
      </div>

      <div class="space-y-1">
        <label class="block text-xs font-semibold text-white/60 uppercase tracking-widest pl-1"
          >Password</label
        >
        <input
          [(ngModel)]="password"
          type="password"
          class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
          placeholder="••••••••"
        />
      </div>

      <button
        (click)="login()"
        [disabled]="loading()"
        class="w-full relative isolate overflow-hidden bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 group"
      >
        <span class="relative z-10 flex items-center justify-center gap-2">
          <span
            *ngIf="loading()"
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          {{ loading() ? 'AUTHENTICATING...' : 'LOGIN' }}
        </span>
        <div
          class="absolute inset-0 -z-10 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        ></div>
      </button>

      <div
        *ngIf="error()"
        class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mt-4 break-words"
      >
        {{ error() }}
      </div>
    </div>
  `,
})
export class LoginDebugComponent {
  accountId = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');

  constructor(
    private api: AuthApiService,
    private crypto: AuthCryptoService,
    private state: AuthStateService
  ) {}

  async login() {
    if (!this.accountId() || !this.password()) return;

    this.loading.set(true);
    this.error.set('');

    try {
      const acc = this.accountId();

      const preLogin = await new Promise<any>((resolve, reject) => {
        this.api.preLogin(acc).subscribe({ next: resolve, error: reject });
      });

      const { verifier } = await this.crypto.buildLogin(this.password(), preLogin);
      this.password.set('');

      const tokenRes = await new Promise<any>((resolve, reject) => {
        this.api
          .login({ AccountId: acc, Verifier: verifier })
          .subscribe({ next: resolve, error: reject });
      });

      this.state.setAccessToken(tokenRes.Token);
      this.state.setAccountId(acc);
      this.accountId.set('');
    } catch (e: any) {
      this.error.set(e.message || JSON.stringify(e));
    } finally {
      this.loading.set(false);
    }
  }
}
