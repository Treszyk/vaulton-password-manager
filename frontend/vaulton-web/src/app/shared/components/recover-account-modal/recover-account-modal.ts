import {
  Component,
  input,
  output,
  signal,
  inject,
  viewChild,
  computed,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/auth/session.service';
import { ToastService } from '../../ui/toast/toast.service';
import { StrengthMeterComponent } from '../../ui/strength-meter/strength-meter.component';
import { ScrollIndicatorDirective } from '../../directives/scroll-indicator.directive';
import { validateNewPassword } from '../../../core/auth/auth-utils';

type RecoveryStage = 'INPUT' | 'KEY_SETUP' | 'RECOVERING' | 'SUCCESS';

@Component({
  selector: 'app-recover-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StrengthMeterComponent, ScrollIndicatorDirective],
  templateUrl: './recover-account-modal.html',
})
export class RecoverAccountModal implements OnInit, OnDestroy {
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  initialAccountId = input<string>('');
  close = output<void>();

  stage = signal<RecoveryStage>('INPUT');
  isWorking = signal(false);

  accountId = signal('');
  recoveryKey = signal('');

  newPassword = signal('');
  confirmPassword = signal('');
  kdfMode = signal<number>(2);
  isOptimized = signal(false);
  isBenchmarking = signal(false);
  benchmarkStatus = signal('');
  standardTime = signal<number | null>(null);
  hardenedTime = signal<number | null>(null);

  newRecoveryKey = signal('');
  acknowledged = signal(false);
  progress = signal(0);
  isHolding = signal(false);
  private holdInterval: any;

  strengthMeter = viewChild(StrengthMeterComponent);
  isPasswordStrong = computed(() => (this.strengthMeter()?.score() ?? 0) >= 2);

  recommendedMode = computed(() => {
    const h = this.hardenedTime();
    if (h && h <= 4.0) return 2;
    if (this.standardTime()) return 1;
    return null;
  });

  shakeIntensity = computed(() => {
    const p = this.progress();
    if (p < 20) return 0;
    return 0.3 + ((p - 20) / 80) * 2.2;
  });

  buttonLabel = computed(() => {
    const p = this.progress();
    if (p >= 100) return 'FINISHED';
    if (this.isHolding()) {
      const remainingSeconds = Math.max(0, 3 - (p * 3) / 100);
      return `HOLDING... ${remainingSeconds.toFixed(1)}S`;
    }
    return 'Hold to Finish (3s)';
  });

  ngOnInit() {
    if (this.initialAccountId()) {
      this.accountId.set(this.initialAccountId());
    }
  }

  async onNextToKeySetup() {
    if (!this.accountId() || !this.recoveryKey()) {
      this.toast.trigger('Please fill all fields', false);
      return;
    }

    if (this.recoveryKey().trim().length < 32) {
      this.toast.trigger('Invalid recovery key length', false);
      return;
    }

    this.stage.set('KEY_SETUP');
  }

  async onOptimizeKdf() {
    if (this.isBenchmarking()) return;

    const validationError = validateNewPassword(
      this.newPassword(),
      this.accountId(),
      this.confirmPassword(),
    );

    if (validationError) {
      this.toast.trigger(validationError, false);
      return;
    }

    this.isBenchmarking.set(true);
    this.isOptimized.set(false);
    this.standardTime.set(null);
    this.hardenedTime.set(null);

    try {
      this.benchmarkStatus.set('Standard');
      const t1 = await this.session.benchmarkKdf(this.newPassword(), 1);
      this.standardTime.set(t1 / 1000);

      this.benchmarkStatus.set('Hardened');
      const t2 = await this.session.benchmarkKdf(this.newPassword(), 2);
      this.hardenedTime.set(t2 / 1000);

      this.kdfMode.set(t2 < 4000 ? 2 : 1);
      this.isOptimized.set(true);
      this.toast.trigger(`Optimization complete`, true);
    } catch (e: any) {
      this.toast.trigger('Benchmark failed', false);
    } finally {
      this.isBenchmarking.set(false);
      this.benchmarkStatus.set('');
    }
  }

  onPasswordInput() {
    this.isOptimized.set(false);
    this.standardTime.set(null);
    this.hardenedTime.set(null);
    this.benchmarkStatus.set('');
  }

  async onRecover() {
    const validationError = validateNewPassword(
      this.newPassword(),
      this.accountId(),
      this.confirmPassword(),
    );

    if (validationError) {
      this.toast.trigger(validationError, false);
      return;
    }

    this.isWorking.set(true);
    const currentStage = this.stage();
    this.stage.set('RECOVERING');

    try {
      const res = await this.session.recover(
        this.accountId(),
        this.recoveryKey().trim(),
        this.newPassword(),
        this.kdfMode(),
      );

      this.newRecoveryKey.set(res.newRecoveryKey);
      this.stage.set('SUCCESS');
    } catch (err: any) {
      this.stage.set(currentStage);
      console.error('Recovery error:', err);
      this.toast.trigger('Wrong Account ID or Recovery Key', false);
    } finally {
      this.isWorking.set(false);
    }
  }

  startHold() {
    if (!this.acknowledged() || this.progress() >= 100 || this.isHolding()) return;
    this.isHolding.set(true);

    this.holdInterval = setInterval(() => {
      this.progress.update((p) => {
        const next = p + 1.7;
        if (next >= 100) {
          this.triggerFinish();
          return 100;
        }
        return next;
      });
    }, 50);
  }

  cancelHold() {
    this.isHolding.set(false);
    if (this.holdInterval) clearInterval(this.holdInterval);
    if (this.progress() < 100) this.progress.set(0);
  }

  private triggerFinish() {
    if (this.holdInterval) clearInterval(this.holdInterval);
    this.toast.trigger('Recovery completed. Please log in.', true);
    this.close.emit();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.trigger('Copied', true);
    });
  }

  onBack() {
    if (this.stage() === 'KEY_SETUP') this.stage.set('INPUT');
    else if (this.stage() === 'INPUT') this.close.emit();
  }

  ngOnDestroy() {
    if (this.holdInterval) clearInterval(this.holdInterval);
  }
}
