/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Providers a symbol cannot work without.
 *
 * Hard-coded, and the list is short on purpose: these are the four cases where
 * the component compiles, renders nothing useful, and gives no error that names
 * the cause. Everything else is discoverable from the docs page.
 *
 * It sits in its own file because two things ship it: `get_ngwr_setup` in the
 * MCP server, and the generated agent skill (`scripts/gen-ai-assets.ts`), which
 * writes the same four rules into `skills/ngwr/SKILL.md`. One table, imported
 * twice — the alternative is two lists that agree until one of them is edited.
 */
interface RequiredProvider {
  /** Matched against a symbol name, e.g. `WrSelect`. */
  readonly test: RegExp;
  readonly provider: string;
  readonly why: string;
}

const REQUIRED_PROVIDERS: readonly RequiredProvider[] = [
  {
    test: /^Wr(Dialog|Drawer|Toast|Popover|Popconfirm|ContextMenu|Select|Dropdown|CommandPalette|Cascader|Mention|DatePicker|Tour|Lightbox)/,
    provider: "provideWrOverlay() // from 'ngwr/overlay'",
    why: 'overlays render into an ngwr-owned container; without it they never appear',
  },
  {
    test: /^WrIcon/,
    provider: "provideWrIcons(lucideIcons({ … })) // from 'ngwr/icon' + 'ngwr/icon/adapters/lucide'",
    why: 'icons resolve by name from a registry you populate',
  },
  {
    test: /^WrDatePicker|^WrCalendar|^WrEventCalendar/,
    // The one-line wrapper, not `provideWrDateAdapter({ adapter: WrDateFnsAdapter })`:
    // both compile, but this is one import from one entry point, and it is the form
    // the docs recommend. It used to read `provideWrDateAdapter(wrDateFnsAdapter)`,
    // which is wrong three ways at once — `ngwr/date/adapters/fns` exports neither
    // identifier, and the real `provideWrDateAdapter` takes an options object.
    provider: "provideWrDateFnsAdapter() // from 'ngwr/date/adapters/fns'",
    why: 'every date mode goes through an adapter; there is no built-in default',
  },
  {
    // The bar itself needs no provider — `start()` / `complete()` work bare — so
    // the rule names the ROUTER half, which is exactly the table's criterion: the
    // component compiles, renders, and sits at 0% forever with nothing naming the
    // cause. The subscription is opt-in because it is what pulls
    // `@angular/router` into a bundle, and this project's own site shipped a dead
    // bar for the length of one release by missing it.
    test: /^WrLoadingBar/,
    provider: "provideWrLoadingBarRouter() // from 'ngwr/loading-bar/router'",
    why: 'without it the bar never responds to navigation; it only moves for manual start() / complete()',
  },
  {
    // Spelled out rather than `^WrT(Pipe|Directive)$`: `describeTest` in the
    // skill generator only names alternatives that are bare symbols, so a group
    // here would print "symbols matching …" instead of the two names. It used to
    // read `^WrT$`: `WrT` is a symbol ngwr has never exported, and anchored at
    // both ends it matched neither `WrTPipe` nor `WrTDirective` — so the one rule
    // whose `why` names the pipe and the directive fired for neither of them.
    test: /^WrTPipe$|^WrTDirective$|^WrI18n/,
    // Two entry points, and the comment has to say so: the catalog `wrEn` is
    // `ngwr/i18n/en`, not `ngwr/i18n`, which exports neither catalog.
    provider: "provideWrI18n() + provideWrI18nStaticLoader({ en: wrEn }) // from 'ngwr/i18n' + 'ngwr/i18n/en'",
    why: 'the pipe and directive read from a catalog you provide',
  },
];

export { REQUIRED_PROVIDERS };
export type { RequiredProvider };
