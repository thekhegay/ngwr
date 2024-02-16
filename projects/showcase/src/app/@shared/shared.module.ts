import { ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { WrButtonModule } from 'ngwr/button';
import { WrCheckboxModule } from 'ngwr/checkbox';
import { WrDialogModule } from 'ngwr/dialog';
import { WrDividerModule } from 'ngwr/divider';
import { WrFormModule } from 'ngwr/form';
import { WrIconModule } from 'ngwr/icon';
import { WrInputModule } from 'ngwr/input';
import { WrProgressModule } from 'ngwr/progress';
import { WrQRCodeModule } from 'ngwr/qrcode';
import { WrSkeletonModule } from 'ngwr/skeleton';
import { WrSpinnerModule } from 'ngwr/spinner';
import { WrTagModule } from 'ngwr/tag';
import { WrTooltipModule } from 'ngwr/tooltip';
import { HighlightModule } from 'ngx-highlightjs';
import { CodeComponent } from 'showcase/@shared/components/code/code.component';
import { SnippetComponent } from 'showcase/@shared/components/snippet/snippet.component';

const cdk = [ClipboardModule];

const ngwr = [
  WrButtonModule,
  WrCheckboxModule,
  WrDialogModule,
  WrDividerModule,
  WrFormModule,
  WrIconModule,
  WrInputModule,
  WrProgressModule,
  WrQRCodeModule,
  WrSkeletonModule,
  WrSpinnerModule,
  WrTagModule,
  WrTooltipModule,
];

const modules = [RouterModule, FormsModule, ReactiveFormsModule, HighlightModule, ...cdk];

const components = [CodeComponent, SnippetComponent];

@NgModule({
  imports: [CommonModule, ...ngwr, ...modules],
  declarations: [...components],
  exports: [...ngwr, ...modules, ...components],
})
export class SharedModule {}
