# <img src="https://ngwr.dev/assets/images/logo.svg" alt="ngwr logo" height="32px">

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![ngwr version](https://img.shields.io/github/package-json/v/thekhegay/ngwr?filename=projects%2Flib%2Fpackage.json&color=%23f51c6a)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)

**NGWR** is a modern Angular UI library — standalone components, signals-first,
zoneless-ready, responsive, modular SCSS, fully tree-shakable. Built on top of
`@angular/cdk` for overlay, portal, and a11y primitives.

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

Node ≥ 24.16.0 (or 26+). pnpm ≥ 11.8. TypeScript ≥ 6.0.

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

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideWrOverlay(), // isolated overlay container
  ],
});
```

```ts
// app.component.ts
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Check } from 'lucide';
import { WrButton } from 'ngwr/button';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-root',
  imports: [FormsModule, WrButton, WrInput],
  providers: [provideWrIcons(lucideIcons({ checkmark: Check }))], // tree-shaken icons
  template: `
    <input wrInput [(ngModel)]="name" placeholder="Your name" />
    <button wr-btn color="primary" icon="checkmark" (click)="greet()">Hello</button>
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

**Form** — [calendar](https://ngwr.dev/components/calendar), [cascader](https://ngwr.dev/components/cascader), [checkbox](https://ngwr.dev/components/checkbox), [color-picker](https://ngwr.dev/components/color-picker), [date-picker](https://ngwr.dev/components/date-picker), [file-upload](https://ngwr.dev/components/file-upload), [form](https://ngwr.dev/components/form), [form-field](https://ngwr.dev/components/form-field), [input](https://ngwr.dev/components/input), [input-number](https://ngwr.dev/components/input-number), [input-otp](https://ngwr.dev/components/input-otp), [knob](https://ngwr.dev/components/knob), [mention](https://ngwr.dev/components/mention), [radio](https://ngwr.dev/components/radio), [rating](https://ngwr.dev/components/rating), [segmented](https://ngwr.dev/components/segmented), [select](https://ngwr.dev/components/select), [slider](https://ngwr.dev/components/slider), [switch](https://ngwr.dev/components/switch), [textarea](https://ngwr.dev/components/textarea).

**Buttons** — [button](https://ngwr.dev/components/button), [button-group](https://ngwr.dev/components/button-group), [speed-dial](https://ngwr.dev/components/speed-dial).

**Data** — [drag-drop](https://ngwr.dev/components/drag-drop), [pagination](https://ngwr.dev/components/pagination), [table](https://ngwr.dev/components/table), [tree](https://ngwr.dev/components/tree), [virtual-scroll](https://ngwr.dev/components/virtual-scroll).

**Feedback** — [alert](https://ngwr.dev/components/alert), [empty](https://ngwr.dev/components/empty), [progress](https://ngwr.dev/components/progress), [result](https://ngwr.dev/components/result), [skeleton](https://ngwr.dev/components/skeleton), [spinner](https://ngwr.dev/components/spinner).

**Display** — [avatar](https://ngwr.dev/components/avatar), [badge](https://ngwr.dev/components/badge) (incl. `wr-tag`), [compare](https://ngwr.dev/components/compare), [counter](https://ngwr.dev/components/counter), [descriptions](https://ngwr.dev/components/descriptions), [divider](https://ngwr.dev/components/divider), [image-cropper](https://ngwr.dev/components/image-cropper), [keyboard](https://ngwr.dev/components/keyboard), [lightbox](https://ngwr.dev/components/lightbox), [qrcode](https://ngwr.dev/components/qrcode), [statistic](https://ngwr.dev/components/statistic), [timeline](https://ngwr.dev/components/timeline).

**Layout** — [card](https://ngwr.dev/components/card), [carousel](https://ngwr.dev/components/carousel), [collapse](https://ngwr.dev/components/collapse), [layout](https://ngwr.dev/components/layout), [list](https://ngwr.dev/components/list), [page-header](https://ngwr.dev/components/page-header), [splitter](https://ngwr.dev/components/splitter), [toolbar](https://ngwr.dev/components/toolbar).

**Navigation** — [anchor](https://ngwr.dev/components/anchor), [back-top](https://ngwr.dev/components/back-top), [breadcrumbs](https://ngwr.dev/components/breadcrumbs), [burger](https://ngwr.dev/components/burger), [dropdown](https://ngwr.dev/components/dropdown), [sidebar](https://ngwr.dev/components/sidebar), [stepper](https://ngwr.dev/components/stepper), [tabs](https://ngwr.dev/components/tabs).

**Overlays** — [command-palette](https://ngwr.dev/components/command-palette), [context-menu](https://ngwr.dev/components/context-menu), [dialog](https://ngwr.dev/components/dialog), [drawer](https://ngwr.dev/components/drawer), [popconfirm](https://ngwr.dev/components/popconfirm), [popover](https://ngwr.dev/components/popover), [toast](https://ngwr.dev/components/toast), [window](https://ngwr.dev/components/window).

**Charts** — [bar-chart](https://ngwr.dev/components/bar-chart), [calendar-heatmap](https://ngwr.dev/components/calendar-heatmap), [donut-chart](https://ngwr.dev/components/donut-chart), [gauge](https://ngwr.dev/components/gauge), [line-chart](https://ngwr.dev/components/line-chart), [meter-group](https://ngwr.dev/components/meter-group), [sparkline](https://ngwr.dev/components/sparkline).

Plus [icon](https://ngwr.dev/components/icon), the experimental [squircle](https://ngwr.dev/components/squircle), and the [typography](https://ngwr.dev/typography) directive.

### Animations

Animated UI effects. Mix of in-house components + ports of [reactbits.dev](https://www.reactbits.dev) — each port carries a credit chip on its docs page. Defaults are theme-aware (light + dark), and every component honors `prefers-reduced-motion`.

[aurora](https://ngwr.dev/animations/aurora), [blur-text](https://ngwr.dev/animations/blur-text), [border-glow](https://ngwr.dev/animations/border-glow), [circular-text](https://ngwr.dev/animations/circular-text), [click-spark](https://ngwr.dev/animations/click-spark), [confetti](https://ngwr.dev/animations/confetti), [decrypt-text](https://ngwr.dev/animations/decrypt-text), [falling-text](https://ngwr.dev/animations/falling-text), [fuzzy-text](https://ngwr.dev/animations/fuzzy-text), [glitch-text](https://ngwr.dev/animations/glitch-text), [gradient-text](https://ngwr.dev/animations/gradient-text), [marquee](https://ngwr.dev/animations/marquee), [reveal](https://ngwr.dev/animations/reveal), [rotating-text](https://ngwr.dev/animations/rotating-text), [scramble-text](https://ngwr.dev/animations/scramble-text), [shiny-text](https://ngwr.dev/animations/shiny-text), [splash-cursor](https://ngwr.dev/animations/splash-cursor), [split-text](https://ngwr.dev/animations/split-text), [spotlight-card](https://ngwr.dev/animations/spotlight-card), [star-border](https://ngwr.dev/animations/star-border), [tilt-card](https://ngwr.dev/animations/tilt-card), [typewriter](https://ngwr.dev/animations/typewriter), [waves](https://ngwr.dev/animations/waves).

Card packages bundle their related directives: `ngwr/spotlight-card` exports `WrSpotlight`; `ngwr/tilt-card` exports `WrTilt`; `ngwr/shiny-text` exports `WrShimmer`.

### Directives — `ngwr/directives`

[autofocus](https://ngwr.dev/directives/autofocus), [autosize](https://ngwr.dev/directives/autosize), [click-outside](https://ngwr.dev/directives/click-outside), [copy-to-clipboard](https://ngwr.dev/directives/copy-to-clipboard), [reveal](https://ngwr.dev/animations/reveal). [affix](https://ngwr.dev/directives/affix) ships as its own entry (`ngwr/affix`).

### Pipes — `ngwr/pipes`

[wrBytes](https://ngwr.dev/pipes/wr-bytes), [wrDate](https://ngwr.dev/pipes/wr-date), [wrMark](https://ngwr.dev/pipes/wr-mark), [wrNumber](https://ngwr.dev/pipes/wr-number), [wrPlural](https://ngwr.dev/pipes/wr-plural), [wrRange](https://ngwr.dev/pipes/range), [wrTruncate](https://ngwr.dev/pipes/wr-truncate).

### Services

[clipboard](https://ngwr.dev/services/clipboard), [cookie](https://ngwr.dev/services/cookie), [density](https://ngwr.dev/services/density), [hotkey](https://ngwr.dev/services/hotkey), [loading-bar](https://ngwr.dev/services/loading-bar), [media](https://ngwr.dev/services/media), [meta](https://ngwr.dev/services/meta), [platform](https://ngwr.dev/services/platform), [scroll](https://ngwr.dev/services/scroll), [storage](https://ngwr.dev/services/storage), [theme](https://ngwr.dev/services/theme), [translate](https://ngwr.dev/translate) (i18n).

### Validators — `ngwr/validators`

Bundled `ValidatorFn`s composing cleanly with Angular's built-in `Validators`: `cardNumber` (Luhn), `cvc`, `hexColor`, `iban` (mod-97), `match` (sibling control), `maxDate`, `minDate`, `noWhitespace`, `oneOf`, `url`. See [docs](https://ngwr.dev/validators).

### Utils — `ngwr/utils`

Math (`clamp`, `round`), coercion (`numAttr`), css helpers (`resolveCssSize`, `getRootFontSize`), ids (`randomId`), type guards (`isDefined`, `isNonEmptyArray`, `isObservable`), keyboard helpers (`KEYS`, `hasModifier`, `isPrintableKey`), functional primitives (`noop`, `badgeLog`, `debounce`, `throttle`), focus management (`getFocusableElements`, `trapFocus`). See [docs](https://ngwr.dev/utils) for the full list. Shared shapes (`Maybe`, `SafeAny`, `WrColor`, …) are documented under [Interfaces](https://ngwr.dev/interfaces).

### Core

- [Color](https://ngwr.dev/getting-started/color) — design tokens and palette.
- [Grid](https://ngwr.dev/getting-started/grid) — opt-in 12-column layout.
- [Overlay](https://ngwr.dev/getting-started/overlay) — isolated CDK overlay container, `provideWrOverlay()`.
- [Mobile & responsive](https://ngwr.dev/getting-started/mobile) — responsive overlays, touch targets, safe-area insets, container-query layouts.
- [Typography](https://ngwr.dev/typography) — `wrTypography` directive: headings, paragraphs, lists, links, code.
- [Icons](https://ngwr.dev/icons) — `ngwr/icon` registry + thin adapters for Lucide, Feather, Tabler, Phosphor, Heroicons, Iconoir, Radix, Bootstrap.
- **Date adapters** — `ngwr/date-adapter-fns`, `ngwr/date-adapter-luxon`. Wire one with `provideWrDateAdapter(...)` to power calendar + every mode of date-picker.

## Highlights

- **Standalone & signals-first.** Every component is standalone and uses `input()` / `model()` / `output()` / `signal()` / `computed()`. Zoneless-ready.
- **CDK-powered.** Overlays, portals, and a11y come from `@angular/cdk`. We add `provideWrOverlay()` so NGWR overlays never collide with other CDK consumers (Material, NG-ZORRO, etc.).
- **Mobile & responsive.** Overlays collapse to bottom-sheets on small screens (`provideWrResponsiveOverlays()`), touch targets grow to ≥44px on coarse pointers, fixed surfaces respect `env(safe-area-inset-*)`, and `descriptions` / `stepper` / `page-header` reflow to their container via container queries. [Guide](https://ngwr.dev/getting-started/mobile).
- **Tree-shakable.** 127 separate ng-packagr entry points — import only what you use. Per-component FESM bundles are small: a median of ~3 KB gzipped, the heaviest (`ngwr/window`) ~15 KB. The whole catalog gzips to ~320 KB — but real apps pull a handful of entries. The only runtime dependency is `tslib`.
- **Modular SCSS.** Component styles are scoped through CSS custom properties. Theme tokens live in `ngwr/theme`; utilities (`grid`, `reset`) and the breakpoints SCSS API are opt-in.
- **Tree-shaken icons.** `provideWrIcons([plus, trash])` registers only the icons you actually import. Dev-mode validation warns about unregistered icons.
- **Reactbits ports, dependency-free.** All animation ports are reimplemented with vanilla DOM + Web Animations API / `IntersectionObserver` / `requestAnimationFrame` / raw WebGL — no GSAP, no `motion/react`, no `matter-js`, no `ogl`.
- **Motion respects the OS.** Every animation component short-circuits to its final state under `prefers-reduced-motion`.

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
