import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { routes as r } from 'showcase/@shared/routes';

import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { DialogComponent } from './dialog/dialog.component';
import { DividerComponent } from './divider/divider.component';
import { FormComponent } from './form/form.component';
import { IconComponent } from './icon/icon.component';
import { InputComponent } from './input/input.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { TagComponent } from './tag/tag.component';
import { TooltipComponent } from './tooltip/tooltip.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.COMPONENTS.BUTTON,
  },
  {
    path: r.COMPONENTS.BUTTON,
    component: ButtonComponent,
  },
  {
    path: r.COMPONENTS.CHECKBOX,
    component: CheckboxComponent,
  },
  {
    path: r.COMPONENTS.DIALOG,
    component: DialogComponent,
  },
  {
    path: r.COMPONENTS.DIVIDER,
    component: DividerComponent,
  },
  {
    path: r.COMPONENTS.FORM,
    component: FormComponent,
  },
  {
    path: r.COMPONENTS.ICON,
    component: IconComponent,
  },
  {
    path: r.COMPONENTS.INPUT,
    component: InputComponent,
  },
  {
    path: r.COMPONENTS.SKELETON,
    component: SkeletonComponent,
  },
  {
    path: r.COMPONENTS.SPINNER,
    component: SpinnerComponent,
  },
  {
    path: r.COMPONENTS.TAG,
    component: TagComponent,
  },
  {
    path: r.COMPONENTS.TOOLTIP,
    component: TooltipComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComponentsRouting {}
