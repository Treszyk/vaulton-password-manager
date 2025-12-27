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
const ID_KEY = 'vaulton_last_id';

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

  async saveAccountId(id: string): Promise<void> {
    await set(ID_KEY, id);
  }

  async getAccountId(): Promise<string | undefined> {
    return await get<string>(ID_KEY);
  }

  async clearAll(): Promise<void> {
    await clear();
  }
}
