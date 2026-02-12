import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionUiService {
  readonly showWipeConfirm = signal(false);
  readonly showLogoutConfirm = signal(false);
  readonly showLogoutAllConfirm = signal(false);

  triggerWipeConfirm(): void {
    this.showWipeConfirm.set(true);
  }

  cancelWipeConfirm(): void {
    this.showWipeConfirm.set(false);
  }

  triggerLogoutConfirm(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogoutConfirm(): void {
    this.showLogoutConfirm.set(false);
  }

  triggerLogoutAllConfirm(): void {
    this.showLogoutAllConfirm.set(true);
  }

  cancelLogoutAllConfirm(): void {
    this.showLogoutAllConfirm.set(false);
  }
}
