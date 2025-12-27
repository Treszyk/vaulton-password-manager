import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vaulton-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="relative w-full h-full">
      <router-outlet></router-outlet>
    </div>
  `,
})
export class VaultonShellComponent {}
