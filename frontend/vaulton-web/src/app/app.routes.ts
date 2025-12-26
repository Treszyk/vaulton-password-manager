import { Routes } from '@angular/router';
import { AuthDebugComponent } from './features/auth/auth-debug.component';
import { VaultDebugComponent } from './features/vault/vault-debug.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'debug/auth',
    component: AuthDebugComponent,
  },
  {
    path: 'debug/vault',
    component: VaultDebugComponent,
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'debug/auth', pathMatch: 'full' },
];
