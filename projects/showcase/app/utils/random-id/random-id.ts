import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-utl-random-id-page',
  templateUrl: './random-id.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent, DocApiComponent],
})
export default class RandomIdUtilPageComponent {
  protected readonly snippet = `import { randomId } from 'ngwr/utils';

const id = randomId('wr-input'); // 'wr-input-h7m4k2'`;

  protected readonly whySnippet = `// Native options all have downsides:
const a = Math.random().toString(36).slice(2);   // collides under load, no prefix
const b = \`id-\${Date.now()}\`;                    // collides when called twice the same tick
const c = crypto.randomUUID();                   // 36 chars, ugly in HTML, not in every SSR runtime

// ngwr — short, prefixed, collision-resistant, SSR-safe.
const id = randomId('wr-input');   // 'wr-input-h7m4k2'`;

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'randomId(prefix?)',
      description: 'Generates a stable random id like `wr-input-h7m4k2`. Safe for SSR (uses crypto when available).',
      type: '(prefix?: string) => string',
      default: '—',
    },
  ];
}
