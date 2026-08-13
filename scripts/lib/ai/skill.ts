/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * The generated agent skill: `skills/ngwr/SKILL.md` plus two reference files.
 *
 * Same source as `llms-full.txt` — one `collect()` in `gen-ai-assets.ts` feeds
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

/** Just enough of `gen-ai-assets.ts`'s `Entry` to render the catalog. */
interface SkillEntry {
  readonly name: string;
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
  const components = entries.filter(e => e.selectors.length > 0).length;

  return `---
name: ngwr
description: Build Angular UIs with the ngwr component library (standalone, signals-first, zoneless). Use when adding, styling or debugging ngwr components — \`wr-*\` selectors, \`ngwr/*\` imports, \`provideWr*\` providers, \`--wr-*\` CSS custom properties — or when picking a component for an Angular app that already depends on ngwr.
---

# ngwr

An Angular ${angular} UI library: ${entries.length} tree-shakable entry points, ${components} of them shipping a selector.
Standalone, signals-first, zoneless, \`ViewEncapsulation.None\`. One runtime
dependency (\`tslib\`).

## Get the facts, do not guess

Four sources ship in the package or on the docs site, in the order worth
reaching for:

1. \`references/catalog.md\` in this skill — every entry point, its import line
   and its selector(s).
2. \`node_modules/ngwr/llms-full.txt\` — the same catalog plus every public
   export per entry point.
3. Any docs page as markdown: append \`.md\` to the URL, e.g.
   \`${DOCS}/reference/components/select.md\`.
4. \`npx ngwr-mcp\` — the bundled MCP server, when the agent speaks MCP:
   \`search_ngwr\`, \`get_ngwr_component\`, \`get_ngwr_api\`, \`get_ngwr_setup\`.

Exact input / output signatures are in the shipped \`.d.ts\` files. Do not invent
an input name; read one.

## The rules that are not guessable

These are the ones that compile and then behave wrong, or that a reasonable
guess gets backwards.

- **Import from the entry point, never a barrel.**
  \`import { WrSelect } from 'ngwr/select'\` — there is no \`ngwr\` root export for
  components, and the subpath is what makes the library tree-shakable.
- **The selector is not always the entry point name.** The button is
  \`wr-btn\`, not \`wr-button\`. Check \`references/catalog.md\` before writing a tag.
- **Check for a MODE before reaching for another component.** The catalog is
  deliberately consolidated: \`wr-select\` covers single / multi / search / tag,
  \`wr-date-picker\` covers date / time / datetime, \`wr-popover\` has a tooltip
  mode, \`wr-drawer\` doubles as a bottom sheet, \`wr-table\` owns pinning,
  resizing, grouping, tree rows, CSV export and virtual scroll.
- **There is no \`ControlValueAccessor\`.** Value components implement Signal
  Forms' \`FormValueControl\` / \`FormCheckboxControl\`. Bind
  \`[formField]="form.x"\`, or use the two-way model standalone —
  \`[(value)]\`, \`[(checked)]\`. \`[(ngModel)]\` and reactive forms still work:
  Angular 22 synthesises the accessor.
- **\`<wr-checkbox>\` group identity is \`checkboxValue\`, not \`value\`.**
  \`value\` is reserved for the form value, so a leftover \`value="x"\` lands on the
  host as a plain DOM attribute, every box in the group keeps the default
  identity \`null\`, and they all toggle together. No template error.
- **Styles are opt-in and global.** \`@use 'ngwr'\` for everything, or
  \`@use 'ngwr/<name>'\` per component. Components are \`ViewEncapsulation.None\`;
  their \`.wr-*\` BEM classes and \`--wr-*\` custom properties are PUBLIC API, so
  style against them rather than reaching into the DOM structure.
- **Theme through tokens, not overrides.** \`--wr-color-{intent}\` and its
  \`-contrast\` / \`-ink\` / \`-soft\` companions. \`-contrast\` is the label ON a
  filled intent; \`-ink\` is the intent used AS text. Using the bare intent as
  text fails WCAG AA on the soft tint in both themes.
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
ng g ngwr:provider overlay                           # splices a provider into bootstrap
\`\`\`

\`--path\` is a NAMED option on \`ngwr:use\`; only the symbol is positional, and
passing the path bare fails with \`Unknown argument\`.

### Providers a component cannot work without

Each of these compiles fine and then does nothing, with no error naming the
cause.

${providers.map(p => `- \`${p.provider}\`\n  — ${p.why}\n  — needed by: ${describeTest(p.test)}`).join('\n')}

## Testing

Every control, overlay, chart and most animations ship a CDK harness at
\`ngwr/<name>/testing\`. Use it instead of querying the DOM:

\`\`\`ts
const select = await loader.getHarness(WrSelectHarness);
await select.open();
await select.selectOption({ text: 'Angular' });
\`\`\`

Overlay panels render into the overlay container, NOT the fixture — provide
\`provideWrOverlay()\` in the test and load those harnesses from
\`TestbedHarnessEnvironment.documentRootLoader(fixture)\`.

## Reference files

- \`references/catalog.md\` — every entry point with import line and selectors.
- \`references/setup.md\` — bootstrap, styles, theme, i18n, date adapters.
`;
}

/**
 * Turn the provider table's regular expression back into names.
 *
 * The table matches symbols, and a raw `/^Wr(Dialog|Drawer|…)/` in a document
 * meant for reading is noise. This unpacks the one shape the table uses; if a
 * rule ever needs a different one, it renders the source and stays honest
 * rather than printing a confident half-list.
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
    'root barrel for components.',
    '',
    '| Entry point | Import | Selector(s) |',
    '| --- | --- | --- |',
  ];

  for (const entry of entries) {
    const symbol = entry.headline ?? '…';
    const selectors = entry.selectors.length > 0 ? entry.selectors.map(s => `\`${s}\``).join(' ') : '—';
    lines.push(`| \`ngwr/${entry.name}\` | \`import { ${symbol} } from 'ngwr/${entry.name}'\` | ${selectors} |`);
  }

  lines.push('', 'Descriptions and every public export per entry point:', '`llms-full.txt`, shipped in the same package.', '');
  return lines.join('\n');
}

function setupMd(providers: readonly RequiredProvider[]): string {
  return `# Setting up ngwr

## Install

\`\`\`bash
ng add ngwr
\`\`\`

Prompts for styles, date adapter, density and theme, installs the peers, and
prints a bootstrap snippet tailored to the answers.

## Bootstrap

\`\`\`ts
import { provideWrTheme } from 'ngwr/theme';
import { provideWrOverlay } from 'ngwr/overlay';
import { provideWrIcons } from 'ngwr/icon';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideWrTheme(),
    provideWrOverlay(),
    provideWrIcons(lucideIcons({ check, chevronDown })),
  ],
});
\`\`\`

\`provideWrOverlay()\` gives ngwr its OWN CDK overlay container, which is what
keeps it from colliding with Material or NG-ZORRO in the same app. It also
installs \`WrVisualViewport\`, which publishes \`--wr-keyboard-inset\`.

## Styles

\`\`\`scss
@use 'ngwr';          // everything
@use 'ngwr/button';   // or one entry point at a time
\`\`\`

Resolved through the \`sass\` condition in the package's \`exports\` map. Entry
points that ship no stylesheet (the \`/testing\` harnesses, \`ngwr/utils\`) have no
\`@use\` target — importing one fails the build.

## Providers with no default

${providers.map(p => `### \`${p.provider}\`\n\n${p.why[0].toUpperCase()}${p.why.slice(1)}. Needed by ${describeTest(p.test)}.\n`).join('\n')}
## Optional, app-wide

- \`provideWrConfig({ button: { size: 'sm' } })\` — component defaults. A bound
  value always wins, including a bound \`false\` over a configured \`true\`.
- \`provideWrDensity('sm' | 'md' | 'lg' | 'touch')\` — one control size for the
  whole app; \`touch\` enlarges every hit area at once.
- \`provideWrResponsiveOverlays()\` — overlays present as bottom sheets under the
  breakpoint (640px by default). Per-component opt-out with \`[responsive]="false"\`.
- \`provideWrFormErrors({ … })\` — one place for validation copy; \`<wr-form-field>\`
  resolves a message per error key through it, then the i18n catalog, then a
  built-in fallback.
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
