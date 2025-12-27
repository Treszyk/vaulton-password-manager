import { Injectable, signal } from '@angular/core';
import { catchError, map, of, Observable, switchMap } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthPersistenceService } from './auth-persistence.service';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(
    private readonly authApi: AuthApiService,
    private readonly authState: AuthStateService,
    private readonly crypto: AuthCryptoService,
    private readonly persistence: AuthPersistenceService,
    private readonly router: Router
  ) {}

  readonly showWipeConfirm = signal(false);

  triggerWipeConfirm(): void {
    this.showWipeConfirm.set(true);
  }

  cancelWipeConfirm(): void {
    this.showWipeConfirm.set(false);
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
  logout(): void {
    this.authState.clear();
    this.crypto.clearKeys();

    this.authApi.logout().subscribe();

    this.router.navigate(['/auth']);
  }

  wipeDevice(): void {
    this.authState.clear();
    this.crypto.clearKeys();
    this.persistence.clearAll();
    this.showWipeConfirm.set(false);

    this.authApi.logout().subscribe();
    this.router.navigate(['/auth']);
  }
}
