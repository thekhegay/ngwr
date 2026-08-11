# <img src="https://ngwr.dev/images/logo.svg" alt="ngwr logo" height="32px">

[![ngwr website](https://img.shields.io/badge/ngwr.dev-3969e2)](https://ngwr.dev)
[![ngwr version](https://img.shields.io/github/package-json/v/thekhegay/ngwr?filename=projects%2Flib%2Fpackage.json&color=%23f51c6a)](https://www.npmjs.com/package/ngwr)
[![angular peer](https://img.shields.io/npm/dependency-version/ngwr/peer/@angular/core)](https://www.npmjs.com/package/ngwr)
[![ci](https://img.shields.io/github/actions/workflow/status/thekhegay/ngwr/ci.yml?branch=main&label=ci)](https://github.com/thekhegay/ngwr/actions/workflows/ci.yml)
[![coverage](https://codecov.io/gh/thekhegay/ngwr/branch/main/graph/badge.svg)](https://codecov.io/gh/thekhegay/ngwr)
[![license](https://img.shields.io/npm/l/ngwr)](https://github.com/thekhegay/ngwr/blob/main/LICENSE)

**NGWR** is a modern Angular UI library — standalone components, signals-first,
zoneless-ready, responsive, modular SCSS, fully tree-shakable. Built on top of
`@angular/cdk` for overlay, portal, and a11y primitives.

> **Status:** active development. v10 is the current major line (Angular 22 peer).
> Public API is stable across patch releases and still evolving between majors.
> [Open an issue](https://github.com/thekhegay/ngwr/issues/new)
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
| `lucide` _(optional)_       | `>= 1.0.0`           |

Node ≥ 24.16.0 (or 26+) and TypeScript `~6.0.x` (Angular 22 requires
`typescript >=6.0 <6.1`). Contributing to this repo additionally needs
pnpm ≥ 11.10.

## Install

The schematic does the whole Install + Styles section for you — it installs
ngwr and its peers, appends `@use 'ngwr';` to your global stylesheet, and
prints a provider snippet tailored to your answers (date adapter, density,
theme) to paste into bootstrap:

```shell
ng add ngwr
```

Or wire it up by hand:

```shell
pnpm add ngwr @angular/cdk
# or
npm install ngwr @angular/cdk
# or
yarn add ngwr @angular/cdk
```

`@angular/cdk` is the only required peer. Add an icon set and a date library
only if you use them — `lucide` (or `feather`) for the icon adapters, and
`date-fns` or `luxon` for the calendar / date-picker adapters. The Quick start
below registers a lucide icon, so it needs `lucide`:

```shell
pnpm add lucide
```

## Styles

The fastest way — pull in everything (theme tokens + all component styles):

```scss
// styles.scss
@use 'ngwr';
```

Good for a spike, but it is every entry point at once — about **247 kB** of CSS
(~30 kB over the wire), which on its own exceeds the 500 kB initial budget a
fresh `ng new` ships with. For anything you intend to keep, opt in per component
below and the sheet stays proportional to what you actually render.

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
@use 'ngwr/animations'; // .wr-animate-fade-in, .wr-animate-slide-up, …
@use 'ngwr/typography-utilities'; // .wr-text-*, .wr-font-* utility classes
@use 'ngwr/breakpoints' as bp; // SCSS mixins only, no CSS output
```

`ngwr/typography-utilities` is the utility-class sheet — not `ngwr/typography`,
which is the larger `wrTypography` component entry.

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

Every value control is Signal Forms-native, so `[formField]` binds straight
through — no `ControlValueAccessor` anywhere in the chain:

```ts
// profile-form.ts
import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrInput } from 'ngwr/input';

@Component({
  selector: 'app-profile-form',
  imports: [FormField, WrCheckbox, WrInput],
  template: `
    <input wrInput [formField]="profile.name" placeholder="Your name" />
    <wr-checkbox [formField]="profile.agree">I agree</wr-checkbox>
  `,
})
export class ProfileForm {
  readonly model = signal({ name: '', agree: false });
  readonly profile = form(this.model); // FieldTree — profile.name, profile.agree
}
```

## Catalog

> Browse the full catalog with live demos at [**ngwr.dev**](https://ngwr.dev).
> Each entry below is a tree-shakable subpath — `import { … } from 'ngwr/<name>'`.
> A few share a package: `form-field` ships from `ngwr/form`, `button-group` from
> `ngwr/button`, and `qr` is the subpath behind the `qrcode` docs page.

### Components

**Form** — [calendar](https://ngwr.dev/reference/components/calendar), [cascader](https://ngwr.dev/reference/components/cascader), [checkbox](https://ngwr.dev/reference/components/checkbox), [color-picker](https://ngwr.dev/reference/components/color-picker), [date-picker](https://ngwr.dev/reference/components/date-picker), [file-upload](https://ngwr.dev/reference/components/file-upload), [form](https://ngwr.dev/reference/components/form), [form-field](https://ngwr.dev/reference/components/form-field), [input](https://ngwr.dev/reference/components/input), [input-number](https://ngwr.dev/reference/components/input-number), [input-otp](https://ngwr.dev/reference/components/input-otp), [knob](https://ngwr.dev/reference/components/knob), [mention](https://ngwr.dev/reference/components/mention), [radio](https://ngwr.dev/reference/components/radio), [rating](https://ngwr.dev/reference/components/rating), [segmented](https://ngwr.dev/reference/components/segmented), [select](https://ngwr.dev/reference/components/select), [slider](https://ngwr.dev/reference/components/slider), [switch](https://ngwr.dev/reference/components/switch), [textarea](https://ngwr.dev/reference/components/textarea), [transfer](https://ngwr.dev/reference/components/transfer).

**Buttons** — [button](https://ngwr.dev/reference/components/button), [button-group](https://ngwr.dev/reference/components/button-group), [speed-dial](https://ngwr.dev/reference/components/speed-dial).

**Data** — [drag-drop](https://ngwr.dev/reference/components/drag-drop), [event-calendar](https://ngwr.dev/reference/components/event-calendar), [pagination](https://ngwr.dev/reference/components/pagination), [pull-to-refresh](https://ngwr.dev/reference/components/pull-to-refresh), [table](https://ngwr.dev/reference/components/table), [tree](https://ngwr.dev/reference/components/tree), [virtual-scroll](https://ngwr.dev/reference/components/virtual-scroll).

**Feedback** — [alert](https://ngwr.dev/reference/components/alert), [empty](https://ngwr.dev/reference/components/empty), [progress](https://ngwr.dev/reference/components/progress), [result](https://ngwr.dev/reference/components/result), [skeleton](https://ngwr.dev/reference/components/skeleton), [spinner](https://ngwr.dev/reference/components/spinner).

**Display** — [avatar](https://ngwr.dev/reference/components/avatar), [badge](https://ngwr.dev/reference/components/badge) (incl. `wr-tag`), [compare](https://ngwr.dev/reference/components/compare), [counter](https://ngwr.dev/reference/components/counter), [descriptions](https://ngwr.dev/reference/components/descriptions), [divider](https://ngwr.dev/reference/components/divider), [image-cropper](https://ngwr.dev/reference/components/image-cropper), [keyboard](https://ngwr.dev/reference/components/keyboard), [lightbox](https://ngwr.dev/reference/components/lightbox), [qr](https://ngwr.dev/reference/components/qrcode), [statistic](https://ngwr.dev/reference/components/statistic), [timeline](https://ngwr.dev/reference/components/timeline).

**Layout** — [card](https://ngwr.dev/reference/components/card), [carousel](https://ngwr.dev/reference/components/carousel), [collapse](https://ngwr.dev/reference/components/collapse), [layout](https://ngwr.dev/reference/components/layout), [list](https://ngwr.dev/reference/components/list), [page-header](https://ngwr.dev/reference/components/page-header), [splitter](https://ngwr.dev/reference/components/splitter), [toolbar](https://ngwr.dev/reference/components/toolbar).

**Navigation** — [anchor](https://ngwr.dev/reference/components/anchor), [back-top](https://ngwr.dev/reference/components/back-top), [breadcrumbs](https://ngwr.dev/reference/components/breadcrumbs), [burger](https://ngwr.dev/reference/components/burger), [dropdown](https://ngwr.dev/reference/components/dropdown), [sidebar](https://ngwr.dev/reference/components/sidebar), [stepper](https://ngwr.dev/reference/components/stepper), [tabs](https://ngwr.dev/reference/components/tabs).

**Overlays** — [action-sheet](https://ngwr.dev/reference/components/action-sheet), [command-palette](https://ngwr.dev/reference/components/command-palette), [context-menu](https://ngwr.dev/reference/components/context-menu), [dialog](https://ngwr.dev/reference/components/dialog), [drawer](https://ngwr.dev/reference/components/drawer), [popconfirm](https://ngwr.dev/reference/components/popconfirm), [popover](https://ngwr.dev/reference/components/popover), [toast](https://ngwr.dev/reference/components/toast), [window](https://ngwr.dev/reference/components/window).

**Charts** — [bar-chart](https://ngwr.dev/reference/components/bar-chart), [calendar-heatmap](https://ngwr.dev/reference/components/calendar-heatmap), [donut-chart](https://ngwr.dev/reference/components/donut-chart), [gauge](https://ngwr.dev/reference/components/gauge), [line-chart](https://ngwr.dev/reference/components/line-chart), [meter-group](https://ngwr.dev/reference/components/meter-group), [sparkline](https://ngwr.dev/reference/components/sparkline).

Plus [icon](https://ngwr.dev/reference/components/icon), the experimental [squircle](https://ngwr.dev/reference/components/squircle), and the [typography](https://ngwr.dev/reference/directives/typography) directive.

### Animations

Animated UI effects. Mix of in-house components + ports of [reactbits.dev](https://www.reactbits.dev) — each port carries a credit chip on its docs page. Defaults are theme-aware (light + dark), and every component honors `prefers-reduced-motion`.

[aurora](https://ngwr.dev/animations/aurora), [blur-text](https://ngwr.dev/animations/blur-text), [border-glow](https://ngwr.dev/animations/border-glow), [circular-text](https://ngwr.dev/animations/circular-text), [click-spark](https://ngwr.dev/animations/click-spark), [confetti](https://ngwr.dev/animations/confetti), [decrypt-text](https://ngwr.dev/animations/decrypt-text), [falling-text](https://ngwr.dev/animations/falling-text), [fuzzy-text](https://ngwr.dev/animations/fuzzy-text), [glitch-text](https://ngwr.dev/animations/glitch-text), [gradient-text](https://ngwr.dev/animations/gradient-text), [marquee](https://ngwr.dev/animations/marquee), [rotating-text](https://ngwr.dev/animations/rotating-text), [shiny-text](https://ngwr.dev/animations/shiny-text), [splash-cursor](https://ngwr.dev/animations/splash-cursor), [split-text](https://ngwr.dev/animations/split-text), [spotlight-card](https://ngwr.dev/animations/spotlight-card), [star-border](https://ngwr.dev/animations/star-border), [tilt-card](https://ngwr.dev/animations/tilt-card), [typewriter](https://ngwr.dev/animations/typewriter), [waves](https://ngwr.dev/animations/waves).

Card packages bundle their related directives: `ngwr/spotlight-card` exports `WrSpotlight`; `ngwr/tilt-card` exports `WrTilt`; `ngwr/shiny-text` exports `WrShimmer`.

### Directives — `ngwr/directives`

[autofocus](https://ngwr.dev/reference/directives/autofocus), [autosize](https://ngwr.dev/reference/directives/autosize), [click-outside](https://ngwr.dev/reference/directives/click-outside), [copy-to-clipboard](https://ngwr.dev/reference/directives/copy-to-clipboard). [affix](https://ngwr.dev/reference/directives/affix) ships as its own entry (`ngwr/affix`).

### Pipes — `ngwr/pipes`

[wrBytes](https://ngwr.dev/reference/pipes/wr-bytes), [wrDate](https://ngwr.dev/reference/pipes/wr-date), [wrMark](https://ngwr.dev/reference/pipes/wr-mark), [wrNumber](https://ngwr.dev/reference/pipes/wr-number), [wrPlural](https://ngwr.dev/reference/pipes/wr-plural), [wrRange](https://ngwr.dev/reference/pipes/range), [wrTruncate](https://ngwr.dev/reference/pipes/wr-truncate).

### Services

[clipboard](https://ngwr.dev/reference/services/clipboard), [cookie](https://ngwr.dev/reference/services/cookie), [density](https://ngwr.dev/reference/services/density), [hotkey](https://ngwr.dev/reference/services/hotkey), [loading-bar](https://ngwr.dev/reference/services/loading-bar), [media](https://ngwr.dev/reference/services/media), [meta](https://ngwr.dev/reference/services/meta), [platform](https://ngwr.dev/reference/services/platform), [scroll](https://ngwr.dev/reference/services/scroll), [storage](https://ngwr.dev/reference/services/storage), [theme](https://ngwr.dev/reference/services/theme), [tour](https://ngwr.dev/reference/services/tour), [i18n](https://ngwr.dev/reference/services/i18n).

### Validators — `ngwr/validators`

Bundled `ValidatorFn`s composing cleanly with Angular's built-in `Validators`: `cardNumber` (Luhn), `cvc`, `hexColor`, `iban` (mod-97), `match` (sibling control), `matchFields` (group-level), `maxDate`, `minDate`, `noWhitespace`, `oneOf`, `url`. See [docs](https://ngwr.dev/reference/validators).

### Utils — `ngwr/utils`

Math (`clamp`, `round`), coercion (`numAttr`), css helpers (`resolveCssSize`, `getRootFontSize`), ids (`randomId`), type guards (`isDefined`, `isNonEmptyArray`, `isObservable`), keyboard helpers (`KEYS`, `hasModifier`, `isPrintableKey`), functional primitives (`noop`, `badgeLog`, `debounce`, `throttle`), focus management (`getFocusableElements`, `trapFocus`). See [docs](https://ngwr.dev/reference/utils) for the full list. Shared shapes (`Maybe`, `SafeAny`, `WrColor`, …) are documented under [Interfaces](https://ngwr.dev/reference/interfaces).

### Core

- [Color](https://ngwr.dev/guides/tokens/colors) — design tokens and palette.
- [Grid](https://ngwr.dev/guides/grid) — opt-in 12-column layout.
- [Overlay](https://ngwr.dev/guides/overlay) — isolated CDK overlay container, `provideWrOverlay()`.
- [Mobile & responsive](https://ngwr.dev/guides/mobile) — responsive overlays, touch targets & density, swipe gestures, safe-area insets, container-query layouts.
- [Typography](https://ngwr.dev/guides/typography) — `wrTypography` directive: headings, paragraphs, lists, links, code.
- [Icons](https://ngwr.dev/icons) — `ngwr/icon` registry. Use `svgIcon()` for any set that ships raw SVG files (Tabler, Phosphor, Heroicons, Iconoir, Radix, Bootstrap, or your designer's own), plus thin adapters for Lucide (`ngwr/icon/adapters/lucide`) and Feather (`ngwr/icon/adapters/feather`), whose packages don't ship SVGs.
- **Date adapters** — `ngwr/date-adapter-fns`, `ngwr/date-adapter-luxon`. Wire one with `provideWrDateAdapter(...)` to power calendar + every mode of date-picker.

## Highlights

- **Standalone & signals-first.** Every component is standalone and uses `input()` / `model()` / `output()` / `signal()` / `computed()`. Zoneless-ready.
- **Signal Forms native.** Every value control implements `FormValueControl` / `FormCheckboxControl`, so `[formField]` binds straight through — there is no `ControlValueAccessor` in the library at all. `[(ngModel)]` and reactive forms keep working through Angular's bridge, and every control also works standalone via `[(value)]` / `[(checked)]`.
- **CDK-powered.** Overlays, portals, and a11y come from `@angular/cdk`. We add `provideWrOverlay()` so NGWR overlays never collide with other CDK consumers (Material, NG-ZORRO, etc.).
- **Mobile & responsive.** Overlays collapse to bottom-sheets on small screens (`provideWrResponsiveOverlays()`), touch targets grow to ≥44px on coarse pointers, a `touch` density preset enlarges every control, and drawer / lightbox / toast / carousel respond to swipe gestures. Fixed surfaces respect `env(safe-area-inset-*)`, and layout components (`descriptions`, `stepper`, `page-header`, `toolbar`, `pagination`, `table`) reflow to their container via container queries. [Guide](https://ngwr.dev/guides/mobile).
- **Table, batteries included.** `wr-table` covers column pinning / resizing / drag-reorder, row selection, expandable rows, grouping, tree rows (`childrenKey` — the forest flattens into the same `<tbody>`, so pinning and cell templates keep working at every depth, and the table announces a `treegrid`), summary rows, CSV export (`exportCsv()`, dependency-free RFC 4180) and a virtualized body — all opt-in inputs on the one component. Excel (`.xlsx`) export is deliberately not shipped: it would mean a third-party dependency.
- **Tree-shakable.** 156 separate ng-packagr entry points — import only what you use. Per-component FESM bundles are small: a median of ~3 KB gzipped, the heaviest (`ngwr/select`) ~20 KB. The whole catalog gzips to ~516 KB — but real apps pull a handful of entries. The only runtime dependency is `tslib`.
- **Modular SCSS.** Component styles are scoped through CSS custom properties. Theme tokens live in `ngwr/theme`; utilities (`grid`, `reset`) and the breakpoints SCSS API are opt-in.
- **Tree-shaken icons.** `provideWrIcons(lucideIcons({ plus: Plus }))` registers only the icons you actually import. Dev-mode validation warns about unregistered icons.
- **Reactbits ports, dependency-free.** All animation ports are reimplemented with vanilla DOM + Web Animations API / `IntersectionObserver` / `requestAnimationFrame` / raw WebGL — no GSAP, no `motion/react`, no `matter-js`, no `ogl`.
- **Motion respects the OS.** Every animation component short-circuits to its final state under `prefers-reduced-motion`.
- **Legible to agents.** Every docs page also serves as markdown at the same URL plus `.md` — [reference/components/select.md](https://ngwr.dev/reference/components/select.md) is that page's prose, code samples and API tables without the site chrome. The whole catalog is at [llms-full.txt](https://ngwr.dev/llms-full.txt), a quick-ref at [llms.txt](https://ngwr.dev/llms.txt).

## Contributing

Conventional commits are enforced on PR titles. Common types: `feat`, `fix`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`. Optional scope is the component or area (`feat(checkbox): icon mode`).

```shell
pnpm install
pnpm dev            # ng serve --o (showcase)
pnpm build:lib      # ng build lib + ai assets + dist assets + schematics
pnpm build:showcase # showcase build + sitemap
pnpm lint           # ng lint + eslint scripts + stylelint + colour parity
```

## Authors

- [Roman Khegay](https://github.com/thekhegay) — code, design

## License

[MIT](./LICENSE) — free for commercial use.
