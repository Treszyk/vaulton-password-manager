import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vault-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full h-full flex flex-col items-center justify-center p-12 text-center text-white/20 animate-fade-in"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-24 h-24 mb-6 opacity-20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h2 class="text-2xl font-black uppercase tracking-[0.2em] mb-2">Vault Unlocked</h2>
      <p class="text-sm font-medium opacity-50">Secure Environment Ready</p>
    </div>
  `,
})
export class VaultDashboardComponent {}
