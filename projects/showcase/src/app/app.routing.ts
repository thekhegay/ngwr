import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from 'showcase/@shared/components';
import { routes as r } from 'showcase/@shared/routes';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
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
        path: r.COMPONENTS.INDEX,
        loadChildren: () => import('./components/components.module').then(m => m.ComponentsModule),
      },
      {
        path: r.CORE.INDEX,
        loadChildren: () => import('./common/common.module').then(m => m.CommonModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule],
})
export class AppRouting {}
