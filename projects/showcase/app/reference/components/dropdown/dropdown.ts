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
    triggerId: `<!-- Your id stays on the element; the menu points at it. -->
<button wr-btn id="row-actions" [wrDropdown]="menu">Actions</button>
<!-- => <button id="row-actions" aria-haspopup="menu" …>
     <div role="menu" aria-labelledby="row-actions"> -->

<!-- Bound and interpolated forms are honoured too. -->
<button wr-btn [id]="'actions-' + row.id" [wrDropdown]="menu">Actions</button>

<!-- No id of your own: the fallback is generated, and is not a stable
     locator — it counts dropdown instances, so it differs between the
     prerendered page and the hydrated one.
     => <button id="wr-dropdown-trigger-3" …> -->
<button wr-btn [wrDropdown]="menu">Actions</button>`,
    scrollable: `import { CdkScrollable } from '@angular/cdk/scrolling';

@Component({
  imports: [CdkScrollable, WrDropdown, WrDropdownMenu, WrDropdownItem],
  template: \`
    <!-- Without \`cdkScrollable\` the menu is placed once and stays there while
         this box scrolls — it ends up floating over, or away from, its own
         trigger. The window itself is always tracked; a nested scroller is not
         until it registers. -->
    <div class="side-panel" cdkScrollable>
      <button wr-btn [wrDropdown]="menu">Actions</button>
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
