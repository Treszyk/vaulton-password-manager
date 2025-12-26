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
