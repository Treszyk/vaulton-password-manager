import {
  Component,
  inject,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, Event, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-docs-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="flex flex-col h-full overflow-hidden px-4 md:px-8">
      <header
        class="flex-none h-16 md:h-24 flex items-center justify-between pointer-events-auto w-full mx-auto relative z-20"
      >
        <div class="flex items-center gap-4">
          <button
            (click)="toggleMenu()"
            class="md:hidden text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Toggle Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <span
            class="text-xl font-black tracking-tighter cursor-pointer select-none truncate"
            (click)="router.navigate(['/'])"
          >
            Vaulton<span class="text-vault-purple">.</span>
            <span
              class="ml-3 text-xs font-black uppercase tracking-[0.25em] text-zinc-400 border-l border-zinc-800 pl-3 inline"
              >Docs</span
            >
          </span>
        </div>

        <div class="flex items-center gap-4 md:gap-6">
          <a
            routerLink="/"
            class="text-xs font-bold uppercase tracking-[0.2em] text-zinc-200 hover:text-white transition-colors flex items-center gap-2 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span class="hidden md:inline">Go Back</span>
          </a>

          <div class="w-[1px] h-4 bg-zinc-800"></div>

          <a
            href="https://github.com/Treszyk/vaulton-password-manager"
            target="_blank"
            rel="noopener noreferrer"
            class="text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="GitHub Repository"
          >
            <svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
          </a>
        </div>
      </header>

      <div class="flex-1 flex flex-row md:gap-8 w-full mx-auto overflow-hidden relative">
        <div
          *ngIf="isMobileMenuOpen"
          (click)="closeMenu()"
          class="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
        ></div>

        <aside
          [class.translate-x-0]="isMobileMenuOpen"
          [class.-translate-x-full]="!isMobileMenuOpen"
          class="fixed md:static inset-y-0 left-0 w-64 md:w-64 bg-zinc-950 md:bg-transparent border-r border-zinc-900/50 z-40 transition-transform duration-300 ease-in-out -translate-x-full md:translate-x-0 flex flex-col pt-4 md:pt-12 pb-8 md:block overflow-y-auto scrollbar-none shadow-2xl md:shadow-none"
        >
          <div class="px-6 md:px-0 flex flex-col gap-8 h-full sticky top-0">
            <div class="flex md:hidden items-center justify-between mb-2">
              <span class="text-sm font-black uppercase tracking-wider text-zinc-500">Menu</span>
              <button (click)="closeMenu()" class="text-zinc-400 hover:text-white p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div>
              <h3
                class="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 px-3 md:px-0"
              >
                Documentation
              </h3>
              <div class="flex flex-col gap-1 border-l border-zinc-800 pl-4">
                <a
                  routerLink="/docs/auth"
                  routerLinkActive="text-vault-purple border-vault-purple bg-vault-purple/5"
                  (click)="closeMenu()"
                  class="block py-2 px-3 text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white border-l-2 border-transparent hover:border-zinc-700 transition-all rounded-r-lg"
                >
                  Authentication
                </a>
                <a
                  routerLink="/docs/crypto"
                  routerLinkActive="text-vault-purple border-vault-purple bg-vault-purple/5"
                  (click)="closeMenu()"
                  class="block py-2 px-3 text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white border-l-2 border-transparent hover:border-zinc-700 transition-all rounded-r-lg"
                >
                  Cryptography
                </a>
                <a
                  routerLink="/docs/threatmodel"
                  routerLinkActive="text-vault-purple border-vault-purple bg-vault-purple/5"
                  (click)="closeMenu()"
                  class="block py-2 px-3 text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white border-l-2 border-transparent hover:border-zinc-700 transition-all rounded-r-lg"
                >
                  Threat Model
                </a>
              </div>
            </div>
          </div>
        </aside>

        <main
          #mainContent
          class="flex-1 overflow-y-auto pt-4 md:pt-6 pb-24 md:pr-4 md:pl-0 scroll-smooth w-full md:w-auto min-w-0"
        >
          <div class="max-w-none w-full mx-auto md:mx-0">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class DocsLayoutComponent implements OnDestroy, AfterViewInit {
  @ViewChild('mainContent') mainContent!: ElementRef;
  public readonly router = inject(Router);
  private sub: Subscription;
  public isMobileMenuOpen = false;

  constructor() {
    this.sub = this.router.events
      .pipe(filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.scrollToTop();
        this.isMobileMenuOpen = false;
      });
  }

  ngAfterViewInit(): void {
    this.scrollToTop();
  }

  private scrollToTop(): void {
    if (this.mainContent?.nativeElement) {
      this.mainContent.nativeElement.scrollTop = 0;
    }
  }

  public toggleMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  public closeMenu(): void {
    this.isMobileMenuOpen = false;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
