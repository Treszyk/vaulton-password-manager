import { Injectable, signal, effect } from '@angular/core';

export interface AppSettings {
  showStarfield: boolean;
  timeoutSeconds: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  showStarfield: true,
  timeoutSeconds: 300,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly showStarfield = signal<boolean>(DEFAULT_SETTINGS.showStarfield);
  readonly timeoutSeconds = signal<number>(DEFAULT_SETTINGS.timeoutSeconds);

  constructor() {
    this.loadSettings();

    // Auto-save whenever settings change
    effect(() => {
      this.saveSettings();
    });
  }

  private loadSettings() {
    try {
      const stored = localStorage.getItem('vaulton_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.showStarfield.set(parsed.showStarfield ?? DEFAULT_SETTINGS.showStarfield);
        this.timeoutSeconds.set(parsed.timeoutSeconds ?? DEFAULT_SETTINGS.timeoutSeconds);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }

  private saveSettings() {
    try {
      const settings: AppSettings = {
        showStarfield: this.showStarfield(),
        timeoutSeconds: this.timeoutSeconds(),
      };
      localStorage.setItem('vaulton_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  toggleStarfield() {
    this.showStarfield.update((v) => !v);
  }

  updateTimeout(seconds: number) {
    this.timeoutSeconds.set(seconds);
  }
}
