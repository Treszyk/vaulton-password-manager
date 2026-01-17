import { Component, inject, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../../core/settings/settings.service';
import { AuthPersistenceService } from '../../../../core/auth/auth-persistence.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { PasscodeSetupComponent } from '../passcode-setup/passcode-setup.component';
import { RekeyVaultComponent } from '../rekey-vault/rekey-vault.component';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, PasscodeSetupComponent, RekeyVaultComponent],
  templateUrl: './security-settings.component.html',
  host: {
    class: 'flex flex-col gap-8',
  },
})
export class SecuritySettingsComponent implements OnInit {
  protected readonly settings = inject(SettingsService);
  protected readonly persistence = inject(AuthPersistenceService);
  protected readonly toast = inject(ToastService);

  accountId = input.required<string>();
  initialShowPasscodeSetup = input<boolean>(false);

  isPasscodeEnabled = signal(false);
  showPasscodeSetup = signal(false);

  async ngOnInit() {
    if (this.initialShowPasscodeSetup()) {
      this.showPasscodeSetup.set(true);
    }

    const id = this.accountId();
    if (id) {
      const wrap = await this.persistence.getLocalPasscode(id);
      this.isPasscodeEnabled.set(!!wrap);
    }
  }

  togglePasscode() {
    if (this.isPasscodeEnabled()) {
      const id = this.accountId();
      if (id) {
        this.persistence.clearLocalPasscode(id).then(() => {
          this.isPasscodeEnabled.set(false);
          this.toast.trigger('Local Passcode Disabled');
        });
      }
    } else {
      this.showPasscodeSetup.set(true);
    }
  }

  cancelPasscodeSetup() {
    this.showPasscodeSetup.set(false);
  }

  onPasscodeSetupFinished() {
    this.isPasscodeEnabled.set(true);
    this.showPasscodeSetup.set(false);
  }
}
