import { Injectable, signal } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';

@Injectable({ providedIn: 'root' })
export class MkStateService {
  private readonly _isReady = signal(false);
  public readonly isReady = this._isReady.asReadonly();

  constructor(private authCrypto: AuthCryptoService) {}

  async ensureKey(): Promise<void> {
    if (this._isReady()) return;

    await this.authCrypto.generateDebugVaultKey();
    this._isReady.set(true);
  }

  clear(): void {
    this._isReady.set(false);
  }
}
