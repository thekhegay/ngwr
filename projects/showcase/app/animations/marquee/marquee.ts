import { Component, type TemplateRef, computed, signal, viewChild } from '@angular/core';

import { Atom, Code, Flame, GitBranch, Globe, Package, Send } from 'lucide';
import { WrIcon, provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrMarquee, type WrMarqueeItem } from 'ngwr/marquee';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  type DocControl,
  DocPageComponent,
  DocPlaygroundComponent,
  DocSectionComponent,
  ReactbitsCredit,
} from '#core/components';

@Component({
  selector: 'ngwr-marquee-page',
  templateUrl: './marquee.html',
  imports: [
    WrMarquee,
    WrIcon,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
  providers: [
    provideWrIcons(
      lucideIcons({
        'logo-angular': Atom,
        'logo-chrome': Globe,
        'logo-firebase': Flame,
        'logo-github': Code,
        'logo-gitlab': GitBranch,
        'logo-npm': Package,
        'logo-telegram': Send,
      })
    ),
  ],
})
export default class MarqueePage {
  private readonly angularLogo = viewChild.required<TemplateRef<unknown>>('angularLogo');
  private readonly chromeLogo = viewChild.required<TemplateRef<unknown>>('chromeLogo');
  private readonly firebaseLogo = viewChild.required<TemplateRef<unknown>>('firebaseLogo');
  private readonly githubLogo = viewChild.required<TemplateRef<unknown>>('githubLogo');
  private readonly gitlabLogo = viewChild.required<TemplateRef<unknown>>('gitlabLogo');
  private readonly npmLogo = viewChild.required<TemplateRef<unknown>>('npmLogo');
  private readonly telegramLogo = viewChild.required<TemplateRef<unknown>>('telegramLogo');

  protected readonly items = computed<readonly WrMarqueeItem[]>(() => [
    { node: this.angularLogo(), ariaLabel: 'Angular' },
    { node: this.chromeLogo(), ariaLabel: 'Chrome' },
    { node: this.firebaseLogo(), ariaLabel: 'Firebase' },
    { node: this.githubLogo(), ariaLabel: 'GitHub' },
    { node: this.gitlabLogo(), ariaLabel: 'GitLab' },
    { node: this.npmLogo(), ariaLabel: 'npm' },
    { node: this.telegramLogo(), ariaLabel: 'Telegram' },
  ]);

  // ── Live demo state ─────────────────────────────────────────────
  protected readonly speed = signal(120);
  protected readonly gap = signal(48);
  protected readonly itemHeight = signal(36);
  protected readonly direction = signal<'left' | 'right'>('left');
  protected readonly pauseOnHover = signal(false);
  protected readonly fadeOut = signal(true);

  protected readonly snippet = computed(
    () =>
      `<wr-marquee
  [items]="items"
  [speed]="${this.speed()}"
  [gap]="${this.gap()}"
  [itemHeight]="${this.itemHeight()}"
  direction="${this.direction()}"
  [pauseOnHover]="${this.pauseOnHover()}"
  [fadeOut]="${this.fadeOut()}"
/>`
  );

  protected readonly controls: readonly DocControl[] = [
    { kind: 'slider', label: 'Speed (px/s)', signal: this.speed, min: 10, max: 300, step: 5 },
    { kind: 'slider', label: 'Gap (px)', signal: this.gap, min: 8, max: 96, step: 2, unit: 'px' },
    { kind: 'slider', label: 'Item Height (px)', signal: this.itemHeight, min: 16, max: 72, step: 1, unit: 'px' },
    { kind: 'select', label: 'Direction', signal: this.direction, options: ['left', 'right'] as const },
    { kind: 'toggle', label: 'Pause on Hover', signal: this.pauseOnHover },
    { kind: 'toggle', label: 'Fade Out', signal: this.fadeOut },
  ];

  protected readonly snippets = {
    install: `import { WrMarquee } from 'ngwr/marquee';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'items',
      description: 'Items to display (images or template nodes).',
      type: 'WrMarqueeItem[]',
      default: '— (required)',
      required: true,
    },
    {
      name: 'speed',
      description: 'Scroll speed in px/s. Negative reverses direction.',
      type: 'number',
      default: '120',
    },
    { name: 'direction', description: 'Track direction.', type: "'left' | 'right'", default: "'left'" },
    { name: 'itemHeight', description: 'Item height in px.', type: 'number', default: '28' },
    { name: 'gap', description: 'Gap between items in px.', type: 'number', default: '32' },
    { name: 'pauseOnHover', description: 'Pause the loop on hover.', type: 'boolean', default: 'false' },
    {
      name: 'hoverSpeed',
      description: 'Custom speed when hovered. Overrides `pauseOnHover`.',
      type: 'number',
      default: '—',
    },
    { name: 'fadeOut', description: 'Apply edge fade-out gradients.', type: 'boolean', default: 'false' },
    {
      name: 'fadeOutColor',
      description: 'Fade-out gradient colour. Defaults to the lib surface colour (`--wr-color-white`).',
      type: 'string',
      default: '—',
    },
    { name: 'scaleOnHover', description: 'Scale individual items up on hover.', type: 'boolean', default: 'false' },
    {
      name: 'ariaLabel',
      description: 'Accessible label for the carousel region.',
      type: 'string',
      default: "'Marquee'",
    },
  ];
}
