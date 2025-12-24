import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'debug/auth',
    loadComponent: () =>
      import('./features/auth/auth-debug.component').then((m) => m.AuthDebugComponent),
  },
  {
    path: 'debug/vault',
    loadComponent: () =>
      import('./features/vault/vault-debug.component').then((m) => m.VaultDebugComponent),
  },
  { path: '', redirectTo: 'debug/auth', pathMatch: 'full' },
];
