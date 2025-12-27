import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionTimerService } from '../../core/auth/session-timer.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { SessionService } from '../../core/auth/session.service';

@Component({
  selector: 'app-vaulton-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="z-50 w-full px-8 h-24 flex items-center justify-between transition-all duration-700 bg-transparent border-none"
      [class.absolute]="isAuthPage()"
      [class.sticky]="!isAuthPage()"
      [class.top-0]="true"
    >
      <div class="flex items-center h-full">
        <span
          class="text-xl font-black tracking-tighter cursor-pointer animate-slide-in-left select-none"
          (click)="router.navigate(['/'])"
        >
          Vaulton<span class="text-vault-purple">.</span>
        </span>
      </div>

      <div *ngIf="isVaultPage()" class="flex items-center gap-4 animate-fade-in h-full">
        <div 
          *ngIf="timer.remainingSeconds() < 300"
          class="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 transition-all animate-fade-in"
          [class.border-red-500/30]="timer.isAboutToLock()"
          [class.bg-red-500/5]="timer.isAboutToLock()"
        >
          <div class="flex flex-col items-end">
            <span class="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 leading-none">Session</span>
            <span 
              class="text-xs font-mono font-bold tracking-widest transition-colors duration-300"
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

        <div class="flex items-center gap-2 p-1 rounded-full bg-white/[0.03] border border-white/5">
          <button
            class="px-5 py-2 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98]"
            (click)="lock()"
          >
            Lock
          </button>
          <div class="w-[1px] h-4 bg-white/5"></div>
          <button
            class="px-5 py-2 rounded-full hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98]"
            (click)="triggerWipe()"
          >
            Wipe
          </button>
        </div>
      </div>
    </nav>
  `,
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

  triggerWipe(): void {
    this.session.triggerWipeConfirm();
  }
}
