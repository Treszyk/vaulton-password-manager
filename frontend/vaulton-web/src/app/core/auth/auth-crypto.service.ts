import { Injectable, signal } from '@angular/core';
import { CryptoWorkerFactory } from '../crypto/worker/crypto-worker.factory';
import type { PreLoginResponse } from '../api/auth-api.service';
import type {
  RegisterRequest,
  EncryptedValueDto,
  EncryptedEntryResult,
  DecryptEntryResult,
  CheckStatusResponse,
} from '../crypto/worker/crypto.worker.types';

@Injectable({ providedIn: 'root' })
export class AuthCryptoService {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void; timeoutId: any }
  >();
  private isWorking = false;

  constructor(private workerFactory: CryptoWorkerFactory) {}

  private initWorker() {
    this.worker = this.workerFactory.create();

    this.worker.onmessage = ({
      data,
    }: MessageEvent<{ id: string; ok: boolean; result?: any; error?: string }>) => {
      const { id, ok, result, error } = data;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        clearTimeout(pending.timeoutId);
        if (!ok) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
        this.pendingRequests.delete(id);
      }
    };

    this.worker.onerror = (err: ErrorEvent) => {
      this.rejectAllPending(new Error(`Crypto Worker crashed: ${err.message || 'Unknown error'}`));
      this.terminate();
    };

    this.worker.onmessageerror = (err) => {
      this.rejectAllPending(new Error('Crypto Worker serialization failed'));
    };
  }

  private rejectAllPending(error: Error) {
    for (const [id, req] of this.pendingRequests) {
      clearTimeout(req.timeoutId);
      req.reject(error);
    }
    this.pendingRequests.clear();
    this.isWorking = false;
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.rejectAllPending(new Error('Worker terminated'));
  }

  async buildRegister(
    accountId: string,
    password: string,
    kdfMode: number,
    schemaVer: number,
  ): Promise<{
    registerBody: RegisterRequest;
    recoveryKey: string;
  }> {
    if (this.isWorking) {
      throw new Error('Crypto worker is busy. Please wait.');
    }
    this.isWorking = true;
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
    const passwordBuffer = pwdBytes.buffer;
    password = '';

    try {
      const res = await this.postToWorker<{
        registerBody: RegisterRequest;
        recoveryKey: string;
      }>('REGISTER', { accountId, passwordBuffer, kdfMode, schemaVer }, [passwordBuffer]);
      return res;
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
        pwdBytes = null;
      }
      this.isWorking = false;
    }
  }

  async buildLogin(password: string, preLogin: PreLoginResponse): Promise<{ verifier: string }> {
    if (this.isWorking) {
      throw new Error('Crypto worker is busy. Please wait.');
    }
    this.isWorking = true;
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
    const passwordBuffer = pwdBytes.buffer;
    password = '';
    try {
      const res = await this.postToWorker<{ verifier: string }>(
        'LOGIN',
        {
          passwordBuffer,
          saltB64: preLogin.S_Pwd,
          kdfMode: preLogin.KdfMode,
        },
        [passwordBuffer],
      );
      return res;
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
        pwdBytes = null;
      }
      this.isWorking = false;
    }
  }

  async encryptEntry(
    plaintextOrBuffer: string | ArrayBuffer,
    aadB64: string,
    domain?: string,
  ): Promise<{ DomainTag: string; Payload: { Nonce: string; CipherText: string; Tag: string } }> {
    let ptBytes: Uint8Array | null;
    let plaintextBuffer: ArrayBuffer;

    if (typeof plaintextOrBuffer === 'string') {
      ptBytes = new TextEncoder().encode(plaintextOrBuffer);
      plaintextBuffer = ptBytes.buffer as ArrayBuffer;
    } else {
      ptBytes = null;
      plaintextBuffer = plaintextOrBuffer;
    }

    try {
      return await this.postToWorker<EncryptedEntryResult>(
        'ENCRYPT_ENTRY',
        { plaintextBuffer, aadB64, domain },
        [plaintextBuffer],
      );
    } finally {
      if (ptBytes) {
        try {
          ptBytes.fill(0);
        } catch {}
        ptBytes = null;
      }
    }
  }

  async decryptEntry(dto: EncryptedValueDto, aadB64: string): Promise<string> {
    const res = await this.postToWorker<DecryptEntryResult>('DECRYPT_ENTRY', {
      dto,
      aadB64,
    });
    const ptBytes = new Uint8Array(res.ptBuffer);
    try {
      return new TextDecoder().decode(ptBytes);
    } finally {
      try {
        ptBytes.fill(0);
      } catch {}
    }
  }

  async finalizeLogin(
    mkWrapPwd: EncryptedValueDto,
    schemaVer: number,
    accountId: string,
  ): Promise<void> {
    await this.postToWorker('FINALIZE_LOGIN', {
      MkWrapPwd: mkWrapPwd,
      CryptoSchemaVer: schemaVer,
      AccountId: accountId,
    });
  }

  async benchmarkKdf(password: string, salt: Uint8Array, kdfMode: number): Promise<number> {
    const pwdBytes = new TextEncoder().encode(password);
    const passwordBuffer = pwdBytes.buffer;
    const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength);

    try {
      const res = await this.postToWorker<{ duration: number }>(
        'BENCHMARK_KDF',
        {
          passwordBuffer,
          saltBuffer,
          kdfMode,
        },
        [passwordBuffer, saltBuffer],
      );
      return res.duration;
    } catch (err: any) {
      throw err;
    } finally {
      try {
        pwdBytes.fill(0);
      } catch {}
    }
  }

  async clearKeys(forceTerminate = false): Promise<void> {
    if (this.isWorking && !forceTerminate) {
      throw new Error('Crypto worker is busy');
    }

    try {
      await this.postToWorker('CLEAR_KEYS', {});
    } catch {}

    if (forceTerminate) {
      this.terminate();
    }
  }

  async checkStatus(): Promise<boolean> {
    try {
      const res = await this.postToWorker<CheckStatusResponse>('CHECK_STATUS', {});
      return res.isUnlocked;
    } catch {
      return false;
    }
  }

  async unlock(
    password: string,
    bundle: {
      S_Pwd: string;
      KdfMode: number;
      MkWrapPwd: EncryptedValueDto;
      CryptoSchemaVer: number;
      AccountId: string;
    },
  ): Promise<void> {
    if (this.isWorking) {
      throw new Error('Crypto worker is busy.');
    }
    this.isWorking = true;
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
    const passwordBuffer = pwdBytes.buffer;

    try {
      await this.postToWorker(
        'UNLOCK',
        {
          passwordBuffer,
          saltB64: bundle.S_Pwd,
          kdfMode: bundle.KdfMode,
          MkWrapPwd: bundle.MkWrapPwd,
          CryptoSchemaVer: bundle.CryptoSchemaVer,
          AccountId: bundle.AccountId,
        },
        [passwordBuffer],
      );
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
        pwdBytes = null;
      }
      this.isWorking = false;
    }
  }

  async deriveAdminVerifier(password: string, salt: string, kdfMode: number): Promise<string> {
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
    const passwordBuffer = pwdBytes.buffer;
    try {
      const res = await this.postToWorker<{ adminVerifier: string }>(
        'DERIVE_ADMIN_VERIFIER',
        { passwordBuffer, saltB64: salt, kdfMode },
        [passwordBuffer],
      );
      return res.adminVerifier;
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
      }
    }
  }

  async activatePasscode(
    password: string,
    masterSalt: string,
    masterKdfMode: number,
    passcode: string,
    accountId: string,
    mkWrapPwd: EncryptedValueDto,
    schemaVer: number,
  ): Promise<{ mkWrapLocal: EncryptedValueDto; sLocalB64: string }> {
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(password);
    let pinBytes: Uint8Array | null = new TextEncoder().encode(passcode);
    const passwordBuffer = pwdBytes.buffer;
    const passcodeBuffer = pinBytes.buffer;

    try {
      return await this.postToWorker<{ mkWrapLocal: EncryptedValueDto; sLocalB64: string }>(
        'ACTIVATE_PASSCODE',
        {
          passwordBuffer,
          masterSaltB64: masterSalt,
          masterKdfMode,
          passcodeBuffer,
          accountId,
          mkWrapPwd,
          schemaVer,
        },
        [passwordBuffer, passcodeBuffer],
      );
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
      }
      if (pinBytes) {
        try {
          pinBytes.fill(0);
        } catch {}
      }
    }
  }

  async unlockViaPasscode(
    passcode: string,
    saltB64: string,
    mkWrapLocal: EncryptedValueDto,
    accountId: string,
  ): Promise<void> {
    let pinBytes: Uint8Array | null = new TextEncoder().encode(passcode);
    const passcodeBuffer = pinBytes.buffer;
    try {
      await this.postToWorker(
        'UNLOCK_VIA_PASSCODE',
        { passcodeBuffer, saltB64, mkWrapLocal, accountId },
        [passcodeBuffer],
      );
    } finally {
      if (pinBytes) {
        try {
          pinBytes.fill(0);
        } catch {}
      }
    }
  }

  async executeRekey(
    currentPassword: string,
    currentSalt: string,
    currentKdfMode: number,
    newPassword: string,
    accountId: string,
    currentMkWrapPwd: EncryptedValueDto,
    schemaVer: number,
    newKdfMode: number,
  ): Promise<{
    newVerifier: string;
    newAdminVerifier: string;
    newS_Pwd: string;
    newMkWrapPwd: EncryptedValueDto;
  }> {
    let curPwdBytes: Uint8Array | null = new TextEncoder().encode(currentPassword);
    let newPwdBytes: Uint8Array | null = new TextEncoder().encode(newPassword);
    const currentPasswordBuffer = curPwdBytes.buffer;
    const newPasswordBuffer = newPwdBytes.buffer;

    try {
      return await this.postToWorker<{
        newVerifier: string;
        newAdminVerifier: string;
        newS_Pwd: string;
        newMkWrapPwd: EncryptedValueDto;
      }>(
        'EXECUTE_REKEY',
        {
          currentPasswordBuffer,
          currentSaltB64: currentSalt,
          currentKdfMode,
          newPasswordBuffer,
          accountId,
          currentMkWrapPwd,
          schemaVer,
          newKdfMode,
        },
        [currentPasswordBuffer, newPasswordBuffer],
      );
    } finally {
      if (curPwdBytes) {
        try {
          curPwdBytes.fill(0);
        } catch {}
      }
      if (newPwdBytes) {
        try {
          newPwdBytes.fill(0);
        } catch {}
      }
    }
  }

  async recover(
    recoveryKey: string,
    newPassword: string,
    accountId: string,
    mkWrapRk: EncryptedValueDto,
    schemaVer: number,
    newKdfMode: number,
  ): Promise<{
    rkVerifier: string;
    newVerifier: string;
    newAdminVerifier: string;
    newRkVerifier: string;
    newS_Pwd: string;
    newKdfMode: number;
    newMkWrapPwd: EncryptedValueDto;
    newMkWrapRk: EncryptedValueDto;
    cryptoSchemaVer: number;
    newRecoveryKey: string;
  }> {
    let pwdBytes: Uint8Array | null = new TextEncoder().encode(newPassword);
    const newPasswordBuffer = pwdBytes.buffer;
    try {
      return await this.postToWorker<any>(
        'RECOVER',
        {
          recoveryKeyB64: recoveryKey,
          newPasswordBuffer,
          accountId,
          mkWrapRk,
          schemaVer,
          newKdfMode,
        },
        [newPasswordBuffer],
      );
    } finally {
      if (pwdBytes) {
        try {
          pwdBytes.fill(0);
        } catch {}
      }
    }
  }

  private postToWorker<T>(type: string, payload: any, transfer?: Transferable[]): Promise<T> {
    if (!this.worker) {
      this.initWorker();
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.get(id)?.reject(new Error('Crypto operation timed out'));
          this.pendingRequests.delete(id);
        }
      }, 60000);

      this.pendingRequests.set(id, { resolve, reject, timeoutId });
      try {
        this.worker!.postMessage({ id, payload: { type, payload } }, transfer || []);
      } catch (e) {
        reject(e);
      }
    });
  }
}
