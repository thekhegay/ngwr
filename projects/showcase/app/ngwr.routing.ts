import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from 'showcase/@core/components';
import { routes as r } from 'showcase/@shared/routes';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.HOME.INDEX,
  },
  {
    path: r.HOME.INDEX,
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
  },
  {
    path: r.DOCS.INDEX,
    component: LayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: r.DOCS.GETTING_STARTED.INDEX,
      },
      {
        path: r.DOCS.GETTING_STARTED.INDEX,
        loadChildren: () => import('./docs/getting-started/getting-started.module').then(m => m.GettingStartedModule),
      },
      {
        path: r.DOCS.CORE.INDEX,
        loadChildren: () => import('./docs/core/core.module').then(m => m.CoreModule),
      },
      {
        path: r.DOCS.COMPONENTS.INDEX,
        loadChildren: () => import('./docs/components/components.module').then(m => m.ComponentsModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class NgwrRouting {}
