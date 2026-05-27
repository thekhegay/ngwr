import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrTilt, WrTiltCard } from 'ngwr/tilt-card';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tilt-card-page',
  templateUrl: './tilt-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrTiltCard,
    WrTilt,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class TiltCardPage {
  protected readonly snippets = {
    install: `import { WrTiltCard, WrTilt } from 'ngwr/tilt-card';`,
    basic: `<wr-tilt-card>
  <h3>Hover me</h3>
  <p>Move the cursor across me.</p>
</wr-tilt-card>`,
    glare: `<wr-tilt-card [maxTilt]="20" [scale]="1.05" [glare]="true">
  <h3>Glare</h3>
  <p>Adds a moving highlight overlay.</p>
</wr-tilt-card>`,
    directive: `// Directive variant — same package, drops on any element.
import { WrTilt } from 'ngwr/tilt-card';

<img wrTilt [maxTilt]="10" [scale]="1.02" src="…" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'maxTilt', description: 'Maximum tilt in degrees.', type: 'number', default: '12' },
    { name: 'perspective', description: 'CSS perspective in pixels.', type: 'number', default: '800' },
    { name: 'scale', description: 'Scale applied while hovered.', type: 'number', default: '1.03' },
    { name: 'glare', description: 'Add a moving glare highlight overlay.', type: 'boolean', default: 'false' },
    {
      name: '[wrTilt]',
      description: 'Directive variant — same inputs as `<wr-tilt-card>`. Drops on any element.',
      type: 'directive',
      default: '—',
    },
  ];
}
