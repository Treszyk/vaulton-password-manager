import { Injectable } from '@angular/core';
import { catchError, map, of, Observable, switchMap } from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  constructor(
    private readonly authApi: AuthApiService,
    private readonly authState: AuthStateService
  ) {}

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
}
