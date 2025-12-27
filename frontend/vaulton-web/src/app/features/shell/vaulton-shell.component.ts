import { Component, inject, ViewEncapsulation } from '@angular/core';
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
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  template: `
    <div class="relative w-full h-full overflow-hidden flex flex-col">
      <app-starfield></app-starfield>

      <div class="relative z-10 w-full flex-1 min-h-0 flex flex-col">
        <router-outlet></router-outlet>
      </div>

      <div
        *ngIf="(authState.isInitialized() && !crypto.isUnlocked()) || session.showWipeConfirm()"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in"
      >
        <app-unlock-overlay
          *ngIf="!session.showWipeConfirm()"
          class="w-full flex justify-center"
        ></app-unlock-overlay>

        <app-wipe-confirmation
          *ngIf="session.showWipeConfirm()"
          (confirmWipe)="session.wipeDevice()"
          (cancel)="session.cancelWipeConfirm()"
          class="w-full flex justify-center"
        ></app-wipe-confirmation>
      </div>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
})
export class VaultonShellComponent {
  protected readonly crypto = inject(AuthCryptoService);
  protected readonly authState = inject(AuthStateService);
  protected readonly session = inject(SessionService);
}
