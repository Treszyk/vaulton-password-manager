import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  QueryList,
  ViewChildren,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SettingsService } from '../../core/settings/settings.service';
import { AuthPersistenceService } from '../../core/auth/auth-persistence.service';
import { zeroize } from '../../core/crypto/zeroize';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { SessionService } from '../../core/auth/session.service';
import { VaultDataService } from '../vault/vault-data.service';
import { AuthCryptoService } from '../../core/auth/auth-crypto.service';
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
              (click)="setTab('GENERAL')"
              class="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 z-10 relative"
              [class.text-white]="activeTab() === 'GENERAL'"
              [class.text-white/40]="activeTab() !== 'GENERAL'"
            >
              General
            </button>
            <button
              (click)="setTab('SECURITY')"
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
              <div class="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl gap-6">
                <div class="space-y-1 flex-1 min-w-0">
                   <div class="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 flex-wrap">Account ID</div>
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
                    <p class="text-[0.625rem] md:text-[0.75rem] text-white/30 pt-1">This is your unique vault identifier. Keep it safe. You need it to log in to your vault.</p>
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
                  (click)="settings.toggleStarfield(accountId())"
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
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Device Security</h2>
                <div *ngIf="isPasscodeEnabled()" class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span class="text-[0.5625rem] font-bold text-emerald-500 uppercase tracking-tighter">Active</span>
                </div>
              </div>

              <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-white/10 transition-colors gap-6">
                <div class="flex flex-col gap-1 flex-1 min-w-0">
                  <span class="text-sm font-bold text-white tracking-tight">Local PASSCODE Unlock</span>
                  <span class="text-xs text-white/40 leading-relaxed">Quickly unlock with a 6-digit passcode on this device.</span>
                </div>
                
                <button 
                  (click)="togglePasscode()"
                  class="w-12 h-7 rounded-full transition-colors duration-300 relative focus:outline-none shrink-0"
                  [class.bg-vault-purple]="isPasscodeEnabled()"
                  [class.bg-white/10]="!isPasscodeEnabled()"
                >
                  <div 
                    class="w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-300 shadow-md"
                    [class.translate-x-6]="isPasscodeEnabled()"
                    [class.translate-x-1]="!isPasscodeEnabled()"
                  ></div>
                </button>
              </div>
              <p class="text-[0.75rem] md:text-sm font-medium text-orange-400/80 tracking-wide px-1 mt-1.5 animate-fade-in">
                 Weakens local security, but increases convenience.
              </p>

              <div class="grid transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                   [class.grid-rows-[0fr]]="!showPasscodeSetup()"
                   [class.grid-rows-[1fr]]="showPasscodeSetup()"
                   [class.opacity-0]="!showPasscodeSetup()"
                   [class.opacity-100]="showPasscodeSetup()"
                   [class.mt-0]="!showPasscodeSetup()"
                   [class.mt-6]="showPasscodeSetup()">
                   
                 <div class="overflow-hidden min-h-0">
                   <div class="bg-zinc-900/80 border border-vault-purple/30 rounded-2xl p-6 space-y-6">
                     <div class="flex items-center justify-between">
                        <h3 class="text-xs font-black text-white uppercase tracking-widest">Setup PASSCODE</h3>
                        <button (click)="cancelPasscodeSetup()" class="text-white/30 hover:text-white transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                     </div>

                     <div class="space-y-4">
                        <div class="space-y-2">
                           <label class="text-[0.5625rem] md:text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">Master Password</label>
                           <input 
                            type="password" 
                            [(ngModel)]="confirmPasswordForPasscode"
                            name="confirmPassword"
                            class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-vault-purple/50 transition-colors" 
                            placeholder="Verify for re-wrap">
                        </div>

                        <div class="space-y-4 text-center">
                            <div class="flex items-center justify-between px-1">
                              <label class="text-[0.5625rem] md:text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">Choose 6-Character PASSCODE</label>
                              <button (click)="togglePinVisibility()" class="text-white/30 hover:text-white transition-colors">
                                <svg *ngIf="pinVisibility()" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <svg *ngIf="!pinVisibility()" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                </svg>
                              </button>
                            </div>
                           <div class="flex justify-center gap-2">
                              <input 
                                *ngFor="let i of [0,1,2,3,4,5]"
                                #pinInput
                                [type]="pinVisibility() ? 'text' : 'password'"
                                maxlength="1"
                                class="w-8 h-10 bg-white/5 border border-white/10 rounded focus:border-vault-purple text-center text-white text-lg font-bold !px-0"
                                (input)="onPinInput($event, i)"
                                (keydown)="onPinKeyDown($event, i)"
                                [(ngModel)]="pinDigits[i]"
                                [name]="'pin' + i"
                                autocomplete="off"
                              >
                           </div>
                        </div>

                        <button 
                          (click)="finishPasscodeSetup()"
                          [disabled]="isPasscodeBusy()"
                          class="w-full py-3 rounded-xl bg-vault-purple hover:bg-vault-purple-hover text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                          <span *ngIf="!isPasscodeBusy()">Activate PASSCODE</span>
                          
                          <span *ngIf="isPasscodeBusy()" class="flex items-center gap-2">
                            <svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Activating...</span>
                          </span>
                        </button>
                     </div>
                   </div>
                 </div>
              </div>
            </section>

            <section class="space-y-4">
              <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Auto-Lock Timeout</h2>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <button
                  (click)="settings.updateTimeout(accountId(), 60)"
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
                    <div class="text-[0.625rem] text-white/40 uppercase tracking-wider">Paranoid</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(accountId(), 300)"
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
                    <div class="text-[0.625rem] text-white/40 uppercase tracking-wider">Recommended</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(accountId(), 1800)"
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
                    <div class="text-[0.625rem] text-orange-500/80 uppercase tracking-wider font-bold">Decreased Security</div>
                  </div>
                </button>


                <button
                  (click)="settings.updateTimeout(accountId(), 3600)"
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
                    <div class="text-[0.625rem] text-red-500 uppercase tracking-wider font-bold">Danger: High Risk</div>
                  </div>
                </button>
              </div>
            </section>


            <section class="space-y-4">
               <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Master Password</h2>
               <div class="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
                  
                  <div class="flex items-start gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="text-[0.6875rem] md:text-[0.75rem] text-amber-500/70 leading-relaxed font-medium">
                      Changing your password will re-key your entire vault. This is a irreversible local and cloud operation. Ensure you remember your new password.
                    </p>
                  </div>

                  <div class="space-y-4">
                     <div class="space-y-2">
                        <label class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">Current Password</label>
                        <input 
                          type="password" 
                          [(ngModel)]="rekeyOldPassword"
                          class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-vault-purple/50 transition-colors" 
                          placeholder="••••••••">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">New Master Password</label>
                        <input 
                          type="password" 
                          [(ngModel)]="rekeyNewPassword"
                          (ngModelChange)="isOptimized.set(false); standardTime.set(null); hardenedTime.set(null)"
                          class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-vault-purple/50 transition-colors" 
                          placeholder="••••••••">
                     </div>
                     <div class="space-y-2 animate-fade-in" *ngIf="rekeyNewPassword">
                        <label class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 ml-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          [(ngModel)]="rekeyConfirmPassword"
                          class="w-full pl-5 pr-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-vault-purple/50 transition-colors" 
                          placeholder="••••••••">
                     </div>

                     <div class="kdf-container expanded mt-2">
                      <div class="min-h-0 space-y-3">
                        <div class="flex items-center justify-between ml-1 mb-1 relative">
                          <div class="flex items-center gap-1.5 group/info cursor-help tooltip-full" 
                               data-tooltip="This setting influences both vault security and login time.">
                            <label class="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/55 cursor-help">Vault Hardening Grade</label>
                          </div>
                          
                          <div class="flex items-center gap-2 h-5">
                            <span 
                              *ngIf="isBenchmarking()"
                              class="text-[0.4375rem] md:text-[0.5625rem] font-black uppercase tracking-wider text-vault-purple-bright animate-pulse"
                            >
                              Benchmarking {{ benchmarkStatus() }}...
                            </span>

                            <button 
                              *ngIf="isOptimized() && !isBenchmarking()"
                              (click)="onOptimizeKdf()"
                              class="group/rerun flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-all animate-fade-in"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5 text-vault-purple transition-transform group-hover/rerun:rotate-180 duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                              </svg>
                              <span class="text-[0.5rem] md:text-[0.625rem] font-black uppercase tracking-widest text-vault-purple/70 group-hover/rerun:text-vault-purple transition-colors">Rerun</span>
                            </button>
                          </div>
                        </div>
                        <div class="relative py-1 overflow-visible">
                           <div class="flex gap-2 transition-all duration-700 ease-in-out -m-4 p-4" 
                                [class.opacity-0]="!isOptimized() && !isBenchmarking()"
                                [class.scale-[0.94]]="!isOptimized() && !isBenchmarking()"
                               [class.pointer-events-none]="!isOptimized() && !isBenchmarking()">
                            <div class="kdf-option group/kdf tooltip-trigger tooltip-full relative" 
                                 [class.active]="kdfMode() === 1"
                                 (click)="kdfMode.set(1)"
                                 data-tooltip="Standard protection. Recommended for most devices.">
                              <div class="flex items-center gap-1.5">
                                <span class="grade-title">Standard</span>
                              </div>
                              <span class="grade-desc" *ngIf="!standardTime()">Fast & Secure</span>
                              <span class="grade-desc" *ngIf="standardTime()">Estimated time: {{ standardTime()?.toFixed(1) }}s</span>
                              <div *ngIf="standardTime() && !isBenchmarking()" 
                                   class="absolute top-0.5 right-0.5 px-1.5 py-0.5 rounded text-[0.4375rem] md:text-[0.5rem] font-black uppercase tracking-tighter"
                                   [class.text-green-400]="recommendedMode() === 1"
                                   [class.text-orange-400]="recommendedMode() !== 1 && standardTime()! <= 4.0"
                                   [class.text-red-400]="recommendedMode() !== 1 && standardTime()! > 4.0">
                                {{ recommendedMode() === 1 ? 'RECOMMENDED' : (standardTime()! > 4.0 ? 'VERY SLOW' : 'GOOD') }}
                              </div>
                            </div>
                            
                            <div class="kdf-option group/kdf tooltip-trigger tooltip-full relative" 
                                 [class.active]="kdfMode() === 2"
                                 (click)="kdfMode.set(2)"
                                 data-tooltip="Strong protection. Best for modern desktops.">
                              <div class="flex items-center gap-1.5">
                                <span class="grade-title">Hardened</span>
                              </div>
                              <span class="grade-desc" *ngIf="!hardenedTime()">Maximum Resistance</span>
                              <span class="grade-desc" *ngIf="hardenedTime()">Estimated time: {{ hardenedTime()?.toFixed(1) }}s</span>
                              <div *ngIf="hardenedTime() && !isBenchmarking()" 
                                   class="absolute top-0.5 right-0.5 px-1.5 py-0.5 rounded text-[0.4375rem] md:text-[0.5rem] font-black uppercase tracking-tighter"
                                   [class.text-green-400]="recommendedMode() === 2"
                                   [class.text-orange-400]="recommendedMode() !== 2 && hardenedTime()! <= 3.25"
                                   [class.text-red-400]="recommendedMode() !== 2 && hardenedTime()! > 3.25">
                                {{ recommendedMode() === 2 ? 'RECOMMENDED' : (hardenedTime()! > 3.25 ? 'VERY SLOW' : 'GOOD') }}
                              </div>
                            </div>
                          </div>
    
                          <div *ngIf="!isOptimized() && !isBenchmarking()" 
                               class="absolute inset-x-0 inset-y-0 z-10 flex flex-col items-center justify-center animate-fade-in pointer-events-none">
                            <div class="flex flex-col items-center justify-center p-4 pointer-events-auto">
                              <button 
                                (click)="onOptimizeKdf()"
                                [disabled]="!rekeyNewPassword"
                                class="flex items-center gap-2.5 px-6 py-3 bg-vault-purple hover:bg-vault-purple-bright text-white rounded-2xl transition-all active:scale-95 shadow-2xl shadow-vault-purple/40 border border-white/20 disabled:opacity-50 disabled:pointer-events-none"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span class="text-[0.625rem] font-black uppercase tracking-widest">Benchmark & Select</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                     <button 
                      (click)="updateMasterKey()"
                      [disabled]="isRekeyBusy() || !isOptimized() || isRekeySuccess()"
                      class="w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
                      [class.bg-vault-purple]="!isRekeySuccess()"
                      [class.hover:bg-vault-purple-bright]="!isRekeySuccess()"
                      [class.text-white]="!isRekeySuccess()"
                      [class.shadow-vault-purple_20]="!isRekeySuccess()"
                      [class.bg-green-500]="isRekeySuccess()"
                      [class.text-white]="isRekeySuccess()"
                      [class.shadow-none]="isRekeySuccess()"
                     >
                        <span *ngIf="!isRekeyBusy() && !isRekeySuccess()">Update Master Key</span>
                        <span *ngIf="isRekeySuccess()" class="flex items-center gap-2 animate-scale-in">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>DONE</span>
                        </span>
                        <span *ngIf="isRekeyBusy()" class="flex items-center gap-2">
                           <svg class="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                           <span>{{ rekeyStatus() || 'Processing...' }}</span>
                        </span>
                     </button>
                  </div>
               </div>
            </section>

          </div>
        </div>

      </div>
    


    </div>
  `,
})
export class SettingsComponent implements OnInit {
  protected readonly settings = inject(SettingsService);
  protected readonly persistence = inject(AuthPersistenceService);
  protected readonly api = inject(AuthApiService);
  protected readonly crypto = inject(AuthCryptoService);
  protected readonly toast = inject(ToastService);
  protected readonly router = inject(Router);
  protected readonly session = inject(SessionService);
  protected readonly authState = inject(AuthStateService);
  protected readonly vaultData = inject(VaultDataService);
  private readonly route = inject(ActivatedRoute);

  activeTab = signal<'GENERAL' | 'SECURITY'>('GENERAL');
  accountId = signal<string>('');

  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  isPasscodeEnabled = signal(false);
  showPasscodeSetup = signal(false);
  isPasscodeBusy = signal(false);
  confirmPasswordForPasscode = '';
  pinDigits = ['', '', '', '', '', ''];
  pinVisibility = signal(false);

  isRekeyBusy = signal(false);
  isRekeySuccess = signal(false);
  rekeyStatus = signal('');
  rekeyOldPassword = '';
  rekeyNewPassword = '';
  rekeyConfirmPassword = '';

  kdfMode = signal<number>(2);
  isBenchmarking = signal<boolean>(false);
  isOptimized = signal<boolean>(false);
  benchmarkStatus = signal<string>('');
  standardTime = signal<number | null>(null);
  hardenedTime = signal<number | null>(null);

  recommendedMode = computed(() => {
    const h = this.hardenedTime();
    if (h && h <= 4.0) return 2;
    if (this.standardTime()) return 1;
    return null;
  });

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

  async ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as any);
      }
      if (params['setupPasscode'] === 'true') {
        this.showPasscodeSetup.set(true);
      }
    });

    const id = this.accountId() || (await this.persistence.getAccountId());
    if (id) {
      const wrap = await this.persistence.getLocalPasscode(id);
      this.isPasscodeEnabled.set(!!wrap);
    }
  }

  setTab(tab: 'GENERAL' | 'SECURITY') {
    this.activeTab.set(tab);
    if (tab === 'GENERAL') {
      this.rekeyOldPassword = '';
      this.rekeyNewPassword = '';
      this.rekeyConfirmPassword = '';
      this.isOptimized.set(false);
      this.isBenchmarking.set(false);
      this.benchmarkStatus.set('');
      this.standardTime.set(null);
      this.hardenedTime.set(null);
      this.kdfMode.set(2);
      this.rekeyStatus.set('');
      this.isRekeySuccess.set(false);
    }
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast.trigger('Copied to Clipboard');
    });
  }

  togglePasscode() {
    if (this.isPasscodeEnabled()) {
      const id = this.accountId();
      if (id) {
        this.persistence.clearLocalPasscode(id).then(() => {
          this.isPasscodeEnabled.set(false);
          this.toast.trigger('Local Passcode Disabled');
        });
      }
    } else {
      this.showPasscodeSetup.set(true);
    }
  }

  cancelPasscodeSetup() {
    this.showPasscodeSetup.set(false);
    this.confirmPasswordForPasscode = '';
    this.pinDigits = ['', '', '', '', '', ''];
  }

  togglePinVisibility() {
    this.pinVisibility.update((v) => !v);
  }

  onPinInput(event: any, index: number) {
    const val = event.target.value;
    if (val && index < 5) {
      this.pinInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onPinKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.pinDigits[index] && index > 0) {
      this.pinInputs.toArray()[index - 1].nativeElement.focus();
    }
  }

  async finishPasscodeSetup() {
    const pin = this.pinDigits.join('');
    if (pin.length !== 6) {
      this.toast.trigger('PIN must be 6 digits');
      return;
    }
    if (!this.confirmPasswordForPasscode) {
      this.toast.trigger('Confirm with Master Password');
      return;
    }

    this.isPasscodeBusy.set(true);
    try {
      const bundle = await this.persistence.getBundle();
      if (!bundle) throw new Error('No vault session found');

      const adminVerifier = await this.crypto.deriveAdminVerifier(
        this.confirmPasswordForPasscode,
        bundle.S_Pwd,
        bundle.KdfMode
      );

      const wraps = await this.api.getWraps({ AdminVerifier: adminVerifier }).toPromise();
      if (!wraps) throw new Error('Failed to fetch Master Key wrap');

      const res = await this.crypto.activatePasscode(
        this.confirmPasswordForPasscode,
        bundle.S_Pwd,
        bundle.KdfMode,
        pin,
        bundle.AccountId,
        wraps.MkWrapPwd,
        bundle.CryptoSchemaVer
      );

      await this.persistence.saveLocalPasscode({
        AccountId: bundle.AccountId,
        MkWrapLocal: res.mkWrapLocal,
        S_Local: res.sLocalB64,
      });

      this.isPasscodeEnabled.set(true);
      this.showPasscodeSetup.set(false);
      this.toast.trigger('Passcode Enabled');
    } catch (err: any) {
      if (err.status == 401 || err.message?.includes('401')) {
        this.toast.trigger('INVALID CREDENTIALS', false);
      } else {
        this.toast.trigger(err.message || 'Passcode setup failed');
      }
    } finally {
      this.isPasscodeBusy.set(false);
      this.confirmPasswordForPasscode = '';
      this.pinDigits = ['', '', '', '', '', ''];
    }
  }

  async onOptimizeKdf(): Promise<void> {
    if (this.isBenchmarking()) return;

    if (!this.rekeyNewPassword || !this.rekeyConfirmPassword) {
      this.toast.trigger('Fill both password fields first', false);
      return;
    }

    if (this.rekeyNewPassword !== this.rekeyConfirmPassword) {
      this.toast.trigger('Passwords do not match', false);
      return;
    }

    this.isBenchmarking.set(true);
    this.standardTime.set(null);
    this.hardenedTime.set(null);
    const pwd = this.rekeyNewPassword;
    const dummySalt = new Uint8Array(16);
    const HARDENED_THRESHOLD_MS = 4000;
    const STANDARD_SKIP_HARDENED_THRESHOLD = 4500;

    try {
      this.benchmarkStatus.set('Standard');
      const t1 = await this.crypto.benchmarkKdf(pwd, dummySalt, 1);
      this.standardTime.set(t1 / 1000);

      if (t1 > STANDARD_SKIP_HARDENED_THRESHOLD) {
        this.kdfMode.set(1);
        this.isOptimized.set(true);
        this.toast.trigger('Optimization complete! Standard mode selected.', true);
        return;
      }

      this.benchmarkStatus.set('Hardened');
      const t2 = await this.crypto.benchmarkKdf(pwd, dummySalt, 2);
      this.hardenedTime.set(t2 / 1000);

      if (t2 < HARDENED_THRESHOLD_MS) {
        this.kdfMode.set(2);
        this.toast.trigger('Optimization complete! Hardened mode selected.', true);
      } else {
        this.kdfMode.set(1);
        this.toast.trigger('Optimization complete! Standard mode selected.', true);
      }
      this.isOptimized.set(true);
    } catch (e: any) {
      this.toast.trigger('Optimization failed', false);
    } finally {
      zeroize(dummySalt);
      this.isBenchmarking.set(false);
      this.benchmarkStatus.set('');
    }
  }

  async updateMasterKey() {
    if (!this.rekeyOldPassword || !this.rekeyNewPassword || !this.rekeyConfirmPassword) {
      this.toast.trigger('Fill all password fields');
      return;
    }

    if (this.rekeyNewPassword !== this.rekeyConfirmPassword) {
      this.toast.trigger('Passwords do not match');
      return;
    }

    if (this.rekeyOldPassword === this.rekeyNewPassword) {
      this.toast.trigger('New password must be different');
      return;
    }

    if (!this.isOptimized()) {
      this.toast.trigger('Please run the benchmark first');
      return;
    }

    this.isRekeyBusy.set(true);
    try {
      this.rekeyStatus.set('Verifying current password...');
      const bundle = await this.persistence.getBundle();
      if (!bundle) throw new Error('No vault session found');

      const oldAdminVerifier = await this.crypto.deriveAdminVerifier(
        this.rekeyOldPassword,
        bundle.S_Pwd,
        bundle.KdfMode
      );

      const wraps = await this.api.getWraps({ AdminVerifier: oldAdminVerifier }).toPromise();
      if (!wraps) throw new Error('Current password incorrect');

      this.rekeyStatus.set('Deriving New Keys...');

      await new Promise((r) => setTimeout(r, 50));

      const res = await this.crypto.executeRekey(
        this.rekeyOldPassword,
        bundle.S_Pwd,
        bundle.KdfMode,
        this.rekeyNewPassword,
        bundle.AccountId,
        wraps.MkWrapPwd,
        bundle.CryptoSchemaVer,
        this.kdfMode()
      );

      this.rekeyStatus.set('Updating vault...');
      this.rekeyStatus.set('Updating Server...');
      await this.api
        .changePassword({
          AdminVerifier: oldAdminVerifier,
          NewVerifier: res.newVerifier,
          NewAdminVerifier: res.newAdminVerifier,
          NewS_Pwd: res.newS_Pwd,
          NewKdfMode: this.kdfMode(),
          NewMkWrapPwd: res.newMkWrapPwd,
          NewMkWrapRk: null,
          CryptoSchemaVer: bundle.CryptoSchemaVer,
        })
        .toPromise();

      this.isRekeySuccess.set(true);
      this.toast.queue('Password Updated. Please log in again.');
      setTimeout(async () => {
        await this.persistence.clearBundle();
        await this.persistence.clearLocalPasscode(bundle.AccountId);
        await this.session.logout();
      }, 2000);
    } catch (err: any) {
      if (err.status == 401 || err.message?.includes('401')) {
        this.toast.trigger('INVALID CREDENTIALS', false);
      } else {
        this.toast.trigger(err.message || 'Password change failed');
      }
    } finally {
      if (!this.isRekeySuccess()) {
        this.isRekeyBusy.set(false);
      }
      this.rekeyStatus.set('');
      this.rekeyNewPassword = '';
      this.rekeyConfirmPassword = '';
    }
  }
}
