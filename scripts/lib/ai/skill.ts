/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The generated agent skill: `skills/ngwr/SKILL.md` plus two reference files.
 *
 * Same source as `llms-full.txt` — one `collect()` in `gen/ai-assets.ts` feeds
 * both — so the catalog in the skill cannot drift from the catalog in the
 * package. That is the whole reason this is generated rather than written: a
 * hand-maintained skill is a fourth copy of the entry-point list, and the three
 * that already exist agree only because none of them is typed by hand.
 *
 * Progressive disclosure is the format's point, so SKILL.md stays short and
 * says what an agent gets WRONG about ngwr; the long tail (every entry point,
 * every provider) lives in `references/` and is read only when needed.
 *
 * Why a skill at all when `llms-full.txt` and the MCP server already ship: those
 * answer "what exists" and "what is the signature". Neither carries the dozen
 * rules that make the difference between code that compiles and code that works
 * — `wr-btn` not `wr-button`, `checkboxValue` not `value`, no
 * `ControlValueAccessor`, import from the entry point and not the barrel. An
 * agent finds those out by shipping something broken.
 */

import type { RequiredProvider } from '../../../projects/lib/mcp/providers';

/** Just enough of `gen/ai-assets.ts`'s `Entry` to render the catalog. */
interface SkillEntry {
  readonly name: string;
  /** `ngwr/select`, or `ngwr` for the root entry point. */
  readonly path: string;
  readonly selectors: readonly string[];
  readonly headline: string | undefined;
  readonly description: string;
}

interface SkillFile {
  /** Path relative to the skill root, e.g. `SKILL.md`. */
  readonly path: string;
  readonly content: string;
}

const DOCS = 'https://ngwr.dev';

/**
 * The frontmatter `description` is the only thing an agent reads before
 * deciding whether to load the skill, so it names the library, the framework
 * and the trigger rather than describing itself.
 */
function skillMd(entries: readonly SkillEntry[], providers: readonly RequiredProvider[], angular: string): string {
  // The secondary entry points only, the figure the docs site prints: the root
  // `ngwr` is in the catalog for `provideWr()`, and is not one of them.
  const secondary = entries.filter(e => e.path !== 'ngwr');
  const components = secondary.filter(e => e.selectors.length > 0).length;

  return `---
name: ngwr
description: Build Angular UIs with the ngwr component library (standalone, signals-first, zoneless). Use when adding, styling or debugging ngwr components — \`wr-*\` selectors, \`ngwr/*\` imports, \`provideWr()\` and its \`with*()\` features, \`--wr-*\` CSS custom properties — or when picking a component for an Angular app that already depends on ngwr.
---

# ngwr

An Angular ${angular} UI library: ${secondary.length} tree-shakable entry points, ${components} of them shipping a selector.
Standalone, signals-first, zoneless, \`ViewEncapsulation.None\`. No runtime
dependencies.

## Get the facts, do not guess

Four sources ship in the package or on the docs site, in the order worth
reaching for:

1. \`references/catalog.md\` in this skill — every entry point, its import line
   and its selector(s).
2. \`node_modules/ngwr/llms-full.txt\` — the same catalog plus every public
   export per entry point.
3. Any docs page as markdown: append \`.md\` to the URL, e.g.
   \`${DOCS}/reference/components/select.md\`.
4. \`npx -y -p ngwr ngwr-mcp\` — the bundled MCP server, when the agent speaks
   MCP: \`search_ngwr\`, \`get_ngwr_component\`, \`get_ngwr_api\`, \`get_ngwr_setup\`.

Exact input / output signatures are in the shipped \`.d.ts\` files. Do not invent
an input name; read one.

## The rules that are not guessable

These are the ones that compile and then behave wrong, or that a reasonable
guess gets backwards.

- **Import from the entry point, never a barrel.**
  \`import { WrSelect } from 'ngwr/select'\` — the root \`ngwr\` exports only
  \`provideWr()\`, and the subpath is what makes the library tree-shakable.
  Charts and bits are nested: \`ngwr/charts/<name>\` (\`ngwr/charts/bar-chart\`)
  and \`ngwr/bits/<name>\` (\`ngwr/bits/aurora\`).
- **App-wide configuration is ONE call.**
  \`provideWr(withDensity(), withToast({ … }), withTheme(), withDates(), withStorage(), withMeta())\`,
  with \`provideWr\` from \`ngwr\` and each feature from the entry point it
  configures (\`withDensity\` from \`ngwr/density\`, and so on). Every feature is
  optional. There is no \`provideWrDensity()\`, \`provideWrToastConfig()\`,
  \`provideWrConfig()\`, \`provideWrOverlay()\` or \`provideWrDateAdapter()\`:
  overlays and dates need no provider, and a \`size\` or \`rounded\` default is
  bound on the input.
- **Code written for v14 or older: run \`ng update ngwr\`.** It runs
  \`migration-v15\`, which rewrites the paths, the provider calls, the \`-rgb\`
  reads and the renamed token reads, and lists by file and line what needs a
  decision. ${DOCS}/docs/migration lists every change.
- **The selector is not always the entry point name.** The button is
  \`wr-btn\`, not \`wr-button\`. Check \`references/catalog.md\` before writing a tag.
- **Check for a MODE before reaching for another component.** The catalog is
  deliberately consolidated: \`wr-select\` covers single / multi / search / tag,
  \`wr-date-picker\` covers date / time / datetime, \`wr-popover\` has a tooltip
  mode, \`wr-drawer\` doubles as a bottom sheet (and, with \`hasBackdrop\` off,
  a non-modal side panel), \`wr-table\` owns pinning,
  resizing, grouping, tree rows, CSV export and virtual scroll.
- **There is no \`ControlValueAccessor\`.** Value components implement Signal
  Forms' \`FormValueControl\` / \`FormCheckboxControl\`. Bind
  \`[formField]="form.x"\`, or use the two-way model standalone —
  \`[(value)]\`, \`[(checked)]\`. \`[(ngModel)]\` and reactive forms still bind,
  with no accessor created: Angular's \`NgModel\` / \`FormControlDirective\` drive
  the \`value\` or \`checked\` model directly. That bridge does NOT apply template
  validator directives — \`required\`, \`minlength\`, \`maxlength\`, \`pattern\` or
  \`email\` on an ngwr control is silently ignored and the form submits — so put
  validators on the \`FormControl\`. It also ignores \`updateOn\`, and a
  \`{ emitEvent: false }\` write needs \`markForCheck()\`.
- **ngwr ships no validation copy.** For an error no \`<wr-form-error key>\`
  claims, \`<wr-form-field>\` shows the validator's own message
  (\`required(path.email, { message: '…' })\`), else \`validation.<key>\` from the
  APP's i18n catalog. With neither, nothing renders and only dev mode warns.
- **\`<wr-checkbox>\` group identity is \`checkboxValue\`, not \`value\`.**
  \`value\` is reserved for the form value, so a leftover \`value="x"\` lands on the
  host as a plain DOM attribute, every box in the group keeps the default
  identity \`null\`, and they all toggle together. No template error.
- **Styles are opt-in, global, and per entry point.** \`@use 'ngwr/theme'\` first,
  then \`@use 'ngwr/<name>'\` for each component a template renders. There is no
  \`@use 'ngwr'\`. Two kinds of sheet need a line though no template names them, and
  nothing warns without them: \`ngwr/density\` with \`withDensity()\` or
  \`[wrDensity]\` (density silently does nothing), and the sheet of a component
  a service opens — \`ngwr/dialog\` for \`WrDialog\`, \`ngwr/toast\` for
  \`WrToast\`, \`ngwr/drawer\` for \`WrDrawerManager\`, \`ngwr/window\` for
  \`WrWindowManager\`, \`ngwr/tour\` for \`WrTour\` (the panel renders unstyled).
  Components are \`ViewEncapsulation.None\`;
  their \`.wr-*\` BEM classes and \`--wr-*\` custom properties are PUBLIC API, so
  style against them rather than reaching into the DOM structure.
- **Five intents, and no neutral one.** An intent \`color\` (\`WrColor\`) is
  \`primary\`, \`success\`, \`warning\`, \`danger\` or \`info\`. There is no
  \`secondary\`, \`light\`, \`medium\` or \`dark\`: without \`strictTemplates\` a
  removed value renders neutral, and a \`var(--wr-color-medium)\` drops its
  whole declaration, both with no error.
  Neutrals are role tokens: \`--wr-color-surface\`, \`--wr-color-on-surface\`,
  \`--wr-color-on-surface-muted\`, \`--wr-border-base\`.
- **Theme through tokens, not overrides.** \`--wr-color-{intent}\` and its
  \`-contrast\` / \`-ink\` / \`-soft\` companions. \`-contrast\` is the label ON a
  filled intent; \`-ink\` is the intent used AS text. Using the bare intent as
  text fails WCAG AA on the soft tint in both themes.
- **Dark mode is \`color-scheme\` plus \`light-dark()\`.** There is no
  \`[data-theme]\`, so a \`[data-theme='dark']\` selector matches nothing: write
  your own dark values as \`light-dark(<light>, <dark>)\`. There are no \`-rgb\`
  tokens either: \`color-mix(in srgb, var(--wr-color-primary) 12%, transparent)\`,
  never \`rgba(var(--wr-color-primary-rgb), 0.12)\`.
- **Never hard-code user-facing text in a wrapper component.** Strings route
  through \`ngwr/i18n\`; every component takes overridable \`*Label\` inputs.
- **Prefer the library over hand-rolling.** \`ngwr/utils\` (coercion, dom,
  keyboard, id, css-size, math), \`ngwr/pipes\` (\`wrDate\`, \`wrBytes\`,
  \`wrTruncate\`, \`wrNumber\`, \`wrMark\`, \`wrPlural\`, \`wrRange\`) and
  \`ngwr/validators\` already exist.

## Setting a component up

\`\`\`bash
ng add ngwr                                          # prompts, installs peers, prints bootstrap
ng g ngwr:use WrSelect --path src/app/some.ts        # adds the import AND the @Component entry
ng g ngwr:provider icons                             # splices a provider into bootstrap
\`\`\`

\`--path\` is a NAMED option on \`ngwr:use\`; only the symbol is positional, and
passing the path bare fails with \`Unknown argument\`. It takes declarables only:
a service such as \`WrDialog\` is refused, since the import line would compile and
the \`imports\` entry would not — \`inject()\` it instead.

### Providers a component cannot work without

Each of these compiles fine and then does nothing, with no error naming the
cause.

${providers.map(p => `- \`${p.provider}\`\n  — ${p.why}\n  — needed by: ${describeTest(p.test)}`).join('\n')}

## Testing

Every control, overlay, chart and most bits ship a CDK harness at
\`ngwr/<entry>/testing\` — \`ngwr/select/testing\`,
\`ngwr/charts/bar-chart/testing\`. Use it instead of querying the DOM:

\`\`\`ts
const select = await loader.getHarness(WrSelectHarness);
await select.open();
await select.selectOption({ text: 'Angular' });
\`\`\`

A harness whose component opens a panel reaches that panel itself, scoped by
the id its trigger publishes, so it loads from the fixture like any other. Only
what a SERVICE opens — \`WrDialog\`, \`WrToast\`, \`WrDrawerManager\` — renders
outside the fixture: load those from
\`TestbedHarnessEnvironment.documentRootLoader(fixture)\`.

## Reference files

- \`references/catalog.md\` — every entry point with import line and selectors.
- \`references/setup.md\` — bootstrap, styles, theme, i18n, the date adapter.
`;
}

/**
 * Turn the provider table's regular expression back into names.
 *
 * The table matches symbols, and a raw `/^WrTPipe$|^WrTDirective$|…/` in a
 * document meant for reading is noise. This unpacks the shapes the table uses —
 * bare alternatives, or one `^Wr(A|B|…)` group; if a rule ever needs a
 * different one, it renders the source and stays honest rather than printing a
 * confident half-list.
 */
function describeTest(test: RegExp): string {
  const source = test.source;
  const grouped = /^\^Wr\(([A-Za-z|]+)\)$/.exec(source);
  if (grouped) return grouped[1].split('|').map(name => `\`Wr${name}\``).join(', ');

  const alternatives = source.split('|').map(part => part.replace(/[$^]/g, ''));
  if (alternatives.every(part => /^Wr[A-Za-z0-9]*$/.test(part))) {
    return alternatives.map(part => `\`${part}\``).join(', ');
  }
  return `symbols matching \`${source}\``;
}

function catalogMd(entries: readonly SkillEntry[]): string {
  const lines = [
    '# ngwr entry points',
    '',
    'Generated from the library source. Import from the subpath — there is no',
    'root barrel for components: the root `ngwr` exports only `provideWr()`.',
    '',
    '| Entry point | Import | Selector(s) |',
    '| --- | --- | --- |',
  ];

  for (const entry of entries) {
    const symbol = entry.headline ?? '…';
    const selectors = entry.selectors.length > 0 ? entry.selectors.map(s => `\`${s}\``).join(' ') : '—';
    lines.push(`| \`${entry.path}\` | \`import { ${symbol} } from '${entry.path}'\` | ${selectors} |`);
  }

  lines.push('', 'Descriptions and every public export per entry point:', '`llms-full.txt`, shipped in the same package.', '');
  return lines.join('\n');
}

/**
 * Every snippet below is hand-typed prose that ships to consumers, so it is the
 * one part of the skill that CAN drift from the library — nothing compiles it.
 * Keep each provider bullet a literal call an agent can paste: the density line
 * used to read `provideWrDensity('sm' | 'md' | 'lg' | 'touch')` — notation sitting
 * in an argument position, where the real signature takes
 * `Partial<WrDensityConfig>`. A bare string does not compile (TS2559); silence
 * that and it spreads into indexed characters, leaving `defaultDensity` at `md`.
 */
function setupMd(providers: readonly RequiredProvider[]): string {
  return `# Setting up ngwr

## Install

\`\`\`bash
ng add ngwr
\`\`\`

Prompts for styles and density, installs the peers, and prints a bootstrap
snippet tailored to the answers.

## Bootstrap

\`\`\`ts
import { lucideIcons, provideWrIcons } from 'ngwr/icon';
import { Check, ChevronDown } from 'lucide';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideWrIcons(lucideIcons({ check: Check, 'chevron-down': ChevronDown })),
  ],
});
\`\`\`

ngwr's overlays render into their OWN CDK overlay container with no provider,
which is what keeps them from colliding with Material or NG-ZORRO in the same
app.

## Styles

\`\`\`scss
@use 'ngwr/theme';    // the token layer — first, and the only configurable load
@use 'ngwr/button';   // then one line per component you render
@use 'ngwr/density';  // only with withDensity() or [wrDensity]
@use 'ngwr/dialog';   // a component a service opens — WrDialog here
\`\`\`

There is no \`@use 'ngwr'\` umbrella: compiling every component stylesheet for a
page that renders a handful was measured at 287 kB against 44 kB. Only a
module's FIRST load can be configured, so the theme line goes above the
components or \`@use 'ngwr/theme' with ($base-colors: …)\` fails the build.

A component's sheet brings the sheets of what it renders inside, so
\`ngwr/table\` alone styles its checkboxes and pager. What no template names
needs a line of its own, and nothing warns without it:

- \`ngwr/density\`, the only sheet that declares the \`--wr-density-*\`
  multipliers. Without it \`withDensity()\` and \`[wrDensity]\` do nothing.
- The sheet of a component a service opens: \`ngwr/dialog\` for \`WrDialog\`,
  \`ngwr/toast\` for \`WrToast\`, \`ngwr/drawer\` for \`WrDrawerManager\`,
  \`ngwr/window\` for \`WrWindowManager\`, \`ngwr/tour\` for \`WrTour\`.

Resolved through the \`sass\` condition in the package's \`exports\` map. Entry
points that ship no stylesheet (the root \`ngwr\`, the \`/testing\` harnesses,
\`ngwr/utils\`) have no \`@use\` target — importing one fails the build.

### Optional sheets

No component needs these:

- \`@use 'ngwr/reset';\` — a modern CSS reset.
- \`@use 'ngwr/grid';\` — a 12-column grid and container.
- \`@use 'ngwr/typography-utilities';\` — text utility classes.
- \`@use 'ngwr/breakpoints' as bp;\` — \`media-up\` / \`media-down\` mixins for
  your own SCSS.
- \`@use 'ngwr/animations';\` — keyframes and animation classes. The animation
  COMPONENTS are the \`ngwr/bits/*\` entry points.

\`ngwr/reset\`, \`ngwr/typography-utilities\` and \`ngwr/animations\` load the
theme, so like a component line they go below a configured
\`@use 'ngwr/theme' with (…)\`. Above it the build fails with "This module was
already loaded".

## Light and dark

The theme follows \`color-scheme\`, with no provider and no script: \`:root\`
declares \`color-scheme: light dark\`, so a page follows the OS, and every token
that differs between the two is one \`light-dark(<light>, <dark>)\` value.
\`color-scheme: dark\` on any element switches that subtree.
\`inject(WrTheme).set('dark')\` from \`ngwr/theme\` switches the whole page and
remembers the choice; \`'light'\` forces the other side and \`'auto'\` hands it
back to the OS. The service applies a remembered choice, or a non-\`auto\`
\`defaultMode\` passed to \`withTheme()\`, when it is first injected, and
\`provideWr(withTheme())\` injects it at boot; without that, a page whose first
screen never injects it paints the OS scheme. Ship \`wrThemePrePaintScript()\`
in \`<head>\` with the same values to apply the choice before first paint.
A canvas cannot draw a \`light-dark()\` value: resolve its colours with
\`resolveCssColor()\` and redraw a still frame from \`watchColorScheme()\`, both
in \`ngwr/utils\`.
Write your own dark values with \`light-dark()\` as well — there is no theme
attribute to key a selector on.

Browsers: Chrome 123, Firefox 120, Safari 17.5 or newer, since the theme
tokens are \`light-dark()\` values.

## Providers with no default

${providers.map(p => `### \`${p.provider}\`\n\n${p.why[0].toUpperCase()}${p.why.slice(1)}. Needed by ${describeTest(p.test)}.\n`).join('\n')}
## Optional, app-wide

App-wide options are features of ONE \`provideWr()\` call from \`ngwr\`, each
imported from the entry point it configures, so an app bundles only the ones it
uses. Each feature goes in once; in dev mode a repeat throws.

\`\`\`ts
import { provideWr } from 'ngwr';
import { withDates } from 'ngwr/date';
import { withDensity } from 'ngwr/density';

bootstrapApplication(App, {
  providers: [provideWr(withDensity({ defaultDensity: 'sm' }), withDates({ locale: 'fr' }))],
});
\`\`\`

- \`withDensity({ defaultDensity: 'sm' })\` from \`ngwr/density\` — one control
  size for the whole app; \`'sm' | 'md' | 'lg' | 'touch'\`. It scales the
  paddings of the ten stylesheets that read the multipliers — button, input,
  textarea, select, cascader, tree, list, table, badge/tag, editor — so
  \`touch\` grows those together. A control with fixed geometry (checkbox,
  switch, radio, slider, rating, segmented) does not move; its ≥44px target
  comes from the \`touch-target\` mixin under \`@media (pointer: coarse)\`
  instead. It needs \`@use 'ngwr/density'\`: without that sheet the density is
  written to \`<html>\` and nothing reads it. On a prerendered page, ship
  \`wrDensityPrePaintScript()\` in \`<head>\` with the same values, as for the
  theme, so a stored density applies before first paint.
- \`withDates({ locale: 'fr' })\` from \`ngwr/date\` — pins the dates to another
  locale. The calendar, the date pickers and the event calendar need no
  provider: they run on the native adapter (\`Date\` and \`Intl\`) in
  \`LOCALE_ID\`. Another date library: subclass \`WrDateAdapter\`, decorate it
  with \`@Service()\` and pass it as \`{ adapter: MyDateAdapter }\`. Its
  \`format\` and \`parse\` handle every \`WrDateFormat\` key, the \`12h\`, \`24h\`
  and \`Seconds\` variants of \`time\` and \`shortDateTime\` included. The one
  feature that also works in a route's \`providers\`, for that subtree.
- \`withTheme({ defaultMode: 'dark' })\` from \`ngwr/theme\` — the default
  scheme and its storage key, and \`WrTheme\` created at boot.
- \`withToast({ … })\` from \`ngwr/toast\`, \`withStorage({ … })\` from
  \`ngwr/storage\` and \`withMeta({ … })\` from \`ngwr/meta\` — toast defaults,
  the storage engine, prefix and TTL, and \`<head>\` defaults for every route.
  Like density and theme they configure a root service, so they belong at
  bootstrap.
- A \`validation\` namespace in your own i18n catalog — ngwr ships no validation
  copy. \`<wr-form-field>\` reads \`validation.<key>\` for an error whose validator
  carries no \`{ message }\`, with the error payload as params.
`;
}

function renderSkill(
  entries: readonly SkillEntry[],
  providers: readonly RequiredProvider[],
  angular: string
): readonly SkillFile[] {
  return [
    { path: 'SKILL.md', content: skillMd(entries, providers, angular) },
    { path: 'references/catalog.md', content: catalogMd(entries) },
    { path: 'references/setup.md', content: setupMd(providers) },
  ];
}

export { renderSkill };
export type { SkillEntry, SkillFile };
