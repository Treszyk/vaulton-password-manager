import { Component, inject, signal, computed, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AuthPersistenceService } from '../../../../core/auth/auth-persistence.service';
import { AuthCryptoService } from '../../../../core/auth/auth-crypto.service';
import { AuthApiService } from '../../../../core/api/auth-api.service';
import { SessionService } from '../../../../core/auth/session.service';
import { zeroize } from '../../../../core/crypto/zeroize';
import { StrengthMeterComponent } from '../../../../shared/ui/strength-meter/strength-meter.component';
import { ScrollIndicatorDirective } from '../../../../shared/directives/scroll-indicator.directive';

@Component({
  selector: 'app-rekey-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, StrengthMeterComponent, ScrollIndicatorDirective],
  templateUrl: './rekey-vault.component.html',
})
export class RekeyVaultComponent {
  private readonly toast = inject(ToastService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly crypto = inject(AuthCryptoService);
  private readonly api = inject(AuthApiService);
  private readonly session = inject(SessionService);

  strengthMeter = viewChild(StrengthMeterComponent);
  isPasswordStrong = computed(() => (this.strengthMeter()?.score() ?? 0) >= 2);

  isRekeyBusy = signal(false);
  isRekeySuccess = signal(false);
  rekeyStatus = signal('');
  rekeyOldPassword = '';
  rekeyNewPassword = '';
  rekeyConfirmPassword = '';

  kdfMode = signal<number>(2);
  isBenchmarking = signal<boolean>(false);
  isOptimized = signal<boolean>(false);
  benchmarkStatus = signal<string>('');
  standardTime = signal<number | null>(null);
  hardenedTime = signal<number | null>(null);

  recommendedMode = computed(() => {
    const h = this.hardenedTime();
    if (h && h <= 4.0) return 2;
    if (this.standardTime()) return 1;
    return null;
  });

  async onOptimizeKdf(): Promise<void> {
    if (this.isBenchmarking()) return;

    if (!this.rekeyNewPassword || !this.rekeyConfirmPassword) {
      this.toast.trigger('Fill both password fields first', false);
      return;
    }

    if (!this.isPasswordStrong()) {
      this.toast.trigger('Password too weak', false);
      return;
    }

    if (this.rekeyNewPassword !== this.rekeyConfirmPassword) {
      this.toast.trigger('Passwords do not match', false);
      return;
    }

    this.isBenchmarking.set(true);
    this.isOptimized.set(false);
    this.standardTime.set(null);
    this.hardenedTime.set(null);
    const pwd = this.rekeyNewPassword;
    const dummySalt = new Uint8Array(16);
    const HARDENED_THRESHOLD_MS = 4000;
    const STANDARD_SKIP_HARDENED_THRESHOLD = 4500;

    try {
      this.benchmarkStatus.set('Standard');
      const t1 = await this.crypto.benchmarkKdf(pwd, dummySalt, 1);
      this.standardTime.set(t1 / 1000);

      if (t1 > STANDARD_SKIP_HARDENED_THRESHOLD) {
        this.kdfMode.set(1);
        this.isOptimized.set(true);
        this.toast.trigger('Optimization complete! Standard mode selected.', true);
        return;
      }

      this.benchmarkStatus.set('Hardened');
      const t2 = await this.crypto.benchmarkKdf(pwd, dummySalt, 2);
      this.hardenedTime.set(t2 / 1000);

      if (t2 < HARDENED_THRESHOLD_MS) {
        this.kdfMode.set(2);
        this.toast.trigger('Optimization complete! Hardened mode selected.', true);
      } else {
        this.kdfMode.set(1);
        this.toast.trigger('Optimization complete! Standard mode selected.', true);
      }
      this.isOptimized.set(true);
    } catch (e: any) {
      this.toast.trigger('Optimization failed', false);
    } finally {
      zeroize(dummySalt);
      this.isBenchmarking.set(false);
      this.benchmarkStatus.set('');
    }
  }

  async updateMasterKey() {
    if (!this.rekeyOldPassword || !this.rekeyNewPassword || !this.rekeyConfirmPassword) {
      this.toast.trigger('Fill all password fields');
      return;
    }

    if (this.rekeyNewPassword !== this.rekeyConfirmPassword) {
      this.toast.trigger('Passwords do not match');
      return;
    }

    if (this.rekeyOldPassword === this.rekeyNewPassword) {
      this.toast.trigger('New password must be different');
      return;
    }

    if (!this.isPasswordStrong()) {
      this.toast.trigger('Password too weak');
      return;
    }

    if (!this.isOptimized()) {
      this.toast.trigger('Please run the benchmark first');
      return;
    }

    this.isRekeyBusy.set(true);
    try {
      this.rekeyStatus.set('Verifying current password...');
      const bundle = await this.persistence.getBundle();
      if (!bundle) throw new Error('No vault session found');

      const oldAdminVerifier = await this.crypto.deriveAdminVerifier(
        this.rekeyOldPassword,
        bundle.S_Pwd,
        bundle.KdfMode,
      );

      const wraps = await this.api.getWraps({ AdminVerifier: oldAdminVerifier }).toPromise();
      if (!wraps) throw new Error('Current password incorrect');

      this.rekeyStatus.set('Deriving New Keys...');

      await new Promise((r) => setTimeout(r, 50));

      const res = await this.crypto.executeRekey(
        this.rekeyOldPassword,
        bundle.S_Pwd,
        bundle.KdfMode,
        this.rekeyNewPassword,
        bundle.AccountId,
        wraps.MkWrapPwd,
        bundle.CryptoSchemaVer,
        this.kdfMode(),
      );

      this.rekeyStatus.set('Updating vault...');
      this.rekeyStatus.set('Updating Server...');
      await this.api
        .changePassword({
          AdminVerifier: oldAdminVerifier,
          NewVerifier: res.newVerifier,
          NewAdminVerifier: res.newAdminVerifier,
          NewS_Pwd: res.newS_Pwd,
          NewKdfMode: this.kdfMode(),
          NewMkWrapPwd: res.newMkWrapPwd,
          NewMkWrapRk: null,
          CryptoSchemaVer: bundle.CryptoSchemaVer,
        })
        .toPromise();

      this.isRekeySuccess.set(true);
      this.toast.queue('Password Updated. Please log in again.');
      setTimeout(async () => {
        await this.persistence.clearBundle();
        await this.persistence.clearLocalPasscode(bundle.AccountId);
        await this.session.logout();
      }, 2000);
    } catch (err: any) {
      if (err.status == 401 || err.message?.includes('401')) {
        this.toast.trigger('INVALID CREDENTIALS', false);
      } else {
        this.toast.trigger(err.message || 'Password change failed');
      }
    } finally {
      if (!this.isRekeySuccess()) {
        this.isRekeyBusy.set(false);
      }
      this.rekeyStatus.set('');
      this.rekeyNewPassword = '';
      this.rekeyConfirmPassword = '';
    }
  }
}
