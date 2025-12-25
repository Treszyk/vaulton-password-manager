/// <reference lib="webworker" />

import { bytesToB64, b64ToBytes } from '../b64';
import { zeroize } from '../zeroize';
import { encryptSplit } from '../aesgcm-split';
import { hkdfAesGcm256Key, hkdfVerifierB64 } from '../hkdf';
import { Pbkdf2KdfProvider } from '../kdf/pbkdf2-kdf';
import type { EncryptedValueDto, RegisterRequest } from '../../auth/auth-crypto.service';
import type { WorkerRequest, WorkerMessage, WorkerResponseEnvelope } from './crypto.worker.types';
import type { KdfProvider } from '../kdf/kdf';

const kdfProvider: KdfProvider = new Pbkdf2KdfProvider();

addEventListener('message', async ({ data }: MessageEvent<WorkerMessage<WorkerRequest>>) => {
  const { id, payload: request } = data;
  let pwdBytes: Uint8Array | null = null;

  try {
    const { passwordBuffer } = request.payload;
    if (!(passwordBuffer instanceof ArrayBuffer)) {
      throw new Error('Invalid payload: passwordBuffer missing');
    }
    pwdBytes = new Uint8Array(passwordBuffer);

    switch (request.type) {
      case 'REGISTER':
        const regRes = await handleRegister({
          ...request.payload,
          password: pwdBytes,
        });
        postSuccess(id, regRes);
        break;
      case 'LOGIN':
        const loginRes = await handleLogin({
          ...request.payload,
          password: pwdBytes,
        });
        postSuccess(id, loginRes);
        break;
      default:
        throw new Error(`Unknown message type: ${(request as any).type}`);
    }
  } catch (err: any) {
    postError(id, err.message || String(err));
  } finally {
    if (pwdBytes) {
      zeroize(pwdBytes);
    }
  }
});

function postSuccess<T>(id: string, result: T) {
  const msg: WorkerResponseEnvelope<T> = { id, ok: true, result };
  postMessage(msg);
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
