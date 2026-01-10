import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wipe-confirmation',
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </div>

      <h2 class="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-100 mb-4">
        Destructive Wipe
      </h2>
      <p class="text-sm md:text-base text-zinc-400 mb-8 font-medium leading-relaxed">
        This will permanently remove your <span class="text-zinc-300">Vault Bundle</span>,
        <span class="text-zinc-300">Account ID</span>, and all local session data. <br /><br />
        <span class="text-red-400">Only use this on public or shared computers.</span>
      </p>

      <div class="flex flex-col gap-4">
        <div
          class="relative h-16 rounded-2xl overflow-hidden group cursor-pointer select-none border border-zinc-600 hover:border-red-500/50 transition-all"
          [class.unstable-shake]="isHolding()"
          [style.--shake-intensity]="shakeIntensity()"
          (mousedown)="startHold()"
          (mouseup)="cancelHold()"
          (mouseleave)="cancelHold()"
          (touchstart)="$event.preventDefault(); startHold()"
          (touchend)="cancelHold()"
          (touchcancel)="cancelHold()"
        >
          <div class="wipe-progress" [style.width.%]="progress()"></div>

          <button
            class="absolute inset-0 w-full h-full flex items-center justify-center gap-3 transition-all pointer-events-none"
          >
            <span
              class="font-bold uppercase tracking-[0.2em] text-xs md:text-base transition-all"
              [class.text-red-400]="isHolding()"
              [class.text-zinc-300]="!isHolding()"
            >
              {{ buttonLabel() }}
            </span>
          </button>
        </div>

        <button
          (click)="cancel.emit()"
          class="py-4 text-xs md:text-[0.75rem] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class WipeConfirmationComponent implements OnDestroy {
  @Output() confirmWipe = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  progress = signal(0);
  isHolding = signal(false);
  private interval: any;

  shakeIntensity = computed(() => {
    const p = this.progress();
    if (p < 20) return 0;
    return 0.3 + ((p - 20) / 80) * 2.2;
  });

  buttonLabel = computed(() => {
    if (this.progress() >= 100) return 'PURGING...';
    if (this.isHolding()) return `HOLDING... ${Math.ceil(5 - (this.progress() * 5) / 100)}S`;
    return 'Hold to Wipe Device (5s)';
  });

  startHold() {
    if (this.progress() >= 100) return;
    this.isHolding.set(true);

    this.interval = setInterval(() => {
      this.progress.update((p) => {
        const next = p + 1;
        if (next >= 100) {
          this.triggerWipe();
          return 100;
        }
        return next;
      });
    }, 50);
  }

  cancelHold() {
    this.isHolding.set(false);
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.progress() < 100) {
      this.progress.set(0);
    }
  }

  private triggerWipe() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    setTimeout(() => {
      this.confirmWipe.emit();
    }, 500);
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
