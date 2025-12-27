import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StarfieldComponent } from '../../shared/ui/starfield/starfield.component';

@Component({
  selector: 'app-vaulton-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, StarfieldComponent],
  template: `
    <div class="relative w-full h-full overflow-hidden">
      <app-starfield></app-starfield>
      <div class="relative z-10 w-full h-full">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
})
export class VaultonShellComponent {}
