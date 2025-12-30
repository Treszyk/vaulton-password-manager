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
    await set(`${PASSCODE_KEY}_${wrap.AccountId}`, wrap);
  }

  async getLocalPasscode(accountId: string): Promise<LocalPasscodeWrap | undefined> {
    return await get<LocalPasscodeWrap>(`${PASSCODE_KEY}_${accountId}`);
  }

  async clearLocalPasscode(accountId: string): Promise<void> {
    await del(`${PASSCODE_KEY}_${accountId}`);
  }

  async setPasscodePrompted(accountId: string, prompted: boolean): Promise<void> {
    await set(`${PROMPT_KEY}_${accountId}`, prompted);
  }

  async isPasscodePrompted(accountId: string): Promise<boolean> {
    return (await get<boolean>(`${PROMPT_KEY}_${accountId}`)) ?? false;
  }

  async clearAll(): Promise<void> {
    await clear();
  }

  async clearUserData(accountId: string): Promise<void> {
    await del(STORAGE_KEY);

    await del(`${PASSCODE_KEY}_${accountId}`);
    await del(`${PROMPT_KEY}_${accountId}`);

    const lastId = await this.getAccountId();
    if (lastId === accountId) {
      await del(ID_KEY);
    }
  }
}
