import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { unlockedGuard } from './core/auth/unlocked.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
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
            (m) => m.VaultDashboardComponent,
          ),
      },
      {
        path: 'settings',
        canActivate: [unlockedGuard],
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' },
];
