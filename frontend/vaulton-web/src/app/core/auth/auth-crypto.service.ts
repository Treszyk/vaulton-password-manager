import { Injectable } from '@angular/core';
import { CryptoWorkerFactory } from '../crypto/worker/crypto-worker.factory';

export type EncryptedValueDto = { Nonce: string; CipherText: string; Tag: string };

export type RegisterRequest = {
  AccountId: string;
  Verifier: string;
  S_Pwd: string;
  KdfMode: number;
  MKWrapPwd: EncryptedValueDto;
  MKWrapRk: null;
  CryptoSchemaVer: number;
};

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
    try {
      const res = await this.postToWorker<{
        registerBody: RegisterRequest;
        loginBodyForSwagger: string;
      }>('REGISTER', { accountId, password, kdfMode, schemaVer });
      return res;
    } finally {
      this.isWorking = false;
    }
  }

  private postToWorker<T>(type: string, payload: any): Promise<T> {
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
      }, 60000); // 60s timeout

      this.pendingRequests.set(id, { resolve, reject, timeoutId });
      this.worker!.postMessage({ id, payload: { type, payload } });
    });
  }
}
