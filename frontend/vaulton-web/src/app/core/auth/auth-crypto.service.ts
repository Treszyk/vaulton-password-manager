import { Injectable, signal } from '@angular/core';
import { CryptoWorkerFactory } from '../crypto/worker/crypto-worker.factory';
import type { PreLoginResponse } from '../api/auth-api.service';
import type {
  RegisterRequest,
  EncryptedValueDto,
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
  readonly isUnlocked = signal(false);

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
    schemaVer: number
  ): Promise<{
    registerBody: RegisterRequest;
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
        [passwordBuffer]
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
    domain?: string
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
      return await this.postToWorker<{
        DomainTag: string;
        Payload: { Nonce: string; CipherText: string; Tag: string };
      }>('ENCRYPT_ENTRY', { plaintextBuffer, aadB64, domain }, [plaintextBuffer]);
    } finally {
      if (ptBytes) {
        try {
          ptBytes.fill(0);
        } catch {}
        ptBytes = null;
      }
    }
  }

  async decryptEntry(
    dto: { Nonce: string; CipherText: string; Tag: string },
    aadB64: string
  ): Promise<string> {
    const res = await this.postToWorker<{ ptBuffer: ArrayBuffer }>('DECRYPT_ENTRY', {
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
    accountId: string
  ): Promise<void> {
    await this.postToWorker('FINALIZE_LOGIN', {
      MkWrapPwd: mkWrapPwd,
      CryptoSchemaVer: schemaVer,
      AccountId: accountId,
    });
    this.isUnlocked.set(true);
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
        [passwordBuffer, saltBuffer]
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

  async clearKeys(): Promise<void> {
    await this.postToWorker('CLEAR_KEYS', {});
    this.isUnlocked.set(false);
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
    }
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
        [passwordBuffer]
      );
      this.isUnlocked.set(true);
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
