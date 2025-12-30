import { Injectable, signal } from '@angular/core';
import { catchError, map, of, Observable, switchMap } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthPersistenceService } from './auth-persistence.service';
import { Router } from '@angular/router';
import { ToastService } from '../../shared/ui/toast/toast.service';

import { VaultDataService } from '../../features/vault/vault-data.service';
import { SettingsService } from '../../core/settings/settings.service';

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
    private readonly settings: SettingsService
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
          })
        );
      }),
      catchError(() => {
        this.authState.clear();
        this.authState.setInitialized(true);
        return of(false);
      })
    );
  }
  async logout(): Promise<void> {
    await this.crypto.clearKeys();

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

    await this.crypto.clearKeys();
    this.authState.clear();
    this.vault.clearData();

    if (accountId) {
      await this.persistence.clearUserData(accountId);
      this.settings.clearSettings(accountId);
    } else {
      // fallback if no ID found: wipe all to be safe (Nuclear option as fallback)
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
}
