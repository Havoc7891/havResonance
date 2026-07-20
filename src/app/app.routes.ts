import { Routes } from '@angular/router';
import { connectionPageGuard, connectionRequiredGuard } from './core/connection/connection.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [connectionPageGuard],
    loadComponent: () =>
      import('./features/connection/connection').then((module) => module.Connection),
  },
  {
    path: 'library',
    canActivate: [connectionRequiredGuard],
    loadComponent: () => import('./features/library/library').then((module) => module.Library),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((module) => module.About),
  },
  {
    path: 'album/:id',
    canActivate: [connectionRequiredGuard],
    loadComponent: () => import('./features/album/album').then((module) => module.Album),
  },
  { path: '**', redirectTo: '' },
];
