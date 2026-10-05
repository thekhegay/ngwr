import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-noop-page',
  templateUrl: './noop.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class NoopPage {
  protected readonly snippet = `import { noop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = noop;
}`;

  protected readonly whySnippet = `// Inline — reads as unfinished, and each instance gets its own closure.
class MyComponent {
  onChange = () => {};
}

// noop — says the nothing is deliberate, and it is one shared reference.
class MyComponent {
  onChange = noop;
}

// Where the reference matters: the same function goes in and comes back out.
el.addEventListener('scroll', noop);
el.removeEventListener('scroll', noop);`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'noop()',
      description: 'No-op function. Use as default for required callback slots.',
      type: '() => void',
      default: '—',
    },
  ];
}
