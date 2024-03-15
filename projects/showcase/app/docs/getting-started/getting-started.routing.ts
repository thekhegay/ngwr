import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { routes as r } from 'showcase/@shared/routes';

import { InstallationComponent } from './installation/installation.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.DOCS.GETTING_STARTED.INSTALLATION,
  },
  {
    path: r.DOCS.GETTING_STARTED.INSTALLATION,
    component: InstallationComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GettingStartedRouting {}
