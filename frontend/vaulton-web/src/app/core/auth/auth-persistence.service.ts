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

export interface LocalPasscodeWrap {
  AccountId: string;
  MkWrapLocal: EncryptedValueDto;
  S_Local: string;
}

const STORAGE_KEY = 'vaulton_bundle';
const ID_KEY = 'vaulton_last_id';
const PASSCODE_KEY = 'vaulton_local_passcode';
const PROMPT_KEY = 'vaulton_passcode_prompted';

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

  async saveLocalPasscode(wrap: LocalPasscodeWrap): Promise<void> {
    await set(PASSCODE_KEY, wrap);
  }

  async getLocalPasscode(): Promise<LocalPasscodeWrap | undefined> {
    return await get<LocalPasscodeWrap>(PASSCODE_KEY);
  }

  async clearLocalPasscode(): Promise<void> {
    await del(PASSCODE_KEY);
  }

  async setPasscodePrompted(prompted: boolean): Promise<void> {
    await set(PROMPT_KEY, prompted);
  }

  async isPasscodePrompted(): Promise<boolean> {
    return (await get<boolean>(PROMPT_KEY)) ?? false;
  }

  async clearAll(): Promise<void> {
    await clear();
  }
}
