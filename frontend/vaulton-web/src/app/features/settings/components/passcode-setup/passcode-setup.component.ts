import {
  Component,
  inject,
  signal,
  QueryList,
  ViewChildren,
  ElementRef,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { AuthPersistenceService } from '../../../../core/auth/auth-persistence.service';
import { AuthCryptoService } from '../../../../core/auth/auth-crypto.service';
import { AuthApiService } from '../../../../core/api/auth-api.service';

@Component({
  selector: 'app-passcode-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './passcode-setup.component.html',
})
export class PasscodeSetupComponent {
  private readonly toast = inject(ToastService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly crypto = inject(AuthCryptoService);
  private readonly api = inject(AuthApiService);

  isPasscodeEnabled = input<boolean>(false);

  cancel = output<void>();
  setupFinished = output<void>();

  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  isPasscodeBusy = signal(false);
  confirmPasswordForPasscode = '';
  pinDigits = ['', '', '', '', '', ''];
  pinVisibility = signal(false);

  togglePinVisibility() {
    this.pinVisibility.update((v) => !v);
  }

  onPinInput(event: any, index: number) {
    const val = event.target.value;
    if (val && index < 5) {
      this.pinInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onPinKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.pinDigits[index] && index > 0) {
      this.pinInputs.toArray()[index - 1].nativeElement.focus();
    }
  }

  async finishPasscodeSetup() {
    const pin = this.pinDigits.join('');
    if (pin.length !== 6) {
      this.toast.trigger('PIN must be 6 digits');
      return;
    }
    if (!this.confirmPasswordForPasscode) {
      this.toast.trigger('Confirm with Master Password');
      return;
    }

    this.isPasscodeBusy.set(true);
    try {
      const bundle = await this.persistence.getBundle();
      if (!bundle) throw new Error('No vault session found');

      const adminVerifier = await this.crypto.deriveAdminVerifier(
        this.confirmPasswordForPasscode,
        bundle.S_Pwd,
        bundle.KdfMode,
      );

      const wraps = await this.api.getWraps({ AdminVerifier: adminVerifier }).toPromise();
      if (!wraps) throw new Error('Failed to fetch Master Key wrap');

      const res = await this.crypto.activatePasscode(
        this.confirmPasswordForPasscode,
        bundle.S_Pwd,
        bundle.KdfMode,
        pin,
        bundle.AccountId,
        wraps.MkWrapPwd,
        bundle.CryptoSchemaVer,
      );

      await this.persistence.saveLocalPasscode({
        AccountId: bundle.AccountId,
        MkWrapLocal: res.mkWrapLocal,
        S_Local: res.sLocalB64,
      });

      this.setupFinished.emit();
      this.toast.trigger('Passcode Enabled');
    } catch (err: any) {
      if (err.status == 401 || err.message?.includes('401')) {
        this.toast.trigger('INVALID CREDENTIALS', false);
      } else {
        this.toast.trigger(err.message || 'Passcode setup failed');
      }
    } finally {
      this.isPasscodeBusy.set(false);
      this.confirmPasswordForPasscode = '';
      this.pinDigits = ['', '', '', '', '', ''];
    }
  }
}
