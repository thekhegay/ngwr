import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { WrGradientText } from 'ngwr/gradient-text';

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
  selector: 'ngwr-gradient-text-page',
  templateUrl: './gradient-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    WrGradientText,
    DocPageComponent,
    DocSectionComponent,
    DocPlaygroundComponent,
    DocCodeComponent,
    DocApiComponent,
    ReactbitsCredit,
  ],
})
export default class GradientTextPage {
  // ── Live demo state ─────────────────────────────────────────────
  protected readonly text = signal('Hello, ngwr!');
  protected readonly animationSpeed = signal(8);
  protected readonly direction = signal<'horizontal' | 'vertical' | 'diagonal'>('horizontal');
  protected readonly yoyo = signal(true);
  protected readonly pauseOnHover = signal(false);
  protected readonly showBorder = signal(false);

  protected readonly snippet = computed(
    () =>
      `<wr-gradient-text
  [animationSpeed]="${this.animationSpeed()}"
  direction="${this.direction()}"
  [yoyo]="${this.yoyo()}"
  [pauseOnHover]="${this.pauseOnHover()}"
  [showBorder]="${this.showBorder()}"
>
  ${this.text()}
</wr-gradient-text>`
  );

  protected readonly controls: readonly DocControl[] = [
    {
      kind: 'slider',
      label: 'Speed (s)',
      signal: this.animationSpeed,
      min: 1,
      max: 20,
      step: 0.5,
      precision: 1,
      unit: 's',
    },
    {
      kind: 'select',
      label: 'Direction',
      signal: this.direction,
      options: ['horizontal', 'vertical', 'diagonal'] as const,
    },
    { kind: 'toggle', label: 'Yoyo', signal: this.yoyo },
    { kind: 'toggle', label: 'Pause on Hover', signal: this.pauseOnHover },
    { kind: 'toggle', label: 'Border', signal: this.showBorder },
    { kind: 'text', label: 'Text', signal: this.text, placeholder: 'Text' },
  ];

  protected readonly snippets = {
    install: `import { WrGradientText } from 'ngwr/gradient-text';`,
  };

  protected readonly api: readonly DocApiRow[] = [
    {
      name: 'colors',
      description: 'Gradient stops (any CSS colours).',
      type: 'readonly string[]',
      default: "['#5227FF', '#FF9FFC', '#B497CF']",
    },
    {
      name: 'animationSpeed',
      description: 'Seconds per full sweep (or per half if `yoyo` is on).',
      type: 'number',
      default: '8',
    },
    {
      name: 'showBorder',
      description: 'Wrap the text in a dark pill with the gradient as a border.',
      type: 'boolean',
      default: 'false',
    },
    {
      name: 'direction',
      description: 'Gradient slide direction.',
      type: "'horizontal' | 'vertical' | 'diagonal'",
      default: "'horizontal'",
    },
    { name: 'pauseOnHover', description: 'Pause the animation while hovered.', type: 'boolean', default: 'false' },
    { name: 'yoyo', description: 'Bounce back-and-forth instead of restarting.', type: 'boolean', default: 'true' },
  ];
}
