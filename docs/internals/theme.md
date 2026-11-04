# Theme and styling

Part of [AGENTS.md](../../AGENTS.md). Read this before changing tokens, colours, dark mode or component hooks.

- **Theme** (`ngwr/theme`) — the `--wr-*` token layer is plain CSS and needs no
  provider (see Styling). Global CSS is `@use 'ngwr/theme'` plus one `@use 'ngwr/<name>'`
  per component. **There is no umbrella and v15 removed it**: the root `exports`
  key carries no `sass` condition, so `@use 'ngwr'` does not resolve. It
  compiled every component stylesheet for whatever a page rendered — measured
  here at 287 kB against 44 kB for the entry points one demo draws, and an
  out-of-memory error inside StackBlitz. The key itself still exists, and since
  v15 it carries TypeScript only — `provideWr()` and nothing from the catalog
  (before that it pointed at an empty `public-api.ts`, kept because
  `@angular/build:library` refuses a manifest whose `exports` has no `.`). The
  one consumer that really does want every sheet is the showcase, and its
  aggregate is `projects/showcase/styles/_components.scss`, written by
  `pnpm gen:exports` off the same walk — not a hand-kept list, which is what it
  was for 110 lines. Removing it also made each component load the styles of
  the components it renders (see the anatomy above).
  Removing the umbrella made `@use` ORDER load-bearing, and Sass says so out
  loud: a module can be configured only at its first load, so
  `@use 'ngwr/theme' with (...)` below any component entry fails the build with
  "This module was already loaded".
  **Dark mode is the CSS standard since v15: `color-scheme` plus
  `light-dark()`.** It also sets the browser floor, a v15 break of its own:
  Chrome 123, Firefox 120 and Safari 17.5, the first releases with
  `light-dark()`. Below the floor every themed colour is lost outright rather
  than degraded. A CSS feature newer than those three has to degrade on them,
  the way `smooth-br` falls back to a plain radius where `corner-shape` is
  missing. The theme declares `color-scheme: light dark` on `:root`, so
  a page follows the OS with no JavaScript at all, and every token that differs
  between the schemes is declared ONCE, as `light-dark(<light>, <dark>)`, with
  both sides tuned by hand and independently — the dark palette is not derived
  from the light one. Forcing a scheme is one inline style on `<html>`:
  `WrTheme`, a root service with no provider, writes `color-scheme: light` or
  `dark` for an explicit mode, clears its own write for `auto` (an author's
  `<html>` scheme is left alone), keeps the choice in `WrStorage`, and writes
  NOTHING on the server, so a prerendered page carries no inline style and an
  OS-dark visitor gets dark from the first paint. With no provider the service
  is created on first `inject()`, and that is when a stored choice or a
  non-`auto` `defaultMode` lands — so a page whose first screen never asks for
  it paints the OS scheme. `provideWr(withTheme({ defaultMode, storageKey }))`
  sets `WR_THEME_CONFIG` and adds the environment initializer that creates it
  at boot, the same thing `withDensity()` does for `WrDensity`.
  `wrThemePrePaintScript()` replays the same choice (a stored `light` / `dark`,
  else a non-`auto` `defaultMode` passed to it) before the bundle boots.
  `color-scheme` replaced a `[data-theme='dark']` block, and the defect there was the ancestor SELECTOR, not the attribute — a
  class dies the same way: emulated encapsulation tags every compound of a
  selector, the ancestor included, so `[data-theme='dark'] .card` in a
  consumer's component stylesheet compiled, shipped and matched nothing, and
  the workarounds (a `:host-context()` twin on every `theme.dark` rule, an
  attribute name set in a provider AND in Sass, a dev-mode mismatch warning)
  were all about that one selector. `light-dark()` is a VALUE, so it needs no ancestor, passes through
  encapsulation untouched and resolves per element: a `color-scheme: dark` on
  any subtree flips every token read under it with no re-declaration. Do not
  bring an ancestor selector back. `theme.dark`, `dark-selector()` and
  `$theme-attribute` are gone with no replacement helper — a consumer writes
  `light-dark()` in its own declarations. Four switches were not colours and so
  could not move (`wr-border-glow`'s two blend modes and fill scale,
  `wr-tilt-card`'s glare blend); each carries one value chosen to read on both
  canvases, with the reason at the line.
  **What `light-dark()` will not do, measured in Chromium, Chrome, WebKit and
  Firefox.** A canvas never takes it: Chromium and WebKit ignore the string and
  keep the previous colour, while Firefox accepts it and paints the LIGHT side
  on a dark page — so canvas and WebGL code resolves the colour first, through
  a probe element's computed `color`, which comes back as `rgb(…)` or
  `color(srgb r g b / a)` with 0–1 channels and never as hex. That probe is
  `resolveCssColor(context, expression, fallback)` in `ngwr/utils`, which the
  bits drawing on a 2D canvas share — use it rather than a second copy. It is
  not `getPropertyValue('--wr-…')`, which returns the raw declared text,
  `light-dark(#fff, #000)` included, in either scheme. For a WebGL uniform,
  `resolveCssColorChannels(context, expression, fallback)` beside it reads the
  same result as 0–1 sRGB channels, which `wr-aurora` and `wr-iridescence`
  share. Never register a theme
  token with `@property … { syntax: '<color>' }` on `:root`: a registered
  colour resolves where it is declared, and every subtree with its own
  `color-scheme` silently keeps the root's value. It holds colours only —
  `light-dark(1px, 2px)` is invalid and the property falls back to its initial
  value. And an overlay follows the ROOT scheme, not its trigger's: the CDK
  container sits under `<body>`, so a dropdown opened from a
  `color-scheme: dark` card renders in whatever `<html>` resolves to.
  **The public Sass entry is `theme/_index.scss`, it DECLARES its API rather
  than forwarding it, and both halves of that were measured rather than
  guessed.** Editors do not read the `sass` condition of `exports`: they resolve
  the specifier as a plain path, so there has to be a file at
  `node_modules/ngwr/theme/_index.scss` at all — `exports` points at the same
  file so the compiler and the editor can never land on two different ones. And
  once an editor is there it has to follow `@forward` to find anything, which
  WebStorm does not do for a file inside `node_modules`. One variable at a time,
  against a real project: the same one-hop forward chain resolves inside `src/`
  and does not inside `node_modules`; a two-hop chain inside `src/` resolves, so
  it is not depth; it fails through a pnpm symlink and through a plain copied
  directory alike, so it is not the symlink; it fails for a relative `@use` into
  `node_modules` as well as for a bare specifier, so it is not the specifier;
  `@forward … show` does not help; and marking the directory Not Excluded or a
  Test Source Root does not either. What DOES resolve is a member the resolved
  file declares itself — so the mixins and functions a consumer reaches for in
  a COMPONENT stylesheet are re-declared there as one-line wrappers, the
  forward's `hide` list being the source for which ones (`smooth-br`,
  `touch-target`, `focus-ring`, `rebrand` and `contrast` today). In a component
  stylesheet that `@use` still brings a second, shimmed-dead copy of the token
  layer along, because a component stylesheet is its own Sass compilation.
  Three rules hold it together and each one is a build error or a silent loss if
  broken: `@forward` comes BEFORE `@use`, because the forward is the load that
  accepts configuration and the other order makes
  `@use 'ngwr/theme' with ($base-colors: …)` refuse to compile; the forward
  `hide`s exactly the wrapped names, or each collides with its own original;
  and a VARIABLE cannot be wrapped, so `$base-colors` and the other `!default`
  variables stay forwarded and are the members that resolve in the compiler and
  not in the editor. The cost is a second copy of every signature, which is why
  `theme/sass-entry.spec.ts` compiles the entry and holds each wrapper's
  parameter list against the implementation's as well as pinning the `exports`
  target, the `hide` list and the load order.
  **An escaped quote inside an interpolated string stops a language server
  reading the rest of the file** — WebStorm reported "Cannot find mixin" for a
  mixin declared sixteen lines below such a string until the string was
  rewritten with double quotes, and Sass emits the identical string either way.
  Prefer double quotes for any Sass string that has to contain one.
  **Rebranding is compile-time only since v15.**
  `@use 'ngwr/theme' with ($base-colors: …)` moves the LIGHT side alone,
  because the dark intents are hand-tuned rather than derived and no formula
  reproduces the tuning; `rebrand($colors, $dark)` carries a rebrand into both
  schemes, its second map being the dark seeds. It re-declares every `-ink`
  too, so it also re-emits the `prefers-contrast: more` shares from
  `$ink-mix-more`: a `:root` rebrand comes later in source than the theme's
  high-contrast block, at the same specificity, and without its own copy would
  switch the 7:1 ink layer off for every intent on the page. `wrThemeTokens()`,
  its `check:theme` gate, `gen:design-tokens` and the `/guides/tokens/builder`
  page were deleted together: a TypeScript copy of the Sass palette arithmetic
  needed a gate of its own to stay honest, for a runtime rebrand nothing used.
  One limit outlived them: the `-ink` shares are calibrated against the SHIPPED
  bases, so a seed far from them inherits shares that no longer guarantee 5:1 —
  measure it.

**Styling.** Component styles live in `styles/_index.scss`, themed through
**CSS custom properties** (`--wr-*`), not encapsulation. The token layer
(`@use 'ngwr/theme'`, plain CSS on `:root`): five intent colors
`--wr-color-{primary,success,warning,danger,info}`,
each with `-contrast / -light / -lighter / -dark / -darker`, plus the
soft set (`-soft / -soft-border / -soft-contrast / -active`) and `-ink`. **The
neutrals are not intents** — v15 cut `secondary`, `light`, `medium` and `dark`,
because the first was a second brand colour nobody had and the other three were
fills wearing the names of surfaces. What replaced them is a six-step gray ramp
(`--wr-color-gray-1` … `-6`, faintest wash to body text) that each theme SETS
rather than mirrors, plus the semantic role aliases that resolve through it
(`--wr-color-{surface,on-surface,on-surface-muted,placeholder,hover,fill,fill-subtle,fill-strong}`
and the border family `--wr-border-{subtle,base,strong}`).
A component paints with the ROLE, never with a ramp step: the step is the
substrate, and reaching past the role is how a component ends up right in one
theme only. **A token that differs between the schemes is declared once, as
`light-dark(<light>, <dark>)`**, and everything derived from one (`-soft`,
`-ink`, the role aliases) is written in terms of `var()`, so it re-resolves per
scheme with no dark copy. **There are no `-rgb` channel lists since v15**: a
channel list cannot be a `light-dark()` value, and
`color-mix(in srgb, var(--wr-color-primary) 12%, transparent)` paints the same
as the `rgba(var(--wr-color-primary-rgb), 0.12)` it replaced. Note that it
computes to `color(srgb …)` with 0–1 channels, not to `rgba(…)`. Plus
`--wr-space-{xs,sm,md,lg,xl}` (since v15 the ONE scale for padding, margin and
gap), `--wr-border-radius-{sm,base,lg,pill}`, `--wr-text-*`,
`--wr-leading-*`, `--wr-tracking-*`, `--wr-font-weight-*`, `--wr-shadow-*`,
`--wr-control-*` (the size contract every form control reads), `--wr-z-*`,
`--wr-duration-*` and `--wr-ease-*`; `theme/styles/_variables.scss` is the
list. Pull mixins and tokens from `ngwr/theme`.
The TS `WR_COLORS` list and the SCSS `$base-colors` map must stay in sync —
`theme/sass-entry.spec.ts` fails if they drift.

**A component paints only through its own hooks (v15).** The block declares one
`--wr-<block>-*` variable per token it paints with, each defaulting to a role,
space or other theme token, and its rules read only those variables:

```scss
.wr-card {
  --wr-card-bg: var(--wr-color-surface);
  --wr-card-padding-y: var(--wr-space-lg);

  background: var(--wr-card-bg);
}
```

A rule that reads `--wr-color-surface` or `--wr-space-lg` directly leaves the
consumer no hook of the component's own to restyle it with, and the hooks are
public API (see `gen:css-vars` below).

**An input that can be unset never binds to a hook's own name.** Angular compiles
`[style.--wr-x]` under a namespaced key that misses a value of the same name in the
host's `style` attribute and in `[style]`, so a `null` binding wipes the author's
value where `[style.color]` would restore it. `[ngStyle]` writes through the renderer,
outside that chain, so a `null` host binding wipes its value for any property. A host
map binding is no way out: it keeps a static value on the first pass, loses it once
the input has been set and unset, and overrides a consumer's own `[style.--wr-x]`. So
the input writes `--wr-<block>-input-<name>`, which the table does not list, and the
rule reads `var(--wr-<block>-input-<name>, var(--wr-<block>-<name>))`. That also means
an expression built on the hook, `color-mix(in srgb, var(--wr-x) 50%, black)`, is no
cycle. A component that can hold another of its kind (a projected slot, a consumer
template) also declares that variable `initial` on the block, or the inner one inherits
it. A hook that mirrors an input whose value is never `null` (`--wr-threads-count`,
`--wr-waves-x-gap`) has no such problem and no way in from a stylesheet rule either,
since the input's value is on the host. `gen:css-vars` reads that off the owner's
`host:` metadata and its `setProperty` calls — a write with no `null` branch and no
`removeProperty` — and marks the row `host`, so the docs table says the component
sets it instead of telling the reader to set it on the element. The same mark lands
on a hook written from STATE and never released (`--wr-border-glow-angle` follows the
pointer), where a rule holds until the first write, so the note says "until the
component writes" rather than "cannot". An always-set input has to reach the host
through one of those two shapes: `wr-border-glow` wrote its geometry through a
`setProperty(k, vars[k])` bag, and the scan, which cannot read a bag, left four
hooks documented as a rule's while every instance overwrote them. An author's own
`[style.--wr-x]` still wins over it, as a template binding does over a host binding.

**The COMPONENT-scoped hooks are catalogued by `gen:css-vars`.** How many there
are is printed by the run — do not re-type it here, which is how this line came
to say 379 while `gen:css-vars` said 380. A consumer restyles a component
through exactly those `--wr-<name>-*` hooks, and they were documented nowhere
until v14: the sanctioned, non-breaking route meant opening
`node_modules/ngwr/<name>/styles/_index.scss`, and a consumer who cannot find a
hook overrides the internal BEM class instead — against a class-name stability
statement that never meant to cover it. `scripts/lib/build-css-var-map.ts` reads
the stylesheets and `<ngwr-doc-page>` renders the section itself, keyed by route,
so a component that grows a hook cannot ship without the row. Three rules earned
while writing it: **declaring a hook is not owning one** (some declarations are
one component setting another's — `--wr-icon-size` inside its own `<wr-icon>` —
and belong on the owner's page; the run counts those too); **a read may live in
TypeScript** (`wr-circular-text` writes `var(--wr-circular-text-radius)` into a
transform and `wr-aurora` reads three hooks through `getPropertyValue`, so a
stylesheet-only scan called all four dead) but never in a spec or a harness; and
**the default is the BASE declaration**, outside any at-rule and on a selector
with no modifier, because a hook is typically re-declared by every variant.
Exactly one hook is declared and never read — `--wr-density-text`, published
for consumers' own `calc()` — and the generator prints it rather than listing it.

**`check:tokens` finds a READER with no token** — a `var(--wr-color-…)` or
`var(--wr-border-…)` at a name the theme never declares. A dangling read is
invalid at computed-value time, so the browser drops the WHOLE declaration
holding it. `border: 1px solid var(--wr-color-gone)` draws no border at all,
and nothing says so in the build, the console or a test.
v15 is why the check exists: cutting four intents left **220 reads across 71
files**, nine of them in the SHIPPED library — `wr-gauge`, `wr-knob`,
`wr-calendar-heatmap` and `wr-line-chart` each drew a neutral track or grid line
through a token that no longer existed — and every gate was
green. Scope: the `--wr-color-*` namespace and the
`--wr-border-{subtle,base,strong}` family, both owned by the theme layer; a
read in a template or in TypeScript counts, because an inline
`style` is a live rule and a printed snippet is advice someone
will paste; a declaration counts from a stylesheet or a template but NEVER from
TypeScript, since every `--wr-color-…:` in a `.ts` file here is inside a printed
snippet, and counting those made the check answer that every read of a deleted
token resolved. `projects/lib/schematics` is skipped whole: a codemod's tables
and fixtures name the old vocabulary on purpose. Its other pass, a declared
token nothing paints with, went in v15 with its `unused-ok:` markers.

**A `::before` background is invisible to every contrast checker.** The case
that taught it was `wr-squircle`, which painted its content fill on a
pseudo-element: axe walked past it to the host's `background-color` — which for
the bordered variant was the BORDER colour — and reported the intent measured
against itself. That component is gone with v15, the rule is not. Any component
that paints through a pseudo-element, a gradient, or an SVG is unmeasurable this
way; check those by hand rather than believing the number.

**`-contrast` picks, it does not blend.** `_contrast()` returns whichever of
`$contrast-dark` / `$contrast-light` scores higher against the fill, so those two
values ARE the ceiling for every intent — there is no share to tune, and a
"softer" black spends contrast that nothing else can recover. Both are the
extremes (`#000` / `#fff`), which puts every intent at its theoretical maximum.
Because it picks, the label an intent gets is decided by the FILL: the two
candidates are equal at √21 ≈ 4.58, so anything lighter than that takes a black
label no matter what anyone prefers. That is the whole reason v11 deepened five
intents — `secondary`, `success`, `danger`, `info`, `medium` — just past the flip
(light theme: white 4.60–4.64, black 4.52–4.56, an 8–20% shift in tone); at the
old tones white measured 3.10–3.99, below AA, so a muddy black label won on
merit. `warning` (black at 12.28:1) is deliberately NOT in that set and cannot
be — white needs `#906900` on it, which is brown, not a warning colour. Two of
those five, `secondary` and `medium`, are gone with v15; the deepening stands
for the three that remain. Every intent clears AA; the tightest is now `info`
at 4.61:1 with `danger` at 4.63:1, where white already wins and pure white is
the ceiling, so the only lever left is the fill itself.

**In the DARK theme those two roles cannot both be satisfied, and the arithmetic
says so.** A patch after v11 deepened the dark `primary` from `#5b85ff` to
`#3567ff` so its label would stop being black while the light theme's was white.
White wins below L ≈ 0.179; clearing 4.5:1 as text on the dark canvas needs
L ≥ 0.201 on the library's own `--wr-color-surface` (`#0b1120`) and L ≥ 0.214 on the
showcase's slightly lighter page (`#0e162d`, which is the pair axe reports). The two
ranges do not overlap on either — **no colour takes a
white label AND works as body text on a dark page**, for any intent, at any hue.
So a dark theme whose filled buttons carry white labels MUST route the
intent-as-text role through `-ink` (which lightens in dark), and the bare token
went from 5.33:1 to 3.87:1 in that role. That is why the showcase's twenty
`color: var(--wr-color-primary)` declarations became `-ink`: not a workaround, the
only consistent reading of the two tokens.

**Text takes `-ink`; a GRAPHIC keeps the bare intent.** The library had 29
declarations painting a bare `--wr-color-primary` through a text property, and the
split is 11 text / 18 graphic — decided by reading each template, never by the
class name. **A property-name grep does not find them all.** `wr-calendar` paints
today's day number through its own theming hook — `--wr-calendar-accent`, which
defaults to `var(--wr-color-primary)` — so no search for the token's name reaches
it. It measured 4.06:1 in dark and now has an `--wr-calendar-accent-ink` companion
beside the existing `-contrast` one, so overriding the hook carries the
text role with it (and its tints, which `color-mix` the hook itself). Sweeping
every component-local alias that resolves to a bare intent turned up exactly
one other, `--wr-alert-close`, and it is a non-issue: an `<svg>`, and every
variant already overrides the default with `-ink`. Two more
shapes a grep also misses — `wr-shiny-text` mixes the bare `--wr-color-primary`
into a gradient stop under `background-clip: text`, which stayed bare only
because there was no `-ink-rgb` to swap in (with `color-mix` the swap is one
word, and has not been measured), and the chart components take
`input<string>('var(--wr-color-primary)')` as a consumer-facing default that
specs pin. `.wr-date-picker__trigger`, `.wr-table-sort--asc`,
`.wr-input-number__step` and all five `.wr-sidebar__icon` rules contain nothing but
an `<svg>`, and WCAG holds a graphic to 3:1, which `#3567ff` clears on the dark
canvas at 3.87. Deepening those would restyle the light theme for no accessibility
gain. The ten that DID move — `wr-option--selected`, `wr-tree__row--selected`,
`wr-tree__chip`, `wr-cascader__opt--active`, the command-palette and context-menu
items, `wr-segmented__option:hover`,
`wr-anchor__link--active`, `wr-table-filter__reset` ("Reset", a real text button)
and `wr-falling-text__word--hl` — all carry text, and six of them sit directly on
`--wr-color-primary-soft`, the tint `-ink` is calibrated against. Five were failing
in the LIGHT theme too, at 4.17–4.19:1, long before the dark base moved.

**The `-ink` ramp is calibrated, not eyeballed.** Each intent's share in
`$ink-mix` (`theme/styles/_colors.scss`) was derived as the most saturated value
that still reaches **5.0:1 against that intent's own `-soft` tint**, in both
themes — the soft tint being the darker of the two backgrounds `-ink` is
documented for, and so the binding one. The 5.0 target is deliberate headroom
over AA's 4.5: the first pass aimed at 4.5 exactly and left every intent between
4.59 and 4.83, so a slightly different background pushed it under
(`wr-typography--code` measured 4.24, `wr-tag--primary` 4.42). **v11 moved five of
the bases without re-deriving the shares**, which cuts both ways: a deeper base
darkens the ink, which raises contrast on a light tint and lowers it on a dark
one, so the light theme sits at 5.03–6.56 while dark slipped. `primary` has since
been re-derived from 86% to **78%** — the dark base deepening dropped it to
4.48:1 on the sidebar's own tint, a real AA failure axe caught, and 78% is the
most saturated share that reaches 5.0 there (5.04). Lowering a share only helps
the light theme, where less intent means more `--wr-color-gray-6`. The one
recorded laggard was `secondary-ink` in DARK at 4.78 — clear of AA, under the
documented target — and v15 removed that intent, so nothing measured sits below
the target today. That is not the same as everything clearing it: v11 moved
`success` and `danger` without re-deriving either share, so measure before you
trust the four that remain. **Derive against the pair axe resolved on
the page, not against a hand-rolled composite:** compositing the `-soft` tint over
the canvas by hand reproduces the ink colour exactly and the BACKGROUND not at all
(4.14 computed where axe measured 4.48, and it missed the then-recorded
`secondary-ink` 4.78 by the same kind of margin). The ratio formula itself is
sound — it reproduces axe to the second decimal on a pair axe has already
resolved. So take the foreground/background pair out of the `check:contrast`
report and solve on that. Those figures are arithmetic on token values, not
painted measurements; `pnpm check:contrast` is the authority. If you change a
share, re-derive it — do not nudge it until one page looks right.

**Two directions, two tokens — do not mix them up.** `-contrast` is the label ON
a filled intent; `-ink` is the intent used AS text on `--wr-color-surface` or on
its own `-soft` tint. In the dark theme the bare token is now unusable as text for
`primary` too (3.87:1 on the page background) — see the impossibility above; the
showcase learned this the hard way across 193 routes. The v11 deepening changed
the first half of that story and
not the second: a bare `--wr-color-<intent>` as text now clears AA on the plain
light surface for every intent but `warning` (1.71:1) — but
on its own `-soft` tint, which is where outlined / ghost / tinted variants
actually paint it, it still fails everywhere (1.60–4.17 in light, 3.65–4.84 in
dark). That tint is what `-ink` is calibrated against, so those variants take
`-ink` regardless of how the bare intent scores on white. `-ink` and
`-soft-contrast` are `color-mix`es toward `--wr-color-gray-6`, the ramp's ink
step, which is itself a `light-dark()` pair — so one declaration darkens in light
and lightens in dark. For muted prose the role alias `--wr-color-on-surface-muted`
is the answer, and v15 removed the trap that used to sit beside it: the `medium`
INTENT was a fill reading 4.63:1 on pure white and only 4.01:1 on the lightest
surface the library paints (`#ebeff4`), where the muted role still holds 4.63:1.
There is no longer a neutral intent to reach for by mistake. **Placeholder text reads `--wr-color-placeholder`**,
which is that role under the name of its job — every placeholder in the catalog
reads it, including the component hooks (`--wr-input-placeholder`,
`--wr-textarea-placeholder`), and `theme/styles.spec.ts` fails on one that reads
anything else, a hook defaulting to the muted role it equals today included. It replaced four strengths, the weakest an
`rgba(…, 0.7)` at 2.91:1, and no softer tier can exist under it: 4.5:1 needs
0.93 alpha on white and 0.98 on a readonly field's fill. `--wr-color-text-faint`
is decorative only and nothing in the library paints with it.
