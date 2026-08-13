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
    provider: "provideWrDateAdapter(wrDateFnsAdapter) // from 'ngwr/date-adapter-fns'",
    why: 'every date mode goes through an adapter; there is no built-in default',
  },
  {
    test: /^WrT$|^WrI18n/,
    provider: "provideWrI18n() + provideWrI18nStaticLoader({ en: wrEn }) // from 'ngwr/i18n'",
    why: 'the pipe and directive read from a catalog you provide',
  },
];

export { REQUIRED_PROVIDERS };
export type { RequiredProvider };
