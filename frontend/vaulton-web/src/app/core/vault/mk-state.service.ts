import { Injectable } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';

@Injectable({ providedIn: 'root' })
export class MkStateService {
  private _isReady = false;

  constructor(private authCrypto: AuthCryptoService) {}

  async ensureKey(): Promise<void> {
    if (this._isReady) return;

    await this.authCrypto.generateDebugVaultKey();
    this._isReady = true;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  clear(): void {
    this._isReady = false;
    // clear vaultkey later
  }
}
