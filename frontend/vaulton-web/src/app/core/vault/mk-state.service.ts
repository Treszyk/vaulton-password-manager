import { Injectable, signal } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';

@Injectable({ providedIn: 'root' })
export class MkStateService {
  private readonly _isReady = signal(false);
  public readonly isReady = this._isReady.asReadonly();

  constructor(private authCrypto: AuthCryptoService) {}

  async ensureKey(): Promise<void> {
    if (this._isReady()) return;
    // this service only tracks if the worker has keys
    const unlocked = await this.authCrypto.checkStatus();
    if (unlocked) {
      this._isReady.set(true);
    }
  }

  clear(): void {
    this._isReady.set(false);
  }
}
