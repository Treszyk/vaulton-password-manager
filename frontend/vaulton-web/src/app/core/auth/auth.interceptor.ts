import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthApiService, TokenResponse } from '../api/auth-api.service';
import { AuthStateService } from './auth-state.service';

let refreshInFlight$: Observable<TokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const authApi = inject(AuthApiService);

  if (
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/logout-all') ||
    req.url.includes('/auth/pre-register') ||
    req.url.includes('/auth/register')
  ) {
    return next(req);
  }

  const token = authState.accessToken();
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        if (!refreshInFlight$) {
          refreshInFlight$ = authApi.refresh().pipe(
            tap((res) => {
              authState.setAccessToken(res.Token);
            }),
            shareReplay(1),
            finalize(() => {
              refreshInFlight$ = null;
            }),
            catchError((err) => {
              authState.setAccessToken(null);
              return throwError(() => err);
            })
          );
        }

        return refreshInFlight$.pipe(
          switchMap((res) => {
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.Token}` },
            });
            return next(newReq);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
