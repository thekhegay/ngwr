import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-keys-page',
  templateUrl: './keys.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class KeysUtilPageComponent {
  protected readonly snippet = `import { KEYS, hasModifier, isPrintableKey } from 'ngwr/utils';

if (event.key === KEYS.ESCAPE) { close(); }
if (hasModifier(event)) { /* ctrl/cmd/alt/shift held */ }
if (isPrintableKey(event)) { /* single printable char */ }`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'KEYS',
      description: 'Canonical `KeyboardEvent.key` constants — `ENTER`, `ESCAPE`, `ARROW_UP`, …',
      type: 'const record',
      default: '—',
    },
    { name: 'WrKey', description: 'Union of every value in `KEYS`.', type: 'type', default: '—' },
    {
      name: 'hasModifier(event)',
      description: 'True when Ctrl / Cmd / Alt / Shift / Meta is held.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
    {
      name: 'isPrintableKey(event)',
      description: 'True when the key is a single printable character (no modifiers).',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
