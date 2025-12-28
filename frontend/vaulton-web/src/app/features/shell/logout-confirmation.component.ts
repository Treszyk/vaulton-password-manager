import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-md p-8 rounded-3xl overlay-card animate-slide-up text-center">
      <div
        class="w-20 h-20 rounded-full bg-vault-purple/10 flex items-center justify-center mx-auto mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 text-vault-purple"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </div>

      <h2 class="text-2xl font-black uppercase tracking-[0.2em] text-white/90 mb-4">End Session</h2>
      <p class="text-sm text-white/40 mb-8 font-medium leading-relaxed">
        This will invalidate your current session on this device.
        <br /><br />
        Your <span class="text-white/70">Account Login</span> will remain pre-filled for your next
        visit, but you must enter your password to re-enter the vault. <br /><br />
        <span class="text-white/30 italic"
          >Note: For a full data removal on public computers, use the
        </span>
        <span
          (click)="requestWipe.emit()"
          class="text-red-400 font-bold cursor-pointer hover:text-red-300 underline decoration-red-400/30 underline-offset-4 transition-all"
          >WIPE</span
        >
        <span class="text-white/30 italic"> action.</span>
      </p>

      <div class="flex flex-col gap-4">
        <button
          (click)="confirmLogout.emit()"
          class="w-full btn-primary !rounded-2xl !py-4 active:scale-[0.98] transition-all"
        >
          <span class="font-black uppercase tracking-[0.25em] text-xs">Confirm Logout</span>
        </button>

        <button
          (click)="cancel.emit()"
          class="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 hover:text-white transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class LogoutConfirmationComponent {
  @Output() confirmLogout = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() requestWipe = new EventEmitter<void>();
}
