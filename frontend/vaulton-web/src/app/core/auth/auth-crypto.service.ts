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
  private worker: Worker;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();

  constructor(private workerFactory: CryptoWorkerFactory) {
    this.worker = this.workerFactory.create();
    this.worker.onmessage = ({ data }: MessageEvent<{ id: string; payload: any }>) => {
      const { id, payload } = data;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        if (payload.type === 'ERROR') {
          pending.reject(new Error(payload.error));
        } else {
          pending.resolve(payload.payload);
        }
        this.pendingRequests.delete(id);
      }
    };
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
    return this.postToWorker('REGISTER', { accountId, password, kdfMode, schemaVer });
  }

  private postToWorker<T>(type: string, payload: any): Promise<T> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker.postMessage({ id, payload: { type, payload } });
    });
  }
}
