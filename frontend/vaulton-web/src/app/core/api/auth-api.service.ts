import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { RegisterRequest } from '../auth/auth-crypto.service';

export type TokenResponse = { Token: string };
type MeResponse = { accountId: string };
type LoginRequest = { AccountId: string; Verifier: string };
type PreRegisterResponse = { AccountId: string; CryptoSchemaVer: number };

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  preRegister(): Observable<PreRegisterResponse> {
    return this.http.post<PreRegisterResponse>(`${this.baseUrl}/auth/pre-register`, {});
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
}
