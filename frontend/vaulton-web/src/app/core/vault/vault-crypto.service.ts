import { Injectable } from '@angular/core';
import { AuthCryptoService } from '../auth/auth-crypto.service';
import { MkStateService } from './mk-state.service';
import { CreateVaultEntryRequest, EncryptedValueDto } from '../crypto/worker/crypto.worker.types';
import { bytesToB64 } from '../crypto/b64';

export type PlainEntry = { title: string; username: string; password: string; notes: string };

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
  ): Promise<CreateVaultEntryRequest> {
    await this.mk.ensureKey();
    const json = JSON.stringify(entry);
    const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));
    return await this.authCrypto.encryptEntry(json, aadB64, domain);
  }

  async decryptEntry(dto: EncryptedValueDto, aadStr: string): Promise<PlainEntry> {
    await this.mk.ensureKey();
    const aadB64 = bytesToB64(new TextEncoder().encode(aadStr));
    const json = await this.authCrypto.decryptEntry(dto, aadB64);
    return JSON.parse(json) as PlainEntry;
  }
}
