import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrReveal } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-reveal-page',
  templateUrl: './reveal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrReveal, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class RevealPage {
  protected readonly snippets = {
    install: `import { WrReveal } from 'ngwr/directives';`,
    usage: `<!-- Add 'ngwr/animations' for the .wr-reveal enter styles. -->
<h2 wrReveal>Animates in once visible</h2>
<div wrReveal threshold="0.5" rootMargin="-100px 0px">…</div>
<p wrReveal [once]="false">Re-runs on every entry</p>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrReveal]',
      description: 'Adds `.wr-reveal--visible` once the host enters the viewport. Pair with `ngwr/animations` styles.',
      type: 'directive',
      default: '—',
    },
  ];
}
