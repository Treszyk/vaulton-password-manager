import { Injectable } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';
import { MkStateService } from './mk-state.service';
import { EncryptedEntryResult, EncryptedValueDto } from '../crypto/worker/crypto.worker.types';
import { bytesToB64 } from '../crypto/b64';

export type PlainEntry = {
  title: string;
  website: string;
  username: string;
  password: string;
  notes: string;
};

@Injectable({ providedIn: 'root' })
export class VaultCryptoService {
  constructor(
    private readonly authCrypto: AuthCryptoService,
    private readonly mk: MkStateService
  ) {}

  async encryptEntry(
    entry: PlainEntry,
    domain: string,
    aadStr: string
  ): Promise<EncryptedEntryResult> {
    await this.mk.ensureKey();
    const json = JSON.stringify(entry);
    const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));

    const ptBytes = new TextEncoder().encode(json);
    try {
      return await this.authCrypto.encryptEntry(ptBytes.buffer, aadB64, domain);
    } finally {
      try {
        ptBytes.fill(0);
      } catch {}
    }
  }

  async decryptEntry(dto: EncryptedValueDto, aadStr: string): Promise<PlainEntry> {
    await this.mk.ensureKey();
    const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));
    const json = await this.authCrypto.decryptEntry(dto, aadB64);
    return JSON.parse(json) as PlainEntry;
  }
}
