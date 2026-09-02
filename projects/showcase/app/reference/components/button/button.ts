import { Component, signal } from '@angular/core';

import { Copy, Download, Plus, Trash2, TriangleAlert } from 'lucide';
import { WrButton, type WrButtonShape } from 'ngwr/button';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WR_COLORS } from 'ngwr/theme';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-button-page',
  templateUrl: './button.html',
  imports: [WrButton, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
  providers: [
    provideWrIcons(
      lucideIcons({
        add: Plus,
        'copy-outline': Copy,
        download: Download,
        trash: Trash2,
        warning: TriangleAlert,
      })
    ),
  ],
})
export default class ButtonComponent {
  protected readonly colors = WR_COLORS;
  protected readonly shapes: readonly WrButtonShape[] = ['rounded', 'pill', 'squircle'];
  protected readonly loading = signal(false);

  protected readonly snippets = {
    install: `import { WrButton } from 'ngwr/button';

@Component({ imports: [WrButton] })
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
    shape: `<!-- Three shapes -->
<wr-btn color="primary">Rounded (default)</wr-btn>
<wr-btn color="primary" shape="pill">Pill</wr-btn>
<wr-btn color="primary" shape="squircle">Squircle</wr-btn>

<!-- No corner-shape support? [wrSquircle] clips the same look everywhere.
     Its own entry point: import { WrSquircle } from 'ngwr/squircle' and add
     WrSquircle to imports — the attribute is inert without it. -->
<wr-btn color="primary" wrSquircle [radius]="14">Squircle</wr-btn>`,
    block: `<wr-btn color="primary" block>Full width</wr-btn>`,
    icon: `<wr-btn icon="add" color="primary">Add</wr-btn>
<wr-btn icon="download" iconPosition="end" color="success">Download</wr-btn>`,
    disabled: `<wr-btn disabled>Disabled</wr-btn>`,
    loading: `<wr-btn [loading]="loading()" color="primary" (click)="loading.set(!loading())">
  Click to toggle
</wr-btn>`,
  };

  protected readonly api = API.WrButton;
}
