import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  readonly accessToken = signal<string | null>(null);
  readonly accountId = signal<string | null>(null);
  readonly isInitialized = signal(false);

  setAccessToken(token: string | null): void {
    this.accessToken.set(token);
  }

  setAccountId(id: string | null): void {
    this.accountId.set(id);
  }

  setInitialized(val: boolean): void {
    this.isInitialized.set(val);
  }

  clear(): void {
    this.accessToken.set(null);
    this.accountId.set(null);
  }
}
