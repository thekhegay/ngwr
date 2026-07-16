import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
} from '#core/components';

@Component({
  selector: 'ngwr-tokens-sizing',
  templateUrl: './sizing.html',
  imports: [DocApiComponent, DocCodeComponent, DocPageComponent, DocSectionComponent],
})
export default class TokensSizingPage {
  protected readonly snippets = {
    contract: `:root {
  /* sm → 22px · md → 30px · lg → 36px */
  --wr-control-padding-y-sm: 0.125rem;  /* 2px  → 16 + 2×2 + 2×1 = 22 */
  --wr-control-padding-y-md: 0.25rem;   /* 4px  → 20 + 2×4 + 2×1 = 30 */
  --wr-control-padding-y-lg: 0.3125rem; /* 5px  → 24 + 2×5 + 2×1 = 36 */

  --wr-control-padding-x-sm: 0.5rem;    /* 8px  */
  --wr-control-padding-x-md: 0.75rem;   /* 12px */
  --wr-control-padding-x-lg: 1rem;      /* 16px */

  --wr-control-line-height-sm: 1rem;    /* 16px */
  --wr-control-line-height-md: 1.25rem; /* 20px */
  --wr-control-line-height-lg: 1.5rem;  /* 24px */

  --wr-control-font-size-sm: var(--wr-text-xs);   /* 12px */
  --wr-control-font-size-md: var(--wr-text-sm);   /* 14px */
  --wr-control-font-size-lg: var(--wr-text-base); /* 16px */

  --wr-control-radius-sm: 5px;
  --wr-control-radius-md: 6px;
  --wr-control-radius-lg: 7px;
}`,

    derive: `/* A control never hard-codes its height. It sums the three contract
   parts, and multiplies padding-y by the density factor so the whole
   catalogue tracks density together. From the button styles: */
.wr-btn {
  --wr-btn-padding-y: var(--wr-control-padding-y-md);
  --wr-btn-line-height: var(--wr-control-line-height-md);
  --wr-btn-font-size: var(--wr-control-font-size-md);
  --wr-btn-radius: var(--wr-control-radius-md);

  line-height: var(--wr-btn-line-height);
  font-size: var(--wr-btn-font-size);
  /* height = line-height + 2×padding-y(×density) + 2×1px border */
  padding: calc(var(--wr-btn-padding-y) * var(--wr-density-y, 1))
    calc(var(--wr-btn-padding-x) * var(--wr-density-x, 1));
}

/* The 'sm' / 'lg' modifiers just re-point the same knobs at the
   matching tier of the contract — so button, input and select line
   up pixel-for-pixel in a row at every size. */
.wr-btn--sm {
  --wr-btn-padding-y: var(--wr-control-padding-y-sm);
  --wr-btn-line-height: var(--wr-control-line-height-sm);
  --wr-btn-font-size: var(--wr-control-font-size-sm);
  --wr-btn-radius: var(--wr-control-radius-sm);
}`,

    size: `<!-- The same size API on every control — sm · md (default) · lg. -->
<button wr-button size="sm">Small</button>
<button wr-button size="md">Medium</button>
<button wr-button size="lg">Large</button>

<input wrInput size="sm" placeholder="Small" />
<wr-select size="lg" placeholder="Large">…</wr-select>`,

    sizeType: `import { input } from '@angular/core';

// Each control re-exports its own size alias, but they share one shape.
export type WrButtonSize = 'sm' | 'md' | 'lg';
export type WrInputSize = 'sm' | 'md' | 'lg';
export type WrSelectSize = 'sm' | 'md' | 'lg';

// In the component the input defaults to 'md' and only emits a class
// when it differs — so the base styles cover the common case.
readonly size = input<WrButtonSize>('md');
// host: const size = this.size();
//       if (size !== 'md') parts.push(\`wr-btn--\${size}\`);`,

    radius: `:root {
  /* Controls — the squircle radii that sit on buttons / inputs / selects. */
  --wr-control-radius-sm: 5px;
  --wr-control-radius-md: 6px;
  --wr-control-radius-lg: 7px;

  /* Containers & overlays — cards, dropdowns, dialogs, toasts… */
  --wr-border-radius-sm: 0.375rem;  /* 6px  — nested items (e.g. dropdown rows) */
  --wr-border-radius-base: 0.625rem; /* 10px — the default panel radius */
  --wr-border-radius-lg: 1rem;       /* 16px — large surfaces */
  --wr-border-radius-pill: 50rem;    /* fully-rounded ends (pill buttons, tags) */
}

/* Circles are not a token — avatars, radio dots and FABs use 50% directly. */
.wr-avatar { border-radius: 50%; }`,
  };

  protected readonly contractTokens: readonly DocApiRow[] = [
    {
      name: '--wr-control-padding-y-{sm,md,lg}',
      type: 'length',
      default: '2px · 4px · 5px',
      description:
        'Vertical padding per size. Multiplied by `--wr-density-y` at consume time, so it stays the only density-aware part of the height.',
    },
    {
      name: '--wr-control-padding-x-{sm,md,lg}',
      type: 'length',
      default: '8px · 12px · 16px',
      description: 'Horizontal padding per size. Multiplied by `--wr-density-x` at consume time.',
    },
    {
      name: '--wr-control-line-height-{sm,md,lg}',
      type: 'length',
      default: '16px · 20px · 24px',
      description: 'The text box height — the fixed core the padding is added around.',
    },
    {
      name: '--wr-control-font-size-{sm,md,lg}',
      type: 'length',
      default: '`--wr-text-xs` · `--wr-text-sm` · `--wr-text-base`',
      description: 'Label size per tier — 12 / 14 / 16px. Aliases the type scale so it stays in step with typography.',
    },
    {
      name: '--wr-control-radius-{sm,md,lg}',
      type: 'length',
      default: '5px · 6px · 7px',
      description: 'Corner radius per control size. Climbs gently so larger controls read a touch rounder.',
    },
  ];

  protected readonly radiusTokens: readonly DocApiRow[] = [
    {
      name: '--wr-control-radius-sm',
      type: 'length',
      default: '5px',
      description: 'Small control corners (`size="sm"` button / input / select).',
    },
    {
      name: '--wr-control-radius-md',
      type: 'length',
      default: '6px',
      description: 'Default control corners.',
    },
    {
      name: '--wr-control-radius-lg',
      type: 'length',
      default: '7px',
      description: 'Large control corners.',
    },
    {
      name: '--wr-border-radius-sm',
      type: 'length',
      default: '0.375rem (6px)',
      description: 'Nested surfaces inside a panel — e.g. dropdown / context-menu rows.',
    },
    {
      name: '--wr-border-radius-base',
      type: 'length',
      default: '0.625rem (10px)',
      description: 'The default container / overlay radius — cards, dropdowns, dialogs, toasts, popovers.',
    },
    {
      name: '--wr-border-radius-lg',
      type: 'length',
      default: '1rem (16px)',
      description: 'Large surfaces that want a softer frame.',
    },
    {
      name: '--wr-border-radius-pill',
      type: 'length',
      default: '50rem',
      description: 'Fully-rounded ends — pill buttons, tags, the `pill` shape modifier.',
    },
  ];
}
