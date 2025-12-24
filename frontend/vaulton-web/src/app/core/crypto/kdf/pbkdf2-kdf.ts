import type { KdfProvider } from './kdf';
import { zeroize } from '../zeroize';

// I will use Argon2id in the future

const PBKDF2_ITERS_BY_MODE: Record<number, number> = {
  0: 200_000,
  1: 400_000,
  2: 600_000,
};

export class Pbkdf2KdfProvider implements KdfProvider {
  async deriveHkdfBaseKey(password: string, sPwd: Uint8Array, kdfMode: number): Promise<CryptoKey> {
    const pwdBytes = new TextEncoder().encode(password);
    let pbkdf2BaseKey: CryptoKey;

    try {
      pbkdf2BaseKey = await crypto.subtle.importKey('raw', pwdBytes, { name: 'PBKDF2' }, false, [
        'deriveBits',
      ]);
    } finally {
      zeroize(pwdBytes);
    }

    const mode = kdfMode in PBKDF2_ITERS_BY_MODE ? kdfMode : 1;
    const iterations = PBKDF2_ITERS_BY_MODE[mode];

    const ikmBuf = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: sPwd as BufferSource, iterations },
      pbkdf2BaseKey,
      256
    );

    const ikmBytes = new Uint8Array(ikmBuf);
    try {
      return await crypto.subtle.importKey('raw', ikmBytes, 'HKDF', false, [
        'deriveBits',
        'deriveKey',
      ]);
    } finally {
      zeroize(ikmBytes);
    }
  }
}
