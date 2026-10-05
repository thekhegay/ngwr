import { Component, signal } from '@angular/core';

import { Copy, Download, Plus, Trash2, TriangleAlert } from 'lucide';
import { WrButton, type WrButtonShape } from 'ngwr/button';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WR_COLORS } from 'ngwr/theme';
import { WrTypography } from 'ngwr/typography';

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
  imports: [
    WrButton,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  styleUrl: './button.scss',
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
    basic: `<wr-btn>Default</wr-btn>
<button wr-btn>Native button</button>
<a wr-btn>Anchor</a>`,
    submit: `<form (ngSubmit)="save()">
  <!-- Submits: a real <button>, with the type the platform reads. -->
  <button wr-btn type="submit" color="primary">Save</button>

  <!-- Does NOT submit: <wr-btn> is a custom element. Bind the click. -->
  <wr-btn (click)="save()" color="primary">Save</wr-btn>
</form>`,
    colors: `<!-- No color at all is the default button. -->
<wr-btn>Default</wr-btn>
<wr-btn color="primary">Primary</wr-btn>
<wr-btn color="success">Success</wr-btn>`,
    outlined: `<wr-btn outlined>Default</wr-btn>
<wr-btn color="primary" outlined>Outlined</wr-btn>`,
    sizes: `<wr-btn size="sm">Small</wr-btn>
<wr-btn size="md">Medium</wr-btn>
<wr-btn size="lg">Large</wr-btn>`,
    shape: `<!-- Three shapes -->
<wr-btn color="primary">Rounded (default)</wr-btn>
<wr-btn color="primary" shape="pill">Pill</wr-btn>
<wr-btn color="primary" shape="squircle">Squircle</wr-btn>`,
    block: `<wr-btn color="primary" block>Full width</wr-btn>`,
    icon: `<wr-btn icon="add" color="primary">Add</wr-btn>
<wr-btn icon="trash" color="danger" outlined>Delete</wr-btn>
<wr-btn icon="download" iconPosition="end">Download</wr-btn>`,
    disabled: `<wr-btn disabled>Disabled</wr-btn>`,
    loading: `<wr-btn [loading]="loading()" color="primary" (click)="loading.set(!loading())">
  Click to toggle
</wr-btn>`,
  };

  protected readonly api = API.WrButton;
}
