import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import type { RegisterRequest } from '../../core/crypto/worker/crypto.worker.types';

@Component({
  standalone: true,
  selector: 'app-auth-page',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white">Create Account</h2>
        <div class="flex items-center gap-2">
          <span class="text-xs text-white/40 font-mono italic">{{
            accountId() || 'awaiting id...'
          }}</span>
          <button
            (click)="refreshAccountId()"
            class="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-all"
            title="New ID"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-white/60 ml-1">Master Password</label>
          <input
            type="password"
            [ngModel]="password()"
            (ngModelChange)="password.set($event)"
            class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-white/60 ml-1">KDF Strategy</label>
          <select
            [ngModel]="kdfMode()"
            (ngModelChange)="kdfMode.set(+$event)"
            class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
          >
            <option [value]="0">Legacy (0)</option>
            <option [value]="1">Standard (1)</option>
            <option [value]="2">Hardened (2)</option>
          </select>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          (click)="register()"
          [disabled]="!accountId() || !password().length || isWorking()"
          class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/20 disabled:text-white/20 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/10 active:scale-[0.98]"
        >
          {{ isWorking() ? 'Working...' : 'Register' }}
        </button>
        <button
          (click)="clear()"
          class="px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
        >
          Clear
        </button>
      </div>

      <div *ngIf="statusMessage()" class="pt-4 border-t border-white/5">
        <p
          class="text-sm font-medium transition-all"
          [ngClass]="{
            'text-emerald-400': isSuccess(),
            'text-rose-400': !isSuccess()
          }"
        >
          {{ statusMessage() }}
        </p>
      </div>
    </div>
  `,
})
export class AuthPageComponent {
  accountId = signal<string>('');
  password = signal<string>('');
  kdfMode = signal<number>(1);
  cryptoSchemaVer = signal<number>(1);

  statusMessage = signal<string>('');
  isSuccess = signal<boolean>(false);
  isWorking = signal<boolean>(false);

  constructor(private readonly api: AuthApiService, private readonly crypto: AuthCryptoService) {
    this.init();
  }

  private init(): void {
    this.refreshAccountId();
  }

  refreshAccountId(): void {
    this.statusMessage.set('');
    this.api.preRegister().subscribe({
      next: (r) => {
        this.accountId.set(r.AccountId);
        this.cryptoSchemaVer.set(r.CryptoSchemaVer);
      },
      error: () => this.reportError('Failed to initialize registration. Please try again.'),
    });
  }

  register(): void {
    if (this.isWorking()) return;

    this.isWorking.set(true);
    this.statusMessage.set('');

    const accountId = this.accountId();
    const password = this.password();
    const kdfMode = this.kdfMode();
    const schemaVer = this.cryptoSchemaVer();

    this.crypto
      .buildRegister(accountId, password, kdfMode, schemaVer)
      .then(({ registerBody }) => {
        this.password.set('');
        this.api.register(registerBody).subscribe({
          next: () => {
            this.isSuccess.set(true);
            this.statusMessage.set('Account created successfully!');
            this.isWorking.set(false);
          },
          error: (e) => {
            this.reportError(`Server registration failed: ${e.statusText || 'Unknown error'}`);
          },
        });
      })
      .catch((e) => {
        this.reportError(`Encryption failed: ${String(e)}`);
      });
  }

  clear(): void {
    this.statusMessage.set('');
    this.password.set('');
    this.isSuccess.set(false);
  }

  private reportError(msg: string): void {
    this.isSuccess.set(false);
    this.statusMessage.set(msg);
    this.isWorking.set(false);
  }
}
