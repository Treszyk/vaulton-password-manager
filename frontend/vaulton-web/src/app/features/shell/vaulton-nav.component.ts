import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

      <div *ngIf="isVaultPage()" class="flex items-center gap-6 animate-fade-in h-full">
        <button
          class="px-5 py-2.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] active:scale-[0.98]"
          (click)="router.navigate(['/auth'])"
        >
          Lock Vault
        </button>
      </div>
    </nav>
  `,
})
export class VaultonNavComponent {
  public readonly router = inject(Router);

  isAuthPage(): boolean {
    const url = this.router.url;
    return url.includes('/auth') || url === '/' || url === '';
  }

  isVaultPage(): boolean {
    return this.router.url.includes('/vault');
  }
}
