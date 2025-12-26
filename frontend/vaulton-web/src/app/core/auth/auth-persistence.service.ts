import { Injectable } from '@angular/core';
import { get, set, del, clear } from 'idb-keyval';
import { EncryptedValueDto } from '../crypto/worker/crypto.worker.types';

export interface VaultBundle {
  S_Pwd: string;
  KdfMode: number;
  CryptoSchemaVer: number;
  MkWrapPwd: EncryptedValueDto;
  MkWrapRk: EncryptedValueDto | null;
  AccountId: string;
}

const STORAGE_KEY = 'vaulton_bundle';

@Injectable({ providedIn: 'root' })
export class AuthPersistenceService {
  async saveBundle(bundle: VaultBundle): Promise<void> {
    await set(STORAGE_KEY, bundle);
  }

  async getBundle(): Promise<VaultBundle | undefined> {
    return await get<VaultBundle>(STORAGE_KEY);
  }

  async clearBundle(): Promise<void> {
    await del(STORAGE_KEY);
  }

  async hasBundle(): Promise<boolean> {
    const bundle = await this.getBundle();
    return !!bundle;
  }
}
