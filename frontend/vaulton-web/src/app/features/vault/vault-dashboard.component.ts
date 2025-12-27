import { Component, inject, signal, effect, ViewEncapsulation, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VaultDataService } from './vault-data.service';
import { RecordCardComponent } from './record-card.component';
import { RecordEditorComponent } from './record-editor.component';
import { MemoModalComponent } from './memo-modal.component';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';

@Component({
  selector: 'app-vault-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RecordCardComponent,
    RecordEditorComponent,
    MemoModalComponent,
  ],
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  template: `
    <div class="p-4 md:p-8 max-w-7xl mx-auto flex-1 min-h-0 flex flex-col w-full">
      <div
        class="flex-none mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 px-4"
      >
        <div>
          <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-1">
            Encrypted Archive
          </h2>
          <div class="flex items-center gap-3">
            <span class="text-4xl font-black text-white/90">{{ filteredRecords().length }}</span>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1.5"
              >Results</span
            >
          </div>
        </div>
        <div class="relative w-full md:w-80 group">
          <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 text-white/10 group-focus-within:text-vault-purple transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            (click)="searchScope.set(searchScope() === 'titles' ? 'all' : 'titles')"
            class="absolute inset-y-0 right-2 my-auto px-3 py-1.5 h-fit rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
            [ngClass]="{
              'text-vault-purple bg-vault-purple/10 border border-vault-purple/20':
                searchScope() === 'titles',
              'text-white/20 hover:text-white/40 hover:bg-white/5 border border-transparent':
                searchScope() === 'all'
            }"
          >
            {{ searchScope() === 'titles' ? 'Title/Website' : 'All' }}
          </button>

          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Search Vault..."
            class="w-full !bg-white/[0.02] !border-white/5 focus:!border-vault-purple/30 !rounded-2xl !py-4 !pl-14 !pr-6 !text-xs !tracking-[0.1em] !font-bold transition-all placeholder:text-white/5"
          />
        </div>
      </div>
      <div
        *ngIf="vault.isLoading()"
        class="flex-none flex flex-col items-center justify-center py-20 animate-fade-in text-center"
      >
        <div
          class="w-12 h-12 border-2 border-white/5 border-t-white/40 rounded-full animate-spin mb-4"
        ></div>
        <p class="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">
          Deciphering Neural Storage...
        </p>
      </div>
      <div
        *ngIf="!vault.isLoading()"
        class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch animate-fade-in px-1"
      >
        <app-record-card
          *ngFor="let record of filteredRecords(); let i = index; trackBy: trackByQuery"
          [style.animation-delay]="i * 100 + 'ms'"
          class="animate-scale-in"
          [record]="record"
          (onDelete)="vault.deleteRecord($event)"
          (onEdit)="editRecord($event)"
          (onShowMemo)="activeMemo.set($event)"
        ></app-record-card>
        <button
          *ngIf="!searchQuery()"
          (click)="showAddModal.set(true)"
          class="group relative h-[240px] flex flex-col items-center justify-center p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.01] border-2 border-dashed border-white/5 hover:border-vault-purple/40 hover:bg-white/[0.02] transition-all duration-500"
        >
          <div
            class="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-vault-purple/10 group-hover:border-vault-purple/20 transition-all duration-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-white/20 group-hover:text-vault-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span
            class="text-[11px] font-black uppercase tracking-[0.4em] text-white/30 group-hover:text-white/60 transition-colors"
            >Add New Entry</span
          >
        </button>
        <div
          *ngIf="filteredRecords().length === 0 && searchQuery()"
          class="col-span-full py-20 text-center"
        >
          <p class="text-white/10 text-[10px] font-black uppercase tracking-[0.5em]">
            No matching secrets found
          </p>
        </div>
      </div>
      <app-record-editor
        *ngIf="showAddModal()"
        (close)="showAddModal.set(false)"
        (save)="addRecord($event)"
      ></app-record-editor>

      <app-memo-modal
        *ngIf="activeMemo()"
        [record]="activeMemo()!"
        (close)="activeMemo.set(null)"
      ></app-memo-modal>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class VaultDashboardComponent {
  showAddModal = signal(false);
  activeMemo = signal<VaultRecord | null>(null);
  searchQuery = signal('');
  searchScope = signal<'titles' | 'all'>('titles');

  constructor(
    protected readonly vault: VaultDataService,
    private readonly crypto: AuthCryptoService,
    private readonly router: Router
  ) {
    effect(() => {
      if (this.crypto.isUnlocked() && this.router.url.includes('/vault')) {
        this.vault.loadRecords();
      }
    });
  }

  filteredRecords = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const scope = this.searchScope();
    const allRecords = this.vault.records();

    if (!query) return allRecords;

    return allRecords.filter((r) => {
      const matchesTitleOrDomain =
        r.title.toLowerCase().includes(query) || r.website?.toLowerCase().includes(query);

      if (scope === 'titles') {
        return matchesTitleOrDomain;
      }

      return (
        matchesTitleOrDomain ||
        r.username.toLowerCase().includes(query) ||
        r.notes.toLowerCase().includes(query)
      );
    });
  });

  async addRecord(input: VaultRecordInput) {
    try {
      await this.vault.addRecord(input);
      this.showAddModal.set(false);
    } catch (e) {
      console.error('Failed to add record', e);
    }
  }

  editRecord(record: VaultRecord) {}
  trackByQuery = (index: number, item: VaultRecord): string => {
    return item.id + (this.searchQuery() || '');
  };
}
