import { Injectable, signal, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VaultApiService } from '../../core/api/vault-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { VaultCryptoService } from '../../core/vault/vault-crypto.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';

@Injectable({ providedIn: 'root' })
export class VaultDataService {
  private readonly api = inject(VaultApiService);
  private readonly vaultCrypto = inject(VaultCryptoService);
  private readonly authState = inject(AuthStateService);

  readonly records = signal<VaultRecord[]>([]);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      if (!this.authState.isUnlocked()) {
        this.records.set([]);
      }
    });
  }

  clearData() {
    this.records.set([]);
  }

  async loadRecords() {
    this.isLoading.set(true);
    try {
      const encryptedEntries = await firstValueFrom(this.api.list());
      const decryptedRecords: VaultRecord[] = [];

      for (const entry of encryptedEntries) {
        try {
          const data = await this.vaultCrypto.decryptEntry(entry.Payload, entry.Id);

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
    const encrypted = await this.vaultCrypto.encryptEntry(input, input.website, EntryId);

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

  async updateRecord(id: string, input: VaultRecordInput) {
    const encrypted = await this.vaultCrypto.encryptEntry(input, input.website, id);

    await firstValueFrom(
      this.api.update(id, {
        DomainTag: encrypted.DomainTag,
        Payload: encrypted.Payload,
      })
    );

    this.records.update((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)));
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
