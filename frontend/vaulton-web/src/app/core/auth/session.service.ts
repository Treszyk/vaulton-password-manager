import { Injectable, signal, inject } from '@angular/core';
import { catchError, map, of, Observable, switchMap, firstValueFrom } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthPersistenceService } from './auth-persistence.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';

import { VaultDataService } from '../../features/vault/vault-data.service';
import { SettingsService } from '../../core/settings/settings.service';
import { zeroize } from '../../core/crypto/zeroize';

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
            return true;
          }),
          catchError(() => {
            this.authState.clear();
            this.authState.setInitialized(true);
            return of(false);
          }),
        );
      }),
      catchError(() => {
        this.authState.clear();
        this.authState.setInitialized(true);
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
  ): Promise<void> {
    const { registerBody } = await this.crypto.buildRegister(
      accountId,
      password,
      kdfMode,
      schemaVer,
    );
    await firstValueFrom(this.authApi.register(registerBody));
    await this.login(accountId, password);
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

  async logout(): Promise<void> {
    await this.crypto.clearKeys(true);

    this.authState.clear();
    this.vault.clearData();

    this.toast.queue('Logged out successfully');

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
}
