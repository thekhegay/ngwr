import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { DividerComponent } from './divider/divider.component';
import { FormComponent } from './form/form.component';
import { IconComponent } from './icon/icon.component';
import { InputComponent } from './input/input.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { TagComponent } from './tag/tag.component';

const routes: Routes = [
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
    path: 'form',
    component: FormComponent
  },
  {
    path: 'icon',
    component: IconComponent
  },
  {
    path: 'input',
    component: InputComponent
  },
  {
    path: 'skeleton',
    component: SkeletonComponent
  },
  {
    path: 'spinner',
    component: SpinnerComponent
  },
  {
    path: 'tag',
    component: TagComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComponentsRouting {}
