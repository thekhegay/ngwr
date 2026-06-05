# <img src="https://ngwr.dev/assets/images/logo.svg" alt="ngwr logo" height="32px">

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![ngwr version](https://img.shields.io/github/package-json/v/thekhegay/ngwr?filename=projects%2Flib%2Fpackage.json&color=%23f51c6a)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)

**NGWR** is a modern Angular UI library — standalone components, signals-first,
zoneless-ready, modular SCSS, fully tree-shakable. Built on top of `@angular/cdk`
for overlay, portal, and a11y primitives.

> **Status:** active development. Public API is stable across patch releases but
> the v7 line is still maturing. [Open an issue](https://github.com/thekhegay/ngwr/issues/new)
> if something breaks or feels wrong.

## Requirements

| Peer                        | Range                |
| --------------------------- | -------------------- |
| `@angular/core`             | `>= 22.0.0`          |
| `@angular/common`           | `>= 22.0.0`          |
| `@angular/cdk`              | `>= 22.0.0`          |
| `@angular/platform-browser` | `>= 22.0.0`          |
| `rxjs`                      | `^7.0.0`             |
| `date-fns` _(optional)_     | `^3.0.0 \|\| ^4.0.0` |
| `luxon` _(optional)_        | `^3.0.0`             |

Node ≥ 24.15.0 (or 26+). pnpm ≥ 11.5. TypeScript ≥ 6.0.

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
@use 'ngwr/theme'; // CSS custom properties (--wr-color-*, --wr-font-*, etc.)
@use 'ngwr/button';
@use 'ngwr/input';
@use 'ngwr/checkbox';
```

Opt-in utilities (not part of `@use 'ngwr'`):

```scss
@use 'ngwr/reset'; // box-sizing, body margin, sane defaults
@use 'ngwr/grid'; // .grid, .container, .col-*
@use 'ngwr/breakpoints' as bp; // SCSS mixins only, no CSS output
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
    provideWrOverlay(), // isolated overlay container
    provideWrIcons([plus, trash, check]), // tree-shaken icon set
  ],
});
```

```ts
// app.component.ts
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WrButton } from 'ngwr/button';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-root',
  imports: [FormsModule, WrButton, WrInput],
  template: `
    <input wrInput [(ngModel)]="name" placeholder="Your name" />
    <button wr-btn color="primary" (click)="greet()">Hello</button>
  `,
})
export class AppComponent {
  readonly name = signal('');
  greet(): void {
    console.log('Hi', this.name());
  }
}
```

## Catalog

> Browse the full catalog with live demos at [**ngwr.dev**](https://ngwr.dev).
> Each entry below is a tree-shakable subpath — `import { … } from 'ngwr/<name>'`.

### Components

**Form** — [calendar](https://ngwr.dev/components/calendar), [cascader](https://ngwr.dev/components/cascader), [checkbox](https://ngwr.dev/components/checkbox), [color-picker](https://ngwr.dev/components/color-picker), [counter](https://ngwr.dev/components/counter), [date-picker](https://ngwr.dev/components/date-picker), [file-upload](https://ngwr.dev/components/file-upload), [form](https://ngwr.dev/components/form), [input](https://ngwr.dev/components/input), [input-number](https://ngwr.dev/components/input-number), [input-otp](https://ngwr.dev/components/input-otp), [knob](https://ngwr.dev/components/knob), [radio](https://ngwr.dev/components/radio), [rating](https://ngwr.dev/components/rating), [segmented](https://ngwr.dev/components/segmented), [select](https://ngwr.dev/components/select), [slider](https://ngwr.dev/components/slider), [switch](https://ngwr.dev/components/switch), [textarea](https://ngwr.dev/components/textarea), [tree](https://ngwr.dev/components/tree), [tree-select](https://ngwr.dev/components/tree-select).

**Buttons** — [button](https://ngwr.dev/components/button), [button-group](https://ngwr.dev/components/button-group), [speed-dial](https://ngwr.dev/components/speed-dial).

**Display** — [alert](https://ngwr.dev/components/alert), [avatar](https://ngwr.dev/components/avatar), [badge](https://ngwr.dev/components/badge), [count-up](https://ngwr.dev/components/count-up), [descriptions](https://ngwr.dev/components/descriptions), [divider](https://ngwr.dev/components/divider), [empty](https://ngwr.dev/components/empty), [icon](https://ngwr.dev/components/icon), [image](https://ngwr.dev/components/image), [keyboard](https://ngwr.dev/components/keyboard), [list](https://ngwr.dev/components/list), [meter-group](https://ngwr.dev/components/meter-group), [progress](https://ngwr.dev/components/progress), [qrcode](https://ngwr.dev/components/qrcode), [result](https://ngwr.dev/components/result), [skeleton](https://ngwr.dev/components/skeleton), [spinner](https://ngwr.dev/components/spinner), [squircle](https://ngwr.dev/components/squircle), [statistic](https://ngwr.dev/components/statistic), [tag](https://ngwr.dev/components/tag), [typography](https://ngwr.dev/components/typography).

**Navigation** — [anchor](https://ngwr.dev/components/anchor), [back-top](https://ngwr.dev/components/back-top), [breadcrumb](https://ngwr.dev/components/breadcrumb), [dropdown](https://ngwr.dev/components/dropdown), [page-header](https://ngwr.dev/components/page-header), [pagination](https://ngwr.dev/components/pagination), [stepper](https://ngwr.dev/components/stepper), [tabs](https://ngwr.dev/components/tabs), [timeline](https://ngwr.dev/components/timeline), [toolbar](https://ngwr.dev/components/toolbar).

**Overlay** — [command-palette](https://ngwr.dev/components/command-palette), [context-menu](https://ngwr.dev/components/context-menu), [dialog](https://ngwr.dev/components/dialog), [drawer](https://ngwr.dev/components/drawer), [mention](https://ngwr.dev/components/mention), [popconfirm](https://ngwr.dev/components/popconfirm), [popover](https://ngwr.dev/components/popover), [toast](https://ngwr.dev/components/toast), [window](https://ngwr.dev/components/window).

**Layout** — [carousel](https://ngwr.dev/components/carousel), [collapse](https://ngwr.dev/components/collapse), [compare](https://ngwr.dev/components/compare), [layout](https://ngwr.dev/components/layout), [splitter](https://ngwr.dev/components/splitter).

**Data** — [charts](https://ngwr.dev/components/charts) (bar / line / donut / gauge / calendar-heatmap / sparkline), [drag-drop](https://ngwr.dev/components/drag-drop), [image-cropper](https://ngwr.dev/components/image-cropper), [table](https://ngwr.dev/components/table), [virtual-scroll](https://ngwr.dev/components/virtual-scroll).

### Animations

Animated UI effects. Mix of in-house components + ports of [reactbits.dev](https://www.reactbits.dev) — each port carries a credit chip on its docs page.

[border-glow](https://ngwr.dev/animations/border-glow), [aurora](https://ngwr.dev/animations/aurora), [marquee](https://ngwr.dev/animations/marquee), [animated-text](https://ngwr.dev/animations/animated-text), [confetti](https://ngwr.dev/animations/confetti), [reveal](https://ngwr.dev/animations/reveal), [spotlight-card](https://ngwr.dev/animations/spotlight-card), [tilt-card](https://ngwr.dev/animations/tilt-card), [click-spark](https://ngwr.dev/animations/click-spark), [split-text](https://ngwr.dev/animations/split-text), [blur-text](https://ngwr.dev/animations/blur-text), [shiny-text](https://ngwr.dev/animations/shiny-text), [gradient-text](https://ngwr.dev/animations/gradient-text), [rotating-text](https://ngwr.dev/animations/rotating-text), [typewriter](https://ngwr.dev/animations/typewriter), [scramble-text](https://ngwr.dev/animations/scramble-text), [decrypt-text](https://ngwr.dev/animations/decrypt-text), [glitch-text](https://ngwr.dev/animations/glitch-text), [fuzzy-text](https://ngwr.dev/animations/fuzzy-text), [falling-text](https://ngwr.dev/animations/falling-text), [circular-text](https://ngwr.dev/animations/circular-text).

Card packages bundle their related directives: `ngwr/spotlight-card` exports `WrSpotlight`; `ngwr/tilt-card` exports `WrTilt`; `ngwr/shiny-text` exports `WrShimmer`.

### Directives — `ngwr/directives`

[affix](https://ngwr.dev/directives/affix), [autofocus](https://ngwr.dev/directives/autofocus), [autosize](https://ngwr.dev/directives/autosize), [click-outside](https://ngwr.dev/directives/click-outside), [copy-to-clipboard](https://ngwr.dev/directives/copy-to-clipboard), [reveal](https://ngwr.dev/directives/reveal).

### Pipes — `ngwr/pipes`

[wrNumber](https://ngwr.dev/pipes/wr-number), [wrBytes](https://ngwr.dev/pipes/wr-bytes), [wrDate](https://ngwr.dev/pipes/wr-date), [wrTruncate](https://ngwr.dev/pipes/wr-truncate), [range](https://ngwr.dev/pipes/range).

### Services

[theme](https://ngwr.dev/services/theme), [scroll](https://ngwr.dev/services/scroll), [hotkey](https://ngwr.dev/services/hotkey), [media](https://ngwr.dev/services/media), [platform](https://ngwr.dev/services/platform), [meta](https://ngwr.dev/services/meta), [storage](https://ngwr.dev/services/storage), [i18n](https://ngwr.dev/services/i18n), [density](https://ngwr.dev/services/density).

### Validators — `ngwr/validators`

Bundled `ValidatorFn`s composing cleanly with Angular's built-in `Validators`: `email`, `noWhitespace`, `hexColor`, `url`, `cardNumber` (Luhn), `cvc`, `iban` (mod-97), `match` (sibling control), `oneOf`, `minDate`, `maxDate`. See [docs](https://ngwr.dev/validators).

### Utils — `ngwr/utils`

Css helpers (`resolveCssSize`, `getRootFontSize`), ids (`randomId`), type guards (`isDefined`, `isNonEmptyArray`, `isObservable`), keyboard helpers (`KEYS`, `hasModifier`, `isPrintableKey`), functional primitives (`noop`, `badgeLog`, `debounce`, `throttle`), focus management (`getFocusableElements`, `trapFocus`). See [docs](https://ngwr.dev/utils) for the full list.

### Core

- [Color](https://ngwr.dev/getting-started/color) — design tokens and palette.
- [Grid](https://ngwr.dev/getting-started/grid) — opt-in 12-column layout.
- [Overlay](https://ngwr.dev/getting-started/overlay) — isolated CDK overlay container, `provideWrOverlay()`.
- **Date adapters** — `ngwr/date-adapter-fns`, `ngwr/date-adapter-luxon`. Wire one with `provideWrDateAdapter(...)` to power calendar + every mode of date-picker.

## Highlights

- **Standalone & signals-first.** Every component is standalone and uses `input()` / `model()` / `output()` / `signal()` / `computed()`. Zoneless-ready.
- **CDK-powered.** Overlays, portals, and a11y come from `@angular/cdk`. We add `provideWrOverlay()` so NGWR overlays never collide with other CDK consumers (Material, NG-ZORRO, etc.).
- **Tree-shakable.** ~110 separate ng-packagr entry points — import only what you use. Per-component FESM bundles are typically 5–25 KB; the largest entry (`ngwr/icon`) is ~98 KB before tree-shaking and ships only the icons you actually register.
- **Modular SCSS.** Component styles are scoped through CSS custom properties. Theme tokens live in `ngwr/theme`; utilities (`grid`, `reset`) and the breakpoints SCSS API are opt-in.
- **Tree-shaken icons.** `provideWrIcons([plus, trash])` registers only the icons you actually import. Dev-mode validation warns about unregistered icons.
- **Reactbits ports, dependency-free.** All animation ports are reimplemented with vanilla DOM + Web Animations API / `IntersectionObserver` / `requestAnimationFrame` — no GSAP, no `motion/react`, no `matter-js`.

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
