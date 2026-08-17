import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-registry-page',
  templateUrl: './registry.html',
  imports: [
    RouterLink,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class RegistryGuidePageComponent {
  protected readonly snippets = {
    theme: `{
  "$schema": "https://ngwr.dev/registry/schema.json",
  "name": "theme-slate",
  "type": "registry:theme",
  "title": "Slate",
  "description": "A cooler, lower-saturation take on the default palette — the blue steps back toward grey.",
  "author": "ngwr",
  "ngwr": ">=11",
  "cssVars": {
    "light": {
      "--wr-color-primary": "#41598f",
      "--wr-color-primary-rgb": "65, 89, 143",
      "--wr-color-primary-contrast": "#ffffff",
      "--wr-color-primary-dark": "#394e7d",
      "--wr-color-primary-darker": "#31436c",
      "--wr-color-primary-light": "#4964a1",
      "--wr-color-primary-lighter": "#526fb1",
      … the same seven for "secondary"
    },
    "dark": { … }
  }
}`,

    block: `{
  "$schema": "https://ngwr.dev/registry/schema.json",
  "name": "block-sign-in",
  "type": "registry:block",
  "title": "Sign-in card",
  "description": "A centred sign-in card wired to Signal Forms.",
  "ngwr": ">=11",
  "entryPoints": ["ngwr/card", "ngwr/form", "ngwr/input", "ngwr/button", "ngwr/validators"],
  "files": [
    {
      "path": "sign-in.ts",
      "target": "src/app/sign-in/sign-in.ts",
      "content": "import { Component } from '@angular/core';\\n…"
    }
  ]
}`,
  };

  protected readonly fields: readonly DocApiRow[] = [
    {
      name: 'name',
      description: 'kebab-case, unique within the registry that hosts it.',
      type: 'string',
      required: true,
    },
    {
      name: 'type',
      description:
        'A theme is tokens and nothing else. A block composes several ngwr components into a page or a section. A component is one unit of UI.',
      type: `'registry:theme' | 'registry:block' | 'registry:component'`,
      required: true,
    },
    { name: 'title', description: 'Short human name, shown in a picker.', type: 'string', required: true },
    { name: 'description', description: 'One sentence on what it is for.', type: 'string', required: true },
    { name: 'author', description: 'Whoever publishes it.', type: 'string', default: '—' },
    {
      name: 'ngwr',
      description: 'Compatible ngwr versions, as a semver range — e.g. `">=11"`.',
      type: 'string',
      default: '—',
    },
    { name: 'dependencies', description: 'npm packages beyond ngwr and its peers.', type: 'string[]', default: '[]' },
    {
      name: 'registryDependencies',
      description:
        'Absolute `https` URLs of other items this one composes. Relative is meaningless — the resolving tool does not know where this item came from.',
      type: 'string[]',
      default: '[]',
    },
    {
      name: 'entryPoints',
      description:
        'The `ngwr/*` subpaths the item imports from. Checked against the real catalog, so a typo fails instead of installing something that will not compile.',
      type: 'string[]',
      default: '[]',
    },
    {
      name: 'cssVars',
      description: 'Token overrides per theme (`light` / `dark`). Every key must be a `--wr-*` token.',
      type: '{ light?: Record<string, string>; dark?: Record<string, string> }',
      default: '—',
    },
    {
      name: 'files',
      description:
        'Source files to write: `path` (inside the item), `target` (relative to the project root) and `content`. Required for a block or a component, refused for a theme.',
      type: 'RegistryFile[]',
      default: '[]',
    },
  ];

  protected readonly related: readonly DocSeeAlsoLink[] = [
    {
      kind: 'Guide',
      title: 'Design tokens',
      url: ['/guides', 'tokens'],
      description: 'The `--wr-*` layer a theme preset overrides.',
    },
    {
      kind: 'Guide',
      title: 'Theming',
      url: ['/guides', 'theming'],
      description: 'How the token layer is applied, and what `provideWrTheme()` does with it.',
    },
    {
      kind: 'Guide',
      title: 'Agent skill',
      url: ['/guides', 'agent-skill'],
      description: 'The other half of the machine-readable surface: the rules an agent needs to write ngwr correctly.',
    },
  ];
}
