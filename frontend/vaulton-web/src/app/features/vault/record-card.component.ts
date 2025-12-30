import { Component, Input, Output, EventEmitter, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultRecord } from './vault-record.model';

@Component({
  selector: 'app-record-card',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'h-full',
  },
  template: `
    <div 
      class="group relative h-[240px] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/10 hover:border-vault-purple/30 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
    >
      <div class="relative flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center border border-white/10 group-hover:bg-vault-purple/10 group-hover:border-vault-purple/20 transition-all">
             <span class="text-lg font-black text-white/35 group-hover:text-vault-purple/60 uppercase">
                {{ record.title.charAt(0) }}
             </span>
          </div>
          <div class="space-y-0.5">
            <h3 class="font-black text-white/90 text-sm uppercase tracking-widest truncate max-w-[120px]">
              {{ record.title }}
            </h3>
            <p class="text-[10px] text-white/40 uppercase tracking-widest truncate max-w-[120px] font-black">
              {{ record.website || 'INTERNAL' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button  
            type="button"
            (click)="onEdit.emit(record)"
            class="edit-btn p-2 rounded-xl flex items-center justify-center"
            title="Edit Entry"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>

          <div class="relative flex items-center justify-center">
            <span 
              *ngIf="deleteConfirmActive()" 
              class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest pointer-events-none whitespace-nowrap !bg-transparent text-red-500 animate-pulse"
            >
              SURE?
            </span>
            <button 
              type="button"
              (click)="onDeleteClick(record.id)"
              class="p-2 rounded-xl flex items-center justify-center transition-all duration-300"
              [class.trash-btn]="!deleteConfirmActive()"
              [ngClass]="{
                'bg-red-500/10 text-red-500 hover:text-red-400': deleteConfirmActive()
              }"
              title="Delete Entry"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" class="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-4 flex-1 flex flex-col justify-end">
        <div class="relative">
          <p class="text-[10px] font-black uppercase tracking-widest text-white/55 mb-1">Login</p>
          <div class="flex items-center justify-between">
            <p class="text-sm text-white/80 truncate font-medium">{{ record.username }}</p>
            <div class="relative flex items-center justify-center">
              <span 
                *ngIf="justCopied() && copiedStatus() === 'username'" 
                class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest pointer-events-none whitespace-nowrap text-emerald-400 !bg-transparent"
              >
                COPIED
              </span>
              <button 
                (click)="copyUsername(record.username)" 
                class="p-1 px-2 transition-all"
                [class.text-white/35]="!justCopied() || copiedStatus() !== 'username'"
                [class.hover:text-white/40]="!justCopied() || copiedStatus() !== 'username'"
                [class.text-emerald-400]="justCopied() && copiedStatus() === 'username'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="relative">
          <p class="text-[10px] font-black uppercase tracking-widest text-white/55 mb-1">Secret</p>
          <div class="flex items-center justify-between gap-4">
            <div class="relative flex-1 overflow-hidden flex items-center h-5">
               <p 
                class="text-sm font-mono tracking-widest transition-all duration-300 w-fit leading-none"
                [class.revealed-text]="reveal()"
                [class.text-white/35]="!reveal()"
               >
                {{ reveal() ? record.password : '••••••••' }}
               </p>
            </div>
            
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button (click)="toggleReveal()" class="p-1 text-white/35 hover:text-white/40 transition-all relative">
                <svg *ngIf="!reveal()" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="reveal()" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-vault-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
              <div class="relative flex items-center justify-center">
                <span 
                  *ngIf="copyConfirmActive() || (justCopied() && copiedStatus() === 'password')" 
                  class="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest pointer-events-none whitespace-nowrap !bg-transparent"
                  [class.text-orange-400]="copyConfirmActive() && !justCopied()"
                  [class.text-emerald-400]="justCopied() && copiedStatus() === 'password'"
                  [class.animate-pulse]="copyConfirmActive() && !justCopied()"
                >
                  {{ (justCopied() && copiedStatus() === 'password') ? 'COPIED' : 'SURE?' }}
                </span>
                <button 
                  (click)="copyPassword(record.password)" 
                  class="p-1 transition-all text-[10px] font-black flex items-center justify-center"
                  [class.text-white/35]="!copyConfirmActive() && (!justCopied() || copiedStatus() !== 'password')"
                  [class.hover:text-white/40]="!copyConfirmActive() && (!justCopied() || copiedStatus() !== 'password')"
                  [class.text-orange-400]="copyConfirmActive()"
                  [class.text-emerald-400]="justCopied() && copiedStatus() === 'password'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button 
          [class.invisible]="!record.notes"
          [class.pointer-events-none]="!record.notes"
          (click)="record.notes && onShowMemo.emit(record)"
          class="w-fit py-1 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-vault-purple hover:opacity-100 active:scale-95 transition-all flex items-center gap-2 group/btn"
        >
          View Description
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 transition-transform group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class RecordCardComponent {
  @Input({ required: true }) record!: VaultRecord;
  @Output() onDelete = new EventEmitter<string>();
  @Output() onEdit = new EventEmitter<VaultRecord>();
  @Output() onShowMemo = new EventEmitter<VaultRecord>();

  protected reveal = signal(false);
  protected copyConfirmActive = signal(false);
  protected justCopied = signal(false);
  protected copiedStatus = signal<'username' | 'password' | null>(null);

  protected deleteConfirmActive = signal(false);
  private deleteTimeout?: any;
  private revealTimeout?: any;
  private copyTimeout?: any;
  private statusTimeout?: any;

  toggleReveal() {
    if (this.reveal()) {
      this.reveal.set(false);
      if (this.revealTimeout) clearTimeout(this.revealTimeout);
      return;
    }

    this.reveal.set(true);

    this.revealTimeout = setTimeout(() => {
      this.reveal.set(false);
    }, 8000);
  }

  onDeleteClick(id: string) {
    if (!this.deleteConfirmActive()) {
      this.deleteConfirmActive.set(true);
      if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
      this.deleteTimeout = setTimeout(() => this.deleteConfirmActive.set(false), 3000);
      return;
    }

    this.onDelete.emit(id);
    this.deleteConfirmActive.set(false);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
  }

  copy(value: string) {
    navigator.clipboard.writeText(value);
  }

  copyUsername(value: string) {
    this.copy(value);
    this.showFeedback('username');
  }

  copyPassword(value: string) {
    if (this.justCopied() && this.copiedStatus() === 'password') return;

    if (!this.copyConfirmActive()) {
      this.copyConfirmActive.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copyConfirmActive.set(false), 3000);
      return;
    }

    this.copy(value);
    this.copyConfirmActive.set(false);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.showFeedback('password');
  }

  private showFeedback(type: 'username' | 'password') {
    this.justCopied.set(true);
    this.copiedStatus.set(type);
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
    this.statusTimeout = setTimeout(() => {
      this.justCopied.set(false);
      this.copiedStatus.set(null);
    }, 2000);
  }
}
