/// <reference lib="webworker" />

import { bytesToB64, b64ToBytes } from '../b64';
import { zeroize } from '../zeroize';
import { encryptSplit } from '../aesgcm-split';
import { hkdfAesGcm256Key, hkdfHmacSha256Key, hkdfVerifierB64 } from '../hkdf';
import { Argon2KdfProvider } from '../kdf/argon2-kdf';
import type {
  WorkerRequest,
  WorkerMessage,
  WorkerResponseEnvelope,
  EncryptedValueDto,
  RegisterRequest,
} from './crypto.worker.types';
import type { KdfProvider } from '../kdf/kdf';

const kdfProvider: KdfProvider = new Argon2KdfProvider();
let vaultKey: CryptoKey | null = null;
let pendingLoginBaseKey: CryptoKey | null = null;

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
      case 'FINALIZE_LOGIN': {
        await handleFinalizeLogin(request.payload);
        postSuccess(id, { ok: true });
        break;
      }
      case 'CLEAR_KEYS': {
        await handleClearKeys();
        postSuccess(id, { ok: true });
        break;
      }
      case 'CHECK_STATUS': {
        const isUnlocked = !!vaultKey;
        postSuccess(id, { isUnlocked });
        break;
      }
      case 'UNLOCK': {
        const { passwordBuffer } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        try {
          await handleLogin({ ...request.payload, password: pwdBytes });
          await handleFinalizeLogin(request.payload as any);
          postSuccess(id, { ok: true });
        } finally {
          zeroize(pwdBytes);
        }
        break;
      }
      case 'DERIVE_ADMIN_VERIFIER': {
        const { passwordBuffer, saltB64, kdfMode } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        try {
          const res = await handleDeriveAdminVerifier({ password: pwdBytes, saltB64, kdfMode });
          postSuccess(id, res);
        } finally {
          zeroize(pwdBytes);
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
      case 'BENCHMARK_KDF': {
        const { passwordBuffer, saltBuffer, kdfMode } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        const saltBytes = new Uint8Array(saltBuffer);
        try {
          const duration = await kdfProvider.benchmark(pwdBytes, saltBytes, kdfMode);
          postSuccess(id, { duration });
        } finally {
          zeroize(pwdBytes);
          zeroize(saltBytes);
        }
        break;
      }
      case 'ACTIVATE_PASSCODE': {
        const {
          passwordBuffer,
          passcodeBuffer,
          masterSaltB64,
          masterKdfMode,
          accountId,
          mkWrapPwd,
          schemaVer,
        } = request.payload;
        const pwdBytes = new Uint8Array(passwordBuffer);
        const pinBytes = new Uint8Array(passcodeBuffer);
        try {
          const res = await handleActivatePasscode({
            password: pwdBytes,
            masterSaltB64,
            masterKdfMode,
            passcode: pinBytes,
            accountId,
            mkWrapPwd,
            schemaVer,
          });
          postSuccess(id, res);
        } finally {
          zeroize(pwdBytes);
          zeroize(pinBytes);
        }
        break;
      }
      case 'UNLOCK_VIA_PASSCODE': {
        const { passcodeBuffer, saltB64, mkWrapLocal, accountId } = request.payload;
        const pinBytes = new Uint8Array(passcodeBuffer);
        try {
          await handleUnlockViaPasscode({ passcode: pinBytes, saltB64, mkWrapLocal, accountId });
          postSuccess(id, { ok: true });
        } finally {
          zeroize(pinBytes);
        }
        break;
      }
      case 'EXECUTE_REKEY': {
        const { currentPasswordBuffer, newPasswordBuffer } = request.payload;
        const currentPwdBytes = new Uint8Array(currentPasswordBuffer);
        const newPwdBytes = new Uint8Array(newPasswordBuffer);
        try {
          const res = await handleExecuteRekey({
            ...request.payload,
            currentPassword: currentPwdBytes,
            newPassword: newPwdBytes,
          });
          postSuccess(id, res);
        } finally {
          zeroize(currentPwdBytes);
          zeroize(newPwdBytes);
        }
        break;
      }
      case 'RECOVER': {
        const { newPasswordBuffer } = request.payload;
        const newPwdBytes = new Uint8Array(newPasswordBuffer);
        try {
          const res = await handleRecover({
            ...request.payload,
            newPassword: newPwdBytes,
          });
          postSuccess(id, res);
        } finally {
          zeroize(newPwdBytes);
        }
        break;
      }
      case 'DERIVE_RK_VERIFIER': {
        const { recoveryKeyB64 } = request.payload;
        try {
          const rkVerifier = await handleDeriveRkVerifier(recoveryKeyB64);
          postSuccess(id, { rkVerifier });
        } catch (err: any) {
          postError(id, err.message || String(err));
        }
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
  const aad = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);
  const aadRk = new TextEncoder().encode(`vaulton:mk-wrap-rk:schema${schemaVer}:${accountId}`);

  let mkBytes: Uint8Array | null = null;
  let rkBytes: Uint8Array | null = null;

  try {
    const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(password, sPwd, kdfMode);
    const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
    const adminVerifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/admin');
    const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/kek', ['encrypt']);

    mkBytes = crypto.getRandomValues(new Uint8Array(32));
    const wrapMk = await encryptSplit(kekKey, mkBytes, aad);

    rkBytes = crypto.getRandomValues(new Uint8Array(32));
    const rkKey = await crypto.subtle.importKey('raw', rkBytes as any, 'HKDF', false, [
      'deriveKey',
      'deriveBits',
    ]);
    const vrfRk = await hkdfVerifierB64(rkKey, 'vaulton/rk-vrf');
    const kekRk = await hkdfAesGcm256Key(rkKey, 'vaulton/rk-kek', ['encrypt']);
    const wrapRk = await encryptSplit(kekRk, mkBytes, aadRk);

    const recoveryKeyB64 = bytesToB64(rkBytes);

    zeroize(rkBytes);
    rkBytes = null;

    zeroize(mkBytes);
    mkBytes = null;

    const mkWrapPwd: EncryptedValueDto = {
      Nonce: bytesToB64(wrapMk.Nonce),
      CipherText: bytesToB64(wrapMk.CipherText),
      Tag: bytesToB64(wrapMk.Tag),
    };

    const mkWrapRk: EncryptedValueDto = {
      Nonce: bytesToB64(wrapRk.Nonce),
      CipherText: bytesToB64(wrapRk.CipherText),
      Tag: bytesToB64(wrapRk.Tag),
    };

    zeroize(wrapMk.Nonce);
    zeroize(wrapMk.CipherText);
    zeroize(wrapMk.Tag);
    zeroize(wrapRk.Nonce);
    zeroize(wrapRk.CipherText);
    zeroize(wrapRk.Tag);

    const sPwdB64 = bytesToB64(sPwd);
    const registerBody: RegisterRequest = {
      AccountId: accountId,
      Verifier: verifierB64,
      AdminVerifier: adminVerifierB64,
      RkVerifier: vrfRk,
      S_Pwd: sPwdB64,
      KdfMode: kdfMode,
      MKWrapPwd: mkWrapPwd,
      MKWrapRk: mkWrapRk,
      CryptoSchemaVer: schemaVer,
    };

    return { registerBody, recoveryKey: recoveryKeyB64 };
  } finally {
    zeroize(aad);
    if (aadRk) zeroize(aadRk);
    zeroize(sPwd);
    if (mkBytes) zeroize(mkBytes);
    if (rkBytes) zeroize(rkBytes);
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

  if (pendingLoginBaseKey) {
    pendingLoginBaseKey = null;
  }

  try {
    const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(password, sPwd, kdfMode);

    pendingLoginBaseKey = hkdfBaseKey;

    const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
    return { verifier: verifierB64 };
  } catch (e) {
    pendingLoginBaseKey = null;
    throw e;
  } finally {
    zeroize(sPwd);
  }
}

async function handleFinalizeLogin({
  MkWrapPwd,
  CryptoSchemaVer,
  AccountId,
}: {
  MkWrapPwd: EncryptedValueDto;
  CryptoSchemaVer: number;
  AccountId: string;
}) {
  if (!pendingLoginBaseKey) {
    throw new Error('No pending login key found. Please login again.');
  }

  vaultKey = null;

  const aadString = `vaulton:mk-wrap-pwd:schema${CryptoSchemaVer}:${AccountId}`;
  const aad = new TextEncoder().encode(aadString);

  try {
    const kekKey = await hkdfAesGcm256Key(pendingLoginBaseKey, 'vaulton/kek', ['unwrapKey']);

    const mk = await unwrapMk(kekKey, MkWrapPwd, aad);

    vaultKey = await hkdfAesGcm256Key(mk, 'vaulton/vault-enc', ['encrypt', 'decrypt']);
  } catch (e) {
    vaultKey = null;
    throw e;
  } finally {
    pendingLoginBaseKey = null;
    zeroize(aad);
  }
}

async function handleClearKeys() {
  vaultKey = null;
  pendingLoginBaseKey = null;
}

async function handleDeriveAdminVerifier({
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
    const adminVerifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/admin');
    return { adminVerifier: adminVerifierB64 };
  } finally {
    zeroize(sPwd);
  }
}

async function handleEncryptEntry({
  plaintextBuffer,
  aadB64,
}: {
  plaintextBuffer: ArrayBuffer;
  aadB64: string;
}) {
  if (!vaultKey) throw new Error('Vault key not initialized');

  const ptBytes = new Uint8Array(plaintextBuffer);
  const aad = b64ToBytes(aadB64);

  try {
    const split = await encryptSplit(vaultKey, ptBytes, aad);

    try {
      return {
        result: {
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
      ctTag as BufferSource,
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

async function handleActivatePasscode({
  password,
  masterSaltB64,
  masterKdfMode,
  passcode,
  accountId,
  mkWrapPwd,
  schemaVer,
}: {
  password: Uint8Array;
  masterSaltB64: string;
  masterKdfMode: number;
  passcode: Uint8Array;
  accountId: string;
  mkWrapPwd: EncryptedValueDto;
  schemaVer: number;
}) {
  const mSalt = b64ToBytes(masterSaltB64);
  const localSalt = crypto.getRandomValues(new Uint8Array(16));
  const aadLocal = new TextEncoder().encode(`vaulton:local-passcode-wrap:${accountId}`);
  const aadMaster = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);

  try {
    const hkdfLocal = await kdfProvider.deriveHkdfBaseKey(passcode, localSalt, 3);
    const kekLocal = await hkdfAesGcm256Key(hkdfLocal, 'vaulton/passcode-kek', ['encrypt']);

    const hkdfMaster = await kdfProvider.deriveHkdfBaseKey(password, mSalt, masterKdfMode);
    const kekMaster = await hkdfAesGcm256Key(hkdfMaster, 'vaulton/kek', ['decrypt']);

    const mkRaw = await decryptMk(kekMaster, mkWrapPwd, aadMaster);
    const wrap = await encryptSplit(kekLocal, mkRaw, aadLocal);
    zeroize(mkRaw);

    return {
      mkWrapLocal: {
        Nonce: bytesToB64(wrap.Nonce),
        CipherText: bytesToB64(wrap.CipherText),
        Tag: bytesToB64(wrap.Tag),
      },
      sLocalB64: bytesToB64(localSalt),
    };
  } finally {
    zeroize(mSalt);
    zeroize(localSalt);
    zeroize(aadLocal);
    zeroize(aadMaster);
  }
}

async function handleUnlockViaPasscode({
  passcode,
  saltB64,
  mkWrapLocal,
  accountId,
}: {
  passcode: Uint8Array;
  saltB64: string;
  mkWrapLocal: EncryptedValueDto;
  accountId: string;
}) {
  const sLocal = b64ToBytes(saltB64);
  const aadLocal = new TextEncoder().encode(`vaulton:local-passcode-wrap:${accountId}`);
  vaultKey = null;

  try {
    const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(passcode, sLocal, 3);

    const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/passcode-kek', ['unwrapKey']);
    const mk = await unwrapMk(kekKey, mkWrapLocal, aadLocal);

    vaultKey = await hkdfAesGcm256Key(mk, 'vaulton/vault-enc', ['encrypt', 'decrypt']);
  } catch (e) {
    vaultKey = null;
    throw e;
  } finally {
    zeroize(sLocal);
  }
}

async function handleExecuteRekey({
  currentPassword,
  currentSaltB64,
  currentKdfMode,
  newPassword,
  accountId,
  currentMkWrapPwd,
  schemaVer,
  newKdfMode,
}: {
  currentPassword: Uint8Array;
  currentSaltB64: string;
  currentKdfMode: number;
  newPassword: Uint8Array;
  accountId: string;
  currentMkWrapPwd: EncryptedValueDto;
  schemaVer: number;
  newKdfMode: number;
}) {
  const curSalt = b64ToBytes(currentSaltB64);
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const aad = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);

  try {
    const hkdfCurrent = await kdfProvider.deriveHkdfBaseKey(
      currentPassword,
      curSalt,
      currentKdfMode,
    );
    const kekCurrent = await hkdfAesGcm256Key(hkdfCurrent, 'vaulton/kek', ['decrypt']);

    const hkdfNew = await kdfProvider.deriveHkdfBaseKey(newPassword, newSalt, newKdfMode);
    const verifierB64 = await hkdfVerifierB64(hkdfNew, 'vaulton/verifier');
    const adminVerifierB64 = await hkdfVerifierB64(hkdfNew, 'vaulton/admin');
    const kekNew = await hkdfAesGcm256Key(hkdfNew, 'vaulton/kek', ['encrypt']);

    const mkRaw = await decryptMk(kekCurrent, currentMkWrapPwd, aad);
    const wrap = await encryptSplit(kekNew, mkRaw, aad);
    zeroize(mkRaw);

    return {
      newVerifier: verifierB64,
      newAdminVerifier: adminVerifierB64,
      newS_Pwd: bytesToB64(newSalt),
      newMkWrapPwd: {
        Nonce: bytesToB64(wrap.Nonce),
        CipherText: bytesToB64(wrap.CipherText),
        Tag: bytesToB64(wrap.Tag),
      },
    };
  } finally {
    zeroize(curSalt);
    zeroize(newSalt);
    zeroize(aad);
  }
}

async function unwrapMk(
  kek: CryptoKey,
  dto: EncryptedValueDto,
  aad: Uint8Array,
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
      ['deriveKey'],
    );
  } finally {
    zeroize(nonce);
    zeroize(ct);
    zeroize(tag);
    zeroize(wrappedBytes);
  }
}

async function decryptMk(
  kek: CryptoKey,
  dto: EncryptedValueDto,
  aad: Uint8Array,
): Promise<Uint8Array> {
  const nonce = b64ToBytes(dto.Nonce);
  const ct = b64ToBytes(dto.CipherText);
  const tag = b64ToBytes(dto.Tag);

  const ctTag = new Uint8Array(ct.length + tag.length);
  ctTag.set(ct, 0);
  ctTag.set(tag, ct.length);

  try {
    const ptBuf = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce as BufferSource,
        additionalData: aad as BufferSource,
      },
      kek,
      ctTag as BufferSource,
    );

    return new Uint8Array(ptBuf);
  } finally {
    zeroize(nonce);
    zeroize(ct);
    zeroize(tag);
    zeroize(ctTag);
  }
}

async function handleRecover({
  recoveryKeyB64,
  newPassword,
  accountId,
  mkWrapRk,
  schemaVer,
  newKdfMode,
}: {
  recoveryKeyB64: string;
  newPassword: Uint8Array;
  accountId: string;
  mkWrapRk: EncryptedValueDto;
  schemaVer: number;
  newKdfMode: number;
}) {
  const rkBytes = b64ToBytes(recoveryKeyB64);
  const rkBaseKey = await crypto.subtle.importKey('raw', rkBytes as any, 'HKDF', false, [
    'deriveKey',
    'deriveBits',
  ]);

  try {
    const rkProofB64 = await hkdfVerifierB64(rkBaseKey, 'vaulton/rk-vrf');
    const rkKek = await hkdfAesGcm256Key(rkBaseKey, 'vaulton/rk-kek');

    const aadRk = new TextEncoder().encode(`vaulton:mk-wrap-rk:schema${schemaVer}:${accountId}`);
    const mkRaw = await decryptMk(rkKek, mkWrapRk, aadRk);

    try {
      const sPwd = crypto.getRandomValues(new Uint8Array(16));
      const aadPwd = new TextEncoder().encode(
        `vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`,
      );
      const hkdfBaseKey = await kdfProvider.deriveHkdfBaseKey(newPassword, sPwd, newKdfMode);

      const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
      const adminVerifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/admin');
      const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/kek', ['encrypt']);
      const wrapMkPwd = await encryptSplit(kekKey, mkRaw, aadPwd);

      const newRkBytes = crypto.getRandomValues(new Uint8Array(32));
      const newRkKey = await crypto.subtle.importKey('raw', newRkBytes as any, 'HKDF', false, [
        'deriveKey',
        'deriveBits',
      ]);
      const vrfRk = await hkdfVerifierB64(newRkKey, 'vaulton/rk-vrf');
      const kekRk = await hkdfAesGcm256Key(newRkKey, 'vaulton/rk-kek', ['encrypt']);
      const wrapMkRk = await encryptSplit(kekRk, mkRaw, aadRk);

      const newRecoveryKeyB64 = bytesToB64(newRkBytes);

      zeroize(newRkBytes);

      try {
        return {
          rkVerifier: rkProofB64,
          newVerifier: verifierB64,
          newAdminVerifier: adminVerifierB64,
          newRkVerifier: vrfRk,
          newS_Pwd: bytesToB64(sPwd),
          newKdfMode: newKdfMode,
          newMkWrapPwd: {
            Nonce: bytesToB64(wrapMkPwd.Nonce),
            CipherText: bytesToB64(wrapMkPwd.CipherText),
            Tag: bytesToB64(wrapMkPwd.Tag),
          },
          newMkWrapRk: {
            Nonce: bytesToB64(wrapMkRk.Nonce),
            CipherText: bytesToB64(wrapMkRk.CipherText),
            Tag: bytesToB64(wrapMkRk.Tag),
          },
          cryptoSchemaVer: schemaVer,
          newRecoveryKey: newRecoveryKeyB64,
        };
      } finally {
        zeroize(wrapMkPwd.Nonce);
        zeroize(wrapMkPwd.CipherText);
        zeroize(wrapMkPwd.Tag);
        zeroize(wrapMkRk.Nonce);
        zeroize(wrapMkRk.CipherText);
        zeroize(wrapMkRk.Tag);
        zeroize(sPwd);
        zeroize(aadPwd);
      }
    } finally {
      zeroize(mkRaw);
      zeroize(aadRk);
    }
  } finally {
    zeroize(rkBytes);
  }
}

async function handleDeriveRkVerifier(recoveryKeyB64: string): Promise<string> {
  const rkBytes = b64ToBytes(recoveryKeyB64);
  try {
    const rkBaseKey = await crypto.subtle.importKey('raw', rkBytes as any, 'HKDF', false, [
      'deriveBits',
    ]);
    return await hkdfVerifierB64(rkBaseKey, 'vaulton/rk-vrf');
  } finally {
    zeroize(rkBytes);
  }
}
