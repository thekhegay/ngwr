import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-has-modifier-page',
  templateUrl: './has-modifier.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class HasModifierPage {
  protected readonly snippet = `import { hasModifier } from 'ngwr/utils';

@HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
  if (hasModifier(e)) return;   // let Ctrl/Cmd-+key shortcuts through
  if (e.key === 'k') focusSearch();
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'hasModifier(event)',
      description: 'True when Ctrl / Cmd / Alt / Shift / Meta is currently held. Use to bypass plain-key shortcuts during chorded shortcuts.',
      type: '(e: KeyboardEvent) => boolean',
      default: '—',
    },
  ];
}
