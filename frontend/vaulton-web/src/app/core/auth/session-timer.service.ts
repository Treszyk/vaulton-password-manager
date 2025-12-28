import { Injectable, signal, inject, NgZone, OnDestroy, effect } from '@angular/core';
import { AuthCryptoService } from './auth-crypto.service';
import { SettingsService } from '../../core/settings/settings.service';
import { Router } from '@angular/router';
import {
  fromEvent,
  merge,
  Subject,
  takeUntil,
  timer,
  switchMap,
  map,
  startWith,
  takeWhile,
  throttleTime,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionTimerService implements OnDestroy {
  readonly crypto = inject(AuthCryptoService);
  readonly settings = inject(SettingsService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly destroy$ = new Subject<void>();
  private readonly stopTracker$ = new Subject<void>();

  readonly remainingSeconds = signal(300);
  readonly isAboutToLock = signal(false);

  constructor() {
    effect(() => {
      const _ = this.settings.timeoutSeconds();
      this.restartTracker();
    });
  }

  private restartTracker() {
    this.stopTracker$.next();
    this.initInactivityTracker();
  }

  private initInactivityTracker() {
    this.ngZone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(window, 'mousemove'),
        fromEvent(window, 'mousedown'),
        fromEvent(window, 'keydown'),
        fromEvent(window, 'scroll'),
        fromEvent(window, 'touchstart')
      );

      activity$
        .pipe(
          startWith(null),
          takeUntil(this.destroy$),
          takeUntil(this.stopTracker$),
          throttleTime(200),
          switchMap(() => {
            this.ngZone.run(() => this.resetTimer());
            const timeout = this.settings.timeoutSeconds();
            return timer(5000, 1000).pipe(
              takeUntil(this.stopTracker$),
              map((tick) => timeout - 1 - tick),
              takeWhile((remaining) => remaining >= 0)
            );
          })
        )
        .subscribe({
          next: (remaining) => {
            this.ngZone.run(() => {
              this.remainingSeconds.set(remaining);
              this.isAboutToLock.set(remaining < 60);
              if (remaining === 0) {
                this.lockVault();
              }
            });
          },
        });

      this.ngZone.run(() => this.resetTimer());
    });
  }

  private resetTimer() {
    this.remainingSeconds.set(this.settings.timeoutSeconds());
    this.isAboutToLock.set(false);
  }

  private lockVault() {
    this.crypto.clearKeys();
  }

  getFormattedTime(): string {
    const mins = Math.floor(this.remainingSeconds() / 60);
    const secs = this.remainingSeconds() % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTracker$.next();
    this.stopTracker$.complete();
  }
}
