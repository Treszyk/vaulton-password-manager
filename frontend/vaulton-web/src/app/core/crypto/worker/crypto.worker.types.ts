export type KdfMode = 1 | 2 | 3; // 1: Standard, 2: Hardened, 3: BalancedHardened (Local Only)

export interface EncryptedValueDto {
  Nonce: string;
  CipherText: string;
  Tag: string;
}

export interface RegisterRequest {
  AccountId: string;
  Verifier: string;
  AdminVerifier: string;
  S_Pwd: string;
  KdfMode: number;
  MKWrapPwd: EncryptedValueDto;
  MKWrapRk: EncryptedValueDto | null;
  CryptoSchemaVer: number;
}

export type WorkerRequest =
  | {
      type: 'REGISTER';
      payload: {
        accountId: string;
        passwordBuffer: ArrayBuffer;
        kdfMode: number;
        schemaVer: number;
      };
    }
  | { type: 'LOGIN'; payload: { passwordBuffer: ArrayBuffer; saltB64: string; kdfMode: number } }
  | {
      type: 'FINALIZE_LOGIN';
      payload: { MkWrapPwd: EncryptedValueDto; CryptoSchemaVer: number; AccountId: string };
    }
  | { type: 'CLEAR_KEYS' }
  | { type: 'CHECK_STATUS' }
  | {
      type: 'UNLOCK';
      payload: {
        passwordBuffer: ArrayBuffer;
        saltB64: string;
        kdfMode: number;
        MkWrapPwd: EncryptedValueDto;
        CryptoSchemaVer: number;
        AccountId: string;
      };
    }
  | {
      type: 'DERIVE_ADMIN_VERIFIER';
      payload: { passwordBuffer: ArrayBuffer; saltB64: string; kdfMode: number };
    }
  | {
      type: 'ENCRYPT_ENTRY';
      payload: { plaintextBuffer: ArrayBuffer; aadB64: string; domain?: string };
    }
  | { type: 'DECRYPT_ENTRY'; payload: { dto: EncryptedValueDto; aadB64: string } }
  | {
      type: 'BENCHMARK_KDF';
      payload: { passwordBuffer: ArrayBuffer; saltBuffer: ArrayBuffer; kdfMode: number };
    }
  | {
      type: 'ACTIVATE_PASSCODE';
      payload: {
        passwordBuffer: ArrayBuffer;
        masterSaltB64: string;
        masterKdfMode: number;
        passcodeBuffer: ArrayBuffer;
        accountId: string;
        mkWrapPwd: EncryptedValueDto;
        schemaVer: number;
      };
    }
  | {
      type: 'UNLOCK_VIA_PASSCODE';
      payload: {
        passcodeBuffer: ArrayBuffer;
        saltB64: string;
        mkWrapLocal: EncryptedValueDto;
        accountId: string;
      };
    }
  | {
      type: 'EXECUTE_REKEY';
      payload: {
        currentPasswordBuffer: ArrayBuffer;
        currentSaltB64: string;
        currentKdfMode: number;
        newPasswordBuffer: ArrayBuffer;
        accountId: string;
        currentMkWrapPwd: EncryptedValueDto;
        schemaVer: number;
        newKdfMode: number;
      };
    };

export interface WorkerResponseEnvelope<T> {
  id: string;
  ok: boolean;
  result?: T;
  error?: string;
}

export interface WorkerMessage<T> {
  id: string;
  payload: T;
}

export interface EncryptedEntryResult {
  DomainTag: string;
  Payload: EncryptedValueDto;
}

export interface DecryptEntryResult {
  ptBuffer: ArrayBuffer;
}

export interface CreateVaultEntryRequest {
  EntryId: string;
  DomainTag: string;
  Payload: EncryptedValueDto;
}

export interface EntryDto {
  Id: string;
  DomainTag: string;
  Payload: EncryptedValueDto;
}

export interface PreCreateEntryResponse {
  EntryId: string;
}

export interface UpdateVaultEntryRequest {
  DomainTag: string;
  Payload: EncryptedValueDto;
}

export interface CheckStatusResponse {
  isUnlocked: boolean;
}
