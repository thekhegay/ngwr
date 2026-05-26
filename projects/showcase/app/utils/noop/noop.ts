import { ChangeDetectionStrategy, Component } from '@angular/core';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class NoopPage {
  protected readonly snippet = `import { noop } from 'ngwr/utils';

class MyService {
  private onChange: (v: string) => void = noop;
}`;

  protected readonly whySnippet = `// Native — each instance gets a fresh arrow, breaking ref equality.
class MyComponent {
  // \`() => {}\` here creates a new function per instance.
  onChange = () => {};
}
// → OnPush comparing \`onChange\` between renders sees "changed" every time.

// ngwr — single shared function reference; ref equality is stable.
class MyComponent {
  onChange = noop;
}`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'noop()',
      description: 'No-op function. Use as default for required callback slots.',
      type: '() => void',
      default: '—',
    },
  ];
}
