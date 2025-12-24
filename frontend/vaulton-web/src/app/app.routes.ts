import { Routes } from '@angular/router';
import { AuthDebugComponent } from './features/auth/auth-debug.component';

export const routes: Routes = [
  { path: 'debug/auth', component: AuthDebugComponent },
  { path: '', redirectTo: 'debug/auth', pathMatch: 'full' },
];
