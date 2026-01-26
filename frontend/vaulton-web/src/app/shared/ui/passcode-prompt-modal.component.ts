import { Component, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-passcode-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-xl animate-fade-in">
      <div class="min-h-full w-full flex items-center justify-center p-4">
        <div class="w-full max-w-md p-8 rounded-3xl overlay-card animate-slide-up">
          <div class="flex flex-col items-center text-center mb-8">
            <div
              class="w-20 h-20 rounded-full bg-vault-purple/10 flex items-center justify-center mb-6"
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 class="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-100">
              Enable Quick Unlock?
            </h2>
            <div class="mt-4 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-left">
              <p class="text-xs md:text-sm text-orange-200/70 leading-relaxed font-medium">
                <span
                  class="text-orange-400 font-bold block mb-1 uppercase tracking-wider text-xs md:text-[0.6875rem]"
                  >Security Notice</span
                >
                This feature enables a 6-digit passcode for faster access. It is
                <span class="text-orange-400">less secure locally</span> than your master password.
                Nothing is stored on the server, and the passcode is bound
                <span class="text-orange-400">ONLY to this device</span>.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <button
              type="button"
              class="w-full btn-primary !rounded-2xl !py-4 flex items-center justify-center font-bold uppercase tracking-[0.2em] shadow-lg shadow-vault-purple/30 group"
              (click)="setup.emit()"
            >
              Setup Passcode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>

            <button
              type="button"
              class="w-full py-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
              (click)="skip.emit()"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class PasscodePromptModalComponent {
  @Output() setup = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();
}
