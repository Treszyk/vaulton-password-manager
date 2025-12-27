import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'vault',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shell/vaulton-shell.component').then((m) => m.VaultonShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/vault/vault-dashboard.component').then(
            (m) => m.VaultDashboardComponent
          ),
      },
    ],
  },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' },
];
