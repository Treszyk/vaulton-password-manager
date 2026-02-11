import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

let workerPolicy: any = null;

export function getWorkerPolicy(): any {
  if (workerPolicy) return workerPolicy;

  const win = window as any;
  if (win.trustedTypes && win.trustedTypes.createPolicy) {
    try {
      workerPolicy = win.trustedTypes.createPolicy('vaulton-worker-policy', {
        createScriptURL: (url: string) => {
          if (url.startsWith('blob:')) return url;

          try {
            const parsed = new URL(url, document.baseURI);

            if (parsed.origin !== window.location.origin) {
              throw new Error('Cross-origin worker scripts are blocked by policy.');
            }

            if (!parsed.pathname.endsWith('.js') && !parsed.pathname.endsWith('.mjs')) {
              throw new Error('Worker script must be a JavaScript file.');
            }

            return parsed.href;
          } catch (e) {
            throw new Error(`Invalid worker URL: ${url}`);
          }
        },
        createHTML: (html: string) => DOMPurify.sanitize(html),
      });
    } catch (e) {
      // Re-creating trusted type policy failed
    }
  }
  return workerPolicy;
}

@Injectable({ providedIn: 'root' })
export class CryptoWorkerFactory {
  create(): Worker {
    if (typeof Worker !== 'undefined') {
      const win = window as any;
      const OriginalWorker = win.Worker;
      const policy = getWorkerPolicy();

      if (policy) {
        win.Worker = class TrustedWorkerProxy extends OriginalWorker {
          constructor(scriptURL: string | URL, options?: WorkerOptions) {
            const safeUrl = policy.createScriptURL(scriptURL.toString());
            super(safeUrl, options);
          }
        };
      }

      try {
        return new Worker(new URL('./crypto.worker', import.meta.url), { type: 'module' });
      } finally {
        if (policy) {
          win.Worker = OriginalWorker;
        }
      }
    } else {
      throw new Error('Web Workers are required for this application.');
    }
  }
}
