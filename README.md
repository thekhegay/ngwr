# <img src="https://ngwr.dev/assets/images/logo.svg" alt="ngwr logo" height="32px">

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![ngwr version](https://img.shields.io/github/package-json/v/thekhegay/ngwr?filename=projects%2Flib%2Fpackage.json&color=%23f51c6a)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)
[![FOSSA security](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fthekhegay%2Fngwr.svg?type=shield&issueType=security)](https://app.fossa.com/projects/git%2Bgithub.com%2Fthekhegay%2Fngwr?ref=badge_shield&issueType=security)
[![FOSSA license](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fthekhegay%2Fngwr.svg?type=shield&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fthekhegay%2Fngwr?ref=badge_shield&issueType=license)

**NGWR** is a modern Angular UI library — standalone components, signals-first,
zoneless-ready, modular SCSS, fully tree-shakable. Built on top of `@angular/cdk`
for overlay, portal, and a11y primitives.

> **Status:** active development. Public API is stable across patch releases but
> the v7 line is still maturing. [Open an issue](https://github.com/thekhegay/ngwr/issues/new)
> if something breaks or feels wrong.

## Requirements

| Peer | Range |
|---|---|
| `@angular/core` | `>= 21.0.0` |
| `@angular/common` | `>= 21.0.0` |
| `@angular/cdk` | `>= 21.0.0` |
| `@angular/platform-browser` | `>= 21.0.0` |
| `rxjs` | `^7.0.0` |

Node ≥ 22.12 for development.

## Install

```shell
pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk
```

## Styles

The fastest way — pull in everything (theme tokens + all component styles):

```scss
// styles.scss
@use 'ngwr';
```

Prefer to opt in per-component? Each component has its own SCSS entry that pulls
in the theme automatically:

```scss
@use 'ngwr/theme';     // CSS custom properties (--wr-color-*, --wr-font-*, etc.)
@use 'ngwr/button';
@use 'ngwr/input';
@use 'ngwr/checkbox';
```

Opt-in utilities (not part of `@use 'ngwr'`):

```scss
@use 'ngwr/reset';   // box-sizing, body margin, sane defaults
@use 'ngwr/grid';    // .grid, .container, .col-*
@use 'ngwr/breakpoints' as bp;  // SCSS mixins only, no CSS output
```

## Quick start

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrIcons, plus, trash, check } from 'ngwr/icon';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrOverlay(),                 // isolated overlay container
    provideWrIcons([plus, trash, check]), // tree-shaken icon set
  ],
});
```

```ts
// app.component.ts
import { Component, signal } from '@angular/core';
import { WrButtonComponent } from 'ngwr/button';
import { WrInputComponent } from 'ngwr/input';

@Component({
  selector: 'app-root',
  imports: [WrButtonComponent, WrInputComponent],
  template: `
    <wr-input [(ngModel)]="name" placeholder="Your name" />
    <wr-btn color="primary" (click)="greet()">Hello</wr-btn>
  `,
})
export class AppComponent {
  readonly name = signal('');
  greet() { console.log('Hi', this.name()); }
}
```

## [Components](https://ngwr.dev/docs/components)

| Form | Buttons | Data |
|---|---|---|
| [Checkbox](https://ngwr.dev/docs/components/checkbox) | [Button](https://ngwr.dev/docs/components/button) | [Pagination](https://ngwr.dev/docs/components/pagination) |
| [Form](https://ngwr.dev/docs/components/form) | [Button Group](https://ngwr.dev/docs/components/button-group) | [Table](https://ngwr.dev/docs/components/table) |
| [Input](https://ngwr.dev/docs/components/input) | | |
| [Radio](https://ngwr.dev/docs/components/radio) | | |
| [Segmented](https://ngwr.dev/docs/components/segmented) | | |
| [Select](https://ngwr.dev/docs/components/select) | | |
| [Switch](https://ngwr.dev/docs/components/switch) | | |
| [Textarea](https://ngwr.dev/docs/components/textarea) | | |

| Display | Navigation | Overlay | Layout |
|---|---|---|---|
| [Alert](https://ngwr.dev/docs/components/alert) | [Breadcrumbs](https://ngwr.dev/docs/components/breadcrumbs) | [Dialog](https://ngwr.dev/docs/components/dialog) | [Collapse](https://ngwr.dev/docs/components/collapse) |
| [Avatar](https://ngwr.dev/docs/components/avatar) | [Dropdown](https://ngwr.dev/docs/components/dropdown) | [Drawer](https://ngwr.dev/docs/components/drawer) | |
| [Badge](https://ngwr.dev/docs/components/badge) | [Tabs](https://ngwr.dev/docs/components/tabs) | [Popconfirm](https://ngwr.dev/docs/components/popconfirm) | |
| [Divider](https://ngwr.dev/docs/components/divider) | | [Popover](https://ngwr.dev/docs/components/popover) | |
| [Icon](https://ngwr.dev/docs/components/icon) | | [Toast](https://ngwr.dev/docs/components/toast) | |
| [Progress](https://ngwr.dev/docs/components/progress) | | [Tooltip](https://ngwr.dev/docs/components/tooltip) | |
| [QR](https://ngwr.dev/docs/components/qr) | | | |
| [Skeleton](https://ngwr.dev/docs/components/skeleton) | | | |
| [Spinner](https://ngwr.dev/docs/components/spinner) | | | |
| [Tag](https://ngwr.dev/docs/components/tag) | | | |

## Core

- [Color](https://ngwr.dev/docs/core/color) — design tokens and palette
- [Grid](https://ngwr.dev/docs/core/grid) — opt-in 12-column layout
- [Overlay](https://ngwr.dev/docs/core/overlay) — isolated CDK overlay container, `provideWrOverlay()`
- [Utils](https://ngwr.dev/docs/core/utils) — small, framework-agnostic helpers

## Highlights

- **Standalone & signals-first.** Every component is standalone, uses `input()` / `model()` / `output()` / `signal()` / `computed()`. Zoneless-friendly.
- **CDK-powered.** Overlays, portals, and a11y come from `@angular/cdk`. We add `provideWrOverlay()` so NGWR overlays never collide with other CDK consumers (Material, NG-ZORRO, etc.).
- **Tree-shakable.** Each component is a separate ng-packagr entry point — import only what you use.
- **Modular SCSS.** Component styles are scoped through CSS custom properties. Theme tokens live in `ngwr/theme`; utilities (`grid`, `reset`) and the breakpoints SCSS API are opt-in.
- **Tree-shaken icons.** `provideWrIcons([plus, trash])` registers only the icons you actually import. Dev-mode validation warns about unregistered icons.

## Contributing

Conventional commits are enforced on PR titles. Common types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`. Optional scope is the component or area (`feat(checkbox): icon mode`).

```shell
pnpm install
pnpm dev            # ng serve --o (showcase)
pnpm build:lib      # ng build lib
pnpm build:showcase # ng build showcase
pnpm lint           # ng lint
```

## Authors

- [Roman Khegay](https://github.com/thekhegay) — code, design

## License

[MIT](./LICENSE) — free for commercial use.
