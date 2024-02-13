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
import { QRCodeComponent } from './qrcode/qrcode.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { TagComponent } from './tag/tag.component';
import { TooltipComponent } from './tooltip/tooltip.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: r.DOCS.COMPONENTS.BUTTON,
  },
  {
    path: r.DOCS.COMPONENTS.BUTTON,
    component: ButtonComponent,
  },
  {
    path: r.DOCS.COMPONENTS.CHECKBOX,
    component: CheckboxComponent,
  },
  {
    path: r.DOCS.COMPONENTS.DIALOG,
    component: DialogComponent,
  },
  {
    path: r.DOCS.COMPONENTS.DIVIDER,
    component: DividerComponent,
  },
  {
    path: r.DOCS.COMPONENTS.FORM,
    component: FormComponent,
  },
  {
    path: r.DOCS.COMPONENTS.ICON,
    component: IconComponent,
  },
  {
    path: r.DOCS.COMPONENTS.INPUT,
    component: InputComponent,
  },
  {
    path: r.DOCS.COMPONENTS.QRCODE,
    component: QRCodeComponent,
  },
  {
    path: r.DOCS.COMPONENTS.SKELETON,
    component: SkeletonComponent,
  },
  {
    path: r.DOCS.COMPONENTS.SPINNER,
    component: SpinnerComponent,
  },
  {
    path: r.DOCS.COMPONENTS.TAG,
    component: TagComponent,
  },
  {
    path: r.DOCS.COMPONENTS.TOOLTIP,
    component: TooltipComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ComponentsRouting {}
