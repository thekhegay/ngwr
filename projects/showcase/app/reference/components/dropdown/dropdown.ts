import { Component } from '@angular/core';

import { Copy, Download, ExternalLink, Settings, Trash2 } from 'lucide';
import { WrButton } from 'ngwr/button';
import { WrDropdown, WrDropdownItem, WrDropdownMenu } from 'ngwr/dropdown';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

import {
  DocApiComponent,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';
import { API } from '#core/generated/api';

@Component({
  selector: 'ngwr-dropdown-page',
  templateUrl: './dropdown.html',
  imports: [
    WrButton,
    WrDropdown,
    WrDropdownMenu,
    WrDropdownItem,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [
    provideWrIcons(
      lucideIcons({
        'copy-outline': Copy,
        download: Download,
        trash: Trash2,
        cog: Settings,
        'external-outline': ExternalLink,
      })
    ),
  ],
})
export default class DropdownComponent {
  protected readonly snippets = {
    install: `import { WrDropdown, WrDropdownMenu, WrDropdownItem } from 'ngwr/dropdown';

@Component({ imports: [WrDropdown, WrDropdownMenu, WrDropdownItem] })
export class MyComponent {}`,
    basic: `<button wr-btn [wrDropdown]="menu">Actions</button>

<wr-dropdown-menu #menu>
  <wr-dropdown-item icon="copy-outline">Copy</wr-dropdown-item>
  <wr-dropdown-item icon="download">Download</wr-dropdown-item>
  <wr-dropdown-item icon="trash">Delete</wr-dropdown-item>
</wr-dropdown-menu>`,
    positions: `<button wr-btn [wrDropdown]="menu" position="top-start">Top start</button>`,
    hover: `<button wr-btn [wrDropdown]="menu" trigger="hover">Hover me</button>`,
    disabled: `<wr-dropdown-item icon="cog" disabled>Disabled item</wr-dropdown-item>`,
  };

  protected readonly api = API.WrDropdown;

  protected readonly itemApi = API.WrDropdownItem;
}
