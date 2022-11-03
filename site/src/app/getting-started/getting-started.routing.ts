import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { InstallationComponent } from './installation/installation.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'installation'
  },
  {
    path: 'installation',
    component: InstallationComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GettingStartedRouting {}
