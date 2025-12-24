import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { SessionService } from './core/auth/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('vaulton-web');
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  constructor() {
    this.session.tryRestore().subscribe((ok: boolean) => {
      this.router.navigateByUrl(ok ? '/debug/vault' : '/debug/auth');
    });
  }
}
