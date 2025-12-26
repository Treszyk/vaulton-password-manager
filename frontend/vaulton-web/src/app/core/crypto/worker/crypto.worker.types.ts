export type RequestId = string;

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

export type FinalizeLoginRequest = {
  MkWrapPwd: EncryptedValueDto;
  CryptoSchemaVer: number;
  AccountId: string;
};

export type ClearKeysRequest = Record<string, never>;

export type CheckStatusResponse = {
  isUnlocked: boolean;
};

export type UnlockRequest = {
  MkWrapPwd: EncryptedValueDto;
  CryptoSchemaVer: number;
  AccountId: string;
} & LoginPayload; // Reuse passwordBuffer, saltB64, kdfMode

export type WorkerMessage<T = unknown> = {
  id: RequestId;
  payload: T;
};

export type RegisterPayload = {
  accountId: string;
  passwordBuffer: ArrayBuffer;
  kdfMode: number;
  schemaVer: number;
};

export type LoginPayload = {
  passwordBuffer: ArrayBuffer;
  saltB64: string;
  kdfMode: number;
};

export type RegisterResult = {
  registerBody: RegisterRequest;
  loginBodyForSwagger: string;
};

export type PlainEntry = {
  title: string;
  website: string;
  username: string;
  password: string;
  notes: string;
};

export type EncryptedEntryResult = {
  DomainTag: string;
  Payload: EncryptedValueDto;
};

export type CreateVaultEntryRequest = EncryptedEntryResult & {
  EntryId: string;
};

export type UpdateVaultEntryRequest = EncryptedEntryResult;

export type PreCreateEntryResponse = {
  EntryId: string;
};

export type EntryDto = {
  Id: string;
  DomainTag: string;
  Payload: EncryptedValueDto;
};

export type WorkerRequest =
  | { type: 'REGISTER'; payload: RegisterPayload }
  | { type: 'LOGIN'; payload: LoginPayload }
  | { type: 'FINALIZE_LOGIN'; payload: FinalizeLoginRequest }
  | { type: 'CLEAR_KEYS'; payload: ClearKeysRequest }
  | { type: 'CHECK_STATUS'; payload: Record<string, never> }
  | { type: 'UNLOCK'; payload: UnlockRequest }
  | { type: 'GENERATE_DEBUG_KEY'; payload: {} }
  | {
      type: 'ENCRYPT_ENTRY';
      payload: { plaintextBuffer: ArrayBuffer; aadB64: string; domain?: string };
    }
  | { type: 'DECRYPT_ENTRY'; payload: { dto: EncryptedValueDto; aadB64: string } }
  | { type: 'CREATE_VAULT_ENTRY'; payload: CreateVaultEntryRequest };

export type WorkerResponseEnvelope<T = unknown> =
  | { id: string; ok: true; result: T }
  | { id: string; ok: false; error: string };
