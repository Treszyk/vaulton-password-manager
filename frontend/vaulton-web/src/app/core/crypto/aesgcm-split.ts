import { zeroize } from './zeroize';

export type SplitGcm = { Nonce: Uint8Array; CipherText: Uint8Array; Tag: Uint8Array };

export async function encryptSplit(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad?: Uint8Array
): Promise<SplitGcm> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ctTagBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad as BufferSource },
    key,
    plaintext as BufferSource
  );

  const ctTag = new Uint8Array(ctTagBuf);
  const tagLen = 16;
  const ct = ctTag.subarray(0, ctTag.length - tagLen);
  const tag = ctTag.subarray(ctTag.length - tagLen);
  return { Nonce: nonce, CipherText: ct, Tag: tag };
}
