import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="toast.message()"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md text-center transition-all duration-300 transform pointer-events-none"
      [class.opacity-0]="!toast.show()"
      [class.translate-y-4]="!toast.show()"
      [class.opacity-100]="toast.show()"
      [class.translate-y-0]="toast.show()"
    >
      <div
        class="inline-block px-6 py-3 rounded-full bg-black/80 backdrop-blur-md transition-colors border border-zinc-700"
      >
        <p
          class="text-xs font-black uppercase tracking-[0.2em] drop-shadow-lg"
          [ngClass]="{
            'text-emerald-400': toast.isSuccess(),
            'text-red-500': !toast.isSuccess(),
          }"
        >
          {{ toast.message() }}
        </p>
      </div>
    </div>
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
