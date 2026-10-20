import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Accessibility, ClipboardCheck, FlaskConical, Heart, Package, Palette, Server, Sparkles, Zap } from 'lucide';
import { WrButton } from 'ngwr/button';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';
import { WrTypography } from 'ngwr/typography';

import { DocPageComponent, DocRichPipe, DocSectionComponent } from '#core/components';
import { BRAND_ICONS } from '#core/icons';
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

@Component({
  selector: 'ngwr-docs-introduction-page',
  templateUrl: './introduction.html',
  styleUrl: './introduction.scss',
  imports: [RouterLink, WrButton, WrIcon, WrTypography, DocPageComponent, DocRichPipe, DocSectionComponent],
  providers: [
    provideWrIcons([
      ...BRAND_ICONS,
      ...lucideIcons({
        heart: Heart,
        accessibility: Accessibility,
        'clipboard-check': ClipboardCheck,
        'flask-conical': FlaskConical,
        package: Package,
        palette: Palette,
        server: Server,
        sparkles: Sparkles,
        zap: Zap,
      }),
    ]),
  ],
})
export default class IntroductionPage {
  protected readonly paths = {
    installation: wrPath(ROUTES.docs, ROUTES.docs.installation),
    configuration: wrPath(ROUTES.docs, ROUTES.docs.configuration),
    skills: wrPath(ROUTES.docs, ROUTES.docs.skills),
    mcp: wrPath(ROUTES.docs, ROUTES.docs.mcp),
    guides: wrPath(ROUTES.guides),
    forms: wrPath(ROUTES.guides, ROUTES.guides.forms),
    theming: wrPath(ROUTES.guides, ROUTES.guides.theming),
    ssr: wrPath(ROUTES.guides, ROUTES.guides.ssr),
    testing: wrPath(ROUTES.guides, ROUTES.guides.testing),
    keyboard: wrPath(ROUTES.guides, ROUTES.guides.keyboard),
    components: wrPath(ROUTES.reference, ROUTES.reference.components),
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
      text: 'Standalone components with `input()` and `model()`. No zone.js.',
    },
    {
      icon: 'package',
      tone: 'success',
      title: 'Tree-shakable',
      text: 'One entry point per component. Import and `@use` only what you render.',
    },
    {
      icon: 'palette',
      tone: 'danger',
      title: 'CSS variables',
      text: 'Restyle the app with tokens, or one component with its own hooks.',
      url: this.paths.theming,
    },
    {
      icon: 'accessibility',
      tone: 'warning',
      title: 'Accessible',
      text: 'WAI-ARIA patterns and full keyboard support, checked with axe in CI.',
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
  ];
}
