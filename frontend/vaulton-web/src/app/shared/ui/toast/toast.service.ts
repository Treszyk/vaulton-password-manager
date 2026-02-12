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

  private queueList: { msg: string; success: boolean }[] = [];
  private isProcessing = false;

  trigger(msg: string, success: boolean = true) {
    this.queueList.push({ msg, success });

    if (this.queueList.length > 5) {
      this.queueList = this.queueList.slice(-5);
    }

    this.processQueue();
  }

  private processQueue() {
    if (this.isProcessing || this.queueList.length === 0) {
      return;
    }

    this.isProcessing = true;
    const next = this.queueList.shift();
    if (!next) {
      this.isProcessing = false;
      return;
    }

    this.message.set(next.msg);
    this.isSuccess.set(next.success);

    this.show.set(false);

    setTimeout(() => {
      this.show.set(true);

      setTimeout(() => {
        this.show.set(false);

        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, 400);
      }, 3000);
    }, 50);
  }

  queue(msg: string, success: boolean = true) {
    sessionStorage.setItem('vaulton_toast_queue', JSON.stringify({ msg, success }));
  }
}
