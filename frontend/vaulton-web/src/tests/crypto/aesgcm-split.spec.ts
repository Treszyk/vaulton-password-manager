import { encryptSplit } from '../../app/core/crypto/aesgcm-split';
import { bytesToB64 } from '../../app/core/crypto/b64';

describe('AES-GCM Split (aesgcm-split.ts)', () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
  });

  it('should encrypt data and return correct structure (Nonce=12, Tag=16)', async () => {
    const data = new TextEncoder().encode('Secret Data');
    const aad = new TextEncoder().encode('AAD');

    const result = await encryptSplit(key, data, aad);

    expect(result.Nonce.length).toBe(12);
    expect(result.Tag.length).toBe(16);
    expect(result.CipherText.length).toBe(data.length);
  });

  it('should be decryptable using standard Web Crypto API', async () => {
    const data = new TextEncoder().encode('Unlock Me');
    const aad = new TextEncoder().encode('AuthData');

    const { Nonce, CipherText, Tag } = await encryptSplit(key, data, aad);

    const ctTag = new Uint8Array(CipherText.length + Tag.length);
    ctTag.set(CipherText, 0);
    ctTag.set(Tag, CipherText.length);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: Nonce as any as BufferSource,
        additionalData: aad as any as BufferSource,
      },
      key,
      ctTag as any as BufferSource,
    );

    const decryptedText = new TextDecoder().decode(decrypted);
    expect(decryptedText).toBe('Unlock Me');
  });

  it('should fail decryption if Tag is tampered', async () => {
    const data = new TextEncoder().encode('Fragile');
    const { Nonce, CipherText, Tag } = await encryptSplit(key, data);

    // Tamper with the tag
    Tag[0] ^= 1;

    const ctTag = new Uint8Array(CipherText.length + Tag.length);
    ctTag.set(CipherText, 0);
    ctTag.set(Tag, CipherText.length);

    let errorThrown = false;
    try {
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Nonce as any as BufferSource },
        key,
        ctTag as any as BufferSource,
      );
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });

  it('should produce different nonces for same data', async () => {
    const data = new TextEncoder().encode('Same Data');

    const r1 = await encryptSplit(key, data);
    const r2 = await encryptSplit(key, data);

    const n1 = bytesToB64(r1.Nonce);
    const n2 = bytesToB64(r2.Nonce);

    expect(n1).not.toBe(n2);
    expect(r1.CipherText).not.toEqual(r2.CipherText);
  });
});
