import { Component, inject, ViewEncapsulation, effect, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StarfieldComponent } from '../../shared/ui/starfield/starfield.component';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { SessionService } from '../../core/auth/session.service';
import { SettingsService } from '../../core/settings/settings.service';
import { UnlockOverlayComponent } from './unlock-overlay/unlock-overlay.component';
import { WipeConfirmationComponent } from './wipe-confirmation.component';
import { LogoutConfirmationComponent } from './logout-confirmation.component';
import { LogoutAllConfirmationComponent } from './logout-all-confirmation.component';

@Component({
  selector: 'app-vaulton-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    StarfieldComponent,
    UnlockOverlayComponent,
    WipeConfirmationComponent,
    LogoutConfirmationComponent,
    LogoutAllConfirmationComponent,
  ],
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  template: `
    <div class="relative w-full h-full overflow-hidden flex flex-col">
      <app-starfield *ngIf="settings.showStarfield()"></app-starfield>

      <div class="relative w-full flex-1 min-h-0 flex flex-col">
        <router-outlet></router-outlet>
      </div>

      <div
        *ngIf="
          (authState.isInitialized() && !authState.isUnlocked()) ||
          session.showWipeConfirm() ||
          session.showLogoutConfirm() ||
          session.showLogoutAllConfirm()
        "
        class="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-md animate-fade-in"
      >
        <div class="min-h-full w-full flex items-center justify-center p-4">
          <app-unlock-overlay
            *ngIf="
              !session.showWipeConfirm() &&
              !session.showLogoutConfirm() &&
              !session.showLogoutAllConfirm()
            "
            class="w-full flex justify-center"
          ></app-unlock-overlay>

          <app-wipe-confirmation
            *ngIf="session.showWipeConfirm()"
            (confirmWipe)="session.wipeDevice()"
            (cancel)="session.cancelWipeConfirm()"
            class="w-full flex justify-center"
          ></app-wipe-confirmation>

          <app-logout-confirmation
            *ngIf="session.showLogoutConfirm()"
            (confirmLogout)="session.logout()"
            (cancel)="session.cancelLogoutConfirm()"
            (requestWipe)="triggerWipeFromLogout()"
            class="w-full flex justify-center"
          ></app-logout-confirmation>

          <app-logout-all-confirmation
            *ngIf="session.showLogoutAllConfirm()"
            (confirmLogoutAll)="session.logoutAll()"
            (cancel)="session.cancelLogoutAllConfirm()"
            class="w-full flex justify-center"
          ></app-logout-all-confirmation>
        </div>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class VaultonShellComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly session = inject(SessionService);
  protected readonly settings = inject(SettingsService);

  constructor() {
    effect(() => {
      const accountId = this.authState.accountId();
      if (accountId) {
        this.settings.loadSettings(accountId);
      }
    });
  }

  @HostListener('window:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.session.verifySession();
    }
  }

  triggerWipeFromLogout(): void {
    this.session.cancelLogoutConfirm();
    this.session.triggerWipeConfirm();
  }
}
