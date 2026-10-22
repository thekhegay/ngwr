import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Palette, PenLine, Route, Shapes, SlidersHorizontal } from 'lucide';
import { WrTag } from 'ngwr/badge';
import { WrBlurText } from 'ngwr/bits/blur-text';
import { WrCard } from 'ngwr/card';
import { lucideIcons, provideWrIcons, WrIcon } from 'ngwr/icon';
import { WrTypography } from 'ngwr/typography';

import { DocCodeComponent, DocInstallComponent, DocRichPipe } from '#core/components';
import type { ShikiLang } from '#core/shiki';
import { ROUTES, wrPath } from '#routes';

interface OptInLink {
  readonly label: string;
  readonly path: string;
  readonly fragment?: string;
}

interface OptInExample {
  readonly icon: string;
  readonly label: string;
  /** Inline `code` only — rendered through `wrDocRich`. */
  readonly caption: string;
  /** The source, or the packages to add when `install` is set. */
  readonly code: string;
  readonly language: ShikiLang;
  /** Render `code` as an install command, one tab per package manager. */
  readonly install?: boolean;
  readonly links: readonly OptInLink[];
}

/**
 * The home page's opt-in section: what ngwr leaves out until the app asks.
 *
 * Every sample is held to the library rather than written from memory —
 * `provideWr()` is `projects/lib/provide-wr.ts`, each `withX()` lives in the
 * entry point it configures, the two router adapters are the nested
 * `ngwr/loading-bar/router` and `ngwr/tabs/router`, and the eight ProseMirror
 * packages are the optional peers in `projects/lib/package.json`, in the order
 * the editor page installs them.
 */
@Component({
  selector: 'ngwr-home-opt-in',
  templateUrl: './opt-in.html',
  styleUrl: './opt-in.scss',
  imports: [
    RouterLink,
    WrBlurText,
    WrCard,
    WrIcon,
    WrTag,
    WrTypography,
    DocCodeComponent,
    DocInstallComponent,
    DocRichPipe,
  ],
  providers: [
    provideWrIcons(
      lucideIcons({
        'sliders-horizontal': SlidersHorizontal,
        route: Route,
        'pen-line': PenLine,
        shapes: Shapes,
        palette: Palette,
      })
    ),
  ],
})
export class HomeOptInComponent {
  protected readonly examples: readonly OptInExample[] = [
    {
      icon: 'sliders-horizontal',
      label: 'Features',
      caption: 'Pass `provideWr()` the features whose defaults you change. One you skip is not bundled.',
      code: `import { provideWr } from 'ngwr';
import { withDensity } from 'ngwr/density';
import { withTheme } from 'ngwr/theme';
import { withToast } from 'ngwr/toast';

provideWr(withDensity(), withToast({ duration: 6000 }), withTheme());`,
      language: 'angular-ts',
      links: [{ label: 'Configuration', path: wrPath(ROUTES.docs, ROUTES.docs.configuration) }],
    },
    {
      icon: 'route',
      label: 'Router',
      caption: 'An add-on, so the loading bar and the tabs work without `@angular/router`.',
      code: `// The loading bar follows navigation
import { provideWrLoadingBarRouter } from 'ngwr/loading-bar/router';

// Tabs with routerLink, on <wr-tabs wrTabsRouting>
import { WrTabsRouting } from 'ngwr/tabs/router';`,
      language: 'angular-ts',
      links: [
        {
          label: 'Loading bar',
          path: wrPath(ROUTES.reference, ROUTES.reference.services, ROUTES.reference.services.loadingBar),
          fragment: 'router-navigation',
        },
        {
          label: 'Tabs',
          path: wrPath(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.tabs),
          fragment: 'router-tabs',
        },
      ],
    },
    {
      icon: 'pen-line',
      label: 'Editor',
      caption: 'ProseMirror is an optional peer. Install it only if you use `ngwr/editor`.',
      // A backslash-newline is whitespace to every shell, so the command still
      // runs as pasted, and the eight names fit a half-width column.
      code: [
        'prosemirror-model prosemirror-state',
        'prosemirror-view prosemirror-commands',
        'prosemirror-keymap prosemirror-history',
        'prosemirror-schema-list prosemirror-inputrules',
      ].join(' \\\n  '),
      language: 'bash',
      install: true,
      links: [
        {
          label: 'Editor',
          path: wrPath(ROUTES.reference, ROUTES.reference.components, ROUTES.reference.components.editor),
          fragment: 'peer-dependencies',
        },
      ],
    },
    {
      icon: 'shapes',
      label: 'Icons',
      caption: 'Register the icons you use. No icon set is a dependency.',
      code: `import { Check, X } from 'lucide';
import { lucideIcons, provideWrIcons } from 'ngwr/icon';

provideWrIcons(lucideIcons({ check: Check, x: X }));`,
      language: 'angular-ts',
      links: [{ label: 'Icon sets', path: wrPath(ROUTES.icons, ROUTES.icons.overview) }],
    },
    {
      icon: 'palette',
      label: 'Styles',
      caption: 'The theme first, then one line per component you render.',
      code: `@use 'ngwr/theme';
@use 'ngwr/button';
@use 'ngwr/select';`,
      language: 'scss',
      links: [{ label: 'Installation', path: wrPath(ROUTES.docs, ROUTES.docs.installation), fragment: 'styles' }],
    },
  ];
}
