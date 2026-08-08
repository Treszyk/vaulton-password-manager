import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthStateService } from './auth-state.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  return toObservable(auth.isInitialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      if (auth.accessToken()) {
        return true;
      }

      return router.createUrlTree(['/auth']);
    }),
  );
};
