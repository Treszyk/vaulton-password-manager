import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { SessionService } from '../../core/auth/session.service';

@Component({
  selector: 'app-unlock-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
    >
      <div
        class="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/5 shadow-2xl animate-slide-up"
      >
        <div class="flex flex-col items-center text-center mb-8">
          <div
            class="w-16 h-16 rounded-full bg-vault-purple/20 flex items-center justify-center mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-8 h-8 text-vault-purple"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 class="text-2xl font-black uppercase tracking-[0.2em] text-white/90">Vault Locked</h2>
          <p class="text-sm text-white/40 mt-2 font-medium">
            Please enter your Master Password to proceed
          </p>
        </div>

        <form (submit)="unlock()" class="space-y-4">
          <div class="relative group">
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Master Password"
              class="w-full !bg-white/5 !border-white/10 focus:!border-vault-purple/50 !rounded-2xl !py-4 transition-all"
              [disabled]="isWorking()"
              autofocus
            />
          </div>

          <button
            type="submit"
            class="w-full btn-primary !rounded-2xl !py-4 flex items-center justify-center gap-3 group"
            [disabled]="isWorking() || !password()"
          >
            <span *ngIf="!isWorking()" class="font-black uppercase tracking-[0.2em]"
              >Unlock Vault</span
            >
            <div
              *ngIf="isWorking()"
              class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></div>
          </button>

          <button
            type="button"
            class="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-red-400 transition-all active:scale-[0.98]"
            (click)="triggerWipe()"
            [disabled]="isWorking()"
          >
            Wipe this Device
          </button>

          <p
            *ngIf="error()"
            class="text-center text-red-400 text-xs font-bold animate-shake uppercase tracking-widest mt-4"
          >
            {{ error() }}
          </p>
        </form>
      </div>
    </div>
  `,
})
export class UnlockOverlayComponent {
  private readonly crypto = inject(AuthCryptoService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly session = inject(SessionService);

  password = signal('');
  isWorking = signal(false);
  error = signal<string | null>(null);

  async unlock() {
    if (this.isWorking()) return;
    this.isWorking.set(true);
    this.error.set(null);

    try {
      const bundle = await this.persistence.getBundle();
      if (!bundle) {
        this.error.set('No vault bundle found');
        return;
      }

      await this.crypto.unlock(this.password(), bundle);
      this.password.set('');
    } catch (e: any) {
      this.error.set('Incorrect Password');
    } finally {
      this.isWorking.set(false);
    }
  }

  triggerWipe() {
    this.session.triggerWipeConfirm();
  }
}
