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
import { AuthPersistenceService } from '../../../core/auth/auth-persistence.service';
import { SessionService } from '../../../core/auth/session.service';
import { SessionTimerService } from '../../../core/auth/session-timer.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-unlock-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unlock-overlay.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class UnlockOverlayComponent implements OnInit {
  private readonly session = inject(SessionService);
  private readonly persistence = inject(AuthPersistenceService);
  private readonly toast = inject(ToastService);
  private readonly sessionTimer = inject(SessionTimerService);

  mode = signal<'PASSWORD' | 'PASSCODE'>('PASSWORD');
  hasPasscode = signal(false);
  password = signal('');
  pinDigits: string[] = ['', '', '', '', '', ''];
  pinVisibility = signal(false);
  isWorking = signal(false);

  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  async ngOnInit() {
    const id = await this.persistence.getAccountId();
    if (id) {
      const wrap = await this.persistence.getLocalPasscode(id);
      if (wrap) {
        this.hasPasscode.set(true);
        this.mode.set('PASSCODE');
      }
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
    if (event.target.value && index < 5) {
      this.pinInputs.toArray()[index + 1].nativeElement.focus();
    }
    if (this.pinDigits.join('').length === 6) {
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

    const pwd = this.password();
    this.password.set('');

    try {
      await this.session.unlock(pwd);
      this.sessionTimer.reset();
    } catch (e: any) {
      this.toast.trigger(e.status === 401 ? 'Incorrect Password' : 'Unlock Failed', false);
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
      await this.session.unlockViaPasscode(pin);
      this.sessionTimer.reset();
    } catch (err: any) {
      this.toast.trigger('Incorrect Passcode', false);
      this.pinDigits = ['', '', '', '', '', ''];
      this.pinInputs.toArray()[0]?.nativeElement.focus();
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
