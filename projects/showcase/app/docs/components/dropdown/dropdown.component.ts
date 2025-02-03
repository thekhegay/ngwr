/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ChangeDetectionStrategy, Component, HostBinding, inject, OnInit, ViewEncapsulation } from '@angular/core';

import { WrButtonComponent } from 'ngwr/button';
import { WrDropdownDirective } from 'ngwr/dropdown';
import { WrDropdownMenuItemComponent } from 'ngwr/dropdown/dropdown-menu-item.component';
import { WrDropdownMenuComponent } from 'ngwr/dropdown/dropdown-menu.component';
import { add, chevronDown, modules, provideWrIcons, trash, wrIconName } from 'ngwr/icon';
import { WrTagComponent } from 'ngwr/tag';

import { CodeComponent, SnippetComponent } from '#core/components';
import { SeoService } from '#core/services';

@Component({
  standalone: true,
  selector: 'ngwr-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CodeComponent,
    SnippetComponent,
    WrDropdownDirective,
    WrDropdownMenuComponent,
    WrDropdownMenuItemComponent,
    WrTagComponent,
    WrButtonComponent,
  ],
  providers: [provideWrIcons([chevronDown, add, modules, trash])],
})
export class DropdownComponent implements OnInit {
  @HostBinding() class = 'ngwr-page';

  private readonly seoService = inject(SeoService);

  title = 'Dropdown';
  description = 'A dropdown menu component that can be attached to any element';

  code = {
    import: `import { WrDropdownDirective, WrDropdownMenuComponent, WrDropdownMenuItemComponent } from 'ngwr/dropdown';`,
    component: `@Component({
                  //...,
                  imports: [
                    WrDropdownDirective,
                    WrDropdownMenuComponent,
                    WrDropdownMenuItemComponent
                  ],
                })
                export class MyComponent {}`,
    basic: `<wr-btn wrDropdown [dropdownMenu]="basicMenu" icon="chevron-down" iconPosition="end">Dropdown</wr-btn>

            <wr-dropdown-menu #menu="wrDropdownMenu">
              <wr-dropdown-menu-item>Item 1</wr-dropdown-menu-item>
              <wr-dropdown-menu-item>Item 2</wr-dropdown-menu-item>
            </wr-dropdown-menu>`,
    position: `<button
                  wrDropdown
                  [dropdownMenu]="menu"
                  position="bottomRight">
                  Dropdown Position
                </button>`,
    withIcons: `<wr-btn wrDropdown [dropdownMenu]="iconMenu" icon="chevron-down" iconPosition="end">Items with Icons</wr-btn>
                <wr-dropdown-menu #menu="wrDropdownMenu">
                  <wr-dropdown-menu-item icon="add">
                    Add
                  </wr-dropdown-menu-item>
                  <wr-dropdown-menu-item icon="modules">
                    Copy
                  </wr-dropdown-menu-item>
                  <wr-dropdown-menu-item icon="trash">
                    Delete
                  </wr-dropdown-menu-item>
                </wr-dropdown-menu>`,
    customContent: `<wr-btn wrDropdown [dropdownMenu]="customMenu" icon="chevron-down" iconPosition="end">Custom Content</wr-btn>

                    <wr-dropdown-menu #menu="wrDropdownMenu">
                      <div class="custom-content">
                        <h4>Custom Header</h4>
                        <p>Any content can be placed here</p>
                        <wr-btn>Action</wr-btn>
                      </div>
                    </wr-dropdown-menu>`,
    triggerTypes: `<wr-btn wrDropdown [dropdownMenu]="clickMenu" icon="chevron-down" iconPosition="end">
                    Click Trigger
                  </wr-btn>

                  <wr-btn wrDropdown [dropdownMenu]="hoverMenu" trigger="hover" icon="chevron-down" iconPosition="end">
                    Hover Trigger
                  </wr-btn>

                  <wr-dropdown-menu #clickMenu="wrDropdownMenu">
                    <wr-dropdown-menu-item>Item 1</wr-dropdown-menu-item>
                    <wr-dropdown-menu-item>Item 2</wr-dropdown-menu-item>
                  </wr-dropdown-menu>

                  <wr-dropdown-menu #hoverMenu="wrDropdownMenu">
                    <wr-dropdown-menu-item>Item 1</wr-dropdown-menu-item>
                    <wr-dropdown-menu-item>Item 2</wr-dropdown-menu-item>
                  </wr-dropdown-menu>`,
    disabled: `<wr-btn wrDropdown [dropdownMenu]="disabledMenu" icon="chevron-down" iconPosition="end">
                 With Disabled Items
               </wr-btn>
              <wr-dropdown-menu-item [disabled]="true">
                Disabled Item
              </wr-dropdown-menu-item>`,
    styling: `:root {
                --wr-dropdown-bg: var(--wr-color-white);
                --wr-dropdown-border-color: var(--wr-color-light-lighter);
                --wr-dropdown-border-radius: 0.375rem;
                --wr-dropdown-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                --wr-dropdown-padding: 4px 0;
                --wr-dropdown-min-width: 160px;

                --wr-dropdown-item-padding: 8px 16px;
                --wr-dropdown-item-color: var(--wr-color-dark);
                --wr-dropdown-item-hover-bg: var(--wr-color-light-lighter);
                --wr-dropdown-item-active-bg: var(--wr-color-light);
                --wr-dropdown-item-disabled-color: var(--wr-color-medium);
                --wr-dropdown-item-gap: 16px;
                --wr-dropdown-item-icon-size: 14px;
                --wr-dropdown-item-font-size: 14px;
              }`,
  };

  menuItems = [
    { label: 'Add', icon: 'add' as wrIconName },
    { label: 'Copy', icon: 'modules' as wrIconName },
    { label: 'Delete', icon: 'trash' as wrIconName },
  ];

  ngOnInit(): void {
    this.seoService.setCanonicalURL();
    this.seoService.setTitle('Dropdown');
    this.seoService.setDescription(this.description);
    this.seoService.setKeywords(['dropdown', 'wr-dropdown', 'menu', 'overlay']);
  }
}
