import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, signal } from '@angular/core';

import {
  WrIcon,
  logoAngular,
  logoChrome,
  logoFirebase,
  logoGithub,
  logoGitlab,
  logoNpm,
  logoTelegram,
  provideWrIcons,
} from 'ngwr/icon';
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
  imports: [
    WrLogoLoop,
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocSnippetComponent,
    DocCodeComponent,
    DocApiComponent,
  ],
  providers: [
    provideWrIcons([logoAngular, logoChrome, logoFirebase, logoGithub, logoGitlab, logoNpm, logoTelegram]),
  ],
})
export default class LogoLoopPage {
  @ViewChild('angularLogo', { static: true }) private readonly angularLogo!: TemplateRef<unknown>;
  @ViewChild('chromeLogo', { static: true }) private readonly chromeLogo!: TemplateRef<unknown>;
  @ViewChild('firebaseLogo', { static: true }) private readonly firebaseLogo!: TemplateRef<unknown>;
  @ViewChild('githubLogo', { static: true }) private readonly githubLogo!: TemplateRef<unknown>;
  @ViewChild('gitlabLogo', { static: true }) private readonly gitlabLogo!: TemplateRef<unknown>;
  @ViewChild('npmLogo', { static: true }) private readonly npmLogo!: TemplateRef<unknown>;
  @ViewChild('telegramLogo', { static: true }) private readonly telegramLogo!: TemplateRef<unknown>;

  protected readonly logos = signal<readonly WrLogoLoopItem[]>([]);

  ngAfterViewInit(): void {
    this.logos.set([
      { node: this.angularLogo, ariaLabel: 'Angular' },
      { node: this.chromeLogo, ariaLabel: 'Chrome' },
      { node: this.firebaseLogo, ariaLabel: 'Firebase' },
      { node: this.githubLogo, ariaLabel: 'GitHub' },
      { node: this.gitlabLogo, ariaLabel: 'GitLab' },
      { node: this.npmLogo, ariaLabel: 'npm' },
      { node: this.telegramLogo, ariaLabel: 'Telegram' },
    ]);
  }

  protected readonly snippets = {
    install: `import { WrLogoLoop } from 'ngwr/logo-loop';`,
    basic: `<wr-logo-loop [logos]="logos" />

// Image variant:
protected readonly logos = [
  { src: '/assets/angular.svg', alt: 'Angular' },
  // …
];

// Template variant (any Angular content):
<ng-template #npmLogo><wr-icon name="logo-npm" size="36" /></ng-template>
protected readonly logos = [
  { node: this.npmLogo, ariaLabel: 'npm' },
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
    { name: 'direction', description: 'Track direction.', type: "'left' | 'right'", default: "'left'" },
    { name: 'logoHeight', description: 'Logo height in px.', type: 'number', default: '28' },
    { name: 'gap', description: 'Gap between logos in px.', type: 'number', default: '32' },
    { name: 'pauseOnHover', description: 'Pause the loop on hover.', type: 'boolean', default: 'false' },
    { name: 'hoverSpeed', description: 'Custom speed when hovered. Overrides `pauseOnHover`.', type: 'number', default: '—' },
    { name: 'fadeOut', description: 'Apply edge fade-out gradients.', type: 'boolean', default: 'false' },
    { name: 'fadeOutColor', description: 'Fade-out gradient colour. Defaults to the lib surface colour (`--wr-color-white`).', type: 'string', default: '—' },
    { name: 'scaleOnHover', description: 'Scale individual logos up on hover.', type: 'boolean', default: 'false' },
    { name: 'ariaLabel', description: 'Accessible label for the carousel region.', type: 'string', default: "'Partner logos'" },
  ];
}
