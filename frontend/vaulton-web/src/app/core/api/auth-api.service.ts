import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, finalize, map, retry, switchMap } from 'rxjs/operators';
import { ToastService } from '../../shared/ui/toast/toast.service';

import type { RegisterRequest } from '../crypto/worker/crypto.worker.types';

export type TokenResponse = {
  Token: string;
  MkWrapPwd?: EncryptedValueDto;
  MkWrapRk?: EncryptedValueDto | null;
};
type MeResponse = { accountId: string };
type LoginRequest = { AccountId: string; Verifier: string };
export type PreLoginResponse = { S_Pwd: string; KdfMode: number; CryptoSchemaVer: number };
type PreRegisterResponse = { AccountId: string; CryptoSchemaVer: number };

export interface WrapsRequest {
  AdminVerifier: string;
}

export interface WrapsResponse {
  MkWrapPwd: EncryptedValueDto;
  MkWrapRk: EncryptedValueDto;
  KdfMode: number;
  CryptoSchemaVer: number;
}

export interface RecoveryWrapsRequest {
  AccountId: string;
  RkVerifier: string;
}

export interface RecoverRequest {
  AccountId: string;
  RkVerifier: string;
  NewVerifier: string;
  NewAdminVerifier: string;
  NewRkVerifier: string;
  NewS_Pwd: string;
  NewKdfMode: number;
  NewMkWrapPwd: EncryptedValueDto;
  NewMkWrapRk: EncryptedValueDto;
  CryptoSchemaVer: number;
}

export interface ChangePasswordRequest {
  AdminVerifier: string;
  NewVerifier: string;
  NewAdminVerifier: string;
  NewS_Pwd: string;
  NewKdfMode: number;
  NewMkWrapPwd: EncryptedValueDto;
  NewMkWrapRk: EncryptedValueDto | null;
  NewRkVerifier: string | null;
  CryptoSchemaVer: number;
}

import type { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = '/api';

  private readonly toast = inject(ToastService);

  constructor(private readonly http: HttpClient) {}

  preRegister(): Observable<PreRegisterResponse> {
    return this.http.post<PreRegisterResponse>(`${this.baseUrl}/auth/pre-register`, {});
  }

  preLogin(accountId: string): Observable<PreLoginResponse> {
    return this.http.post<any>(`${this.baseUrl}/auth/pre-login`, { AccountId: accountId }).pipe(
      map((res) => {
        return {
          S_Pwd: res.S_Pwd ?? res.s_Pwd,
          KdfMode: res.KdfMode ?? res.kdfMode,
          CryptoSchemaVer: res.CryptoSchemaVer ?? res.cryptoSchemaVer,
        };
      }),
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
            // this.toast.queue('Waiting for session sync...', true);
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
