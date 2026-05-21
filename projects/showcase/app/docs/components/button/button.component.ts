import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { provideWrIcons, add, checkmark, copyOutline, download, trash, warning } from 'ngwr/icon';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-button-page',
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons([add, checkmark, copyOutline, download, trash, warning])],
})
export default class ButtonComponent {
  protected readonly colors = WR_COLORS;
  protected readonly loading = signal(false);

  protected readonly snippets = {
    install: `import { WrButtonComponent } from 'ngwr/button';

@Component({ imports: [WrButtonComponent] })
export class MyComponent {}`,
    basic: `<wr-btn>Default</wr-btn>
<button wr-btn>Native button</button>
<a wr-btn>Anchor</a>`,
    colors: `<wr-btn color="primary">Primary</wr-btn>
<wr-btn color="success">Success</wr-btn>`,
    outlined: `<wr-btn color="primary" outlined>Outlined</wr-btn>`,
    sizes: `<wr-btn size="sm">Small</wr-btn>
<wr-btn size="md">Medium</wr-btn>
<wr-btn size="lg">Large</wr-btn>`,
    rounded: `<wr-btn color="primary" rounded>Rounded</wr-btn>`,
    block: `<wr-btn color="primary" block>Full width</wr-btn>`,
    icon: `<wr-btn icon="add" color="primary">Add</wr-btn>
<wr-btn icon="download" iconPosition="end" color="success">Download</wr-btn>`,
    disabled: `<wr-btn disabled>Disabled</wr-btn>`,
    loading: `<wr-btn [loading]="loading()" color="primary" (click)="loading.set(!loading())">
  Click to toggle
</wr-btn>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'color', description: 'Color variant. Omit for neutral default.', type: 'WrColor | null', default: 'null' },
    { name: 'size', description: 'Size variant.', type: "'sm' | 'md' | 'lg'", default: "'md'" },
    { name: 'icon', description: 'Icon shown beside the label.', type: 'WrIconName | null', default: 'null' },
    { name: 'iconPosition', description: 'Where the icon sits.', type: "'start' | 'end'", default: "'start'" },
    { name: 'outlined', description: 'Outlined style.', type: 'boolean', default: 'false' },
    { name: 'rounded', description: 'Pill-shaped corners.', type: 'boolean', default: 'false' },
    { name: 'block', description: 'Stretch to parent width.', type: 'boolean', default: 'false' },
    { name: 'loading', description: 'Show a spinner overlaying the label.', type: 'boolean', default: 'false' },
    {
      name: 'isDisabledWhenLoading',
      description: 'Block pointer events while loading.',
      type: 'boolean',
      default: 'true',
    },
    { name: 'disabled', description: 'Disable the button.', type: 'boolean', default: 'false' },
  ];
}
