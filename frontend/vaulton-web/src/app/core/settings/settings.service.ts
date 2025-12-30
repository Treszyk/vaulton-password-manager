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

  constructor() {}

  loadSettings(accountId: string) {
    try {
      const stored = localStorage.getItem(`vaulton_settings_${accountId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.showStarfield.set(parsed.showStarfield ?? DEFAULT_SETTINGS.showStarfield);
        this.timeoutSeconds.set(parsed.timeoutSeconds ?? DEFAULT_SETTINGS.timeoutSeconds);
      } else {
        this.showStarfield.set(DEFAULT_SETTINGS.showStarfield);
        this.timeoutSeconds.set(DEFAULT_SETTINGS.timeoutSeconds);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }

  private saveSettings(accountId: string) {
    try {
      const settings: AppSettings = {
        showStarfield: this.showStarfield(),
        timeoutSeconds: this.timeoutSeconds(),
      };
      localStorage.setItem(`vaulton_settings_${accountId}`, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  toggleStarfield(accountId: string) {
    this.showStarfield.update((v) => !v);
    this.saveSettings(accountId);
  }

  updateTimeout(accountId: string, seconds: number) {
    this.timeoutSeconds.set(seconds);
    this.saveSettings(accountId);
  }

  clearSettings(accountId: string) {
    localStorage.removeItem(`vaulton_settings_${accountId}`);

    this.showStarfield.set(DEFAULT_SETTINGS.showStarfield);
    this.timeoutSeconds.set(DEFAULT_SETTINGS.timeoutSeconds);
  }
}
