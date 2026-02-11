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
              </div>
            </div>
          </div>
        </aside>

        <main
          #mainContent
          class="flex-1 overflow-y-auto py-8 md:py-12 pb-24 md:pr-4 md:pl-0 scroll-smooth w-full md:w-auto min-w-0"
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
