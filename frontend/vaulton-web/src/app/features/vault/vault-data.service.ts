import { Injectable, signal, inject, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VaultApiService } from '../../core/api/vault-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { VaultCryptoService } from '../../core/vault/vault-crypto.service';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class VaultDataService {
  private readonly api = inject(VaultApiService);
  private readonly vaultCrypto = inject(VaultCryptoService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);

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
          const accountId = this.authState.accountId();
          if (!accountId) throw new Error('Account ID missing');

          const data = await this.vaultCrypto.decryptEntry(
            entry.Payload,
            `${accountId}:${entry.Id}`,
          );

          decryptedRecords.push({
            id: entry.Id,
            ...data,
          });
        } catch (e: any) {
          console.error(`Failed to decrypt entry ${entry.Id}`, e);
          // I'm using console.error here to avoid spamming toast notifications
        }
      }

      this.records.set(decryptedRecords);
      if (decryptedRecords.length < encryptedEntries.length) {
        this.toast.trigger('Some entries could not be decrypted', false);
      }
    } catch (e: any) {
      console.error('Failed to load vault', e);
      this.toast.trigger('Failed to load vault data', false);
    } finally {
      this.isLoading.set(false);
    }
  }

  async addRecord(input: VaultRecordInput) {
    try {
      const { EntryId } = await firstValueFrom(this.api.preCreate());

      const accountId = this.authState.accountId();
      if (!accountId) throw new Error('Account ID missing');

      const encrypted = await this.vaultCrypto.encryptEntry(input, `${accountId}:${EntryId}`);

      await firstValueFrom(
        this.api.create({
          EntryId,
          Payload: encrypted.Payload,
        }),
      );

      const newRecord: VaultRecord = {
        id: EntryId,
        ...input,
      };
      this.records.update((prev) => [newRecord, ...prev]);
      this.toast.trigger('Entry saved');
    } catch (e: any) {
      console.error('Failed to add record', e);
      this.toast.trigger('Failed to save entry', false);
      throw e;
    }
  }

  async updateRecord(id: string, input: VaultRecordInput) {
    try {
      const accountId = this.authState.accountId();
      if (!accountId) throw new Error('Account ID missing');

      const encrypted = await this.vaultCrypto.encryptEntry(input, `${accountId}:${id}`);

      await firstValueFrom(
        this.api.update(id, {
          Payload: encrypted.Payload,
        }),
      );

      this.records.update((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)));
      this.toast.trigger('Entry updated');
    } catch (e: any) {
      console.error('Failed to update record', e);
      this.toast.trigger('Failed to update entry', false);
      throw e;
    }
  }

  async deleteRecord(id: string) {
    const previous = this.records();
    this.records.update((prev) => prev.filter((r) => r.id !== id));

    try {
      await firstValueFrom(this.api.delete(id));
      this.toast.trigger('Entry deleted');
    } catch (e: any) {
      console.error('Failed to delete record', e);
      this.records.set(previous);
      this.toast.trigger('Failed to delete entry', false);
      throw e;
    }
  }
}
