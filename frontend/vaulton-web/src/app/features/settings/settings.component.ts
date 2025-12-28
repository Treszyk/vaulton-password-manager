import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/settings/settings.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { AuthApiService } from '../../core/api/auth-api.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: {
    class: 'flex-1 min-h-0 flex flex-col',
  },
  template: `
    <div class="w-full h-full flex flex-col items-center justify-start p-6 pb-0">
      <div class="w-full max-w-2xl h-full flex flex-col gap-8 relative z-10">
        

        <div class="flex-none flex flex-col gap-8 animate-slide-in-top">

          <header class="flex flex-col gap-2">
            <h1 class="text-3xl font-black text-white tracking-tighter">
              Settings<span class="text-vault-purple">.</span>
            </h1>
            <p class="text-white/40 text-sm font-medium">Manage your vault configuration.</p>
          </header>


          <div class="flex p-1.5 bg-white/5 rounded-2xl relative z-20 border border-white/5 backdrop-blur-md">
            <button
              (click)="activeTab.set('GENERAL')"
              class="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 z-10 relative"
              [class.text-white]="activeTab() === 'GENERAL'"
              [class.text-white/40]="activeTab() !== 'GENERAL'"
            >
              General
            </button>
            <button
              (click)="activeTab.set('SECURITY')"
              class="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 z-10 relative"
              [class.text-white]="activeTab() === 'SECURITY'"
              [class.text-white/40]="activeTab() !== 'SECURITY'"
            >
              Security
            </button>
            

            <div
              class="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-vault-purple rounded-xl transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
              [style.transform]="activeTab() === 'GENERAL' ? 'translateX(0)' : 'translateX(100%)'"
              [style.left.px]="activeTab() === 'GENERAL' ? 6 : 0" 
            ></div>
          </div>
        </div>


        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth pb-20 -mr-2 pr-2">
          

          <div *ngIf="activeTab() === 'GENERAL'" class="flex flex-col gap-8 animate-fade-in pb-4">
            

            <section class="space-y-4">
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Account</h2>
              <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                 <div class="space-y-2">
                    <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Account ID</label>
                    <div class="relative group">
                      <input
                        type="text"
                        [ngModel]="accountId()"
                        readonly
                        class="w-full pl-5 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl transition-all text-white/60 font-mono"
                      />
                      <button 
                        (click)="copyToClipboard(accountId())"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/55 hover:text-vault-purple hover:bg-white/10 transition-all"
                        title="Copy ID"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                    </div>
                    <p class="text-[10px] text-white/30 pt-1">This is your unique vault identifier. Keep it safe. You need it to log in to your vault.</p>
                 </div>
              </div>
            </section>


            <section class="space-y-4">
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Visuals</h2>
              <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-white/10 transition-colors">
                <div class="flex flex-col gap-1">
                  <span class="text-sm font-bold text-white tracking-tight">Background Stars</span>
                  <span class="text-xs text-white/40">Toggle the animated starfield background.</span>
                </div>
                
                <button 
                  (click)="settings.toggleStarfield()"
                  class="w-12 h-7 rounded-full transition-colors duration-300 relative focus:outline-none"
                  [class.bg-vault-purple]="settings.showStarfield()"
                  [class.bg-white/10]="!settings.showStarfield()"
                >
                  <div 
                    class="w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-md"
                    [class.translate-x-6]="settings.showStarfield()"
                    [class.translate-x-1]="!settings.showStarfield()"
                  ></div>
                </button>
              </div>
            </section>

          </div>


          <div *ngIf="activeTab() === 'SECURITY'" class="flex flex-col gap-8 animate-fade-in pb-4">
            

            <section class="space-y-4">
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Auto-Lock Timeout</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <button
                  (click)="settings.updateTimeout(60)"
                  class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group"
                  [class.bg-vault-purple/10]="settings.timeoutSeconds() === 60"
                  [class.border-vault-purple]="settings.timeoutSeconds() === 60"
                  [class.bg-zinc-900/50]="settings.timeoutSeconds() !== 60"
                  [class.border-white/5]="settings.timeoutSeconds() !== 60"
                  [class.hover:border-white/20]="settings.timeoutSeconds() !== 60"
                >
                  <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                       [class.text-vault-purple]="settings.timeoutSeconds() === 60"
                       [class.text-white/40]="settings.timeoutSeconds() !== 60">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-white">1 Minute</div>
                    <div class="text-[10px] text-white/40 uppercase tracking-wider">Paranoid</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(300)"
                  class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group"
                  [class.bg-vault-purple/10]="settings.timeoutSeconds() === 300"
                  [class.border-vault-purple]="settings.timeoutSeconds() === 300"
                  [class.bg-zinc-900/50]="settings.timeoutSeconds() !== 300"
                  [class.border-white/5]="settings.timeoutSeconds() !== 300"
                  [class.hover:border-white/20]="settings.timeoutSeconds() !== 300"
                >
                  <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                       [class.text-vault-purple]="settings.timeoutSeconds() === 300"
                       [class.text-white/40]="settings.timeoutSeconds() !== 300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-white">5 Minutes</div>
                    <div class="text-[10px] text-white/40 uppercase tracking-wider">Recommended</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(1800)"
                  class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group"
                  [class.bg-orange-500/10]="settings.timeoutSeconds() === 1800"
                  [class.border-orange-500]="settings.timeoutSeconds() === 1800"
                  [class.bg-zinc-900/50]="settings.timeoutSeconds() !== 1800"
                  [class.border-white/5]="settings.timeoutSeconds() !== 1800"
                  [class.hover:border-white/20]="settings.timeoutSeconds() !== 1800"
                >
                   <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                       [class.text-orange-500]="settings.timeoutSeconds() === 1800"
                       [class.text-white/40]="settings.timeoutSeconds() !== 1800">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-white group-hover:text-orange-200 transition-colors">30 Minutes</div>
                    <div class="text-[10px] text-orange-500/80 uppercase tracking-wider font-bold">Decreased Security</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(3600)"
                  class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group"
                  [class.bg-red-500/10]="settings.timeoutSeconds() === 3600"
                  [class.border-red-500]="settings.timeoutSeconds() === 3600"
                  [class.bg-zinc-900/50]="settings.timeoutSeconds() !== 3600"
                  [class.border-white/5]="settings.timeoutSeconds() !== 3600"
                  [class.hover:border-white/20]="settings.timeoutSeconds() !== 3600"
                >
                   <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors"
                       [class.text-red-500]="settings.timeoutSeconds() === 3600"
                       [class.text-white/40]="settings.timeoutSeconds() !== 3600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-white group-hover:text-red-200 transition-colors">1 Hour</div>
                    <div class="text-[10px] text-red-500 uppercase tracking-wider font-bold">Danger: High Risk</div>
                  </div>
                </button>
              </div>
            </section>


            <section class="space-y-4">
               <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Change Password</h2>
               <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">

                  <div class="flex items-start gap-4 p-4 rounded-xl bg-vault-purple/10 border border-vault-purple/20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-vault-purple shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="space-y-1">
                      <h3 class="text-xs font-bold text-vault-purple uppercase tracking-wider">Coming Soon</h3>
                      <p class="text-xs text-white/50 leading-relaxed">
                        Rekeying your vault to change your password requires advanced flows that aren't currently implemented. This feature will be available in a future update.
                      </p>
                    </div>
                  </div>

                  <div class="space-y-4 pointer-events-none blur-[2px] select-none">
                     <div class="space-y-2">
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">Current Password</label>
                        <input type="password" class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl" placeholder="••••••••" disabled>
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">New Password</label>
                        <input type="password" class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl" placeholder="••••••••" disabled>
                     </div>
                     <button disabled class="w-full py-4 rounded-xl bg-white/5 text-white/20 text-xs font-black uppercase tracking-widest border border-white/5">Update Key</button>
                  </div>
               </div>
            </section>

          </div>
        </div>

      </div>
    


    </div>
  `,
})
export class SettingsComponent {
  protected readonly settings = inject(SettingsService);
  protected readonly persistence = inject(AuthPersistenceService);
  protected readonly api = inject(AuthApiService);
  protected readonly toast = inject(ToastService);

  activeTab = signal<'GENERAL' | 'SECURITY'>('GENERAL');
  accountId = signal<string>('');

  constructor() {
    this.api.me().subscribe({
      next: (res) => this.accountId.set(res.accountId),
      error: () => {
        this.persistence.getAccountId().then((id) => {
          if (id) this.accountId.set(id);
        });
      },
    });
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.trigger('Copied to Clipboard');
    });
  }
}
