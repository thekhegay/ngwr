import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { WrButtonComponent, WrButtonGroupComponent } from 'ngwr/button';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

type Align = 'left' | 'center' | 'right';

@Component({
  selector: 'ngwr-button-group-page',
  templateUrl: './button-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrButtonComponent,
    WrButtonGroupComponent,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class ButtonGroupComponent {
  protected readonly align = signal<Align>('left');

  protected readonly snippets = {
    install: `import { WrButtonGroupComponent } from 'ngwr/button';

@Component({ imports: [WrButtonComponent, WrButtonGroupComponent] })
export class MyComponent {}`,
    basic: `<wr-btn-group>
  <button wr-btn>Left</button>
  <button wr-btn>Middle</button>
  <button wr-btn>Right</button>
</wr-btn-group>`,
    colors: `<wr-btn-group>
  <button wr-btn color="primary">Save</button>
  <button wr-btn color="primary">Save & Continue</button>
</wr-btn-group>`,
    toggle: `<wr-btn-group>
  <button wr-btn [color]="align() === 'left' ? 'primary' : null" (click)="align.set('left')">Left</button>
  <button wr-btn [color]="align() === 'center' ? 'primary' : null" (click)="align.set('center')">Center</button>
  <button wr-btn [color]="align() === 'right' ? 'primary' : null" (click)="align.set('right')">Right</button>
</wr-btn-group>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: '—', description: 'No inputs. Place buttons as children.', type: '—', default: '—' },
  ];

  protected colorFor(value: Align): 'primary' | null {
    return this.align() === value ? 'primary' : null;
  }

  protected setAlign(value: Align): void {
    this.align.set(value);
  }
}
