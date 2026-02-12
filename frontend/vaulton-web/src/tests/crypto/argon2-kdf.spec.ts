import { Argon2KdfProvider } from '../../app/core/crypto/kdf/argon2-kdf';
import sodium from 'libsodium-wrappers-sumo';

describe('Argon2 KDF (argon2-kdf.ts)', () => {
  let provider: Argon2KdfProvider;

  beforeAll(async () => {
    // Explicitly wait for sodium to be ready
    await sodium.ready;
    provider = new Argon2KdfProvider();
  });

  it('should initialize libsodium without error', async () => {
    const password = new Uint8Array(new TextEncoder().encode('password'));
    const salt = new Uint8Array(16);

    await provider.benchmark(password, salt, 1);
    expect(true).toBe(true);
  });

  it('should derive a valid CryptoKey', async () => {
    const password = new Uint8Array(new TextEncoder().encode('my-secret-password'));
    const salt = new Uint8Array(16);

    const key = await provider.deriveHkdfBaseKey(password, salt, 1);

    expect(key.algorithm.name).toBe('HKDF');
    expect(key.extractable).toBe(false);
  });

  it('should produce different keys for different salts (Avalanche Effect)', async () => {
    const password = new Uint8Array(new TextEncoder().encode('same-password'));
    const salt1 = new Uint8Array(16);
    const salt2 = new Uint8Array(16);
    salt2[0] = 1;

    const k1 = await provider.deriveHkdfBaseKey(password, salt1, 1);
    const k2 = await provider.deriveHkdfBaseKey(password, salt2, 1);

    const bits1 = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
      k1,
      256,
    );
    const bits2 = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new Uint8Array(0) },
      k2,
      256,
    );

    const b1 = new Uint8Array(bits1);
    const b2 = new Uint8Array(bits2);

    let different = false;
    for (let i = 0; i < b1.length; i++) {
      if (b1[i] !== b2[i]) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });

  it('should support Hardened Mode (Mode 3)', async () => {
    const password = new Uint8Array(new TextEncoder().encode('hard-password'));
    const salt = new Uint8Array(16);

    const key = await provider.deriveHkdfBaseKey(password, salt, 3);
    expect(key).toBeDefined();
  });

  it('should zeroize password buffer after use', async () => {
    const pwdBytes = new Uint8Array(new TextEncoder().encode('sensitive'));
    const salt = new Uint8Array(16);

    await provider.deriveHkdfBaseKey(pwdBytes, salt, 1);

    const isZeroed = pwdBytes.every((b) => b === 0);
    expect(isZeroed).toBe(true);
  });
});
