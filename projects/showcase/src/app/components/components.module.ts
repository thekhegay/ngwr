import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../@shared';
import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { ComponentsRouting } from './components.routing';
import { DividerComponent } from './divider/divider.component';
import { FormComponent } from './form/form.component';
import { IconComponent } from './icon/icon.component';
import { InputComponent } from './input/input.component';
import { SkeletonComponent } from './skeleton/skeleton.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { TagComponent } from './tag/tag.component';

@NgModule({
  imports: [CommonModule, SharedModule, ComponentsRouting],
  declarations: [
    ButtonComponent,
    CheckboxComponent,
    DividerComponent,
    FormComponent,
    IconComponent,
    InputComponent,
    SkeletonComponent,
    SpinnerComponent,
    TagComponent
  ]
})
export class ComponentsModule {}
