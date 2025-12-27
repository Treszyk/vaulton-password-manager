import { Component, EventEmitter, Output, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wipe-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full max-w-md p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl animate-slide-up text-center">
      <div class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>

      <h2 class="text-2xl font-black uppercase tracking-[0.2em] text-white/90 mb-4">Destructive Wipe</h2>
      <p class="text-sm text-white/40 mb-8 font-medium leading-relaxed">
        This will permanently remove your <span class="text-white/60">Vault Bundle</span>, 
        <span class="text-white/60">Account ID</span>, and all local session data.
        <br><br>
        <span class="text-red-400">Only use this on public or shared computers.</span>
      </p>

      <div class="flex flex-col gap-4">
        <div 
          class="relative h-16 rounded-2xl overflow-hidden group cursor-pointer"
          (mouseenter)="startWipeTimer()"
          (mouseleave)="cancelWipeTimer()"
        >
          <div 
            class="absolute inset-0 bg-red-500/20"
            [style.width.%]="wipeProgress()"
          ></div>
          
          <button
            class="absolute inset-0 w-full h-full flex items-center justify-center gap-3 border border-white/5 group-hover:border-red-500/30 transition-all"
            [class.pointer-events-none]="wipeProgress() < 100"
            (click)="confirm()"
          >
            <span class="font-black uppercase tracking-[0.2em] text-xs transition-all"
                  [class.text-red-400]="isHovering()"
                  [class.text-white/60]="!isHovering()">
              {{ buttonLabel() }}
            </span>
          </button>
        </div>

        <button 
          (click)="cancel.emit()"
          class="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  `,
})
export class WipeConfirmationComponent implements OnDestroy {
  @Output() confirmWipe = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  wipeProgress = signal(0);
  isHovering = signal(false);
  private timer: any;

  buttonLabel = computed(() => {
    if (this.wipeProgress() >= 100) return 'Click to Confirm Wipe';
    if (this.isHovering()) return 'Hold to Wipe...';
    return 'Wipe this Device';
  });

  startWipeTimer() {
    this.isHovering.set(true);
    const start = Date.now();
    const duration = 3000;

    this.timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / duration) * 100);
      this.wipeProgress.set(progress);

      if (progress >= 100) {
        clearInterval(this.timer);
      }
    }, 16);
  }

  cancelWipeTimer() {
    this.isHovering.set(false);
    this.wipeProgress.set(0);
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  confirm() {
    if (this.wipeProgress() >= 100) {
      this.confirmWipe.emit();
    }
  }

  ngOnDestroy() {
    this.cancelWipeTimer();
  }
}
