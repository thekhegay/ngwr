import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WrLogoLoop, type WrLogoLoopItem } from 'ngwr/logo-loop';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSnippetComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-logo-loop-page',
  templateUrl: './logo-loop.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WrLogoLoop, DocPageComponent, DocSectionComponent, DocSnippetComponent, DocCodeComponent, DocApiComponent],
})
export default class LogoLoopPage {
  protected readonly logos: readonly WrLogoLoopItem[] = [
    { src: 'https://cdn.simpleicons.org/angular', alt: 'Angular' },
    { src: 'https://cdn.simpleicons.org/typescript', alt: 'TypeScript' },
    { src: 'https://cdn.simpleicons.org/rxjs', alt: 'rxjs' },
    { src: 'https://cdn.simpleicons.org/vite', alt: 'Vite' },
    { src: 'https://cdn.simpleicons.org/sass', alt: 'Sass' },
    { src: 'https://cdn.simpleicons.org/vercel', alt: 'Vercel' },
    { src: 'https://cdn.simpleicons.org/github', alt: 'GitHub' },
    { src: 'https://cdn.simpleicons.org/npm', alt: 'npm' },
  ];

  protected readonly snippets = {
    install: `import { WrLogoLoop } from 'ngwr/logo-loop';`,
    basic: `<wr-logo-loop [logos]="logos" />

// component.ts
protected readonly logos = [
  { src: 'https://cdn.simpleicons.org/angular', alt: 'Angular' },
  { src: 'https://cdn.simpleicons.org/typescript', alt: 'TypeScript' },
  // …
];`,
    custom: `<wr-logo-loop
  [logos]="logos"
  [speed]="60"
  [gap]="48"
  [logoHeight]="36"
  direction="right"
  [fadeOut]="true"
  [scaleOnHover]="true"
  [pauseOnHover]="true"
/>`,
  };

  protected readonly api: readonly DocApiRow[] = [
    { name: 'logos', description: 'Logos to display (images or template nodes).', type: 'WrLogoLoopItem[]', default: '— (required)', required: true },
    { name: 'speed', description: 'Scroll speed in px/s. Negative reverses direction.', type: 'number', default: '120' },
    { name: 'direction', description: "Track direction.", type: "'left' | 'right'", default: "'left'" },
    { name: 'logoHeight', description: 'Logo height in px.', type: 'number', default: '28' },
    { name: 'gap', description: 'Gap between logos in px.', type: 'number', default: '32' },
    { name: 'pauseOnHover', description: 'Pause the loop on hover.', type: 'boolean', default: 'false' },
    { name: 'hoverSpeed', description: 'Custom speed when hovered. Overrides `pauseOnHover`.', type: 'number', default: '—' },
    { name: 'fadeOut', description: 'Apply edge fade-out gradients.', type: 'boolean', default: 'false' },
    { name: 'fadeOutColor', description: 'Fade-out gradient colour. Defaults to the page background.', type: 'string', default: '—' },
    { name: 'scaleOnHover', description: 'Scale individual logos up on hover.', type: 'boolean', default: 'false' },
    { name: 'ariaLabel', description: 'Accessible label for the carousel region.', type: 'string', default: "'Partner logos'" },
  ];
}
