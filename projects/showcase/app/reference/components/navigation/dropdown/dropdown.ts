import { Component } from '@angular/core';

import { ChevronDown, Copy, Download, ExternalLink, Settings, Trash2 } from 'lucide';
import { WrButton, WrButtonGroup } from 'ngwr/button';
import { WrDropdown, WrDropdownItem, WrDropdownMenu, WrDropdownSubmenu } from 'ngwr/dropdown';
import { wrLucideIcons, provideWrIcons } from 'ngwr/icon';

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
    WrButtonGroup,
    WrDropdown,
    WrDropdownMenu,
    WrDropdownItem,
    WrDropdownSubmenu,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [
    provideWrIcons(
      wrLucideIcons({
        'copy-outline': Copy,
        download: Download,
        trash: Trash2,
        cog: Settings,
        'external-outline': ExternalLink,
        'chevron-down': ChevronDown,
      })
    ),
  ],
})
export default class DropdownComponent {
  protected readonly rows = ['Ada', 'Grace', 'Linus'];
  protected picked = '';

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
    manual: `<!-- One menu for every row: the click records the row, then opens -->
@for (row of rows; track row.id) {
  <button wr-btn type="button" [wrDropdown]="menu" trigger="manual" #d="wrDropdown" (click)="picked = row; d.open()">
    {{ row.name }}
  </button>
}

<wr-dropdown-menu #menu>
  <wr-dropdown-item icon="trash" (click)="remove(picked)">Delete</wr-dropdown-item>
</wr-dropdown-menu>`,
    submenu: `<button wr-btn type="button" [wrDropdown]="fileMenu" #file="wrDropdown">File</button>

<wr-dropdown-menu #fileMenu>
  <wr-dropdown-item (click)="create(); file.close()">New</wr-dropdown-item>
  <wr-dropdown-item [wrDropdownSubmenu]="exportMenu">Export</wr-dropdown-item>
  <wr-dropdown-item [wrDropdownSubmenu]="shareMenu">Share</wr-dropdown-item>
</wr-dropdown-menu>

<wr-dropdown-menu #exportMenu>
  <wr-dropdown-item (click)="export('csv'); file.close()">CSV</wr-dropdown-item>
  <wr-dropdown-item (click)="export('pdf'); file.close()">PDF</wr-dropdown-item>
  <wr-dropdown-item (click)="export('xlsx'); file.close()">Excel</wr-dropdown-item>
</wr-dropdown-menu>

<wr-dropdown-menu #shareMenu>
  <wr-dropdown-item (click)="share('link'); file.close()">Link</wr-dropdown-item>
  <wr-dropdown-item (click)="share('email'); file.close()">Email</wr-dropdown-item>
</wr-dropdown-menu>`,
    split: `<wr-btn-group>
  <button wr-btn type="button" color="primary" (click)="save()">Save</button>
  <button
    wr-btn
    type="button"
    color="primary"
    icon="chevron-down"
    aria-label="More ways to save"
    position="bottom-end"
    [wrDropdown]="saveMenu"
    #more="wrDropdown"
  ></button>
</wr-btn-group>

<wr-dropdown-menu #saveMenu>
  <wr-dropdown-item (click)="saveDraft(); more.close()">Save as draft</wr-dropdown-item>
  <wr-dropdown-item (click)="saveAndClose(); more.close()">Save and close</wr-dropdown-item>
</wr-dropdown-menu>`,
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

  protected readonly submenuApi = API.WrDropdownSubmenu;
}
