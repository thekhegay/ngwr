import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { routes as r } from 'showcase/@shared/routes';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.DOCUMENTATION.INDEX,
  },
  {
    path: r.DOCUMENTATION.INDEX,
    loadChildren: () => import('./documentation/documentation.module').then(m => m.DocumentationModule),
  },
  {
    path: r.CORE.INDEX,
    loadChildren: () => import('./core/core.module').then(m => m.CoreModule),
  },
  {
    path: r.COMPONENTS.INDEX,
    loadChildren: () => import('./components/components.module').then(m => m.ComponentsModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class NgwrRouting {}
