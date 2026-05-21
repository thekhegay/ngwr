import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrDropdownDirective, WrDropdownItemComponent, WrDropdownMenuComponent } from 'ngwr/dropdown';
import { provideWrIcons, copyOutline, download, trash, cog, externalOutline } from 'ngwr/icon';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-dropdown-page',
  templateUrl: './dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrDropdownDirective,
    WrDropdownMenuComponent,
    WrDropdownItemComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [provideWrIcons([copyOutline, download, trash, cog, externalOutline])],
})
export default class DropdownComponent {
  protected readonly snippets = {
    install: `import { WrDropdownDirective, WrDropdownMenuComponent, WrDropdownItemComponent } from 'ngwr/dropdown';

@Component({ imports: [WrDropdownDirective, WrDropdownMenuComponent, WrDropdownItemComponent] })
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

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrDropdown]',
      description: 'Menu component to open.',
      type: 'WrDropdownMenuComponent',
      required: true,
    },
    { name: 'trigger', description: 'How the menu opens.', type: "'click' | 'hover'", default: "'click'" },
    {
      name: 'position',
      description: 'Anchor side.',
      type: "'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'",
      default: "'bottom-start'",
    },
    { name: '(opened)', description: 'Fires after the menu opens.', type: 'EventEmitter<void>', default: '—' },
    { name: '(closed)', description: 'Fires after the menu closes.', type: 'EventEmitter<void>', default: '—' },
  ];

  protected readonly itemApi: readonly DocApiRow[] = [
    { name: 'icon', description: 'Optional leading icon.', type: 'WrIconName | null', default: 'null' },
    { name: 'disabled', description: 'Disable interaction.', type: 'boolean', default: 'false' },
  ];
}
