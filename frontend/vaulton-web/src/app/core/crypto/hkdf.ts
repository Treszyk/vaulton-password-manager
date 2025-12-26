import { bytesToB64 } from './b64';
import { zeroize } from './zeroize';

const enc = new TextEncoder();

export async function hkdfVerifierB64(hkdfBaseKey: CryptoKey, info: string): Promise<string> {
  const buf = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0) as BufferSource,
      info: enc.encode(info) as BufferSource,
    },
    hkdfBaseKey,
    256
  );

  let bytes: Uint8Array | null = new Uint8Array(buf);
  try {
    return bytesToB64(bytes as Uint8Array);
  } finally {
    if (bytes) {
      zeroize(bytes);
      bytes = null;
    }
  }
}

export function hkdfAesGcm256Key(hkdfBaseKey: CryptoKey, info: string): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0) as BufferSource,
      info: enc.encode(info) as BufferSource,
    },
    hkdfBaseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function hkdfHmacSha256Key(hkdfBaseKey: CryptoKey, info: string): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0) as BufferSource,
      info: enc.encode(info) as BufferSource,
    },
    hkdfBaseKey,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign']
  );
}
