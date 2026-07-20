import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConnectionStateService } from './connection-state.service';

export const connectionRequiredGuard: CanActivateFn = () => {
  const connectionState = inject(ConnectionStateService);
  const router = inject(Router);

  return connectionState.connected() ? true : router.createUrlTree(['/']);
};

export const connectionPageGuard: CanActivateFn = () => {
  const connectionState = inject(ConnectionStateService);
  const router = inject(Router);

  return connectionState.connected() ? router.createUrlTree(['/library']) : true;
};
