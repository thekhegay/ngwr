import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  Accessibility,
  ChartColumn,
  ClipboardCheck,
  FlaskConical,
  Heart,
  Languages,
  Moon,
  Package,
  Palette,
  Server,
  Sparkles,
  WandSparkles,
  Zap,
} from 'lucide';
import { WrButton } from 'ngwr/button';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';
import { WrStatistic, WrStatisticGroup } from 'ngwr/statistic';
import { WrTypography } from 'ngwr/typography';

import {
  DocPageComponent,
  DocRichPipe,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';
import { QUALITY } from '#core/generated/quality';
import { BRAND_ICONS } from '#core/icons';
import { formatCount } from '#core/utils';
import { ROUTES, wrPath } from '#routes';

/** One "What you get" card. */
interface Feature {
  readonly icon: string;
  readonly tone: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  readonly title: string;
  /** Rich text: `code` and [links](/path). */
  readonly text: string;
  readonly url?: string;
}

/** One check tier: when it runs and what it runs. */
interface Tier {
  readonly name: string;
  readonly when: string;
  /** Script names, from `#core/generated/quality`. Empty when `note` says it instead. */
  readonly gates: readonly string[];
  readonly note?: string;
}

@Component({
  selector: 'ngwr-docs-introduction-page',
  templateUrl: './introduction.html',
  styleUrl: './introduction.scss',
  imports: [
    RouterLink,
    WrButton,
    WrIcon,
    WrStatistic,
    WrStatisticGroup,
    WrTypography,
    DocPageComponent,
    DocRichPipe,
    DocSectionComponent,
    DocSeeAlsoComponent,
  ],
  providers: [
    provideWrIcons([
      ...BRAND_ICONS,
      ...lucideIcons({
        heart: Heart,
        accessibility: Accessibility,
        'chart-column': ChartColumn,
        'clipboard-check': ClipboardCheck,
        'flask-conical': FlaskConical,
        languages: Languages,
        moon: Moon,
        package: Package,
        palette: Palette,
        server: Server,
        sparkles: Sparkles,
        'wand-sparkles': WandSparkles,
        zap: Zap,
      }),
    ]),
  ],
})
export default class IntroductionPage {
  protected readonly paths = {
    installation: wrPath(ROUTES.docs, ROUTES.docs.installation),
    configuration: wrPath(ROUTES.docs, ROUTES.docs.configuration),
    migration: wrPath(ROUTES.docs, ROUTES.docs.migration),
    skills: wrPath(ROUTES.docs, ROUTES.docs.skills),
    mcp: wrPath(ROUTES.docs, ROUTES.docs.mcp),
    guides: wrPath(ROUTES.guides),
    forms: wrPath(ROUTES.guides, ROUTES.guides.forms),
    theming: wrPath(ROUTES.guides, ROUTES.guides.theming),
    tokens: wrPath(ROUTES.guides, ROUTES.guides.tokens),
    translations: wrPath(ROUTES.guides, ROUTES.guides.translations),
    ssr: wrPath(ROUTES.guides, ROUTES.guides.ssr),
    testing: wrPath(ROUTES.guides, ROUTES.guides.testing),
    keyboard: wrPath(ROUTES.guides, ROUTES.guides.keyboard),
    theme: wrPath(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.theme),
    components: wrPath(ROUTES.reference, ROUTES.reference.components),
    charts: wrPath(ROUTES.charts),
    bits: wrPath(ROUTES.bits),
  };

  protected readonly features: readonly Feature[] = [
    {
      icon: 'clipboard-check',
      tone: 'primary',
      title: 'Signal Forms',
      text: 'Every value control binds with `[formField]`.',
      url: this.paths.forms,
    },
    {
      icon: 'zap',
      tone: 'warning',
      title: 'Signals, zoneless',
      text: 'Standalone, with `input()` and `model()`. No zone.js.',
    },
    {
      icon: 'package',
      tone: 'success',
      title: 'Tree-shakable',
      text: 'Per-component entry points. Ship only what you import.',
      url: this.paths.installation,
    },
    {
      icon: 'palette',
      tone: 'danger',
      title: 'CSS variables',
      text: 'Tokens restyle the app; hooks restyle one component.',
      url: this.paths.theming,
    },
    {
      icon: 'accessibility',
      tone: 'warning',
      title: 'Accessible',
      text: 'WAI-ARIA patterns, full keyboard support, axe in CI.',
      url: this.paths.keyboard,
    },
    {
      icon: 'server',
      tone: 'info',
      title: 'SSR',
      text: 'Components render on the server and hydrate.',
      url: this.paths.ssr,
    },
    {
      icon: 'languages',
      tone: 'primary',
      title: 'Translations',
      text: `${formatCount(QUALITY.locales.length)} catalogs ship. Import only the languages you use.`,
      url: this.paths.translations,
    },
    {
      icon: 'chart-column',
      tone: 'info',
      title: 'Charts',
      text: 'Bar, line, donut, gauge, sparkline and more.',
      url: this.paths.charts,
    },
    {
      icon: 'wand-sparkles',
      tone: 'danger',
      title: 'Bits',
      text: 'Animated backgrounds, cards and text effects.',
      url: this.paths.bits,
    },
    {
      icon: 'flask-conical',
      tone: 'success',
      title: 'Test harnesses',
      text: 'CDK harnesses at `ngwr/<name>/testing`.',
      url: this.paths.testing,
    },
    {
      icon: 'sparkles',
      tone: 'primary',
      title: 'AI tooling',
      text: `An [agent skill](${this.paths.skills}), [llms-full.txt](/llms-full.txt) and an [MCP server](${this.paths.mcp}).`,
    },
    {
      icon: 'moon',
      tone: 'warning',
      title: 'Dark mode',
      text: 'Follows the OS in CSS alone, through `light-dark()`.',
      url: this.paths.theme,
    },
  ];

  /**
   * Counted by `pnpm gen:quality`, never typed here, and printed through `formatCount` — the site's one spelling
   * of a count. `testCases` is a floor when a spec uses `it.each` or a shared contract, and then reads "4,950+".
   */
  protected readonly counts = {
    specFiles: formatCount(QUALITY.specFiles),
    testCases: formatCount(QUALITY.testCases, { floor: !QUALITY.testCasesAreExact }),
    entryPoints: formatCount(QUALITY.entryPoints),
  };

  protected readonly tiers: readonly Tier[] = [
    {
      name: 'Pull request',
      when: 'Every pull request and push to main',
      gates: QUALITY.prGates.map(g => g.name),
    },
    {
      name: 'Nightly',
      when: 'Each night, when main has moved',
      gates: QUALITY.nightlyGates.map(g => g.name),
    },
    {
      name: 'Release',
      when: 'Before every release',
      gates: [],
      note: 'The pull-request checks, then the nightly site checks.',
    },
  ];

  /**
   * The page's See also, first in the shell's grid. Eight at most, which is the grid's own cap: Charts and Bits are
   * left to the "What you get" cards above, which link them with the same words.
   */
  protected readonly next: readonly DocSeeAlsoLink[] = [
    { title: 'Installation', url: [this.paths.installation], description: 'Add ngwr to an app.' },
    { title: 'Configuration', url: [this.paths.configuration], description: 'Set app-wide options at bootstrap.' },
    { title: 'Forms', url: [this.paths.forms], description: 'Bind controls to any Angular form.' },
    { title: 'Theming', url: [this.paths.theming], description: 'Light, dark and your own palette.' },
    { title: 'Design tokens', url: [this.paths.tokens], description: 'Color, sizing, type, density, motion.' },
    { title: 'Components', url: [this.paths.components], description: 'The full catalog.' },
    { title: 'Guides', url: [this.paths.guides], description: 'SSR, overlays, keyboard, testing.' },
    { title: 'Migration', url: [this.paths.migration], description: 'Upgrade from any earlier major.' },
  ];
}
