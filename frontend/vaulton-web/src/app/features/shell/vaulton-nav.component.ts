import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SessionTimerService } from '../../core/auth/session-timer.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { SessionService } from '../../core/auth/session.service';

@Component({
  selector: 'app-vaulton-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav
      class="z-50 w-full px-4 md:px-8 h-20 md:h-24 flex items-center justify-between transition-all duration-700 bg-transparent border-none"
      [class.absolute]="isAuthPage()"
      [class.sticky]="!isAuthPage()"
      [class.top-0]="true"
    >
      <div class="flex items-center h-full gap-10">
        <span
          class="text-xl font-black tracking-tighter cursor-pointer animate-slide-in-left select-none mr-2"
          (click)="router.navigate(['/'])"
        >
          Vaulton<span class="text-vault-purple">.</span>
        </span>

        <div *ngIf="!isAuthPage()" class="flex items-center gap-6 h-full animate-fade-in pt-1">
           <a 
             routerLink="/" 
             routerLinkActive="!text-vault-purple !opacity-100"
             [routerLinkActiveOptions]="{exact: true}"
             class="text-[0.625rem] font-black uppercase tracking-[0.25em] text-white/80 hover:text-white transition-all active:scale-[0.98] decoration-none"
           >
             Home
           </a>
           <a 
             routerLink="/vault" 
             routerLinkActive="!text-vault-purple !opacity-100"
             [routerLinkActiveOptions]="{exact: true}"
             class="text-[0.625rem] font-black uppercase tracking-[0.25em] text-white/80 hover:text-white transition-all active:scale-[0.98] decoration-none"
           >
             Vault
           </a>
           <a 
             routerLink="/vault/settings" 
             routerLinkActive="!text-vault-purple !opacity-100"
             class="text-[0.625rem] font-black uppercase tracking-[0.25em] text-white/80 hover:text-white transition-all active:scale-[0.98] decoration-none"
           >
             Settings
           </a>
        </div>
      </div>

      <div 
        *ngIf="isVaultPage()" 
        class="fixed bottom-5 right-4 md:top-8 md:right-8 md:bottom-auto z-[30] flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-4 animate-fade-in pointer-events-auto"
      >
        <div 
          *ngIf="timer.remainingSeconds() < timer.settings.timeoutSeconds()"
          class="flex items-center gap-3 px-3 md:px-4 h-10 rounded-full bg-zinc-950 md:bg-white/[0.03] border border-white/10 transition-all animate-fade-in shadow-xl md:shadow-none box-border"
          [class.border-red-500/30]="timer.isAboutToLock()"
          [class.bg-red-500/5]="timer.isAboutToLock()"
        >
          <div class="flex flex-col items-end justify-center h-full">
            <span class="hidden md:block text-[0.5rem] font-black uppercase tracking-[0.2em] text-white/60 leading-none mb-0.5">Session</span>
            <span 
              class="text-xs font-mono font-bold tracking-widest transition-colors duration-300 leading-none"
              [class.text-red-400]="timer.isAboutToLock()"
              [class.text-white/70]="!timer.isAboutToLock()"
            >
              {{ timer.getFormattedTime() }}
            </span>
          </div>
          <div class="w-1.5 h-1.5 rounded-full bg-vault-purple shadow-[0_0_8px_rgba(124,58,237,0.5)]"
               [class.bg-red-500]="timer.isAboutToLock()"
               [class.shadow-red-500/50]="timer.isAboutToLock()"></div>
        </div>

        <div class="flex items-center gap-2 p-1 rounded-full bg-zinc-950 md:bg-white/[0.03] border border-white/10 shadow-xl md:shadow-none">
          <button
            class="px-2 md:px-5 py-2 rounded-full hover:bg-white/5 text-white/70 hover:text-white transition-all text-[0.625rem] font-black uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center"
            (click)="lock()"
            title="Lock Vault"
          >
            <span class="hidden md:block">Lock</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
          <div class="w-[1px] h-4 bg-white/10"></div>
          <button
            class="px-2 md:px-5 py-2 rounded-full hover:bg-vault-purple/10 text-white/70 hover:text-vault-purple transition-all text-[0.625rem] font-black uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center"
            (click)="triggerLogout()"
            title="Logout"
          >
            <span class="hidden md:block">Logout</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
          <div class="w-[1px] h-4 bg-white/10"></div>
          <button
            class="px-2 md:px-5 py-2 rounded-full hover:bg-red-500/10 text-white/70 hover:text-red-400 transition-all text-[0.625rem] font-black uppercase tracking-[0.2em] active:scale-[0.98] flex items-center justify-center"
            (click)="triggerWipe()"
            title="Wipe Data"
          >
            <span class="hidden md:block">Wipe</span>
             <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class VaultonNavComponent {
  public readonly router = inject(Router);
  protected readonly timer = inject(SessionTimerService);
  private readonly crypto = inject(AuthCryptoService);
  private readonly session = inject(SessionService);

  isAuthPage(): boolean {
    const url = this.router.url;
    return url.includes('/auth') || url === '/' || url === '';
  }

  isVaultPage(): boolean {
    return this.router.url.includes('/vault');
  }

  lock(): void {
    this.crypto.clearKeys();
  }

  triggerLogout(): void {
    this.session.triggerLogoutConfirm();
  }

  triggerWipe(): void {
    this.session.triggerWipeConfirm();
  }
}
