import { Injectable, signal, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VaultApiService } from '../../core/api/vault-api.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';

@Injectable({ providedIn: 'root' })
export class VaultDataService {
  private readonly api = inject(VaultApiService);
  private readonly crypto = inject(AuthCryptoService);

  readonly records = signal<VaultRecord[]>([]);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      if (!this.crypto.isUnlocked()) {
        this.records.set([]);
      }
    });
  }

  async loadRecords() {
    this.isLoading.set(true);
    try {
      const encryptedEntries = await firstValueFrom(this.api.list());
      const decryptedRecords: VaultRecord[] = [];

      for (const entry of encryptedEntries) {
        try {
          const aadB64 = btoa(entry.Id);
          const json = await this.crypto.decryptEntry(entry.Payload, aadB64);
          const data = JSON.parse(json);

          decryptedRecords.push({
            id: entry.Id,
            ...data,
          });
        } catch (e) {}
      }

      this.records.set(decryptedRecords);
    } catch (e) {
    } finally {
      this.isLoading.set(false);
    }
  }

  async addRecord(input: VaultRecordInput) {
    const { EntryId } = await firstValueFrom(this.api.preCreate());

    const plaintext = JSON.stringify(input);
    const aadB64 = btoa(EntryId);
    const domain = input.website;
    const encrypted = await this.crypto.encryptEntry(plaintext, aadB64, domain);

    await firstValueFrom(
      this.api.create({
        EntryId,
        DomainTag: encrypted.DomainTag,
        Payload: encrypted.Payload,
      })
    );

    const newRecord: VaultRecord = {
      id: EntryId,
      ...input,
    };
    this.records.update((prev) => [newRecord, ...prev]);
  }

  async deleteRecord(id: string) {
    const previous = this.records();
    this.records.update((prev) => prev.filter((r) => r.id !== id));

    try {
      await firstValueFrom(this.api.delete(id));
    } catch (e) {
      this.records.set(previous);
      throw e;
    }
  }
}
