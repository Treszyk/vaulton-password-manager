import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { VaultApiService, EntryDto } from '../../core/api/vault-api.service';

@Component({
  standalone: true,
  selector: 'app-vault-debug',
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Vault Debug</h2>
          <p class="text-white/40 text-sm">Managing encrypted vault entries and payloads</p>
        </div>
        <div class="flex gap-3">
          <button (click)="list()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20">Fetch Entries</button>
          <button (click)="createDummy()" class="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium transition-all">Create Dummy</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Entries -->
        <div class="lg:col-span-2 space-y-6">
          <div class="flex items-center justify-between pb-2">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              Entries ({{ entries().length }})
            </h3>
          </div>
          
          <div *ngIf="entries().length === 0" class="bg-white/[0.04] border border-dashed border-white/20 rounded-2xl py-20 flex flex-col items-center justify-center text-white/40">
            <div class="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center mb-4 opacity-70">
              <span class="text-2xl font-bold">?</span>
            </div>
            <p class="text-sm font-medium">No entries found. Click <span class="text-blue-400">"Fetch Entries"</span> to load.</p>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div *ngFor="let e of entries()" class="group bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 shadow-lg">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <span class="text-lg font-mono">ID</span>
                  </div>
                  <div>
                    <code class="text-xs text-white/60 block mb-1">{{ e.Id }}</code>
                    <div class="flex gap-4 text-xs text-white/40 font-medium uppercase tracking-wider">
                      <span>Payload: {{ e.Payload.CipherText.length }} bytes</span>
                      <span>•</span>
                      <span>Nonce: {{ e.Payload.Nonce.length }} bytes</span>
                    </div>
                  </div>
                </div>
                <button (click)="del(e.Id)" class="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Results -->
        <div class="space-y-6">
          <div class="flex items-center pb-2">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              Operation Result
            </h3>
          </div>
          <div class="bg-white/[0.06] border border-white/10 rounded-2xl p-6 backdrop-blur-sm sticky top-24 shadow-xl">
            <div class="bg-black/60 rounded-xl border border-white/10 p-4 overflow-auto max-h-[400px]">
              <pre class="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap break-all">{{ result() || 'Systems ready. Awaiting command...' }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VaultDebugComponent {
  entries = signal<EntryDto[]>([]);
  result = signal('');

  constructor(private readonly api: VaultApiService) {}

  list(): void {
    this.api.list(0, 200).subscribe({
      next: (items) => {
        this.entries.set(items);
        this.result.set(`List OK (${items.length})`);
      },
      error: (e) => this.result.set(`List FAILED\n${this.pretty(e)}`),
    });
  }

  createDummy(): void {
    const req = {
      DomainTag: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      Payload: {
        Nonce: 'AAAAAAAAAAAAAAAA',
        CipherText: 'AQ==',
        Tag: 'AAAAAAAAAAAAAAAAAAAAAA==',
      },
    };

    this.api.create(req).subscribe({
      next: (r) => {
        this.result.set(`Create OK\nEntryId: ${r.EntryId}`);
        this.list();
      },
      error: (e) => this.result.set(`Create FAILED\n${this.pretty(e)}`),
    });
  }

  del(id: string): void {
    this.api.delete(id).subscribe({
      next: () => {
        this.result.set(`Delete OK\nId: ${id}`);
        this.list();
      },
      error: (e) => this.result.set(`Delete FAILED\n${this.pretty(e)}`),
    });
  }

  private pretty(e: any): string {
    return JSON.stringify({ status: e?.status, error: e?.error }, null, 2);
  }
}
