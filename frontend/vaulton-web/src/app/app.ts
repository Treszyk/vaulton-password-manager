import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionService } from './core/auth/session.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('vaulton-web');
  loading = signal(true);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  constructor() {
    this.session.tryRestore().subscribe((ok: boolean) => {
      const currentPath = window.location.pathname;

      if (ok && (currentPath === '/' || currentPath === '')) {
        this.router.navigateByUrl('/debug/vault').then(() => this.loading.set(false));
      } else {
        this.loading.set(false);
      }
    });
  }
}
