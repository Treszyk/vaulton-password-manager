import { Component, input, output, signal, computed, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-important-info-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './important-info-modal.html',
})
export class ImportantInfoModal implements OnDestroy {
  accountId = input.required<string>();
  recoveryKey = input.required<string>();
  loginSuccess = input.required<boolean>();
  close = output<void>();

  acknowledged = signal(false);
  copiedState = signal<{ [key: string]: boolean }>({});

  progress = signal(0);
  isHolding = signal(false);
  private interval: any;

  shakeIntensity = computed(() => {
    const p = this.progress();
    if (p < 20) return 0;
    return 0.3 + ((p - 20) / 80) * 2.2;
  });

  buttonLabel = computed(() => {
    const p = this.progress();
    if (p >= 100) return 'OPENING...';
    if (this.isHolding()) {
      const remainingSeconds = Math.max(0, 3 - (p * 3) / 100);
      return `HOLDING... ${remainingSeconds.toFixed(1)}S`;
    }
    return this.loginSuccess() ? 'Hold to Open Vault (3s)' : 'Hold to Login (3s)';
  });

  async copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copiedState.update((s) => ({ ...s, [key]: true }));
      setTimeout(() => {
        this.copiedState.update((s) => ({ ...s, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  startHold() {
    if (!this.acknowledged() || this.progress() >= 100 || this.isHolding()) return;
    this.isHolding.set(true);

    this.interval = setInterval(() => {
      this.progress.update((p) => {
        const next = p + 1.7;
        if (next >= 100) {
          this.triggerContinue();
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

  private triggerContinue() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.close.emit();
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
