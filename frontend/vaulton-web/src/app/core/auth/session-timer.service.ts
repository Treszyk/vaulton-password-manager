import { Injectable, signal, inject, NgZone, OnDestroy } from '@angular/core';
import { AuthCryptoService } from './auth-crypto.service';
import { Router } from '@angular/router';
import {
  fromEvent,
  merge,
  Subject,
  takeUntil,
  timer,
  repeat,
  switchMap,
  map,
  takeWhile,
  throttleTime,
  distinctUntilChanged,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionTimerService implements OnDestroy {
  private readonly crypto = inject(AuthCryptoService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly TIMEOUT_SECONDS = 300;
  private readonly destroy$ = new Subject<void>();

  readonly remainingSeconds = signal(this.TIMEOUT_SECONDS);
  readonly isAboutToLock = signal(false);

  constructor() {
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
          takeUntil(this.destroy$),
          throttleTime(200),
          switchMap(() => {
            this.ngZone.run(() => this.resetTimer());
            return timer(5000, 1000).pipe(
              map((tick) => this.TIMEOUT_SECONDS - 1 - tick),
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
    this.remainingSeconds.set(this.TIMEOUT_SECONDS);
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
  }
}
