import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { WrButtonModule } from 'ngwr/button';
import { wrThemeColors } from 'ngwr/cdk/types';
import { WrCheckboxModule } from 'ngwr/checkbox';
import { logoAngular, logoGithub, provideWrIcons, shieldCheckmark } from 'ngwr/icon';
import { WrTagModule } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-checkbox',
  templateUrl: './checkbox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CodeComponent,
    SnippetComponent,
    WrButtonModule,
    WrCheckboxModule,
    WrTagModule,
  ],
  providers: [provideWrIcons([shieldCheckmark, logoGithub, logoAngular])],
})
export class CheckboxComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  protected readonly pageTitle = 'Checkbox';
  protected readonly pageDescription = 'A two state checkbox';

  protected readonly colors = wrThemeColors;

  protected readonly code = {
    import: `import{WrCheckboxModule}from'ngwr/checkbox';`,
    component: `@Component({\n//...\nimports: [\n//...\nWrCheckboxModule,],})\nexport class MyComponent {}`,
    usage: '<wr-checkbox [formControl]="formControl">Checkbox</wr-checkbox>',
    iconUsage: '<wr-checkbox [formControl]="formControl" icon="logo-angular" />',
  };

  protected readonly value = new FormControl<boolean>(true);
  protected readonly iconValue = new FormControl<boolean>(true);
  protected readonly iconValue2 = new FormControl<boolean>(true);
  protected readonly iconValue3 = new FormControl<boolean>(true);

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle([this.pageTitle, 'Components']);
    this.seoService.setDescription(this.pageDescription);
    this.seoService.setKeywords(['checkbox', 'wr-checkbox']);
  }
}
