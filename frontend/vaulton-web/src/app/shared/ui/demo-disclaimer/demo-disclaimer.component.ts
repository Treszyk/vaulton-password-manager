import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-demo-disclaimer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full flex justify-center py-2 px-4 animate-fade-in pointer-events-none select-none text-center md:fixed md:bottom-0 md:left-0 md:z-[100] md:bg-black/5 md:backdrop-blur-[2px]"
    >
      <div class="text-[0.75rem] font-black uppercase tracking-[0.2em] text-red-500/80">
        Public Demo • All Data purged in:
        <span class="font-black text-red-500">{{ countdown() }}</span>
      </div>
    </div>
  `,
})
export class DemoDisclaimerComponent implements OnInit, OnDestroy {
  countdown = signal<string>('00:00:00');
  private timerSub?: Subscription;

  ngOnInit(): void {
    this.updateCountdown();
    this.timerSub = interval(1000).subscribe(() => this.updateCountdown());
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
  }

  private updateCountdown(): void {
    const now = new Date();
    const nowUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    );

    const purge12 = new Date(now);
    purge12.setUTCHours(12, 0, 0, 0);
    const purge12Utc = purge12.getTime();

    const purge00 = new Date(now);
    purge00.setUTCHours(24, 0, 0, 0);
    const purge00Utc = purge00.getTime();

    let nextPurgeUtc: number;
    if (nowUtc < purge12Utc) {
      nextPurgeUtc = purge12Utc;
    } else {
      nextPurgeUtc = purge00Utc;
    }

    const diffMs = nextPurgeUtc - nowUtc;
    if (diffMs <= 0) {
      this.countdown.set('00:00:00');
      return;
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const formatted = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');

    this.countdown.set(formatted);
  }
}
