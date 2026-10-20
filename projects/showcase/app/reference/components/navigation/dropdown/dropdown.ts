import { Component } from '@angular/core';

import { Copy, Download, ExternalLink, Settings, Trash2 } from 'lucide';
import { WrButton } from 'ngwr/button';
import { WrDropdown, WrDropdownItem, WrDropdownMenu } from 'ngwr/dropdown';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

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
    basic: `<!-- Items do not close the menu: d.close() does. -->
<button wr-btn type="button" [wrDropdown]="menu" #d="wrDropdown">Actions</button>

<wr-dropdown-menu #menu>
  <wr-dropdown-item icon="copy-outline" (click)="copy(); d.close()">Copy</wr-dropdown-item>
  <wr-dropdown-item icon="download" (click)="download(); d.close()">Download</wr-dropdown-item>
  <wr-dropdown-item icon="trash" (click)="remove(); d.close()">Delete</wr-dropdown-item>
</wr-dropdown-menu>`,
    positions: `<button wr-btn type="button" [wrDropdown]="menu" position="top-start">Top start</button>`,
    arrow: `<!-- On by default -->
<button wr-btn type="button" [wrDropdown]="menu">With arrow</button>

<button wr-btn type="button" [wrDropdown]="menu" [arrow]="false">Without arrow</button>`,
    hover: `<button wr-btn type="button" [wrDropdown]="menu" trigger="hover">Hover me</button>`,
    disabled: `<wr-dropdown-item icon="cog" disabled>Disabled item</wr-dropdown-item>`,
    triggerId: `<!-- The menu gets aria-labelledby="row-actions" -->
<button wr-btn type="button" id="row-actions" [wrDropdown]="menu">Actions</button>

<!-- Bound ids work too -->
<button wr-btn type="button" [id]="'actions-' + row.id" [wrDropdown]="menu">Actions</button>`,
    scrollable: `import { CdkScrollable } from '@angular/cdk/scrolling';

@Component({
  imports: [CdkScrollable, WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: \`
    <div class="side-panel" cdkScrollable>
      <button wr-btn type="button" [wrDropdown]="menu">Actions</button>
    </div>
  \`,
})
export class PanelComponent {}`,
    exportAs: `<wr-btn [wrDropdown]="menu" #actions="wrDropdown">Actions</wr-btn>
<wr-dropdown-menu #menu>
  <wr-dropdown-item>Copy</wr-dropdown-item>
</wr-dropdown-menu>

<!-- Anywhere else in the same template -->
<wr-btn (click)="actions.toggle()">Toggle from here</wr-btn>
@if (actions.isOpen()) {
  <span>The menu is up.</span>
}`,
  };

  protected readonly api = API.WrDropdown;

  protected readonly itemApi = API.WrDropdownItem;
}
