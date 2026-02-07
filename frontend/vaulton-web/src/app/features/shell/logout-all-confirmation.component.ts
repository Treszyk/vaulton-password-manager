import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-all-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-md p-8 rounded-3xl overlay-card animate-slide-up text-center">
      <div
        class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-10 h-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 class="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-100 mb-4">
        Logout Everywhere
      </h2>
      <p class="text-sm md:text-base text-zinc-400 mb-8 font-medium leading-relaxed">
        This will invalidate active sessions on
        <span class="text-red-400 font-bold">ALL</span> devices. <br /><br />
        You will be logged out of this device immediately as well.
      </p>

      <div class="flex flex-col gap-4">
        <button
          (click)="confirmLogoutAll.emit()"
          class="w-full h-14 bg-transparent border border-red-500/20 text-red-500 hover:bg-red-800 hover:text-white hover:border-red-800 rounded-2xl font-bold uppercase tracking-[0.25em] text-xs md:text-base transition-all active:scale-[0.98]"
        >
          Yes, Logout All
        </button>

        <button
          (click)="cancel.emit()"
          class="py-4 text-xs md:text-[0.75rem] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class LogoutAllConfirmationComponent {
  @Output() confirmLogoutAll = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
