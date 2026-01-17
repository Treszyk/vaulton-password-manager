import { CommonModule } from '@angular/common';
import { Component, signal, computed, viewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthStateService } from '../../../core/auth/auth-state.service';
import { AuthPersistenceService } from '../../../core/auth/auth-persistence.service';
import { SessionService } from '../../../core/auth/session.service';
import { SessionTimerService } from '../../../core/auth/session-timer.service';
import { StarfieldComponent } from '../../../shared/ui/starfield/starfield.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { StrengthMeterComponent } from '../../../shared/ui/strength-meter/strength-meter.component';
import { ScrollIndicatorDirective } from '../../../shared/directives/scroll-indicator.directive';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StarfieldComponent,
    StrengthMeterComponent,
    ScrollIndicatorDirective,
  ],
  host: {
    class: 'w-full',
  },
  templateUrl: './auth-page.component.html',
})
export class AuthPageComponent {
  private readonly session = inject(SessionService);
  private readonly authState = inject(AuthStateService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sessionTimer = inject(SessionTimerService);

  strengthMeter = viewChild(StrengthMeterComponent);
  mode = signal<'LOGIN' | 'REGISTER'>('LOGIN');

  accountId = signal<string>('');
  password = signal<string>('');
  kdfMode = signal<number>(2);
  cryptoSchemaVer = signal<number>(1);

  isWorking = signal<boolean>(false);
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

  isPasswordStrong = computed(() => (this.strengthMeter()?.score() ?? 0) >= 2);

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.authState.accessToken()) {
      this.router.navigate(['/vault']);
      return;
    }
    this.loadPersistentId();
  }

  private async loadPersistentId() {
    const id = await this.persistence.getAccountId();
    if (id) {
      this.accountId.set(id);
    } else {
      const bundle = await this.persistence.getBundle();
      if (bundle?.AccountId) {
        this.accountId.set(bundle.AccountId);
      }
    }
  }

  setMode(m: 'LOGIN' | 'REGISTER'): void {
    this.mode.set(m);
    this.password.set('');
    this.isOptimized.set(false);
    this.standardTime.set(null);
    this.hardenedTime.set(null);
    if (m === 'REGISTER') {
      this.refreshAccountId();
    } else {
      this.loadPersistentId();
    }
  }

  refreshAccountId(): void {
    this.session.getNewAccount().subscribe({
      next: (r: any) => {
        this.accountId.set(r.AccountId);
        this.cryptoSchemaVer.set(r.CryptoSchemaVer);
      },
      error: (e: any) => {
        this.reportError(e.status === 429 ? 'Too Many Requests' : 'Server Unreachable');
      },
    });
  }

  async onOptimizeKdf(): Promise<void> {
    if (this.isBenchmarking()) return;

    if (!this.password() || !this.isPasswordStrong()) {
      this.toast.trigger('Password too weak for benchmark.', false);
      return;
    }

    this.isBenchmarking.set(true);
    this.isOptimized.set(false);
    this.standardTime.set(null);
    this.hardenedTime.set(null);
    const pwd = this.password();

    try {
      this.benchmarkStatus.set('Standard');
      const t1 = await this.session.benchmarkKdf(pwd, 1);
      this.standardTime.set(t1 / 1000);

      if (t1 > 4500) {
        this.kdfMode.set(1);
        this.isOptimized.set(true);
        this.toast.trigger('Optimized: Standard mode forced.', true);
        return;
      }

      this.benchmarkStatus.set('Hardened');
      const t2 = await this.session.benchmarkKdf(pwd, 2);
      this.hardenedTime.set(t2 / 1000);

      this.kdfMode.set(t2 < 4000 ? 2 : 1);
      this.isOptimized.set(true);
      this.toast.trigger(
        `Optimized: ${this.kdfMode() === 2 ? 'Hardened' : 'Standard'} selected.`,
        true,
      );
    } catch (e: any) {
      this.toast.trigger('Benchmark failed', false);
    } finally {
      this.isBenchmarking.set(false);
      this.benchmarkStatus.set('');
    }
  }

  onLogoClick() {
    if (this.authState.accessToken()) this.router.navigate(['/vault']);
  }

  private reportError(msg: string) {
    this.toast.trigger(msg, false);
    this.isWorking.set(false);
    this.password.set('');
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => this.toast.trigger('Copied', true));
  }

  onForgotPassword() {
    this.toast.trigger('Recovery not implemented', false);
  }

  onSubmit() {
    if (this.mode() === 'LOGIN') this.login();
    else this.register();
  }

  async login() {
    if (this.isWorking()) return;
    this.isWorking.set(true);
    const pwd = this.password();
    this.password.set('');

    try {
      await this.session.login(this.accountId(), pwd);
      this.sessionTimer.reset();
      this.toast.trigger('Vault Unlocked', true);
      this.router.navigate(['/vault']);
    } catch (e: any) {
      this.reportError(e.status === 429 ? 'Too Many Requests' : 'Invalid Credentials');
    }
  }

  async register() {
    if (this.isWorking()) return;
    if (!this.isOptimized()) {
      this.toast.trigger('Please run the benchmark first.', false);
      return;
    }
    this.isWorking.set(true);
    const pwd = this.password();
    this.password.set('');

    try {
      await this.session.register(this.accountId(), pwd, this.kdfMode(), this.cryptoSchemaVer());
      this.toast.trigger('Vault Initialized', true);
      setTimeout(() => this.setMode('LOGIN'), 1000);
    } catch (e) {
      this.reportError('Initialization Failed');
    } finally {
      this.isWorking.set(false);
    }
  }
}
