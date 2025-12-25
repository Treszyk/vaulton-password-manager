import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { AuthPageComponent } from './auth-page.component';
import { LoginDebugComponent } from './login-debug.component';

@Component({
  standalone: true,
  selector: 'app-auth-debug',
  imports: [CommonModule, FormsModule, AuthPageComponent, LoginDebugComponent],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Auth Debug</h2>
          <p class="text-white/40 text-sm">Testing and debugging authentication flows</p>
        </div>
        <div class="flex gap-3">
          <button (click)="refresh()" class="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all">Refresh (cookie)</button>
          <button (click)="me()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20">Me (Bearer)</button>
          <button (click)="logout()" class="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all">Logout</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
          <h3 class="text-lg font-semibold text-white mb-6 flex items-center gap-4">
             <button (click)="mode.set('register')" [class.opacity-50]="mode() !== 'register'" class="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                Register
             </button>
             <span class="text-white/20">|</span>
             <button (click)="mode.set('login')" [class.opacity-50]="mode() !== 'login'" class="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span>
                Login
             </button>
          </h3>
          <div class="bg-black/40 rounded-xl border border-white/5 overflow-hidden p-4">
            <app-auth-page *ngIf="mode() === 'register'"></app-auth-page>
            <app-login-debug *ngIf="mode() === 'login'"></app-login-debug>
          </div>
        </div>

        <div class="space-y-8">
          <div class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                In-Memory Token
              </h3>
              <span class="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded border"
                [class.bg-green-500/10]="authState.accessToken()"
                [class.text-green-400]="authState.accessToken()"
                [class.border-green-500/20]="authState.accessToken()"
                [class.bg-white/5]="!authState.accessToken()"
                [class.text-white/40]="!authState.accessToken()"
                [class.border-white/10]="!authState.accessToken()">
                {{ authState.accessToken() ? 'Active' : 'Missing' }}
              </span>
            </div>
            
            <textarea
              [ngModel]="tokenInput()"
              (ngModelChange)="tokenInput.set($event)"
              rows="4"
              class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-blue-300 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              placeholder="Paste token here..."
            ></textarea>

            <div class="mt-4 flex gap-3">
              <button (click)="setToken()" class="flex-1 bg-white/10 hover:bg-white/15 text-white py-2 rounded-lg text-sm font-medium transition-all">Update Key</button>
              <button (click)="clearToken()" class="px-4 py-2 rounded-lg text-white/40 hover:text-white transition-all text-sm font-medium">Clear</button>
            </div>
          </div>

          <div class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              Execution Result
            </h3>
            <div class="bg-black/60 rounded-xl border border-white/10 p-4 overflow-auto max-h-[300px]">
              <pre class="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all">{{ result() || 'Waiting for action...' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthDebugComponent {
  mode = signal<'register' | 'login'>('register');
  tokenInput = signal('');
  result = signal('');

  constructor(public readonly authState: AuthStateService, private readonly api: AuthApiService) {
    effect(() => {
      const t = this.authState.accessToken();
      this.tokenInput.set(t || '');
    });
  }

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
        this.result.set(`Refresh OK\nToken length: ${r.Token.length}`);
      },
      error: (e) => this.result.set(`Refresh FAILED\n${this.pretty(e)}`),
    });
  }

  me(): void {
    this.api.me().subscribe({
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
