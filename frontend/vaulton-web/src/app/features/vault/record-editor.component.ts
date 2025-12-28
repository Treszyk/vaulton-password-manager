import {
  Component,
  EventEmitter,
  Output,
  Input,
  signal,
  inject,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VaultRecord, VaultRecordInput } from './vault-record.model';

@Component({
  selector: 'app-record-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 !z-[9000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md"
      [class.animate-fade-in]="!isClosing()"
      [class.animate-fade-out]="isClosing()"
    >
      <div
        class="w-full md:max-w-lg bg-transparent md:bg-zinc-950 border-none md:border border-white/15 rounded-t-[2rem] md:rounded-3xl shadow-none md:shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative !z-[9001]"
        [class.animate-slide-up-mobile]="!isClosing()"
        [class.animate-slide-down-mobile]="isClosing()"
        [class.md:animate-slide-up]="!isClosing()"
        (click)="$event.stopPropagation()"
      >
        <div
          class="flex-none p-5 md:p-6 border-b border-transparent md:border-white/10 flex items-center justify-between bg-transparent md:bg-zinc-950"
        >
          <div>
            <h2 class="text-base md:text-lg font-black uppercase tracking-[0.2em] text-white/90">
              {{ record ? 'Edit Secret' : 'Add a New Secret' }}
            </h2>
            <p
              class="text-[7px] md:text-[8px] text-white/55 uppercase tracking-[0.3em] mt-0.5 italic"
            >
              Locally Encrypted Before Transit
            </p>
          </div>
          <button
            (click)="triggerClose()"
            class="p-2 md:p-3 rounded-full hover:bg-white/5 text-white/35 hover:text-white transition-all outline-none"
          >
            <svg
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
          <form (submit)="submit()" class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-1.5">
                <label class="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 ml-1"
                  >Title</label
                >
                <input
                  type="text"
                  name="title"
                  [(ngModel)]="form.title"
                  required
                  placeholder="e.g. My Google Account"
                  class="w-full !bg-white/[0.02] !border-white/10 focus:!border-vault-purple/30 !rounded-xl !py-3.5 !text-xs transition-all"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 ml-1"
                  >Website</label
                >
                <input
                  type="text"
                  name="website"
                  [(ngModel)]="form.website"
                  placeholder="e.g. google.com"
                  class="w-full !bg-white/[0.02] !border-white/10 focus:!border-vault-purple/30 !rounded-xl !py-3.5 !text-xs transition-all"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 ml-1"
                  >Username / Email</label
                >
                <input
                  type="text"
                  name="username"
                  [(ngModel)]="form.username"
                  required
                  placeholder="email@example.com"
                  class="w-full !bg-white/[0.02] !border-white/10 focus:!border-vault-purple/30 !rounded-xl !py-3.5 !text-xs transition-all"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 ml-1"
                  >Password</label
                >
                <div class="relative group">
                  <input
                    [type]="showPwd() ? 'text' : 'password'"
                    name="password"
                    [(ngModel)]="form.password"
                    required
                    placeholder="••••••••••••"
                    class="w-full !bg-white/[0.02] !border-white/10 focus:!border-vault-purple/30 !rounded-xl !py-3.5 !pr-10 !text-xs transition-all"
                  />
                  <button
                    type="button"
                    (click)="showPwd.set(!showPwd())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-all"
                  >
                    <svg
                      *ngIf="!showPwd()"
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
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
                      *ngIf="showPwd()"
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4 text-vault-purple"
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
                </div>
                <button
                  type="button"
                  (click)="generatePassword()"
                  class="w-full text-center text-[7px] font-black uppercase tracking-[0.3em] text-vault-purple/70 hover:text-vault-purple transition-all pt-1.5 block"
                >
                  Auto-Generate Password
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[8px] font-black uppercase tracking-[0.2em] text-white/55 ml-1"
                >Notes</label
              >
              <textarea
                name="notes"
                [(ngModel)]="form.notes"
                rows="2"
                placeholder="Private annotations..."
                class="w-full !bg-white/[0.02] !border-white/10 focus:!border-vault-purple/30 !rounded-xl !py-3.5 transition-all resize-none !text-xs"
              ></textarea>
            </div>

            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-transparent md:border-white/10"
            >
              <button
                type="submit"
                [disabled]="isSubmitting() || !isValid()"
                class="w-full btn-primary !rounded-xl !py-3 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                <div
                  *ngIf="isSubmitting()"
                  class="w-4 h-4 border-2 border-white/15 border-t-white rounded-full animate-spin"
                ></div>
                <span *ngIf="!isSubmitting()" class="font-black uppercase tracking-[0.3em] text-sm">
                  {{ record ? 'Update Secret' : 'Save Secret' }}
                </span>
              </button>
              <button
                type="button"
                (click)="triggerClose()"
                class="w-full py-3 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-black uppercase tracking-[0.3em] text-white/55 hover:text-white transition-all shadow-inner hidden md:block"
              >
                Discard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class RecordEditorComponent implements OnInit, OnDestroy {
  @Input() record?: VaultRecord;
  @Output() save = new EventEmitter<VaultRecordInput>();
  @Output() close = new EventEmitter<void>();

  form: VaultRecordInput = {
    title: '',
    website: '',
    username: '',
    password: '',
    notes: '',
  };

  showPwd = signal(false);
  isSubmitting = signal(false);
  isClosing = signal(false);

  ngOnInit() {
    if (this.record) {
      this.form = {
        title: this.record.title,
        website: this.record.website,
        username: this.record.username,
        password: this.record.password,
        notes: this.record.notes,
      };
    }
  }

  ngOnDestroy() {
    this.wipeForm();
  }

  isValid() {
    return this.form.title && this.form.username && this.form.password;
  }

  triggerClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
      this.wipeForm();
    }, 400);
  }

  private wipeForm() {
    this.form.title = '';
    this.form.website = '';
    this.form.username = '';
    this.form.password = '';
    this.form.notes = '';
  }

  generatePassword() {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~';
    const length = 20;
    let retVal = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      retVal += charset.charAt(array[i] % charset.length);
    }
    this.form.password = retVal;
    array.fill(0);
    this.showPwd.set(true);
  }

  async submit() {
    if (!this.isValid()) return;
    this.isSubmitting.set(true);
    try {
      this.save.emit({ ...this.form });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
