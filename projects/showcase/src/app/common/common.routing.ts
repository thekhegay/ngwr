import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ColorsComponent } from './colors/colors.component';
import { GridComponent } from './grid/grid.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'colors',
    pathMatch: 'full'
  },
  {
    path: 'colors',
    component: ColorsComponent
  },
  {
    path: 'grid',
    component: GridComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CommonRouting {}
