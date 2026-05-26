import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrBorderGlow } from 'ngwr/directives';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-border-glow-page',
  templateUrl: './border-glow.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrBorderGlow,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class BorderGlowPage {
  protected readonly snippets = {
    install: `import { WrBorderGlow } from 'ngwr/directives';`,
    usage: `<!-- Loads from 'ngwr/animations' — make sure it's imported. -->
<div wrBorderGlow [speed]="6" [thickness]="2" class="card">…</div>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: '[wrBorderGlow]',
      description: 'Animated rotating conic-gradient border. `[speed]` (seconds) and `[thickness]` (px) inputs.',
      type: 'directive',
      default: '—',
    },
  ];
}
