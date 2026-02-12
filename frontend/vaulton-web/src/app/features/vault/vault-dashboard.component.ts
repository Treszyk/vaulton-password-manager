import {
  Component,
  inject,
  signal,
  effect,
  ViewEncapsulation,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VaultDataService } from './vault-data.service';
import { RecordCardComponent } from './record-card.component';
import { RecordEditorComponent } from './record-editor.component';
import { MemoModalComponent } from './memo-modal.component';
import { VaultRecord, VaultRecordInput } from './vault-record.model';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PasscodePromptModalComponent } from '../../shared/ui/passcode-prompt-modal.component';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';

import { ScrollIndicatorDirective } from '../../shared/directives/scroll-indicator.directive';

@Component({
  selector: 'app-vault-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RecordCardComponent,
    RecordEditorComponent,
    MemoModalComponent,
    PasscodePromptModalComponent,
    ScrollIndicatorDirective,
  ],
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  template: `
    <div class="p-4 pb-0 md:p-8 md:pb-0 max-w-[100rem] mx-auto flex-1 min-h-0 flex flex-col w-full">
      <div
        class="flex-none mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 px-4"
      >
        <div>
          <h1 class="text-xs font-black uppercase tracking-[0.4em] text-zinc-400 mb-1">
            Vault Storage
          </h1>
          <div class="flex items-center gap-3">
            <span class="text-4xl font-black text-zinc-100">{{ filteredRecords().length }}</span>
            <span class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-1.5"
              >Results</span
            >
          </div>
        </div>
        <div class="relative w-full md:w-80 group">
          <div class="absolute left-6 inset-y-0 flex items-center pointer-events-none">
            <div
              *ngIf="isSearching()"
              class="w-4 h-4 border-2 border-vault-purple/30 border-t-vault-purple rounded-full animate-spin"
            ></div>
            <svg
              *ngIf="!isSearching()"
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-zinc-600"
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
            class="absolute inset-y-0 right-2 my-auto px-3 py-1.5 h-fit rounded-lg text-xs font-black uppercase tracking-wider transition-all text-zinc-400 hover:text-zinc-400 hover:bg-vault-dark border border-transparent"
          >
            {{ searchScope() === 'titles' ? 'Title/Website' : 'All' }}
          </button>

          <input
            type="text"
            [(ngModel)]="searchQueryInput"
            placeholder="Search Vault..."
            class="w-full !bg-vault-black !border-zinc-800 focus:!border-vault-purple/30 !rounded-2xl !py-4 !pl-14 !pr-36 !text-xs !tracking-[0.1em] !font-bold transition-all placeholder:text-zinc-600"
          />
        </div>
      </div>
      <div
        *ngIf="vault.isLoading()"
        class="flex-none flex flex-col items-center justify-center py-20 animate-fade-in text-center"
      >
        <div
          class="w-12 h-12 border-2 border-zinc-700 border-t-white/40 rounded-full animate-spin mb-4"
        ></div>
        <p class="text-zinc-400 text-xs md:text-xs font-bold uppercase tracking-[0.4em]">
          Unlocking Secure Vault...
        </p>
      </div>
      <div
        *ngIf="!vault.isLoading()"
        class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth pb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 [3000px]:grid-cols-4 gap-8 items-stretch animate-fade-in px-4 -mx-4"
      >
        <button
          *ngIf="!searchQuery()"
          (click)="showAddModal.set(true)"
          class="group relative h-[16rem] flex flex-col items-center justify-center p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-vault-black border-2 border-dashed border-zinc-800 hover:border-vault-purple/40 hover:bg-vault-black transition-all duration-500 animate-scale-in"
          [style.--delay]="'0ms'"
          aria-label="Add a New Entry"
        >
          <div
            class="w-16 h-16 rounded-full bg-vault-black border border-zinc-700 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-vault-purple/10 group-hover:border-vault-purple/20 transition-all duration-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6 text-zinc-400 group-hover:text-vault-purple"
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
            class="text-[0.6875rem] md:text-[0.75rem] font-bold uppercase tracking-[0.4em] text-zinc-300 group-hover:text-zinc-300 transition-colors"
            >Add a New Entry</span
          >
        </button>

        <app-record-card
          *ngFor="let record of filteredRecords(); let i = index; trackBy: trackByQuery"
          [style.--delay]="(i < 10 ? (i + (searchQuery() ? 0 : 1)) * 100 : 1000) + 'ms'"
          class="animate-scale-in"
          [record]="record"
          (onDelete)="deleteRecord($event)"
          (onEdit)="editRecord($event)"
          (onShowMemo)="activeMemo.set($event)"
        ></app-record-card>
        <div
          *ngIf="filteredRecords().length === 0 && searchQuery()"
          class="col-span-full py-20 text-center"
        >
          <p class="text-zinc-500 text-xs font-black uppercase tracking-[0.5em]">
            No matching secrets found
          </p>
        </div>
      </div>
      <app-record-editor
        #editor
        *ngIf="showAddModal() || editingRecord()"
        [record]="editingRecord() || undefined"
        (close)="closeEditor()"
        (save)="handleSave($event, editor)"
      ></app-record-editor>

      <app-memo-modal
        *ngIf="activeMemo()"
        [record]="activeMemo()!"
        (close)="activeMemo.set(null)"
      ></app-memo-modal>

      <app-passcode-prompt-modal
        *ngIf="showPasscodePrompt()"
        (setup)="goToPasscodeSetup()"
        (skip)="onSkipPasscodePrompt()"
      ></app-passcode-prompt-modal>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class VaultDashboardComponent implements OnDestroy {
  showAddModal = signal(false);
  editingRecord = signal<VaultRecord | null>(null);
  activeMemo = signal<VaultRecord | null>(null);
  showPasscodePrompt = signal(false);
  searchQueryInput = signal('');
  searchQuery = signal('');
  isSearching = signal(false);
  searchScope = signal<'titles' | 'all'>('titles');

  constructor(
    protected readonly vault: VaultDataService,
    private readonly persistence: AuthPersistenceService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly authState: AuthStateService,
  ) {
    this.checkPasscodePrompt();
    effect(() => {
      if (!this.authState.isUnlocked()) {
        this.closeEditor();
        this.activeMemo.set(null);
        this.searchQueryInput.set('');
        this.searchQuery.set('');
      }
    });

    effect(() => {
      if (this.authState.isUnlocked() && this.router.url.includes('/vault')) {
        this.vault.loadRecords();
      }
    });

    effect((onCleanup) => {
      const input = this.searchQueryInput();
      if (!input) {
        this.searchQuery.set('');
        this.isSearching.set(false);
        return;
      }

      this.isSearching.set(true);
      const timeout = setTimeout(() => {
        this.searchQuery.set(input);
        this.isSearching.set(false);
      }, 300);

      onCleanup(() => clearTimeout(timeout));
    });
  }

  filteredRecords = computed(() => {
    if (!this.authState.isUnlocked()) return [];

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

  async handleSave(input: VaultRecordInput, editor: RecordEditorComponent) {
    const editRec = this.editingRecord();
    try {
      if (editRec) {
        await this.vault.updateRecord(editRec.id, input);
      } else {
        await this.vault.addRecord(input);
      }
      editor.triggerClose();
    } catch (e) {
      this.closeEditor();
      this.vault.loadRecords();
    }
  }

  async deleteRecord(id: string) {
    await this.vault.deleteRecord(id).catch(() => {});
  }

  editRecord(record: VaultRecord) {
    this.editingRecord.set(record);
  }

  closeEditor() {
    this.showAddModal.set(false);
    this.editingRecord.set(null);
  }

  ngOnDestroy() {
    this.editingRecord.set(null);
    this.activeMemo.set(null);
  }

  trackByQuery = (index: number, item: VaultRecord): string => {
    return item.id + (this.searchQuery() || '');
  };

  private async checkPasscodePrompt() {
    const accountId = await this.persistence.getAccountId();
    if (!accountId) return;

    const hasPasscode = !!(await this.persistence.getLocalPasscode(accountId));
    const prompted = await this.persistence.isPasscodePrompted(accountId);

    if (!hasPasscode && !prompted) {
      setTimeout(() => this.showPasscodePrompt.set(true), 1200);
    }
  }

  async onSkipPasscodePrompt() {
    const accountId = await this.persistence.getAccountId();
    if (accountId) {
      await this.persistence.setPasscodePrompted(accountId, true);
    }
    this.showPasscodePrompt.set(false);
  }

  async goToPasscodeSetup() {
    const accountId = await this.persistence.getAccountId();
    if (accountId) {
      await this.persistence.setPasscodePrompted(accountId, true);
    }
    this.showPasscodePrompt.set(false);
    this.router.navigate(['/vault/settings'], {
      queryParams: { tab: 'SECURITY', setupPasscode: true },
    });
  }
}
