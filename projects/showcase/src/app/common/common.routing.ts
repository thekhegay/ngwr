import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { routes as r } from 'showcase/@shared/routes';

import { ColorsComponent } from './colors/colors.component';
import { GridComponent } from './grid/grid.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.CORE.COLORS,
  },
  {
    path: r.CORE.COLORS,
    component: ColorsComponent,
  },
  {
    path: r.CORE.GRID,
    component: GridComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommonRouting {}
