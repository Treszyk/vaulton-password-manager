import type { RegisterRequest } from '../../auth/auth-crypto.service';

export type RequestId = string;

export type WorkerMessage<T = unknown> = {
  id: RequestId;
  payload: T;
};

export type RegisterPayload = {
  accountId: string;
  password: string;
  kdfMode: number;
  schemaVer: number;
};

export type RegisterResult = {
  registerBody: RegisterRequest;
  loginBodyForSwagger: string;
};

export type WorkerRequest =
  | { type: 'REGISTER'; payload: RegisterPayload }
  | { type: 'LOGIN'; payload: { password: string; saltB64: string; kdfMode: number } };

export type WorkerResponseEnvelope<T = unknown> =
  | { id: string; ok: true; result: T }
  | { id: string; ok: false; error: string };
