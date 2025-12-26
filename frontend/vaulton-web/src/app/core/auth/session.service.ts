import { Injectable } from '@angular/core';
import { catchError, map, of, Observable } from 'rxjs';
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
      map((r) => {
        this.authState.setAccessToken(r.Token);
        this.authState.setInitialized(true);
        return true;
      }),
      catchError(() => {
        this.authState.setAccessToken(null);
        this.authState.setInitialized(true);
        return of(false);
      })
    );
  }
}
