import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HighlightModule } from 'ngx-highlightjs';

import { SnippetComponent } from './components/snippet/snippet.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WrCheckboxModule } from 'ngwr/checkbox';
import { WrButtonModule } from 'ngwr/button';
import { WrDividerModule } from 'ngwr/divider';
import { WrFormModule } from 'ngwr/form';
import { WrIconModule } from 'ngwr/icon';
import { WrInputModule } from 'ngwr/input';
import { WrSkeletonModule } from 'ngwr/skeleton';
import { WrSpinnerModule } from 'ngwr/spinner';
import { WrTagModule } from 'ngwr/tag';

const ngwr = [
  WrCheckboxModule,
  WrButtonModule,
  WrDividerModule,
  WrFormModule,
  WrIconModule,
  WrInputModule,
  WrSkeletonModule,
  WrSpinnerModule,
  WrTagModule
];

const modules = [
  RouterModule,
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
