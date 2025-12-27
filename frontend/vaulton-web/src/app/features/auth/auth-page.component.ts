import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { StarfieldComponent } from '../../shared/ui/starfield/starfield.component';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule, StarfieldComponent],
  host: {
    class: 'w-full',
  },
  template: `
    <div 
      class="w-full h-full flex flex-col items-center justify-center p-6 selection:bg-vault-purple/30 selection:text-vault-purple-bright relative overflow-hidden"
      [attr.data-auth-mode]="mode()"
    >
      <app-starfield></app-starfield>

      <div class="w-full max-w-[440px] animate-slide-up relative z-10">
        <div class="auth-panel p-10 rounded-[2.5rem] relative flex flex-col gap-8">
          <div class="text-center relative z-10">
            <h1 class="text-4xl font-black text-white tracking-tighter mb-2">
              Vaulton<span class="text-vault-purple">.</span>
            </h1>
            <div class="h-6 relative">
              <p class="text-white/40 text-sm font-medium absolute inset-0 w-full header-text login-text"
                 [class.active]="mode() === 'LOGIN'">
                Welcome back.
              </p>
              <p class="text-white/40 text-sm font-medium absolute inset-0 w-full header-text register-text"
                 [class.active]="mode() === 'REGISTER'">
                Start your vault.
              </p>
            </div>
          </div>

          <div class="flex p-1.5 bg-white/5 rounded-2xl relative z-20 border border-white/5 backdrop-blur-md">
            <button
              (click)="setMode('LOGIN')"
              class="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 z-10"
              [class.text-white]="mode() === 'LOGIN'"
              [class.text-white/40]="mode() !== 'LOGIN'"
            >
              Login
            </button>
            <button
              (click)="setMode('REGISTER')"
              class="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 z-10"
              [class.text-white]="mode() === 'REGISTER'"
              [class.text-white/40]="mode() !== 'REGISTER'"
            >
              Register
            </button>
            <div
              class="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-vault-purple rounded-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) mode-indicator"
            ></div>
          </div>

          <div class="relative z-10">
            <div class="grid grid-cols-1 grid-rows-1 transition-all duration-500">
              <div class="col-start-1 row-start-1 flex flex-col gap-6 form-view login-view"
                   [class.active]="mode() === 'LOGIN'"
                   [class.pointer-events-none]="mode() !== 'LOGIN'">
                
                <div class="space-y-2">
                  <header class="flex items-center justify-between px-1">
                     <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Account Identifier</label>
                  </header>
                  <div class="relative group">
                    <input
                      type="text"
                      [ngModel]="accountId()"
                      (ngModelChange)="accountId.set($event)"
                      class="w-full pl-5 pr-12 py-4 bg-white/5 border border-white/5 hover:bg-white/[0.08] focus:bg-white/[0.1] focus:border-vault-purple/50 rounded-2xl transition-all outline-none"
                      placeholder="vault-xxxx-xxxx"
                      (keyup.enter)="onSubmit()"
                    />
                    
                    <button 
                      *ngIf="accountId()"
                      (click)="copyToClipboard(accountId())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/20 hover:text-vault-purple hover:bg-white/10 transition-all animate-fade-in"
                      title="Copy ID"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    
                    <div *ngIf="!accountId()" class="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Master Password</label>
                  <div class="relative group">
                    <input
                      type="password"
                      [ngModel]="password()"
                      (ngModelChange)="password.set($event)"
                      class="w-full pl-5 pr-11 py-4 bg-white/5 border border-white/5 hover:bg-white/[0.08] focus:bg-white/[0.1] focus:border-vault-purple/50 rounded-2xl transition-all outline-none"
                      placeholder="••••••••••••"
                      (keyup.enter)="onSubmit()"
                    />
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-vault-purple/40 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-start-1 row-start-1 flex flex-col gap-6 form-view register-view"
                   [class.active]="mode() === 'REGISTER'"
                   [class.pointer-events-none]="mode() !== 'REGISTER'">
                
                <div class="space-y-2 tooltip-trigger">
                  <div class="flex items-center justify-between px-1">
                    <div class="flex items-center gap-1.5 group/info cursor-help tooltip-bottom tooltip-full" 
                         data-tooltip="Anonymous opaque identifier used for platform login.">
                      <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Account ID</label>
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white/10 group-hover/info:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <button 
                      (click)="refreshAccountId()"
                      class="text-[10px] font-bold text-vault-purple hover:text-vault-purple-bright transition-colors uppercase"
                    >
                      Refresh
                    </button>
                  </div>
                  <div class="relative group">
                    <input
                      type="text"
                      [ngModel]="accountId()"
                      readonly
                      class="w-full pl-5 pr-12 py-4 bg-white/[0.03] border border-white/5 rounded-2xl transition-all text-white/60"
                      placeholder="Generating..."
                    />
                    <button 
                      *ngIf="accountId()"
                      (click)="copyToClipboard(accountId())"
                      class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/20 hover:text-vault-purple hover:bg-white/10 transition-all animate-fade-in"
                      title="Copy ID"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                    </button>
                    <div *ngIf="!accountId()" class="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Master Password</label>
                  <div class="relative group">
                    <input
                      type="password"
                      [ngModel]="password()"
                      (ngModelChange)="password.set($event)"
                      class="w-full pl-5 pr-11 py-4 bg-white/5 border border-white/5 hover:bg-white/[0.08] focus:bg-white/[0.1] focus:border-vault-purple/50 rounded-2xl transition-all outline-none"
                      placeholder="••••••••••••"
                    />
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-vault-purple/40 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="kdf-container mt-2" [class.expanded]="mode() === 'REGISTER'">
                  <div class="min-h-0 space-y-3">
                    <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-1">Vault Hardening Grade</label>
                    <div class="flex gap-2">
                      <div class="kdf-option group/kdf tooltip-trigger tooltip-full" 
                           [class.active]="kdfMode() === 1"
                           (click)="kdfMode.set(1)"
                           data-tooltip="Balanced performance and security.">
                        <div class="flex items-center gap-1.5">
                          <span class="grade-title">Standard</span>
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white/10 group-hover/kdf:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span class="grade-desc">Balanced</span>
                      </div>
                      <div class="kdf-option group/kdf tooltip-trigger tooltip-full" 
                           [class.active]="kdfMode() === 2"
                           (click)="kdfMode.set(2)"
                           data-tooltip="Stronger security (Recommended). May take longer on slower devices.">
                        <div class="flex items-center gap-1.5">
                          <span class="grade-title">Hardened</span>
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white/10 group-hover/kdf:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span class="grade-desc">Higher Security</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-6 relative z-20">
            <button
              (click)="onSubmit()"
              [disabled]="!accountId() || !password() || isWorking()"
              class="btn-primary w-full py-4.5 relative overflow-hidden group rounded-2xl transition-all active:scale-[0.98]"
            >
              <span *ngIf="!isWorking()" class="relative z-10 uppercase tracking-[0.4em] text-xs font-black">
                {{ mode() === 'LOGIN' ? 'Unlock Vault' : 'Initialize Vault' }}
              </span>
              <span *ngIf="isWorking()" class="flex items-center justify-center gap-3">
                <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="uppercase tracking-[0.2em] text-[10px] font-bold">Processing...</span>
              </span>
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          </div>
        </div>

        <div class="mt-[2px] sm:mt-[2px] text-center footer-container">
          <p class="text-[10px] text-white/20 uppercase tracking-[0.6em] font-black pointer-events-none">
            <span class="block sm:inline">ZERO-KNOWLEDGE</span>
            <span class="mx-3 text-vault-purple/30 hidden sm:inline">•</span>
            <span class="block sm:inline">ANONYMOUS</span>
          </p>
        </div>
      </div>
      
      <div *ngIf="statusMessage()" 
           class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md text-center transition-all duration-300 transform"
           [class.opacity-0]="!showToast()"
           [class.translate-y-4]="!showToast()"
           [class.opacity-100]="showToast()"
           [class.translate-y-0]="showToast()">
        <div class="px-6 py-3">
           <p class="text-xs font-black uppercase tracking-[0.2em] drop-shadow-lg"
             [ngClass]="{
               'text-vault-purple': isSuccess(),
               'text-red-500': !isSuccess()
             }">
            {{ statusMessage() }}
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent {
  mode = signal<'LOGIN' | 'REGISTER'>('LOGIN');

  accountId = signal<string>('');
  password = signal<string>('');
  kdfMode = signal<number>(2);
  cryptoSchemaVer = signal<number>(1);

  statusMessage = signal<string>('');
  showToast = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  isWorking = signal<boolean>(false);

  constructor(
    private readonly api: AuthApiService,
    private readonly crypto: AuthCryptoService,
    private readonly authState: AuthStateService,
    private readonly persistence: AuthPersistenceService,
    private readonly router: Router
  ) {
    this.init();
  }

  private init(): void {
    this.loadPersistentId();
  }

  private loadPersistentId(): void {
    this.persistence.getAccountId().then((id) => {
      if (id) {
        this.accountId.set(id);
      } else {
        this.persistence.getBundle().then((bundle) => {
          if (bundle?.AccountId) {
            this.accountId.set(bundle.AccountId);
          }
        });
      }
    });
  }

  setMode(m: 'LOGIN' | 'REGISTER'): void {
    this.mode.set(m);
    this.statusMessage.set('');
    this.password.set('');
    if (m === 'REGISTER') {
      this.refreshAccountId();
    } else {
      this.loadPersistentId();
    }
  }

  refreshAccountId(): void {
    this.statusMessage.set('');
    this.api.preRegister().subscribe({
      next: (r) => {
        this.accountId.set(r.AccountId);
        this.cryptoSchemaVer.set(r.CryptoSchemaVer);
      },
      error: () => this.reportError('Server Unreachable'),
    });
  }

  private showStatus(msg: string, success: boolean) {
    this.statusMessage.set(msg);
    this.isSuccess.set(success);

    this.showToast.set(false);

    setTimeout(() => {
      this.showToast.set(true);

      setTimeout(() => {
        this.showToast.set(false);
        setTimeout(() => {
          if (!this.showToast()) {
            this.statusMessage.set('');
          }
        }, 500);
      }, 2500);
    }, 50);
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showStatus('Copied to Clipboard', true);
    });
  }

  private reportError(msg: string): void {
    this.showStatus(msg, false);
    this.isWorking.set(false);
    this.password.set('');
  }

  onSubmit(): void {
    if (this.mode() === 'LOGIN') {
      this.login();
    } else {
      this.register();
    }
  }

  login(): void {
    if (this.isWorking()) return;
    this.isWorking.set(true);

    const accountId = this.accountId();
    const password = this.password();

    this.api.preLogin(accountId).subscribe({
      next: (pre) => {
        this.crypto
          .buildLogin(password, pre)
          .then(({ verifier }) => {
            this.api.login({ AccountId: accountId, Verifier: verifier }).subscribe({
              next: (res) => {
                this.crypto
                  .finalizeLogin(res.MkWrapPwd!, pre.CryptoSchemaVer, accountId)
                  .then(() => {
                    this.authState.setAccessToken(res.Token);
                    this.authState.setAccountId(accountId);
                    this.persistence.saveAccountId(accountId);
                    this.persistence
                      .saveBundle({
                        AccountId: accountId,
                        S_Pwd: pre.S_Pwd,
                        KdfMode: pre.KdfMode,
                        CryptoSchemaVer: pre.CryptoSchemaVer,
                        MkWrapPwd: res.MkWrapPwd!,
                        MkWrapRk: res.MkWrapRk || null,
                      })
                      .then(() => {
                        this.showStatus('Vault Unlocked', true);
                        this.router.navigate(['/vault']);
                      });
                  })
                  .catch((e) => {
                    this.authState.clear();
                    this.reportError('Finalization Failed');
                  });
              },
              error: () => this.reportError('Invalid Credentials'),
            });
          })
          .catch(() => this.reportError('Crypto Failure'));
      },
      error: () => this.reportError('Account Not Found'),
    });
  }

  register(): void {
    if (this.isWorking()) return;

    this.isWorking.set(true);

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
            this.persistence.saveAccountId(accountId);
            this.showStatus('Vault Initialized', true);
            setTimeout(() => {
              this.setMode('LOGIN');
              this.accountId.set(accountId);
              this.isWorking.set(false);
            }, 1000);
          },
          error: (e) => {
            this.reportError('Initialization Failed');
          },
        });
      })
      .catch((e) => {
        this.reportError('Crypto Error');
      });
  }
}
