import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';

export const unlockedGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isUnlocked()) {
    return true;
  }

  return router.createUrlTree(['/vault']);
};
