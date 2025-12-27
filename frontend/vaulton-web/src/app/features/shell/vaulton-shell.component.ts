import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StarfieldComponent } from '../../shared/ui/starfield/starfield.component';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { SessionService } from '../../core/auth/session.service';
import { UnlockOverlayComponent } from './unlock-overlay.component';
import { WipeConfirmationComponent } from './wipe-confirmation.component';

@Component({
  selector: 'app-vaulton-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    StarfieldComponent,
    UnlockOverlayComponent,
    WipeConfirmationComponent,
  ],
  template: `
    <div class="relative w-full h-full overflow-hidden">
      <app-starfield></app-starfield>

      <div class="relative z-10 w-full h-full">
        <router-outlet></router-outlet>
      </div>

      <app-unlock-overlay
        *ngIf="authState.isInitialized() && !crypto.isUnlocked() && !session.showWipeConfirm()"
      ></app-unlock-overlay>

      <app-wipe-confirmation
        *ngIf="session.showWipeConfirm()"
        (confirmWipe)="session.wipeDevice()"
        (cancel)="session.cancelWipeConfirm()"
      ></app-wipe-confirmation>
    </div>
  `,
})
export class VaultonShellComponent {
  protected readonly crypto = inject(AuthCryptoService);
  protected readonly authState = inject(AuthStateService);
  protected readonly session = inject(SessionService);
}
