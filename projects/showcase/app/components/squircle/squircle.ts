import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { WrSlider } from 'ngwr/slider';
import { WrSquircle, WrSquircleHost } from 'ngwr/squircle';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-squircle-page',
  templateUrl: './squircle.html',
  imports: [
    FormsModule,
    WrSlider,
    WrSquircle,
    WrSquircleHost,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
})
export default class SquirclePageComponent {
  protected readonly radius = signal(28);
  protected readonly smoothing = signal(1);

  protected readonly snippets = {
    install: `import { WrSquircle, WrSquircleHost } from 'ngwr/squircle';`,

    standalone: `<wr-squircle [radius]="24" style="width: 160px; height: 160px; background: var(--wr-color-primary)" />`,

    directive: `<!-- works on any element -->
<button wrButton wrSquircle [radius]="16">Save</button>
<wr-tag wrSquircle>v2.0</wr-tag>
<img wrSquircle [radius]="32" src="avatar.jpg" alt="" />`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'radius', description: 'Corner radius in pixels.', type: 'number', default: '12' },
    { name: 'smoothing', description: '0 = rounded rect, 1 = full smooth corner.', type: 'number', default: '1' },
    { name: 'enabled', description: 'Apply the squircle clip-path.', type: 'boolean', default: 'true' },
    { name: 'borderWidth', description: 'Border ring thickness in px (0 = none).', type: 'number', default: '0' },
    { name: 'borderColor', description: 'Border ring colour.', type: 'string', default: "'currentColor'" },
    {
      name: 'corners',
      description: 'Which corners to squircle.',
      type: "'all' | 'left' | 'right' | 'top' | 'bottom' | 'none'",
      default: "'all'",
    },
  ];
}
