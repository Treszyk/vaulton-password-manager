import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal('');
  readonly show = signal(false);
  readonly isSuccess = signal(true);

  constructor() {
    const queued = sessionStorage.getItem('vaulton_toast_queue');
    if (queued) {
      try {
        const { msg, success } = JSON.parse(queued);
        setTimeout(() => this.trigger(msg, success), 500);
      } catch {}
      sessionStorage.removeItem('vaulton_toast_queue');
    }
  }

  trigger(msg: string, success: boolean = true) {
    this.message.set(msg);
    this.isSuccess.set(success);
    this.show.set(false);

    this.show.set(false);

    setTimeout(() => {
      this.show.set(true);

      this.show.set(true);

      setTimeout(() => {
        this.show.set(false);
        this.show.set(false);
        setTimeout(() => {
          if (!this.show()) this.message.set('');
        }, 500);
      }, 2500);
    }, 50);
  }

  queue(msg: string, success: boolean = true) {
    sessionStorage.setItem('vaulton_toast_queue', JSON.stringify({ msg, success }));
  }
}
