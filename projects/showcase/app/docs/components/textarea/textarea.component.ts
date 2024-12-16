import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';

import { SeoService } from '#core/services';
import { WrTagComponent } from 'ngwr/tag';
import { CodeComponent, SnippetComponent } from '#core/components';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { WrTextareaModule } from 'ngwr/textarea';
import { wrThemeColors } from 'ngwr/cdk/types';

@Component({
  standalone: true,
  selector: 'ngwr-textarea',
  templateUrl: './textarea.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ReactiveFormsModule, WrTagComponent, WrTextareaModule, CodeComponent, SnippetComponent],
})
export class TextareaComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly title = 'Textarea';
  protected readonly description = 'Basic textarea component used to provide or change data';

  protected readonly disabledFormControl = new FormControl({ value: null, disabled: true });

  protected readonly code = {
    import: `import{WrTextareaComponent}from'ngwr/textarea';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrTextareaComponent,],})\nexport class MyComponent {}`,
    basic: '<wr-textarea />',
    autosize: '<wr-textarea [autosize]="true" />',
    usage: '<wr-textarea />',
    disabled: '<wr-textarea [formControl]="disabledFormControl"></wr-textarea>',
    readonly: '<wr-textarea readonly></wr-textarea>',
    styling: ':root {\n' +
      '  --wr-textarea-color: var(--wr-color-dark);\n' +
      '  --wr-textarea-placeholder-color: var(--wr-color-light);\n' +
      '  --wr-textarea-suffix-prefix-color: var(--wr-color-medium);\n' +
      '  --wr-textarea-bg-color: var(--wr-color-white);\n' +
      '  --wr-textarea-border-color: var(--wr-color-light-lighter);\n' +
      '  --wr-textarea-border-radius: 0.375rem;\n' +
      '  --wr-textarea-box-shadow: none;\n' +
      '  --wr-textarea-icon-size: 1.25rem;\n' +
      '  --wr-textarea-icon-color: var(--wr-color-medium);\n' +
      '  --wr-textarea-font-size: 0.875rem;\n' +
      '  --wr-textarea-font-weight: 400;\n' +
      '  --wr-textarea-font-family: var(--wr-font-family-base);\n' +
      '  --wr-textarea-line-height: 1.25rem;\n' +
      '  --wr-textarea-padding-y: 0.375rem;\n' +
      '  --wr-textarea-padding-x: 0.825rem;\n' +
      '}\n',
  };

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Textarea');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['textarea', 'wr-textarea']);
  }

  protected readonly colors = wrThemeColors;
}
