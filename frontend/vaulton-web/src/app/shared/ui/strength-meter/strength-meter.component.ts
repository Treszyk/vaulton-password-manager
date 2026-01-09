import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as commonDictionary } from '@zxcvbn-ts/language-common';
import { translations as enTranslations, dictionary as enDictionary } from '@zxcvbn-ts/language-en';
import { translations as plTranslations, dictionary as plDictionary } from '@zxcvbn-ts/language-pl';

@Component({
  selector: 'app-strength-meter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-1.5 opacity-90 hover:opacity-100 transition-opacity">
      <div class="flex gap-1 h-1 w-full">
        <div
          class="flex-1 rounded-full bg-zinc-900 overflow-hidden transition-all duration-300"
          [style.background-color]="(score() >= 0 || !visible) && password ? segmentColor : ''"
          [style.box-shadow]="
            (score() >= 0 || !visible) && password ? '0 0 10px ' + segmentColor + '80' : ''
          "
        ></div>
        <div
          class="flex-1 rounded-full bg-zinc-900 overflow-hidden transition-all duration-300"
          [style.background-color]="(score() >= 2 || !visible) && password ? segmentColor : ''"
          [style.box-shadow]="
            (score() >= 2 || !visible) && password ? '0 0 10px ' + segmentColor + '80' : ''
          "
        ></div>
        <div
          class="flex-1 rounded-full bg-zinc-900 overflow-hidden transition-all duration-300"
          [style.background-color]="(score() >= 3 || !visible) && password ? segmentColor : ''"
          [style.box-shadow]="
            (score() >= 3 || !visible) && password ? '0 0 10px ' + segmentColor + '80' : ''
          "
        ></div>
        <div
          class="flex-1 rounded-full bg-zinc-900 overflow-hidden transition-all duration-300"
          [style.background-color]="(score() >= 4 || !visible) && password ? segmentColor : ''"
          [style.box-shadow]="
            (score() >= 4 || !visible) && password ? '0 0 10px ' + segmentColor + '80' : ''
          "
        ></div>
      </div>

      <div
        class="flex justify-between items-center text-xs font-black uppercase tracking-[0.2em] transition-colors duration-300"
        [ngClass]="colorClass"
      >
        <span>{{ label() }}</span>
      </div>
    </div>
  `,
})
export class StrengthMeterComponent implements OnChanges {
  @Input() password = '';
  @Input() visible = true;

  score = signal(0);
  label = signal('Empty');

  constructor() {
    const options = {
      translations: {
        ...enTranslations,
        ...plTranslations,
      },
      graphs: adjacencyGraphs,
      dictionary: {
        ...commonDictionary,
        ...enDictionary,
        ...plDictionary,
      },
    };
    zxcvbnOptions.setOptions(options);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['password'] || changes['visible']) {
      this.evaluate(this.password);
    }
  }

  private evaluate(pwd: string) {
    if (!pwd || !this.visible) {
      this.score.set(0);
      this.label.set(!pwd ? 'Empty' : 'Hidden');
      return;
    }

    const result = zxcvbn(pwd);
    const entropy = result.guessesLog10;

    let score = 0;
    if (entropy < 7) score = 0;
    else if (entropy < 9) score = 1;
    else if (entropy < 11) score = 2;
    else if (entropy < 13) score = 3;
    else score = 4;

    this.score.set(score);

    switch (score) {
      case 0:
        this.label.set('Very Weak');
        break;
      case 1:
        this.label.set('Weak');
        break;
      case 2:
        this.label.set('Fair');
        break;
      case 3:
        this.label.set('Good');
        break;
      case 4:
        this.label.set('Strong');
        break;
    }
  }

  get segmentColor(): string {
    if (!this.password) return '';
    if (!this.visible) return '#7c3aed';
    const s = this.score();
    if (s <= 1) return '#ef4444';
    if (s === 2) return '#f97316';
    if (s === 3) return '#facc15';
    if (s === 4) return '#22c55e';
    return '';
  }

  get colorClass() {
    if (!this.password) return 'text-zinc-500';
    if (!this.visible) return 'text-vault-purple-bright';
    const s = this.score();
    switch (s) {
      case 0:
      case 1:
        return 'text-red-500';
      case 2:
        return 'text-orange-500';
      case 3:
        return 'text-yellow-400';
      case 4:
        return 'text-green-500';
      default:
        return 'text-zinc-500';
    }
  }
}
