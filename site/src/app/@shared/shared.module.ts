import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import {
  WrCheckboxModule,
  WrButtonModule,
  WrDividerModule,
  WrExtendedInputModule,
  WrFormModule,
  WrIconModule,
  WrInputModule,
  WrPasswordInputModule,
  WrSkeletonModule,
  WrSpinnerModule,
  WrTagModule
} from 'ngwr';
import { HighlightModule } from 'ngx-highlightjs';

import { SnippetComponent } from './components/snippet/snippet.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

const ngwr = [
  WrCheckboxModule,
  WrButtonModule,
  WrDividerModule,
  WrExtendedInputModule,
  WrFormModule,
  WrIconModule,
  WrInputModule,
  WrPasswordInputModule,
  WrSkeletonModule,
  WrSpinnerModule,
  WrTagModule
];

const modules = [
  FormsModule,
  ReactiveFormsModule,
  HighlightModule
];

const components = [
  SnippetComponent
];

@NgModule({
  imports: [CommonModule, ...ngwr, ...modules],
  declarations: [...components],
  exports: [...ngwr, ...modules, ...components]
})
export class SharedModule {}
