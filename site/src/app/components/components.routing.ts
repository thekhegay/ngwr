import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { DividerComponent } from './divider/divider.component';
import { InputComponent } from './input/input.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'button'
      },
      {
        path: 'button',
        component: ButtonComponent
      },
      {
        path: 'checkbox',
        component: CheckboxComponent
      },
      {
        path: 'divider',
        component: DividerComponent
      },
      {
        path: 'input',
        component: InputComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComponentsRouting {}
