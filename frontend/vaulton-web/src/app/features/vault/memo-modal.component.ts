import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultRecord } from './vault-record.model';

@Component({
  selector: 'app-memo-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
    >
      <div class="w-full max-w-md p-8 rounded-3xl overlay-card animate-slide-up">
        <div class="flex flex-col items-center text-center mb-6">
          <div
            class="w-16 h-16 rounded-full bg-vault-purple/20 flex items-center justify-center mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-8 h-8 text-vault-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 class="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] text-zinc-100">
            Description
          </h2>
          <p class="text-sm md:text-base text-zinc-400 mt-2 font-medium italic truncate max-w-full">
            {{ record.title }}
          </p>
        </div>

        <div class="space-y-4 mb-8">
          <div
            class="bg-vault-dark border border-zinc-700 rounded-2xl overflow-hidden max-h-[40vh] flex flex-col"
          >
            <div
              class="px-6 py-5 overflow-y-auto overflow-x-hidden flex-1 selection:bg-vault-purple/30"
            >
              <p
                class="text-[0.875rem] md:text-[1.125rem] text-zinc-300 leading-relaxed whitespace-pre-wrap break-words"
                [textContent]="record.notes.trim()"
              ></p>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="w-full btn-primary !rounded-2xl !py-4 flex items-center justify-center font-black uppercase tracking-[0.2em]"
          (click)="close.emit()"
        >
          Dismiss
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class MemoModalComponent {
  @Input({ required: true }) record!: VaultRecord;
  @Output() close = new EventEmitter<void>();
}
