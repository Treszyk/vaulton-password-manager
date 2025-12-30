import {
  Component,
  inject,
  signal,
  ViewEncapsulation,
  OnInit,
  QueryList,
  ViewChildren,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { SessionService } from '../../core/auth/session.service';
import { AuthApiService } from '../../core/api/auth-api.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { SessionTimerService } from '../../core/auth/session-timer.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-unlock-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-md p-8 rounded-3xl overlay-card animate-slide-up">
      <div class="flex flex-col items-center text-center mb-8">
        <div
          class="w-20 h-20 rounded-full bg-vault-purple/10 flex items-center justify-center mx-auto mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-10 h-10 text-vault-purple"
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
          Verify identity to resume
        </p>
      </div>

      <!-- Mode Choice (Tabs) -->
      <div *ngIf="hasPasscode()" class="flex p-1 bg-white/5 rounded-2xl mb-8 border border-white/5 relative">
        <button
          (click)="setMode('PASSWORD')"
          class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 relative z-10"
          [class.text-white]="mode() === 'PASSWORD'"
          [class.text-white/40]="mode() !== 'PASSWORD'"
        >
          Password
        </button>
        <button
          (click)="setMode('PASSCODE')"
          class="flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 relative z-10"
          [class.text-white]="mode() === 'PASSCODE'"
          [class.text-white/40]="mode() !== 'PASSCODE'"
        >
          Passcode
        </button>
        
        <div
          class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-vault-purple rounded-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) -z-0 left-1"
           [style.transform]="mode() === 'PASSWORD' ? 'translateX(0)' : 'translateX(100%)'"
        ></div>
      </div>

      <div class="relative min-h-[140px]">
        <!-- PASSWORD MODE -->
        <form *ngIf="mode() === 'PASSWORD'" (submit)="unlock()" class="space-y-4 animate-fade-in">
          <div class="relative group">
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Master Password"
              class="w-full !bg-white/5 !border-white/15 focus:!border-vault-purple/50 !rounded-2xl !py-4 transition-all"
              [disabled]="isWorking()"
              autofocus
            />
          </div>

          <button
            type="submit"
            class="w-full btn-primary !rounded-2xl !py-4 flex items-center justify-center gap-3 group overflow-hidden relative"
            [disabled]="isWorking() || !password()"
          >
            <span *ngIf="!isWorking()" class="font-black uppercase tracking-[0.2em] relative z-10">Unlock Vault</span>
             <span *ngIf="isWorking()" class="flex items-center gap-2 relative z-10">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-black uppercase tracking-[0.2em]">Unlocking...</span>
             </span>
             <div class="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </form>

        <!-- PASSCODE MODE -->
        <div *ngIf="mode() === 'PASSCODE'" class="flex flex-col items-center gap-8 animate-fade-in">
          <div class="space-y-4 text-center w-full">
            <div class="flex items-center justify-between px-1">
              <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">6-Character Passcode</label>
              <button (click)="togglePinVisibility()" class="text-white/30 hover:text-white transition-colors">
                <svg *ngIf="pinVisibility()" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg *ngIf="!pinVisibility()" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>
            </div>
            <div class="flex justify-center gap-2">
               <input 
                 *ngFor="let i of [0,1,2,3,4,5]"
                 #pinInput
                 [type]="pinVisibility() ? 'text' : 'password'"
                 maxlength="1"
                  class="w-10 h-14 bg-white/5 border border-white/10 rounded-xl focus:border-vault-purple text-center text-white text-2xl font-bold transition-all !px-0"
                 (input)="onPinInput($event, i)"
                 (keydown)="onPinKeyDown($event, i)"
                 [(ngModel)]="pinDigits[i]"
                 [name]="'pin' + i"
                 autocomplete="off"
                 [disabled]="isWorking()"
               >
            </div>
            
            <!-- Spinner Container in empty space -->
            <div class="min-h-[24px] flex items-center justify-center transition-all duration-300"
                 [class.opacity-0]="!isWorking()"
                 [class.opacity-100]="isWorking()">
                <div class="flex items-center gap-2 text-vault-purple">
                   <svg class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <span class="text-[10px] font-bold uppercase tracking-wider text-white/60">Verifying...</span>
                </div>
            </div>

          </div>
        </div>
      </div>

      <div class="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          class="py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 hover:text-vault-purple transition-all active:scale-[0.98]"
          (click)="triggerLogout()"
          [disabled]="isWorking()"
        >
          Logout
        </button>
        <div class="w-1 h-1 rounded-full bg-white/10"></div>
        <button
          type="button"
          class="py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/55 hover:text-red-400 transition-all active:scale-[0.98]"
          (click)="triggerWipe()"
          [disabled]="isWorking()"
        >
          Wipe Device
        </button>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class UnlockOverlayComponent implements OnInit {
  private readonly crypto = inject(AuthCryptoService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly session = inject(SessionService);
  private readonly api = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);
  private readonly sessionTimer = inject(SessionTimerService);
  private readonly toast = inject(ToastService);

  mode = signal<'PASSWORD' | 'PASSCODE'>('PASSWORD');
  hasPasscode = signal(false);
  password = signal('');
  pinDigits: string[] = ['', '', '', '', '', ''];
  pinVisibility = signal(false);
  isWorking = signal(false);

  indexMap = [0, 1, 2, 3, 4, 5];
  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  async ngOnInit() {
    const wrap = await this.persistence.getLocalPasscode();
    if (wrap) {
      this.hasPasscode.set(true);
      this.mode.set('PASSCODE');
    }
  }

  setMode(m: 'PASSWORD' | 'PASSCODE') {
    this.mode.set(m);
    this.password.set('');
    this.pinDigits = ['', '', '', '', '', ''];
  }

  togglePinVisibility() {
    this.pinVisibility.update((v) => !v);
  }

  onPinInput(event: any, index: number) {
    const val = event.target.value;
    if (val && index < 5) {
      this.pinInputs.toArray()[index + 1].nativeElement.focus();
    }

    const pin = this.pinDigits.join('');
    if (pin.length === 6) {
      setTimeout(() => this.unlockViaPasscode(), 50);
    }
  }

  onPinKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.pinDigits[index] && index > 0) {
      this.pinInputs.toArray()[index - 1].nativeElement.focus();
    }
  }

  async unlock() {
    if (this.isWorking()) return;
    this.isWorking.set(true);

    const password = this.password();
    this.password.set('');

    try {
      let bundle = await this.persistence.getBundle();

      if (!bundle) {
        let accountId = this.authState.accountId();

        if (!accountId) {
          try {
            const me = await firstValueFrom(this.api.me());
            accountId = me.accountId;
            this.authState.setAccountId(accountId);
          } catch {
            this.toast.trigger('Session expired. Please login again.');
            return;
          }
        }

        const pre = await firstValueFrom(this.api.preLogin(accountId));
        const { verifier } = await this.crypto.buildLogin(password, pre);
        const res = await firstValueFrom(
          this.api.login({ AccountId: accountId, Verifier: verifier })
        );

        if (!res.MkWrapPwd) {
          throw new Error('Vault keys missing on server');
        }

        await this.crypto.finalizeLogin(res.MkWrapPwd, pre.CryptoSchemaVer, accountId);

        this.authState.setAccessToken(res.Token);
        await this.persistence.saveBundle({
          AccountId: accountId,
          S_Pwd: pre.S_Pwd,
          KdfMode: pre.KdfMode,
          CryptoSchemaVer: pre.CryptoSchemaVer,
          MkWrapPwd: res.MkWrapPwd,
          MkWrapRk: res.MkWrapRk || null,
        });
      } else {
        await this.crypto.unlock(password, bundle);
      }
      this.sessionTimer.reset();
    } catch (e: any) {
      if (e.status === 401 || e.message?.includes('401')) {
        this.toast.trigger('Incorrect Password', false);
      } else {
        this.toast.trigger('Unlock Failed', false);
      }
    } finally {
      this.isWorking.set(false);
    }
  }

  async unlockViaPasscode() {
    if (this.isWorking()) return;
    const pin = this.pinDigits.join('');
    if (pin.length !== 6) return;

    this.isWorking.set(true);

    try {
      const wrap = await this.persistence.getLocalPasscode();
      if (!wrap) throw new Error('Security wrap missing');

      await this.crypto.unlockViaPasscode(pin, wrap.S_Local, wrap.MkWrapLocal, wrap.AccountId);
      this.sessionTimer.reset();
    } catch (err: any) {
      this.toast.trigger('Incorrect Passcode', false);
      this.pinDigits = ['', '', '', '', '', ''];

      const inputs = this.pinInputs.toArray();
      inputs[0]?.nativeElement.focus();
    } finally {
      this.isWorking.set(false);
    }
  }

  triggerLogout() {
    this.session.triggerLogoutConfirm();
  }

  triggerWipe() {
    this.session.triggerWipeConfirm();
  }
}
