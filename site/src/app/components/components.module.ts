import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../@shared';
import { ComponentsRouting } from './components.routing';
import { ButtonComponent } from './button/button.component';
import { CheckboxComponent } from './checkbox/checkbox.component';
import { DividerComponent } from './divider/divider.component';
import { InputComponent } from './input/input.component';

@NgModule({
  imports: [CommonModule, SharedModule, ComponentsRouting],
  declarations: [
    ButtonComponent,
    CheckboxComponent,
    DividerComponent,
    InputComponent,
  ]
})
export class ComponentsModule {}
