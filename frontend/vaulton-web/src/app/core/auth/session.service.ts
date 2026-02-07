import { Injectable, signal, inject } from '@angular/core';
import {
  catchError,
  map,
  of,
  Observable,
  switchMap,
  firstValueFrom,
  interval,
  Subscription,
  tap,
} from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthPersistenceService } from './auth-persistence.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';

import { VaultDataService } from '../../features/vault/vault-data.service';
import { SettingsService } from '../../core/settings/settings.service';
import { zeroize } from '../../core/crypto/zeroize';

export const SESSION_HEARTBEAT_MS = 300000; // 5 minutes
export const SESSION_CHECK_THROTTLE_MS = 10000; // 10 seconds
export const SESSION_INTERACTION_THROTTLE_MS = 120000; // 2 minutes
export const SESSION_AGGRESSIVE_THROTTLE_MS = 30000; // 30 seconds

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(
    private readonly authApi: AuthApiService,
    private readonly authState: AuthStateService,
    private readonly crypto: AuthCryptoService,
    private readonly persistence: AuthPersistenceService,
    private readonly vault: VaultDataService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly settings: SettingsService,
  ) {}

  private heartbeatSub: Subscription | null = null;
  private lastVerificationTime = 0;
  private verificationInFlight = false;

  readonly showWipeConfirm = signal(false);
  readonly showLogoutConfirm = signal(false);

  triggerWipeConfirm(): void {
    this.showWipeConfirm.set(true);
  }

  cancelWipeConfirm(): void {
    this.showWipeConfirm.set(false);
  }

  triggerLogoutConfirm(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogoutConfirm(): void {
    this.showLogoutConfirm.set(false);
  }

  tryRestore(): Observable<boolean> {
    return this.authApi.refresh().pipe(
      switchMap((r) => {
        this.authState.setAccessToken(r.Token);
        return this.authApi.me().pipe(
          map((me) => {
            this.authState.setAccountId(me.accountId);
            this.authState.setInitialized(true);
            this.startHeartbeat();
            return true;
          }),
          catchError(() => {
            this.authState.clear();
            this.authState.setInitialized(true);
            this.stopHeartbeat();
            return of(false);
          }),
        );
      }),
      catchError(() => {
        this.authState.clear();
        this.authState.setInitialized(true);
        this.stopHeartbeat();
        return of(false);
      }),
    );
  }

  async login(accountId: string, password: string): Promise<void> {
    try {
      const preLogin = await firstValueFrom(this.authApi.preLogin(accountId));
      let { verifier } = await this.crypto.buildLogin(password, preLogin);
      const res = await firstValueFrom(
        this.authApi.login({ AccountId: accountId, Verifier: verifier! }),
      );
      verifier = null as any; // this isn't deleted from memory instantly sadly, but hopefully GC will take care of it on the next cleanup

      await this.crypto.finalizeLogin(res.MkWrapPwd!, preLogin.CryptoSchemaVer, accountId);
      await this.persistence.saveBundle({
        S_Pwd: preLogin.S_Pwd,
        KdfMode: preLogin.KdfMode,
        CryptoSchemaVer: preLogin.CryptoSchemaVer,
        MkWrapPwd: res.MkWrapPwd!,
        MkWrapRk: res.MkWrapRk || null,
        AccountId: accountId,
      });

      await this.persistence.saveAccountId(accountId);

      this.authState.setAccessToken(res.Token);
      this.authState.setAccountId(accountId);
      this.authState.isUnlocked.set(true);
      this.startHeartbeat();
    } catch (e) {
      this.authState.clear();
      this.authApi.logout().subscribe();
      throw e;
    }
  }

  async register(
    accountId: string,
    password: string,
    kdfMode: number,
    schemaVer: number,
  ): Promise<{ recoveryKey: string; loginSuccess: boolean }> {
    const { registerBody, recoveryKey } = await this.crypto.buildRegister(
      accountId,
      password,
      kdfMode,
      schemaVer,
    );
    await firstValueFrom(this.authApi.register(registerBody));
    await this.persistence.saveAccountId(accountId);

    try {
      // throw new Error('Simulated Login Failure');
      await this.login(accountId, password);
      return { recoveryKey, loginSuccess: true };
    } catch (e) {
      console.warn('Auto-login failed', e);
      return { recoveryKey, loginSuccess: false };
    }
  }

  async unlock(password: string): Promise<void> {
    const bundle = await this.persistence.getBundle();
    if (bundle) {
      try {
        await this.crypto.unlock(password, bundle);
        this.authState.isUnlocked.set(true);
      } catch (e) {
        throw e;
      }
    } else {
      const accountId = await this.persistence.getAccountId();
      if (!accountId) throw new Error('No account found on this device');
      await this.login(accountId, password);
    }
  }

  async unlockViaPasscode(passcode: string): Promise<void> {
    const accountId = await this.persistence.getAccountId();
    if (!accountId) throw new Error('No account found');

    const wrap = await this.persistence.getLocalPasscode(accountId);
    if (!wrap) throw new Error('Passcode not set up');

    await this.crypto.unlockViaPasscode(passcode, wrap.S_Local, wrap.MkWrapLocal, accountId);
    this.authState.isUnlocked.set(true);
  }

  async lock(): Promise<void> {
    try {
      await this.crypto.clearKeys(false);
    } catch (e) {
      console.warn('Crypto worker was busy during lock attempt:', e);
    }
    this.vault.clearData();
    this.authState.isUnlocked.set(false);
    this.router.navigate(['/vault']);
  }

  async logout(message?: string): Promise<void> {
    this.stopHeartbeat();
    await this.crypto.clearKeys(true);

    this.authState.clear();
    this.vault.clearData();

    this.toast.queue(message || 'Logged out successfully', false);

    this.authApi.logout().subscribe({
      complete: () => {
        window.location.href = '/auth';
      },
      error: () => {
        window.location.href = '/auth';
      },
    });
  }

  async wipeDevice(): Promise<void> {
    const accountId = this.authState.accountId() || (await this.persistence.getAccountId());

    await this.crypto.clearKeys(true);
    this.authState.clear();
    this.vault.clearData();

    if (accountId) {
      await this.persistence.clearUserData(accountId);
      this.settings.clearSettings(accountId);
    } else {
      await this.persistence.clearAll();
      localStorage.clear();
    }

    this.toast.queue('Device wiped for this account');
    this.authApi.logout().subscribe({
      complete: () => {
        window.location.href = '/auth';
      },
      error: () => {
        window.location.href = '/auth';
      },
    });
  }

  getNewAccount(): Observable<{ AccountId: string; CryptoSchemaVer: number }> {
    return this.authApi.preRegister();
  }

  async benchmarkKdf(password: string, mode: number): Promise<number> {
    const salt = new Uint8Array(16);
    try {
      return await this.crypto.benchmarkKdf(password, salt, mode);
    } finally {
      zeroize(salt);
    }
  }

  async recover(
    accountId: string,
    recoveryKey: string,
    newPassword: string,
    newKdfMode: number,
  ): Promise<{ newRecoveryKey: string }> {
    const rkVerifierToken = await this.crypto.deriveRkVerifier(recoveryKey);
    const wraps = await firstValueFrom(this.authApi.getRecoveryWraps(accountId, rkVerifierToken));
    const recoveryRes = await this.crypto.recover(
      recoveryKey,
      newPassword,
      accountId,
      wraps.MkWrapRk,
      wraps.CryptoSchemaVer,
      newKdfMode,
    );

    await firstValueFrom(
      this.authApi.recover({
        AccountId: accountId,
        RkVerifier: recoveryRes.rkVerifier,
        NewVerifier: recoveryRes.newVerifier,
        NewAdminVerifier: recoveryRes.newAdminVerifier,
        NewRkVerifier: recoveryRes.newRkVerifier,
        NewS_Pwd: recoveryRes.newS_Pwd,
        NewKdfMode: recoveryRes.newKdfMode,
        NewMkWrapPwd: recoveryRes.newMkWrapPwd,
        NewMkWrapRk: recoveryRes.newMkWrapRk,
        CryptoSchemaVer: recoveryRes.cryptoSchemaVer,
      }),
    );

    await this.persistence.saveAccountId(accountId);
    this.toast.queue('Account recovered successfully. Please log in with your new password.');
    return { newRecoveryKey: recoveryRes.newRecoveryKey };
  }

  async verifySession(throttleMs = SESSION_CHECK_THROTTLE_MS): Promise<void> {
    const now = Date.now();
    if (this.verificationInFlight || now - this.lastVerificationTime < throttleMs) {
      return;
    }

    this.verificationInFlight = true;
    try {
      const me = await firstValueFrom(this.authApi.me().pipe(catchError(() => of(null))));
      this.lastVerificationTime = Date.now();

      if (!me) {
        await this.logout('Your session was terminated or has expired.');
      }
    } finally {
      this.verificationInFlight = false;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatSub = interval(SESSION_HEARTBEAT_MS).subscribe(() => {
      this.verifySession(SESSION_HEARTBEAT_MS);
    });
  }

  private stopHeartbeat(): void {
    if (this.heartbeatSub) {
      this.heartbeatSub.unsubscribe();
      this.heartbeatSub = null;
    }
  }
}
