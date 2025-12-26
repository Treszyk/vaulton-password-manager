import { Injectable } from '@angular/core';
import { CryptoWorkerFactory } from '../crypto/worker/crypto-worker.factory';
import type { PreLoginResponse } from '../api/auth-api.service';
import type { EncryptedValueDto, RegisterRequest } from '../crypto/worker/crypto.worker.types';

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

    this.worker.onerror = (err) => {
      console.error('Crypto Worker Error:', err);
      this.rejectAllPending(new Error('Crypto Worker crashed'));
      this.terminate();
    };

    this.worker.onmessageerror = (err) => {
      console.error('Crypto Worker Message Error:', err);
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
    loginBodyForSwagger: string;
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
        loginBodyForSwagger: string;
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

  async generateDebugVaultKey(): Promise<void> {
    await this.postToWorker('GENERATE_DEBUG_KEY', {});
  }

  async encryptEntry(
    plaintext: string,
    aadB64: string,
    domain?: string
  ): Promise<{ DomainTag: string; Payload: { Nonce: string; CipherText: string; Tag: string } }> {
    let ptBytes: Uint8Array | null = new TextEncoder().encode(plaintext);
    const plaintextBuffer = ptBytes.buffer;
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
      this.worker!.postMessage({ id, payload: { type, payload } }, transfer || []);
    });
  }
}
