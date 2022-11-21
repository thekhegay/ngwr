import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { WrButtonModule } from 'ngwr/button';
import { WrCheckboxModule } from 'ngwr/checkbox';
import { WrDividerModule } from 'ngwr/divider';
import { WrFormModule } from 'ngwr/form';
import { WrIconModule } from 'ngwr/icon';
import { WrInputModule } from 'ngwr/input';
import { WrSkeletonModule } from 'ngwr/skeleton';
import { WrSpinnerModule } from 'ngwr/spinner';
import { WrTagModule } from 'ngwr/tag';
import { MarkdownModule } from 'ngx-markdown';
import { SnippetComponent } from 'showcase/@shared/components';

const ngwr = [
  WrButtonModule,
  WrCheckboxModule,
  WrDividerModule,
  WrFormModule,
  WrIconModule,
  WrInputModule,
  WrSkeletonModule,
  WrSpinnerModule,
  WrTagModule,
];

const modules = [RouterModule, FormsModule, ReactiveFormsModule, MarkdownModule];

const components = [SnippetComponent];

@NgModule({
  imports: [CommonModule, ...ngwr, ...modules],
  declarations: [...components],
  exports: [...ngwr, ...modules, ...components],
})
export class SharedModule {}
