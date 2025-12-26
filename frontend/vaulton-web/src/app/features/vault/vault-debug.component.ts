import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { VaultApiService } from '../../core/api/vault-api.service';
import { VaultCryptoService, PlainEntry } from '../../core/vault/vault-crypto.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { EntryDto } from '../../core/crypto/worker/crypto.worker.types';
import { AuthApiService } from '../../core/api/auth-api.service';

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
      <!-- Locked Overlay -->
      <div
        *ngIf="isLocked()"
        class="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <div
          class="max-w-md w-full header-glass p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 pointer-events-none"
          ></div>

          <div class="text-center space-y-2">
            <div
              class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-inner"
            >
              <span class="text-3xl">🔒</span>
            </div>
            <h2 class="text-2xl font-bold text-white tracking-tight">Vault Locked</h2>
            <p class="text-white/40 text-sm">Your session is active, but your keys are locked.</p>
          </div>

          <div class="space-y-4">
            <div class="space-y-1">
              <label
                class="block text-xs font-semibold text-white/60 uppercase tracking-widest pl-1"
                >Master Password</label
              >
              <input
                type="password"
                [ngModel]="unlockPassword()"
                (ngModelChange)="unlockPassword.set($event)"
                (keyup.enter)="performUnlock()"
                class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono shadow-inner"
                placeholder="••••••••"
                [disabled]="isBusy()"
              />
            </div>

            <button
              (click)="performUnlock()"
              [disabled]="isBusy() || !unlockPassword()"
              class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group"
            >
              <span
                *ngIf="isBusy()"
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              ></span>
              {{ isBusy() ? 'Unlocking...' : 'Unlock Vault' }}
            </button>

            <button
              (click)="logout()"
              class="w-full text-xs text-white/30 hover:text-red-400 transition-colors uppercase tracking-widest font-bold py-2"
            >
              Log Out
            </button>
          </div>

          <div
            *ngIf="unlockError()"
            class="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-sm animate-shake"
          >
            {{ unlockError() }}
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex items-center justify-between" [class.blur-sm]="isLocked()">
        <!-- ... Header logic mostly same, changed Debug Mode badge ... -->
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Vault Enclave Debug</h2>
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            ></span>
            <p class="text-white/40 text-sm font-mono">
              ENCLAVE: {{ isLocked() ? 'LOCKED' : 'ACTIVE' }}
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            (click)="logout()"
            class="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-black px-4 py-2 rounded-lg text-sm font-bold transition-all border border-red-500/20"
          >
            Log Out
          </button>
          <button
            (click)="list()"
            [disabled]="isBusy() || isLocked()"
            class="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            <span>{{ isBusy() ? 'Refreshing...' : 'Refresh List' }}</span>
          </button>
        </div>
      </div>

      <!-- ... Form and List sections ... -->
      <div
        class="grid grid-cols-1 lg:grid-cols-3 gap-8"
        [class.blur-sm]="isLocked()"
        [class.pointer-events-none]="isLocked()"
      >
        <!-- Copied existing template logic but removed mk.isReady() checks in favor of !isLocked() -->
        <div class="space-y-6">
          <div
            class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl"
          >
            <!-- ... Form Inputs ... -->
            <!-- ... (Keep existing form template) ... -->
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
                  >Website</label
                >
                <input
                  [(ngModel)]="form.website"
                  class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none transition-all"
                  placeholder="google.com"
                />
              </div>
              <!-- ... Username/Password Inputs ... -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                    >Username</label
                  >
                  <input
                    [(ngModel)]="form.username"
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-white/40 uppercase mb-1.5 ml-1"
                    >Password</label
                  >
                  <input
                    type="password"
                    [(ngModel)]="form.password"
                    class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all"
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
                  class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all resize-none"
                ></textarea>
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
                  [disabled]="isBusy() || isLocked()"
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
          <!-- Logs -->
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
              >{{ result() || 'Systems ready.' }}</pre
            >
          </div>
        </div>

        <!-- List -->
        <div class="lg:col-span-2 space-y-6">
          <div
            *ngIf="entries().length === 0"
            class="bg-white/[0.04] border border-dashed border-white/20 rounded-2xl py-20 flex flex-col items-center justify-center text-white/40"
          >
            <p class="text-sm font-medium">No entries loaded.</p>
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
                      class="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-bold"
                      >Open</span
                    >
                  </div>
                  <div class="text-[10px] text-blue-400/80 font-mono">{{ e.dto.Id }}</div>
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
                    [disabled]="isLocked()"
                    (click)="decrypt(e)"
                    class="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1 rounded-lg text-xs font-bold transition-all border border-blue-500/20"
                  >
                    Decrypt
                  </button>
                  <button
                    (click)="del(e.dto.Id)"
                    class="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    Del
                  </button>
                </div>
              </div>
              <!-- Decrypted View -->
              <div
                *ngIf="e.plain"
                class="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2"
              >
                <div class="text-blue-400 text-sm">{{ e.plain.website }}</div>
                <div class="grid grid-cols-2 gap-4 text-sm text-white">
                  <div>{{ e.plain.username }}</div>
                  <div class="font-mono">{{ e.plain.password }}</div>
                </div>
                <div *ngIf="e.plain.notes" class="text-white/60 text-sm whitespace-pre-wrap">
                  {{ e.plain.notes }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VaultDebugComponent implements OnInit {
  entries = signal<DebugEntry[]>([]);
  isBusy = signal(false);

  // Logic States
  isLocked = signal(true);
  unlockPassword = signal('');
  unlockError = signal('');

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
    private readonly vaultCrypto: VaultCryptoService,
    private readonly authCrypto: AuthCryptoService,
    private readonly persistence: AuthPersistenceService,
    public readonly state: AuthStateService,
    private readonly router: Router,
    private readonly authApi: AuthApiService
  ) {}

  async ngOnInit() {
    await this.checkState();
  }

  async checkState() {
    if (!this.state.accessToken()) {
      await this.logout();
      return;
    }

    const unlocked = await this.authCrypto.checkStatus();
    if (unlocked) {
      this.isLocked.set(false);
      return;
    }

    const hasBundle = await this.persistence.hasBundle();
    if (hasBundle) {
      this.isLocked.set(true);
    } else {
      await this.logout();
    }
  }

  async performUnlock() {
    if (!this.unlockPassword()) return;
    this.isBusy.set(true);
    this.unlockError.set('');

    try {
      const bundle = await this.persistence.getBundle();
      if (!bundle) throw new Error('No offline bundle found.');

      await this.authCrypto.unlock(this.unlockPassword(), bundle);

      this.isLocked.set(false);
      this.unlockPassword.set('');
      this.result.set('Vault Unlocked via Bundle');

      // Auto refresh list logic here if wanted
    } catch (e: any) {
      this.unlockError.set('Incorrect password or corrupted bundle.');
      console.error(e);
    } finally {
      this.isBusy.set(false);
    }
  }

  async logout() {
    try {
      this.isBusy.set(true);
      await this.authCrypto.clearKeys();
      await this.persistence.clearBundle();
      await new Promise<void>((resolve) => {
        this.authApi.logout().subscribe({ next: () => resolve(), error: () => resolve() });
      });
      this.state.clear();
      this.router.navigate(['/debug/auth']);
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
      this.result.set(`Save OK\nEntryId: ${r.EntryId}`);
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
      this.result.set(`Update OK\nEntryId: ${entryId}`);
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
    return await this.vaultCrypto.encryptEntry(plain, this.form.website || 'default', aad);
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
      const res = await this.vaultCrypto.decryptEntry(entry.dto.Payload, boundAad);
      this.entries.update((list) => {
        const item = list.find((i) => i.dto.Id === entry.dto.Id);
        if (item) {
          item.plain = res;
          item.decrypting = false;
        }
        return [...list];
      });
      this.result.set(`Decryption OK`);
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
