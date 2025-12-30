import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
}

export interface ChangePasswordRequest {
  AdminVerifier: string;
  NewVerifier: string;
  NewAdminVerifier: string;
  NewS_Pwd: string;
  NewKdfMode: number;
  NewMkWrapPwd: EncryptedValueDto;
  NewMkWrapRk: EncryptedValueDto | null;
  CryptoSchemaVer: number;
}

import type { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = '/api';

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
      })
    );
  }

  register(body: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/register`, body);
  }

  login(req: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login`, req);
  }

  refresh(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/refresh`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {});
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
}
