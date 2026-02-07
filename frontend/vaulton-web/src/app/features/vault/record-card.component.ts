import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ViewEncapsulation,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultRecord } from './vault-record.model';
import { ScrollIndicatorDirective } from '../../shared/directives/scroll-indicator.directive';
import {
  SessionService,
  SESSION_AGGRESSIVE_THROTTLE_MS,
  SESSION_INTERACTION_THROTTLE_MS,
} from '../../core/auth/session.service';

@Component({
  selector: 'app-record-card',
  standalone: true,
  imports: [CommonModule, ScrollIndicatorDirective],
  host: {
    class: 'h-full',
  },
  template: `
    <div
      class="group relative h-[16rem] p-6 rounded-[2rem] md:rounded-[2.5rem] bg-vault-black border border-zinc-800 hover:border-vault-purple/30 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
    >
      <div class="relative flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-2xl bg-vault-black flex items-center justify-center border border-zinc-700 group-hover:bg-vault-purple/10 group-hover:border-vault-purple/20 transition-all"
          >
            <span class="text-lg font-black text-zinc-300 group-hover:text-vault-purple uppercase">
              {{ record.title.charAt(0) }}
            </span>
          </div>
          <div class="space-y-0.5">
            <h2
              class="font-black text-zinc-100 text-sm uppercase tracking-widest truncate max-w-[120px]"
            >
              {{ record.title }}
            </h2>
            <p
              class="text-xs text-zinc-400 uppercase tracking-widest truncate max-w-[120px] font-black"
            >
              {{ record.website || 'INTERNAL' }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-1.5 flex-shrink-0 min-w-[4.5rem]">
          <button
            type="button"
            (click)="onEditClick()"
            class="edit-btn h-8 w-8 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:bg-vault-900"
            title="Edit Entry"
            aria-label="Edit Entry"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              class="w-5 h-5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>

          <div class="relative flex items-center justify-end h-8 md:h-10">
            <button
              type="button"
              (click)="onDeleteClick(record.id)"
              class="flex items-center justify-center transition-[background-color,color,border-color,box-shadow,fill,stroke] duration-500 rounded-xl overflow-hidden px-2.5 h-full w-fit max-w-[150px]"
              [class.trash-btn]="!deleteConfirmActive()"
              [ngClass]="{
                'bg-red-500 text-white shadow-lg shadow-red-500/20': deleteConfirmActive(),
                'text-red-500/50 hover:bg-red-500/10 shadow-none': !deleteConfirmActive(),
              }"
              title="Delete Entry"
              [attr.aria-label]="deleteConfirmActive() ? 'Confirm Delete' : 'Delete Entry'"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                class="w-5 h-5 flex-shrink-0"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span class="confirm-label" [class.active]="deleteConfirmActive()">
                <span class="overflow-hidden min-h-[1.25rem] flex items-center">
                  <span
                    class="text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap min-w-max"
                  >
                    Delete?
                  </span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-2 flex-1 flex flex-col justify-end min-h-0">
        <div class="relative flex flex-col">
          <p class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Login</p>
          <div class="flex items-center justify-between relative gap-2 min-w-0">
            <div class="relative flex-1 min-w-0 h-10 overflow-hidden">
              <div scroll-indicator class="flex items-center h-full overflow-x-auto scrollbar-none">
                <p class="text-sm text-zinc-200 whitespace-nowrap font-medium pr-2 w-max">
                  {{ record.username }}
                </p>
              </div>
            </div>
            <div class="flex items-center justify-end h-8 md:h-10 flex-shrink-0">
              <button
                (click)="copyUsername(record.username)"
                class="flex items-center justify-center transition-[background-color,color,border-color,box-shadow,fill,stroke] duration-500 rounded-xl overflow-hidden px-2.5 h-full w-fit max-w-[200px]"
                [ngClass]="{
                  'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20':
                    justCopied() && copiedStatus() === 'username',
                  'text-zinc-500 hover:text-white hover:bg-vault-dark shadow-none':
                    !justCopied() || copiedStatus() !== 'username',
                }"
                [attr.aria-label]="
                  justCopied() && copiedStatus() === 'username'
                    ? 'Username Copied'
                    : 'Copy Username'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span
                  class="confirm-label"
                  [class.active]="justCopied() && copiedStatus() === 'username'"
                >
                  <span class="overflow-hidden min-h-[1.25rem] flex items-center">
                    <span
                      class="text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap min-w-max"
                    >
                      Copied
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="relative flex flex-col">
          <p class="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">Secret</p>
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="relative flex-1 h-10 min-w-0 overflow-hidden">
              <div scroll-indicator class="h-full overflow-x-auto scrollbar-none flex items-center">
                <p
                  class="text-sm font-mono tracking-widest transition-all duration-300 leading-none w-max whitespace-nowrap"
                  [class.revealed-text]="reveal()"
                  [class.text-zinc-400]="!reveal()"
                >
                  {{ reveal() ? record.password : '••••••••' }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-end h-8 md:h-10 flex-shrink-0">
              <button
                (click)="toggleReveal()"
                class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-zinc-500 hover:text-white transition-all rounded-xl hover:bg-vault-dark mr-1"
                [attr.aria-label]="reveal() ? 'Hide Password' : 'Show Password'"
              >
                <svg
                  *ngIf="!reveal()"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  *ngIf="reveal()"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5 text-vault-purple"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              </button>

              <button
                (click)="copyPassword(record.password)"
                class="flex items-center justify-center transition-[background-color,color,border-color,box-shadow,fill,stroke] duration-500 rounded-xl overflow-hidden px-2.5 h-full w-fit max-w-[200px]"
                [ngClass]="{
                  'bg-orange-500 text-white shadow-lg shadow-orange-500/20':
                    copyConfirmActive() && !justCopied(),
                  'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20':
                    justCopied() && copiedStatus() === 'password',
                  'text-zinc-500 hover:text-white hover:bg-vault-dark shadow-none':
                    !copyConfirmActive() && (copiedStatus() !== 'password' || !justCopied()),
                }"
                [attr.aria-label]="
                  justCopied() && copiedStatus() === 'password'
                    ? 'Password Copied'
                    : copyConfirmActive()
                      ? 'Confirm Copy Password'
                      : 'Copy Password'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span
                  class="confirm-label password-confirm"
                  [class.active]="
                    copyConfirmActive() || (justCopied() && copiedStatus() === 'password')
                  "
                >
                  <span
                    [class.opacity-0]="justCopied() && copiedStatus() === 'password'"
                    class="transition-opacity duration-300 col-start-1 row-start-1"
                    >Copy?</span
                  >
                  <span
                    [class.opacity-0]="!justCopied() || copiedStatus() !== 'password'"
                    class="transition-opacity duration-300 col-start-1 row-start-1"
                    >Copied</span
                  >
                </span>
              </button>
            </div>
          </div>
        </div>

        <button
          [class.invisible]="!record.notes"
          [class.pointer-events-none]="!record.notes"
          (click)="record.notes && onShowMemo.emit(record)"
          class="w-fit py-1 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-vault-purple hover:opacity-100 active:scale-95 transition-all flex items-center gap-2 group/btn"
        >
          View Description
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-3 h-3 transition-transform group-hover/btn:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class RecordCardComponent implements OnDestroy {
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

  private readonly session = inject(SessionService);

  @HostListener('click')
  onCardInteraction() {
    this.session.verifySession(SESSION_INTERACTION_THROTTLE_MS);
  }

  async toggleReveal() {
    if (!this.reveal()) {
      await this.session.verifySession(SESSION_AGGRESSIVE_THROTTLE_MS);
    }

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

  async onDeleteClick(id: string) {
    if (!this.deleteConfirmActive()) {
      this.deleteConfirmActive.set(true);
      if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
      this.deleteTimeout = setTimeout(() => this.deleteConfirmActive.set(false), 3000);
      return;
    }

    await this.session.verifySession(SESSION_AGGRESSIVE_THROTTLE_MS);
    this.onDelete.emit(id);
    this.deleteConfirmActive.set(false);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
  }

  copy(value: string) {
    navigator.clipboard.writeText(value);
  }

  async onEditClick() {
    await this.session.verifySession(SESSION_AGGRESSIVE_THROTTLE_MS);
    this.onEdit.emit(this.record);
  }

  async copyUsername(value: string) {
    this.resetFeedback();
    this.copy(value);
    this.showFeedback('username');
  }

  async copyPassword(value: string) {
    if (this.justCopied() && this.copiedStatus() === 'password') return;

    if (!this.copyConfirmActive()) {
      this.resetFeedback();
      this.copyConfirmActive.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copyConfirmActive.set(false), 3000);
      return;
    }

    await this.session.verifySession(SESSION_AGGRESSIVE_THROTTLE_MS);
    this.copy(value);
    this.copyConfirmActive.set(false);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    this.showFeedback('password');
  }

  private resetFeedback() {
    this.copyConfirmActive.set(false);
    this.justCopied.set(false);
    this.copiedStatus.set(null);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
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

  ngOnDestroy() {
    if (this.revealTimeout) clearTimeout(this.revealTimeout);
    if (this.deleteTimeout) clearTimeout(this.deleteTimeout);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
  }
}
