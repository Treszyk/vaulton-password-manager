import { hkdfVerifierB64, hkdfAesGcm256Key, hkdfHmacSha256Key } from '../../app/core/crypto/hkdf';
import { bytesToB64 } from '../../app/core/crypto/b64';

describe('HKDF (hkdf.ts)', () => {
  let masterKey: CryptoKey;

  beforeAll(async () => {
    // Generate a base key to act as input for HKDF
    const rawKey = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(rawKey);
    masterKey = await crypto.subtle.importKey('raw', rawKey, 'HKDF', false, [
      'deriveKey',
      'deriveBits',
    ]);
  });

  describe('hkdfVerifierB64', () => {
    it('should generate a base64 string', async () => {
      const result = await hkdfVerifierB64(masterKey, 'vaulton/test-info');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be deterministic (Same Key + Same Info = Same Output)', async () => {
      const r1 = await hkdfVerifierB64(masterKey, 'vaulton/test-info');
      const r2 = await hkdfVerifierB64(masterKey, 'vaulton/test-info');
      expect(r1).toBe(r2);
    });

    it('should provide separation (Same Key + Different Info = Different Output)', async () => {
      const r1 = await hkdfVerifierB64(masterKey, 'vaulton/context-a');
      const r2 = await hkdfVerifierB64(masterKey, 'vaulton/context-b');
      expect(r1).not.toBe(r2);
    });
  });

  describe('hkdfAesGcm256Key', () => {
    it('should return a valid AES-GCM CryptoKey', async () => {
      const derived = await hkdfAesGcm256Key(masterKey, 'vaulton/kek');

      expect(derived.algorithm.name).toBe('AES-GCM');
      expect((derived.algorithm as any).length).toBe(256);
      expect(derived.extractable).toBe(false);
      expect(derived.usages).toContain('encrypt');
      expect(derived.usages).toContain('decrypt');
    });

    it('should support custom usages', async () => {
      const derived = await hkdfAesGcm256Key(masterKey, 'vaulton/wrap', ['wrapKey', 'unwrapKey']);
      expect(derived.usages).toEqual(['wrapKey', 'unwrapKey']);
    });
  });

  describe('hkdfHmacSha256Key', () => {
    it('should return a valid HMAC CryptoKey', async () => {
      const derived = await hkdfHmacSha256Key(masterKey, 'vaulton/sign');

      expect(derived.algorithm.name).toBe('HMAC');
      expect((derived.algorithm as any).hash.name).toBe('SHA-256');
      expect(derived.usages).toContain('sign');
    });
  });
});
