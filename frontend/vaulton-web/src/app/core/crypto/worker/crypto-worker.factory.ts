import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoWorkerFactory {
  create(): Worker {
    if (typeof Worker !== 'undefined') {
      return new Worker(new URL('./crypto.worker', import.meta.url));
    } else {
      throw new Error('Web Workers are required for this application.');
    }
  }
}
