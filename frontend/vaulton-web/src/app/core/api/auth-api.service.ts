import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, finalize, map, retry, switchMap } from 'rxjs/operators';
import { ToastService } from '../../shared/ui/toast/toast.service';

import type {
  ChangePasswordRequest,
  LoginRequest,
  MeResponse,
  PreLoginRawResponse,
  PreLoginResponse,
  PreRegisterResponse,
  RecoverRequest,
  RegisterRequest,
  TokenResponse,
  WrapsRequest,
  WrapsResponse,
} from './dto/auth.dto';

export type {
  ChangePasswordRequest,
  LoginRequest,
  MeResponse,
  PreLoginResponse,
  PreRegisterResponse,
  RecoverRequest,
  RegisterRequest,
  TokenResponse,
  WrapsRequest,
  WrapsResponse,
};

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = '/api';

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  preRegister(): Observable<PreRegisterResponse> {
    return this.http.post<PreRegisterResponse>(`${this.baseUrl}/auth/pre-register`, {});
  }

  preLogin(accountId: string): Observable<PreLoginResponse> {
    return this.http
      .post<PreLoginRawResponse>(`${this.baseUrl}/auth/pre-login`, { AccountId: accountId })
      .pipe(
        map((res) => ({
          S_Pwd: res.S_Pwd ?? res.s_Pwd ?? '',
          KdfMode: res.KdfMode ?? res.kdfMode ?? 1,
          CryptoSchemaVer: res.CryptoSchemaVer ?? res.cryptoSchemaVer ?? 1,
        })),
      );
  }

  register(body: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/register`, body);
  }

  login(req: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login`, req);
  }

  refresh(): Observable<TokenResponse> {
    return of(null).pipe(
      switchMap(() => {
        const lock = localStorage.getItem('v_ref');
        if (lock && Date.now() - Number(lock) < 2000) {
          return throwError(
            () => new HttpErrorResponse({ status: 409, statusText: 'Refresh Lock Active' }),
          );
        }
        localStorage.setItem('v_ref', Date.now().toString());
        return this.http.post<TokenResponse>(`${this.baseUrl}/auth/refresh`, {});
      }),
      retry({
        count: 5,
        delay: (err) => {
          if (err.status === 409) {
            return timer(1000);
          }
          return throwError(() => err);
        },
      }),
      finalize(() => localStorage.removeItem('v_ref')),
      catchError((err) => {
        if (err.status === 429) {
          this.toast.queue('Too many requests. Please try again later.', false);
        } else if (err.status === 409) {
          this.toast.queue('Session synchronization issue. Please log in again.', false);
        }
        return throwError(() => err);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {});
  }

  logoutAll(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout-all`, {});
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/auth/me`);
  }

  getWraps(req: WrapsRequest): Observable<WrapsResponse> {
    return this.http.post<WrapsResponse>(`${this.baseUrl}/auth/wraps`, req);
  }

  changePassword(req: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/change-password`, req);
  }

  getRecoveryWraps(accountId: string, rkVerifier: string): Observable<WrapsResponse> {
    return this.http.post<WrapsResponse>(`${this.baseUrl}/auth/recovery-wraps`, {
      AccountId: accountId,
      RkVerifier: rkVerifier,
    });
  }

  recover(req: RecoverRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/recover`, req);
  }
}
