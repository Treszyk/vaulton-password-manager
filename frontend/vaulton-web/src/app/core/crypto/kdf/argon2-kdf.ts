import sodium from 'libsodium-wrappers-sumo';
import type { KdfProvider } from './kdf';
import { zeroize } from '../zeroize';
export class Argon2KdfProvider implements KdfProvider {
  async deriveHkdfBaseKey(
    password: Uint8Array,
    sPwd: Uint8Array,
    kdfMode: number
  ): Promise<CryptoKey> {
    try {
      await this.ensureSodium();
      const { memLimit, opsLimit } = this.getParams(kdfMode);

      const ikm = sodium.crypto_pwhash(
        32,
        password,
        sPwd,
        opsLimit,
        memLimit,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );

      try {
        return await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, [
          'deriveBits',
          'deriveKey',
        ]);
      } finally {
        zeroize(ikm);
      }
    } finally {
      zeroize(password);
    }
  }

  async benchmark(password: Uint8Array, salt: Uint8Array, kdfMode: number): Promise<number> {
    try {
      await this.ensureSodium();
      const { memLimit, opsLimit } = this.getParams(kdfMode);

      const start = performance.now();
      const out = sodium.crypto_pwhash(
        16,
        password,
        salt,
        opsLimit,
        memLimit,
        sodium.crypto_pwhash_ALG_ARGON2ID13
      );
      const duration = performance.now() - start;
      zeroize(out);
      return duration;
    } finally {
      zeroize(password);
    }
  }

  private async ensureSodium() {
    try {
      await sodium.ready;
    } catch (e: any) {
      throw new Error(`Libsodium WASM failed to load: ${e?.message || e}`);
    }
    if (!sodium.crypto_pwhash) {
      throw new Error('Argon2id KDF initialization failed: crypto_pwhash not found');
    }
  }

  private getParams(kdfMode: number) {
    const mode = kdfMode === 2 ? 2 : 1;
    const memLimit = mode === 2 ? 256 * 1024 * 1024 : 128 * 1024 * 1024;
    const opsLimit = mode === 2 ? 4 : 3;
    return { memLimit, opsLimit };
  }
}
