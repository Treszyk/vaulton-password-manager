import type { EncryptedValueDto, RegisterRequest } from '../../crypto/worker/crypto.worker.types';

export interface TokenResponse {
  Token: string;
  MkWrapPwd?: EncryptedValueDto;
  MkWrapRk?: EncryptedValueDto | null;
}

export interface MeResponse {
  accountId: string;
}

export interface LoginRequest {
  AccountId: string;
  Verifier: string;
}

export interface PreLoginResponse {
  S_Pwd: string;
  KdfMode: number;
  CryptoSchemaVer: number;
}

export interface PreLoginRawResponse {
  S_Pwd?: string;
  s_Pwd?: string;
  KdfMode?: number;
  kdfMode?: number;
  CryptoSchemaVer?: number;
  cryptoSchemaVer?: number;
}

export interface PreRegisterResponse {
  AccountId: string;
  CryptoSchemaVer: number;
}

export interface WrapsRequest {
  AdminVerifier: string;
}

export interface WrapsResponse {
  MkWrapPwd: EncryptedValueDto;
  MkWrapRk: EncryptedValueDto;
  KdfMode: number;
  CryptoSchemaVer: number;
}

export interface RecoveryWrapsRequest {
  AccountId: string;
  RkVerifier: string;
}

export interface RecoverRequest {
  AccountId: string;
  RkVerifier: string;
  NewVerifier: string;
  NewAdminVerifier: string;
  NewRkVerifier: string;
  NewS_Pwd: string;
  NewKdfMode: number;
  NewMkWrapPwd: EncryptedValueDto;
  NewMkWrapRk: EncryptedValueDto;
  CryptoSchemaVer: number;
}

export interface ChangePasswordRequest {
  AdminVerifier: string;
  NewVerifier: string;
  NewAdminVerifier: string;
  NewS_Pwd: string;
  NewKdfMode: number;
  NewMkWrapPwd: EncryptedValueDto;
  NewMkWrapRk: EncryptedValueDto | null;
  NewRkVerifier: string | null;
  CryptoSchemaVer: number;
}

export type { RegisterRequest, EncryptedValueDto };
