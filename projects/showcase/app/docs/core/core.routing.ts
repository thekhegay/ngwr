import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { routes as r } from '#core/routes';

import { ColorsComponent } from './colors/colors.component';
import { GridComponent } from './grid/grid.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.DOCS.CORE.COLORS,
  },
  {
    path: r.DOCS.CORE.COLORS,
    component: ColorsComponent,
  },
  {
    path: r.DOCS.CORE.GRID,
    component: GridComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoreRouting {}
