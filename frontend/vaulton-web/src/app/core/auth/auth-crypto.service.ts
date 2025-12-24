import { Injectable } from '@angular/core';
import { bytesToB64 } from '../crypto/b64';
import { zeroize } from '../crypto/zeroize';
import { encryptSplit } from '../crypto/aesgcm-split';
import { hkdfAesGcm256Key, hkdfVerifierB64 } from '../crypto/hkdf';
import type { KdfProvider } from '../crypto/kdf/kdf';
import { Pbkdf2KdfProvider } from '../crypto/kdf/pbkdf2-kdf';

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
  private readonly kdf: KdfProvider = new Pbkdf2KdfProvider();

  async buildRegister(
    accountId: string,
    password: string,
    kdfMode: number
  ): Promise<{
    registerBody: RegisterRequest;
    loginBodyForSwagger: string;
  }> {
    const sPwd = crypto.getRandomValues(new Uint8Array(16));
    const schemaVer = 1;
    // TODO: backend should return schemaVersion in /auth/pre-register so we can build this string dynamically
    let aad = new TextEncoder().encode(`vaulton:mk-wrap-pwd:schema${schemaVer}:${accountId}`);

    let mkBytes: Uint8Array | null = null;

    try {
      const hkdfBaseKey = await this.kdf.deriveHkdfBaseKey(password, sPwd, kdfMode);
      const verifierB64 = await hkdfVerifierB64(hkdfBaseKey, 'vaulton/verifier');
      const kekKey = await hkdfAesGcm256Key(hkdfBaseKey, 'vaulton/kek');

      mkBytes = crypto.getRandomValues(new Uint8Array(32));
      const wrap = await encryptSplit(kekKey, mkBytes, aad);
      zeroize(mkBytes);
      mkBytes = null;

      const mkWrapPwd: EncryptedValueDto = {
        Nonce: bytesToB64(wrap.Nonce),
        CipherText: bytesToB64(wrap.CipherText),
        Tag: bytesToB64(wrap.Tag),
      };

      zeroize(wrap.Nonce);
      zeroize(wrap.CipherText);
      zeroize(wrap.Tag);

      const sPwdB64 = bytesToB64(sPwd);
      const registerBody: RegisterRequest = {
        AccountId: accountId,
        Verifier: verifierB64,
        S_Pwd: sPwdB64,
        KdfMode: kdfMode,
        MKWrapPwd: mkWrapPwd,
        MKWrapRk: null,
        CryptoSchemaVer: schemaVer,
      };

      const loginBodyForSwagger = JSON.stringify(
        { AccountId: accountId, Verifier: verifierB64 },
        null,
        2
      );
      return { registerBody, loginBodyForSwagger };
    } finally {
      zeroize(aad);
      zeroize(sPwd);
      if (mkBytes) zeroize(mkBytes);
    }
  }
}
