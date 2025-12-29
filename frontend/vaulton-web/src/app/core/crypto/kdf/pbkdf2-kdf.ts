import type { KdfProvider } from './kdf';
import { zeroize } from '../zeroize';

const PBKDF2_ITERS_BY_MODE: Record<number, number> = {
  0: 200_000,
  1: 600_000,
  2: 800_000,
};

export class Pbkdf2KdfProvider implements KdfProvider {
  async deriveHkdfBaseKey(
    password: Uint8Array,
    sPwd: Uint8Array,
    kdfMode: number
  ): Promise<CryptoKey> {
    try {
      let pbkdf2BaseKey: CryptoKey;

      pbkdf2BaseKey = await crypto.subtle.importKey(
        'raw',
        password as BufferSource,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const mode = kdfMode in PBKDF2_ITERS_BY_MODE ? kdfMode : 1;
      const iterations = PBKDF2_ITERS_BY_MODE[mode];

      const ikmBuf = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: sPwd as BufferSource, iterations },
        pbkdf2BaseKey,
        256
      );

      let ikmBytes: Uint8Array | null = new Uint8Array(ikmBuf);
      try {
        return await crypto.subtle.importKey('raw', ikmBytes as BufferSource, 'HKDF', false, [
          'deriveBits',
          'deriveKey',
        ]);
      } finally {
        if (ikmBytes) {
          zeroize(ikmBytes);
          ikmBytes = null;
        }
      }
    } finally {
      zeroize(password);
    }
  }

  async benchmark(password: Uint8Array, salt: Uint8Array, kdfMode: number): Promise<number> {
    try {
      const pbkdf2BaseKey = await crypto.subtle.importKey(
        'raw',
        password as BufferSource,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const mode = kdfMode in PBKDF2_ITERS_BY_MODE ? kdfMode : 1;
      const iterations = PBKDF2_ITERS_BY_MODE[mode];

      const start = performance.now();
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
        pbkdf2BaseKey,
        256
      );
      return performance.now() - start;
    } finally {
      zeroize(password);
    }
  }
}
