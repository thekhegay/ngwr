import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from 'showcase/@shared/shared.module';

import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { ComponentsRouting } from './components.routing';
import { DialogExampleComponent } from './dialog/dialog-example/dialog-example.component';
import { DialogComponent } from './dialog/dialog.component';
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
    DialogComponent,
    DialogExampleComponent,
    DividerComponent,
    FormComponent,
    IconComponent,
    InputComponent,
    SkeletonComponent,
    SpinnerComponent,
    TagComponent,
  ],
})
export class ComponentsModule {}
