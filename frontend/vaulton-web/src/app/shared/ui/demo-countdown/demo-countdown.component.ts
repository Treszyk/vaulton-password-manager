import { Component, signal, OnDestroy, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-demo-countdown',
  standalone: true,
  templateUrl: './demo-countdown.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class DemoCountdownComponent implements OnDestroy {
  countdown = signal('00:00:00');
  isProduction = signal(false);
  private intervalId?: number;

  constructor() {
    this.checkProduction();
    if (this.isProduction()) {
      this.updateCountdown();
      this.intervalId = window.setInterval(() => this.updateCountdown(), 1000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private checkProduction() {
    const hostname = window.location.hostname;
    this.isProduction.set(
      hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.'),
    );
  }

  private updateCountdown() {
    const now = new Date();
    const nowUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    );

    const midnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    );

    const noon = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0);

    const nextMidnight = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    );

    let nextWipe: number;
    if (nowUtc < noon) {
      nextWipe = noon;
    } else {
      nextWipe = nextMidnight;
    }

    const diff = nextWipe - nowUtc;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.countdown.set(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    );
  }
}
