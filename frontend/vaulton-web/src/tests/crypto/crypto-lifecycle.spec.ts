import { Argon2KdfProvider } from '../../app/core/crypto/kdf/argon2-kdf';
import { hkdfAesGcm256Key, hkdfVerifierB64 } from '../../app/core/crypto/hkdf';
import { encryptSplit } from '../../app/core/crypto/aesgcm-split';
import sodium from 'libsodium-wrappers-sumo';

describe('Crypto Lifecycle Integration (Register -> Login -> Unlock)', () => {
  const INFO_KEK = 'vaulton/kek';
  const INFO_VERIFIER = 'vaulton/verifier';

  let provider: Argon2KdfProvider;

  beforeAll(async () => {
    await sodium.ready;
    provider = new Argon2KdfProvider();
  });

  it('should successfully Register, Login, and Decrypt a vault', async () => {
    // --- 1. REGISTRATION PHASE ---
    const accountId = 'user@example.com';
    const password = new Uint8Array(new TextEncoder().encode('correct-horse-battery-staple'));
    const kdfMode = 1;
    const schemaVer = 1;

    // A. Generate random public salt
    const sPwd = crypto.getRandomValues(new Uint8Array(16));

    // B. Derive the Master Base Key (HKDF Base)
    const hkdfBaseKey = await provider.deriveHkdfBaseKey(password, sPwd, kdfMode);

    // C. Generate the Master Key
    const masterKeyBytes = crypto.getRandomValues(new Uint8Array(32));

    // D. Wrap the Master Key
    const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, INFO_KEK, ['encrypt', 'wrapKey']);
    const aad = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);

    const wrappedMK = await encryptSplit(kekKey, masterKeyBytes, aad);

    // E. Generate Verifier (Reference)
    const originalVerifier = await hkdfVerifierB64(hkdfBaseKey, INFO_VERIFIER);

    // --- 2. LOGIN PHASE ---
    // Now we simulate a fresh login using ONLY public info (sPwd, wrappedMK, KDFMode) + Password.

    // NOTE: The original 'password' buffer was zeroized by deriveHkdfBaseKey in step 1.
    // We must recreate it to simulate the user typing it again.
    const passwordLogin = new Uint8Array(new TextEncoder().encode('correct-horse-battery-staple'));

    // A. Derive Login Keys again
    const loginBaseKey = await provider.deriveHkdfBaseKey(passwordLogin, sPwd, kdfMode);

    // B. Check Verifier
    const loginVerifier = await hkdfVerifierB64(loginBaseKey, INFO_VERIFIER);
    expect(loginVerifier).toBe(originalVerifier);

    // C. Unwrap the Master Key
    const unwrapKek = await hkdfAesGcm256Key(loginBaseKey, INFO_KEK, ['decrypt', 'unwrapKey']);

    // Reconstruct ciphertext buffer
    const ctTag = new Uint8Array(wrappedMK.CipherText.length + wrappedMK.Tag.length);
    ctTag.set(wrappedMK.CipherText, 0);
    ctTag.set(wrappedMK.Tag, wrappedMK.CipherText.length);

    const unwrappedBytesBuf = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: wrappedMK.Nonce as any as BufferSource,
        additionalData: aad as any as BufferSource,
      },
      unwrapKek,
      ctTag as any as BufferSource,
    );
    const unwrappedMKBytes = new Uint8Array(unwrappedBytesBuf);

    // ASSERT: Did we get the exact same key bytes back?
    expect(unwrappedMKBytes).toEqual(masterKeyBytes);

    // --- 3. VAULT USAGE PHASE ---
    // Now we use the restored Mk to encrypt actual data.

    const vaultKey = await crypto.subtle.importKey(
      'raw',
      unwrappedMKBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    const secretData = new TextEncoder().encode('My Super Secret Bank Password');
    const vaultItem = await encryptSplit(vaultKey, secretData);

    // Decrypt it
    const itemCtTag = new Uint8Array(vaultItem.CipherText.length + vaultItem.Tag.length);
    itemCtTag.set(vaultItem.CipherText, 0);
    itemCtTag.set(vaultItem.Tag, vaultItem.CipherText.length);

    const decryptedDataBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: vaultItem.Nonce as any as BufferSource },
      vaultKey,
      itemCtTag as any as BufferSource,
    );

    const decryptedString = new TextDecoder().decode(decryptedDataBuf);
    expect(decryptedString).toBe('My Super Secret Bank Password');
  });
});
