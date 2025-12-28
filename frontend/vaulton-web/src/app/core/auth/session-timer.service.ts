import { Injectable, signal, inject, NgZone, OnDestroy, effect, untracked } from '@angular/core';
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
  tap,
  EMPTY,
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

  private targetTimestamp = 0;

  constructor() {
    effect(() => {
      const _ = this.settings.timeoutSeconds();
      untracked(() => {
        this.restartTracker();
      });
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
            const now = Date.now();

            if (this.targetTimestamp > 0 && now > this.targetTimestamp) {
              this.ngZone.run(() => this.lockVault());
              return EMPTY;
            }

            this.ngZone.run(() => this.resetTarget());

            return timer(0, 1000).pipe(
              takeUntil(this.stopTracker$),
              map(() => {
                const currentNow = Date.now();
                const diff = this.targetTimestamp - currentNow;
                const realRemaining = Math.ceil(diff / 1000);

                if (realRemaining <= 0) {
                  return 0;
                }

                return Math.min(this.settings.timeoutSeconds(), realRemaining);
              })
            );
          })
        )
        .subscribe({
          next: (remaining) => {
            this.ngZone.run(() => {
              if (this.remainingSeconds() !== remaining) {
                this.remainingSeconds.set(remaining);
              }

              this.isAboutToLock.set(remaining < 60 && remaining > 0);

              if (remaining <= 0) {
                this.lockVault();
              }
            });
          },
        });

      this.ngZone.run(() => this.resetTarget());
    });
  }

  private resetToMax() {
    const max = this.settings.timeoutSeconds();
    if (this.remainingSeconds() !== max) {
      this.remainingSeconds.set(max);
    }
    this.isAboutToLock.set(false);
  }

  private resetTarget() {
    const now = Date.now();
    this.targetTimestamp = now + 5000 + this.settings.timeoutSeconds() * 1000;
    this.resetToMax();
  }

  private lockVault() {
    if (this.crypto.isUnlocked()) {
      this.crypto.clearKeys();
    }
  }

  getFormattedTime(): string {
    const mins = Math.floor(this.remainingSeconds() / 60);
    const secs = this.remainingSeconds() % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  reset() {
    this.resetTarget();
    this.restartTracker();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTracker$.next();
    this.stopTracker$.complete();
  }
}
