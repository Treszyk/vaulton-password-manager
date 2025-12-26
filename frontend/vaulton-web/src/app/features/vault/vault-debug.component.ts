import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { VaultApiService } from '../../core/api/vault-api.service';
import { VaultCryptoService, PlainEntry } from '../../core/vault/vault-crypto.service';
import { MkStateService } from '../../core/vault/mk-state.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { EntryDto } from '../../core/crypto/worker/crypto.worker.types';

type DebugEntry = {
  dto: EntryDto;
  plain: PlainEntry | null;
  decrypting: boolean;
};

@Component({
  standalone: true,
  selector: 'app-vault-debug',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Vault Enclave Debug</h2>
          <div class="flex items-center gap-2">
            <p class="text-white/40 text-sm">Testing E2E Encryption & Zero-Knowledge Backend</p>
            <span
              class="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-bold uppercase tracking-widest"
              >Debug Mode</span
            >
          </div>
        </div>
        <div class="flex gap-3">
          <button
            *ngIf="!mk.isReady()"
            (click)="unlock()"
            class="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <span>Unlock Enclave</span>
          </button>
          <button
            (click)="list()"
            [disabled]="isBusy()"
            class="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <span>{{ isBusy() ? 'Refreshing...' : 'Refresh List' }}</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="space-y-6">
          <div
            class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl"
          >
            <h3 class="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              {{ editingId() ? 'Update Entry' : 'Create New Entry' }}
            </h3>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                  >Title</label
                >
                <input
                  [(ngModel)]="form.title"
                  class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                  placeholder="e.g. My Google Account"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                  >Website / Domain (Stored in Plaintext)</label
                >
                <input
                  [(ngModel)]="form.website"
                  class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                  placeholder="google.com"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                    >Username</label
                  >
                  <input
                    [(ngModel)]="form.username"
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                    >Password</label
                  >
                  <input
                    type="password"
                    [(ngModel)]="form.password"
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                  >Notes</label
                >
                <textarea
                  [(ngModel)]="form.notes"
                  rows="3"
                  class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all resize-none"
                ></textarea>
              </div>

              <div class="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-white/40 font-bold uppercase">AAD Binding</span>
                  <span class="text-[10px] text-emerald-400 font-bold uppercase">Automatic</span>
                </div>
                <div class="text-[10px] text-blue-400 truncate font-mono">
                  vaulton:v1:entry:{{ state.accountId() || 'GUEST-DEBUG' }}:{{
                    entryIdPreview() || 'PENDING-ID'
                  }}
                </div>
              </div>

              <div class="flex gap-3 mt-4">
                <button
                  *ngIf="editingId()"
                  (click)="cancelEdit()"
                  class="flex-1 bg-white/10 text-white hover:bg-white/20 font-bold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  [disabled]="isBusy() || !mk.isReady()"
                  (click)="submit()"
                  class="flex-1 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-xl transition-all shadow-lg"
                >
                  {{
                    isBusy()
                      ? 'Processing...'
                      : editingId()
                      ? 'Update Entry'
                      : 'Securely Save Entry'
                  }}
                </button>
              </div>
            </div>
          </div>

          <div
            *ngIf="result()"
            class="bg-black/60 border border-white/10 rounded-2xl p-4 animate-in slide-in-from-top-4"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold text-white/40 uppercase">Logs</span>
              <button (click)="result.set('')" class="text-[10px] text-white/20 hover:text-white">
                Clear
              </button>
            </div>
            <pre
              class="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all"
              >{{ result() || 'Systems ready. Awaiting command...' }}</pre
            >
          </div>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <div
            *ngIf="entries().length === 0"
            class="bg-white/[0.04] border border-dashed border-white/20 rounded-2xl py-20 flex flex-col items-center justify-center text-white/40"
          >
            <div
              class="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-4 opacity-50"
            >
              <span class="text-2xl font-bold">?</span>
            </div>
            <p class="text-sm font-medium">No entries found. Refresh to load from backend.</p>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div
              *ngFor="let e of entries()"
              class="bg-white/[0.06] border border-white/10 rounded-2xl p-5 transition-all hover:bg-white/[0.08] group relative"
            >
              <div class="flex items-start justify-between mb-4">
                <div class="space-y-1 w-full mr-4">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-white font-semibold">{{
                      e.plain?.title || 'Locked Entry'
                    }}</span>
                    <span
                      *ngIf="e.plain"
                      class="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-bold tracking-widest"
                      >Decrypted</span
                    >
                  </div>
                  <div class="flex flex-col gap-1 text-[10px] text-white/40 font-mono">
                    <div class="flex items-center gap-2">
                      <span class="text-white/20 uppercase font-bold">ID:</span>
                      <span class="text-blue-400/80">{{ e.dto.Id }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-white/20 uppercase font-bold">TAG:</span>
                      <span class="text-amber-400/80 truncate w-full">{{ e.dto.DomainTag }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button
                    *ngIf="e.plain"
                    (click)="edit(e)"
                    class="bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-indigo-500/20"
                  >
                    Edit
                  </button>
                  <button
                    *ngIf="!e.plain"
                    [disabled]="e.decrypting || !mk.isReady()"
                    (click)="decrypt(e)"
                    class="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-blue-500/20"
                  >
                    {{ e.decrypting ? 'Decrypting...' : 'Decrypt' }}
                  </button>
                  <button
                    (click)="del(e.dto.Id)"
                    class="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div
                *ngIf="e.plain"
                class="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2"
              >
                <div class="bg-black/40 rounded-xl p-3 border border-white/5">
                  <label class="block text-[10px] font-bold text-white/20 uppercase mb-1"
                    >Website</label
                  >
                  <div class="text-blue-400 text-sm font-medium">{{ e.plain.website }}</div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="bg-black/40 rounded-xl p-3 border border-white/5">
                    <label class="block text-[10px] font-bold text-white/20 uppercase mb-1"
                      >Username</label
                    >
                    <div class="text-white text-sm">{{ e.plain.username }}</div>
                  </div>
                  <div class="bg-black/40 rounded-xl p-3 border border-white/5">
                    <label class="block text-[10px] font-bold text-white/20 uppercase mb-1"
                      >Password</label
                    >
                    <div class="text-white text-sm font-mono">{{ e.plain.password }}</div>
                  </div>
                </div>
                <div class="bg-black/40 rounded-xl p-3 border border-white/5" *ngIf="e.plain.notes">
                  <label class="block text-[10px] font-bold text-white/20 uppercase mb-1"
                    >Notes</label
                  >
                  <div class="text-white text-sm whitespace-pre-wrap">{{ e.plain.notes }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VaultDebugComponent {
  entries = signal<DebugEntry[]>([]);
  isBusy = signal(false);
  result = signal('');
  entryIdPreview = signal('');
  editingId = signal<string | null>(null);

  form = {
    title: '',
    website: '',
    username: '',
    password: '',
    notes: '',
  };

  constructor(
    private readonly api: VaultApiService,
    private readonly crypto: VaultCryptoService,
    public readonly mk: MkStateService,
    public readonly state: AuthStateService
  ) {}

  async unlock() {
    try {
      this.isBusy.set(true);
      await this.mk.ensureKey();
      this.result.set('Enclave UNLOCKED');
    } catch (e: any) {
      this.result.set(`Unlock FAILED: ${e.message}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  async list() {
    try {
      this.isBusy.set(true);
      const items = await firstValueFrom(this.api.list(0, 50));
      const wrapped = items.map((dto) => ({ dto, plain: null, decrypting: false }));
      this.entries.set(wrapped);
      this.result.set(`Fetch OK (${items.length})`);
    } catch (e: any) {
      this.result.set(`Fetch FAILED\n${this.pretty(e)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  edit(entry: DebugEntry) {
    if (!entry.plain) return;
    this.form = { ...entry.plain };
    this.editingId.set(entry.dto.Id);
    this.entryIdPreview.set(entry.dto.Id);
    this.result.set(`Editing Entry: ${entry.dto.Id}`);
  }

  async submit() {
    if (this.editingId()) {
      await this.update();
    } else {
      await this.create();
    }
  }

  async create() {
    if (!this.validate()) return;

    try {
      this.isBusy.set(true);

      this.result.set('Allocating Entry ID...');
      const pre = await firstValueFrom(this.api.preCreate());
      const entryId = pre.EntryId;
      this.entryIdPreview.set(entryId);

      const sealed = await this.sealEntry(entryId);

      const r = await firstValueFrom(this.api.create({ ...sealed, EntryId: entryId }));

      this.result.set(`Save OK\nEntryId: ${r.EntryId}\nBound to: ${this.getAad(entryId)}`);
      this.resetForm();
      await this.list();
    } catch (e: any) {
      this.result.set(`Create FAILED: ${e.message}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  async update() {
    if (!this.validate()) return;

    const entryId = this.editingId();
    if (!entryId) return;

    try {
      this.isBusy.set(true);

      const sealed = await this.sealEntry(entryId);

      await firstValueFrom(this.api.update(entryId, sealed));
      this.result.set(`Update OK\nEntryId: ${entryId}\nBound to: ${this.getAad(entryId)}`);

      this.resetForm();
      await this.list();
    } catch (e: any) {
      this.result.set(`Update FAILED: ${e.message}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  private validate(): boolean {
    if (!this.form.title || !this.form.password) {
      this.result.set('Validation FAILED: Title and Password required');
      return false;
    }
    return true;
  }

  private async sealEntry(entryId: string) {
    const plain: PlainEntry = {
      title: this.form.title,
      website: this.form.website,
      username: this.form.username,
      password: this.form.password,
      notes: this.form.notes,
    };

    const aad = this.getAad(entryId);
    this.result.set(`Encrypting...\nAAD: ${aad}`);

    return await this.crypto.encryptEntry(plain, this.form.website || 'default', aad);
  }

  private getAad(entryId: string): string {
    const accountId = this.state.accountId() || 'GUEST-DEBUG';
    return `vaulton:v1:entry:${accountId}:${entryId}`;
  }

  async decrypt(entry: DebugEntry) {
    try {
      this.entries.update((list) => {
        const item = list.find((i) => i.dto.Id === entry.dto.Id);
        if (item) item.decrypting = true;
        return [...list];
      });

      const accountId = this.state.accountId() || 'GUEST-DEBUG';
      const boundAad = `vaulton:v1:entry:${accountId}:${entry.dto.Id}`;

      const res = await this.crypto.decryptEntry(entry.dto.Payload, boundAad);

      this.entries.update((list) => {
        const item = list.find((i) => i.dto.Id === entry.dto.Id);
        if (item) {
          item.plain = res;
          item.decrypting = false;
        }
        return [...list];
      });

      this.result.set(`Decryption OK\nAccount Binding Validated`);
    } catch (e: any) {
      this.result.set(`Decryption FAILED: ${e.message}`);
      this.entries.update((list) => {
        const item = list.find((i) => i.dto.Id === entry.dto.Id);
        if (item) item.decrypting = false;
        return [...list];
      });
    }
  }

  async del(id: string) {
    try {
      this.isBusy.set(true);
      await firstValueFrom(this.api.delete(id));
      this.result.set(`Delete OK\nID: ${id}`);
      await this.list();
    } catch (e: any) {
      this.result.set(`Delete FAILED: ${this.pretty(e)}`);
    } finally {
      this.isBusy.set(false);
    }
  }

  private resetForm() {
    this.form = { title: '', website: '', username: '', password: '', notes: '' };
    this.editingId.set(null);
    this.entryIdPreview.set('');
  }

  cancelEdit() {
    this.resetForm();
    this.result.set('Edit Cancelled');
  }

  private pretty(e: any): string {
    return JSON.stringify({ status: e?.status, error: e?.error }, null, 2);
  }
}
