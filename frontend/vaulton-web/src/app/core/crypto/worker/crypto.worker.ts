/// <reference lib="webworker" />

import { bytesToB64, b64ToBytes } from '../b64';
import { zeroize } from '../zeroize';
import { encryptSplit } from '../aesgcm-split';
import { hkdfAesGcm256Key, hkdfHmacSha256Key, hkdfVerifierB64 } from '../hkdf';
import { Pbkdf2KdfProvider } from '../kdf/pbkdf2-kdf';
import type {
  WorkerRequest,
  WorkerMessage,
  WorkerResponseEnvelope,
  EncryptedValueDto,
  RegisterRequest,
} from './crypto.worker.types';
import type { KdfProvider } from '../kdf/kdf';

const kdfProvider: KdfProvider = new Pbkdf2KdfProvider();
let vaultKey: CryptoKey | null = null;
let domainTagKey: CryptoKey | null = null;

addEventListener('message', async ({ data }: MessageEvent<WorkerMessage<WorkerRequest>>) => {
  const { id, payload: request } = data;

  try {
    switch (request.type) {
      case 'REGISTER': {
        const { passwordBuffer } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        try {
          const res = await handleRegister({ ...request.payload, password: pwdBytes });
          postSuccess(id, res);
        } finally {
          zeroize(pwdBytes);
        }
        break;
      }
      case 'LOGIN': {
        const { passwordBuffer } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        try {
          const res = await handleLogin({ ...request.payload, password: pwdBytes });
          postSuccess(id, res);
        } finally {
          zeroize(pwdBytes);
        }
        break;
      }
      case 'GENERATE_DEBUG_KEY': {
        const rawMk = new Uint8Array(32).fill(0x42);
        try {
          const mkBaseKey = await crypto.subtle.importKey(
            'raw',
            rawMk as BufferSource,
            { name: 'HKDF' },
            false,
            ['deriveKey']
          );

          vaultKey = await hkdfAesGcm256Key(mkBaseKey, 'vaulton/vault-enc');
          domainTagKey = await hkdfHmacSha256Key(mkBaseKey, 'vaulton/vault-tag');

          postSuccess(id, { ok: true });
        } finally {
          zeroize(rawMk);
        }
        break;
      }
      case 'ENCRYPT_ENTRY': {
        const { result } = await handleEncryptEntry(request.payload);
        postSuccess(id, result);
        break;
      }
      case 'DECRYPT_ENTRY': {
        const { result, transfer } = await handleDecryptEntry(request.payload);
        postSuccess(id, result, transfer);
        break;
      }
      default:
        throw new Error(`Unknown message type: ${(request as any).type}`);
    }
  } catch (err: any) {
    postError(id, err.message || String(err));
  }
});

function postSuccess<T>(id: string, result: T, transfer?: Transferable[]) {
  const msg: WorkerResponseEnvelope<T> = { id, ok: true, result };
  postMessage(msg, transfer ?? []);
}

function postError(id: string, error: string) {
  const msg: WorkerResponseEnvelope<any> = { id, ok: false, error };
  postMessage(msg);
}

async function handleRegister({
  accountId,
  password,
  kdfMode,
  schemaVer,
}: {
  accountId: string;
  password: Uint8Array;
  kdfMode: number;
  schemaVer: number;
}) {
  const sPwd = crypto.getRandomValues(new Uint8Array(16));
  let aad = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);
  let mkBytes: Uint8Array | null = null;

  try {
    const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(password, sPwd, kdfMode);
    const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
    const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/kek');

    mkBytes = crypto.getRandomValues(new Uint8Array(32));
    const wrap = await encryptSplit(kekKey, mkBytes, aad);
    zeroize(mkBytes);
    mkBytes = null;

    const mkWrapPwd: EncryptedValueDto = {
      Nonce: bytesToB64(wrap.Nonce),
      CipherText: bytesToB64(wrap.CipherText),
      Tag: bytesToB64(wrap.Tag),
    };

    zeroize(wrap.Nonce);
    zeroize(wrap.CipherText);
    zeroize(wrap.Tag);

    const sPwdB64 = bytesToB64(sPwd);
    const registerBody: RegisterRequest = {
      AccountId: accountId,
      Verifier: verifierB64,
      S_Pwd: sPwdB64,
      KdfMode: kdfMode,
      MKWrapPwd: mkWrapPwd,
      MKWrapRk: null,
      CryptoSchemaVer: schemaVer,
    };

    const loginBodyForSwagger = JSON.stringify(
      { AccountId: accountId, Verifier: verifierB64 },
      null,
      2
    );

    return { registerBody, loginBodyForSwagger };
  } finally {
    zeroize(aad);
    zeroize(sPwd);
    if (mkBytes) zeroize(mkBytes);
  }
}

async function handleLogin({
  password,
  saltB64,
  kdfMode,
}: {
  password: Uint8Array;
  saltB64: string;
  kdfMode: number;
}) {
  const sPwd = b64ToBytes(saltB64);
  try {
    const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(password, sPwd, kdfMode);
    const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
    return { verifier: verifierB64 };
  } finally {
    zeroize(sPwd);
  }
}

async function handleEncryptEntry({
  plaintextBuffer,
  aadB64,
  domain,
}: {
  plaintextBuffer: ArrayBuffer;
  aadB64: string;
  domain?: string;
}) {
  if (!vaultKey || !domainTagKey) throw new Error('Vault key not initialized');

  const ptBytes = new Uint8Array(plaintextBuffer);
  const aad = b64ToBytes(aadB64);

  try {
    const split = await encryptSplit(vaultKey, ptBytes, aad);

    const domainInput = domain ?? '';
    const domainBytes = new TextEncoder().encode(domainInput);
    let domainTag = '';

    try {
      const hmacBuf = await crypto.subtle.sign({ name: 'HMAC' }, domainTagKey, domainBytes);
      const hmacBytes = new Uint8Array(hmacBuf);
      try {
        domainTag = bytesToB64(hmacBytes);
      } finally {
        zeroize(hmacBytes);
      }
    } finally {
      zeroize(domainBytes);
    }

    try {
      return {
        result: {
          DomainTag: domainTag,
          Payload: {
            Nonce: bytesToB64(split.Nonce),
            CipherText: bytesToB64(split.CipherText),
            Tag: bytesToB64(split.Tag),
          },
        },
      };
    } finally {
      zeroize(split.Nonce);
      zeroize(split.CipherText);
      zeroize(split.Tag);
    }
  } finally {
    try {
      zeroize(ptBytes);
    } catch {}
    try {
      zeroize(aad);
    } catch {}
  }
}

async function handleDecryptEntry({ dto, aadB64 }: { dto: EncryptedValueDto; aadB64: string }) {
  if (!vaultKey) throw new Error('Vault key not initialized');

  const nonce = b64ToBytes(dto.Nonce);
  const ct = b64ToBytes(dto.CipherText);
  const tag = b64ToBytes(dto.Tag);
  const aad = b64ToBytes(aadB64);

  let ctTag: Uint8Array | null = null;

  try {
    ctTag = new Uint8Array(ct.length + tag.length);
    ctTag.set(ct, 0);
    ctTag.set(tag, ct.length);

    const ptBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: aad as BufferSource },
      vaultKey,
      ctTag as BufferSource
    );

    return { result: { ptBuffer: ptBuf }, transfer: [ptBuf] };
  } finally {
    zeroize(nonce);
    zeroize(ct);
    zeroize(tag);
    zeroize(aad);
    if (ctTag) zeroize(ctTag);
  }
}

async function unwrapMk(
  kek: CryptoKey,
  dto: EncryptedValueDto,
  aad: Uint8Array
): Promise<CryptoKey> {
  const nonce = b64ToBytes(dto.Nonce);
  const ct = b64ToBytes(dto.CipherText);
  const tag = b64ToBytes(dto.Tag);

  const wrappedBytes = new Uint8Array(ct.length + tag.length);
  wrappedBytes.set(ct, 0);
  wrappedBytes.set(tag, ct.length);

  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedBytes as BufferSource,
      kek,
      { name: 'AES-GCM', iv: nonce as BufferSource, additionalData: aad as BufferSource },
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );
  } finally {
    zeroize(nonce);
    zeroize(ct);
    zeroize(tag);
    zeroize(wrappedBytes);
  }
}
