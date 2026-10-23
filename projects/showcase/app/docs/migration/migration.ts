import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NGWR_PACKAGE } from '../package-spec';

import { DocCodeComponent, DocPageComponent, DocRichPipe, DocSectionComponent } from '#core/components';

/**
 * One row of a migration table. Cells take `code`, [links](/x) and **bold**
 * through `wrDocRich`.
 */
interface Change {
  readonly before: string;
  readonly after: string;
  /** What `ng update` does with it, for the majors that ship a migration. */
  readonly update?: string;
}

@Component({
  selector: 'ngwr-migration-page',
  templateUrl: './migration.html',
  imports: [NgTemplateOutlet, RouterLink, DocPageComponent, DocSectionComponent, DocCodeComponent, DocRichPipe],
})
export default class MigrationPageComponent {
  /** What `ng update ngwr` does for each major, newest first. */
  protected readonly majors: readonly Change[] = [
    {
      before: 'v15',
      after: 'Rewrites paths, config calls, `-rgb` reads, renamed tokens and two values, lists files for the rest.',
    },
    { before: 'v14', after: 'Rewrites six renames, lists files for the rest.' },
    { before: 'v13', after: 'Lists files with a host `id` selector, rewrites nothing.' },
    { before: 'v12', after: 'Rewrites the date import paths.' },
    { before: 'v10, v11', after: 'Nothing. Colour changes only.' },
    { before: 'v9', after: 'Rewrites `<wr-checkbox value>`.' },
    { before: 'v8', after: 'Rewrites density and pagination sizes, lists removed components.' },
    { before: 'v7', after: 'Rewrites tags, imports and `@use` paths.' },
  ];

  protected readonly recovery: readonly Change[] = [
    {
      before: '`ng update ngwr@7`, `@8` or `@9` failed with `exports is not defined in ES module scope`',
      after: '`migration-v7`, `-v8`, `-v9`: each one that failed, oldest first',
    },
    { before: '`ng update ngwr` hung on 14.5.0 or earlier', after: '`migration-v14`' },
    {
      before: 'You are on 15.0.0-rc.0 or rc.1, which shipped without a codemod',
      after: '`migration-v15`. The next `ng update ngwr` runs it too.',
    },
  ];

  /** What `migration-v15` does, before the tables say it per row. */
  protected readonly v15Codemod: readonly Change[] = [
    {
      before: 'Rewrites',
      after:
        'Chart, bit, `ngwr/drag-drop` and `ngwr/icon/adapters/lucide` paths. Config calls into one `provideWr()`. `rgba(var(--…-rgb), a)` into `color-mix()`. Reads of the renamed tokens. `tone="dark"`, `tone="medium"`, `<wr-timeline-item color="medium">`.',
    },
    {
      before: 'Lists files',
      after:
        "What needs your decision, by file and line: `@use 'ngwr'`, removed intents, `[data-theme]`, removed entry points and providers, the sortable list loop, validation copy.",
    },
    { before: 'Leaves alone', after: 'The behaviour and visual changes in the last two sections.' },
  ];

  protected readonly v15Providers: readonly Change[] = [
    { before: '`provideWrDensity(o)`', after: '`withDensity(o)` from `ngwr/density`', update: 'Rewrites' },
    { before: '`provideWrToastConfig(o)`', after: '`withToast(o)` from `ngwr/toast`', update: 'Rewrites' },
    { before: '`provideWrStorage(o)`', after: '`withStorage(o)` from `ngwr/storage`', update: 'Rewrites' },
    { before: '`provideWrMeta(o)`', after: '`withMeta(o)` from `ngwr/meta`', update: 'Rewrites' },
    { before: '`provideWrTheme(o)`', after: '`withTheme(o)` from `ngwr/theme`', update: 'Rewrites' },
    {
      before: '`provideWrDateAdapter(o)`',
      after: '`withDates(o)` from `ngwr/date`. Delete a call with no options.',
      update: 'Rewrites',
    },
    { before: '`provideWrOverlay()`', after: 'Delete. Isolated overlays are the default.', update: 'Lists files' },
    {
      before: '`WrDateAdapterOptions`, `ProvideWrStorageOptions`',
      after: '`WrDatesOptions`, `WrStorageOptions`',
      update: 'Rewrites',
    },
  ];

  protected readonly v15Paths: readonly Change[] = [
    {
      before: '`ngwr/bar-chart`, `calendar-heatmap`, `donut-chart`, `gauge`, `line-chart`, `meter-group`, `sparkline`',
      after: '`ngwr/charts/<name>`',
      update: 'Rewrites',
    },
    {
      before:
        '`ngwr/aurora`, `blur-text`, `border-glow`, `circular-text`, `click-spark`, `confetti`, `decrypt-text`, `falling-text`, `fuzzy-text`, `glitch-text`, `gradient-text`, `marquee`, `rotating-text`, `shiny-text`, `splash-cursor`, `split-text`, `spotlight-card`, `star-border`, `tilt-card`, `typewriter`, `waves`',
      after: '`ngwr/bits/<name>`',
      update: 'Rewrites',
    },
    { before: '`ngwr/drag-drop`', after: '`ngwr/sortable-list`', update: 'Rewrites' },
    { before: '`ngwr/icon/adapters/lucide`', after: '`ngwr/icon`', update: 'Rewrites' },
    {
      before: "`@use 'ngwr'`",
      after: "`@use 'ngwr/theme'` first, then one `@use` per entry point you render",
      update: 'Lists files',
    },
  ];

  protected readonly v15Tokens: readonly Change[] = [
    { before: '`--wr-color-light`, `--wr-color-outline`', after: '`--wr-border-base`', update: 'Rewrites reads' },
    { before: '`--wr-color-dark`', after: '`--wr-color-on-surface`', update: 'Rewrites reads' },
    {
      before: '`--wr-color-muted-text`, `--wr-color-medium`',
      after: '`--wr-color-on-surface-muted`',
      update: 'Rewrites reads',
    },
    {
      before: '`--wr-color-border`, `--wr-color-border-subtle`, `--wr-color-border-strong`',
      after: '`--wr-border-subtle`, or `--wr-border-base` for a firmer line',
      update: 'Rewrites reads, to the subtle one',
    },
    {
      before: '`--wr-color-white-contrast` (dark theme only)',
      after: '`--wr-color-on-surface`',
      update: 'Rewrites reads',
    },
    {
      before: 'Every `-rgb` token, e.g. `rgba(var(--wr-color-primary-rgb), 0.2)`',
      after: '`color-mix(in srgb, var(--wr-color-primary) 20%, transparent)`',
      update: 'Rewrites, lists what it cannot read',
    },
    {
      before: '`--wr-color-backdrop-rgb`',
      after: '`color-mix(in srgb, var(--wr-color-backdrop) 45%, transparent)`',
      update: 'Rewrites',
    },
    { before: '`--wr-calendar-accent-rgb`', after: '`--wr-calendar-accent`', update: 'Rewrites' },
    { before: '`--wr-color-picker-rgb`', after: '`--wr-color-picker-color`', update: 'Rewrites' },
    {
      before: 'The `-rgb` of a renamed token, e.g. `rgba(var(--wr-color-dark-rgb), 0.5)`',
      after: '`color-mix(in srgb, var(--wr-color-on-surface) 50%, transparent)`',
      update: 'Rewrites',
    },
    {
      before:
        '`color="secondary"`, `--wr-color-secondary-*`, and the colour, shades and classes of `light`, `medium`, `dark`',
      after: 'No replacement. Pick another intent or your own colour.',
      update: 'Lists files',
    },
    { before: 'Those four keys in `$base-colors`', after: 'Delete them', update: 'Lists files' },
  ];

  protected readonly v15Scheme: readonly Change[] = [
    {
      before:
        '`theme.dark-selector()`, `$theme-attribute`, the `attribute` option of `provideWrTheme()` and `wrThemePrePaintScript()`',
      after: 'Delete',
      update: 'Lists files',
    },
    { before: 'Reading `data-theme` in code', after: '`WrTheme.resolved()`', update: 'Lists files' },
    {
      before: '`wrThemeTokens()`, `wrIntentTokens()`, `wrContrastFor()`',
      after: '`$base-colors` or `theme.rebrand()`, at build time. See [Theming](/guides/theming).',
      update: 'Lists files',
    },
    {
      before: '`--wr-star-border-stop`',
      after: '`background` on `.wr-star-border .wr-star-border__ray`',
      update: 'Lists files',
    },
  ];

  protected readonly v15Components: readonly Change[] = [
    {
      before: '`<wr-sortable-list>` with an `<ng-template>`',
      after: 'Your own `@for` with one `<wr-sortable-item>` per row. `trackBy` is gone.',
      update: 'Rewrites the path, lists the loop',
    },
    {
      before: '`wrSquircle` from `ngwr/squircle`',
      after: '`shape="squircle"` on `wr-btn`, `wr-avatar`, `wr-badge`; the `theme.smooth-br()` mixin elsewhere',
      update: 'Lists files',
    },
    {
      before: '`<wr-action-sheet>`',
      after: '`<wr-drawer position="bottom" rounded>` with your own rows',
      update: 'Lists files',
    },
    {
      before: '`<wr-drawer showHandle>`, `.wr-drawer__handle`, `__grabber`, `.wr-drawer__panel--handle`',
      after: 'Delete. Swipe-to-dismiss is gone.',
      update: 'Lists files',
    },
    {
      before: '`responsive` on `wr-select`, `[wrDropdown]`, `[wrPopover]`, `wr-command-palette`, `WrDialog.open()`',
      after: 'Delete. For a sheet on phones, open a `<wr-drawer position="bottom">`.',
      update: 'Lists files',
    },
    {
      before: '`WrPopoverHarness.isSheet()`, `WrCommandPaletteHarness.isPresentedAsSheet()`',
      after: 'Delete',
      update: 'Lists files',
    },
    {
      before: '`<wr-editor format>`, `WrEditorFormat`',
      after: 'Delete. The value is a `WrEditorJson` tree, or `null` when empty.',
      update: 'Lists files',
    },
    {
      before: '`[wrTypography] tone="dark"`, `tone="medium"`',
      after: '`tone="base"`, `tone="muted"`',
      update: 'Rewrites',
    },
    {
      before: '`.wr-typography--tone-dark`, `--tone-medium`',
      after: '`.wr-typography--tone-base`, `--tone-muted`',
      update: 'Rewrites',
    },
    {
      before: '`<wr-timeline-item color="medium">`, `.wr-timeline-item--medium`',
      after: '`color="neutral"`, `.wr-timeline-item--neutral`',
      update: 'Rewrites',
    },
    {
      before: "`WrSidebarItem` `badge: 'new'`, `badge: '12'`",
      after: "`badge: { text: 'New', tone: 'primary' }` for a word, `count: 12` for a number",
      update: 'Lists files',
    },
    {
      before: '`WrSidebarGroup.children` holds `WrSidebarItem`s',
      after: "A child can be a group: check `'children' in child` before reading `url`, `disabled` or `activeOptions`",
      update: 'No',
    },
    {
      before: '`<wr-sidebar>` draws `folder` and `caret-forward` icons by default',
      after: 'No icons by default. Bind `defaultGroupIcon` and `defaultItemIcon` to keep them.',
      update: 'Lists files',
    },
    {
      before:
        '`.wr-sidebar__entry`, `__item`, `__group-toggle`, `__item-title`, `--active` and `--disabled` on the first two',
      after:
        '`.wr-sidebar__row`, `__title`, `.wr-sidebar__row--active`, `.wr-sidebar__row--disabled`; `.wr-sidebar__row--group` for `__group-toggle`',
      update: 'Lists files',
    },
    {
      before: '`--wr-sidebar-padding`',
      after: 'Unchanged. It was the only sidebar hook v14 published; the others are new.',
      update: 'Nothing to do',
    },
  ];

  protected readonly v15Removed: readonly Change[] = [
    {
      before: '`ngwr/config`: `provideWrConfig()`, `WR_CONFIG`, `useConfigValue()`',
      after: 'Bind the input where you want another value',
      update: 'Lists files',
    },
    {
      before: '`ngwr/media`: `WrMedia`, `provideWrMedia()`, `WR_BREAKPOINTS`',
      after: '`BreakpointObserver` from `@angular/cdk/layout`',
      update: 'Lists files',
    },
    {
      before: "`ngwr/markdown`, `@use 'ngwr/markdown'` and the `markdown.*` catalog keys",
      after: '`<wr-editor readonly [toolbar]="false">`',
      update: 'Lists files',
    },
    {
      before: '`ngwr/icon/adapters/feather`',
      after: "`svgIcon()` from `ngwr/icon`, with Feather's own SVG files",
      update: 'Lists files',
    },
    {
      before: "`provideWrResponsiveOverlays()`, `WR_RESPONSIVE_OVERLAYS`, `wrPresentAsSheet`, `@use 'ngwr/overlay'`",
      after: 'Delete',
      update: 'Lists files',
    },
    { before: '`WrVisualViewport`, `--wr-keyboard-inset`', after: '`window.visualViewport`', update: 'Lists files' },
  ];

  protected readonly v15Dates: readonly Change[] = [
    {
      before: '`ngwr/date/adapters/fns`, `ngwr/date/adapters/luxon`',
      after: 'The native adapter, or your own `WrDateAdapter<Date>` passed as `withDates({ adapter })`',
      update: 'Lists files',
    },
    {
      before: '`date-fns`, `luxon` as optional peers',
      after: 'No longer peers. Keep them only if your own code uses them.',
      update: 'No',
    },
    {
      before: 'Your own `WrDateAdapter<Date>` subclass, undecorated',
      after: 'Add `@Service()`, or dev mode warns',
      update: 'Lists files',
    },
    {
      before: 'Your own adapter handles six named formats',
      after:
        'Ten more `WrDateFormat` keys: the `12h`, `24h` and `Seconds` variants of `time` and `shortDateTime`, e.g. `time24hSeconds`. The date picker asks for them from `timeFormat` and `showSeconds`.',
      update: 'No',
    },
    { before: '`ng add ngwr --dateAdapter=…`', after: '`ng add ngwr`', update: 'No' },
    { before: '`wrDate` with no provider, `shortDate`: `3/15/26`', after: '`3/15/2026`', update: 'No' },
    { before: '`wrDate` with no provider, `time`: `2:30 PM`', after: '`02:30 PM`', update: 'No' },
    { before: "`wrDate` with no provider, `'dd.MM.yyyy'`: falls back to `shortDate`", after: 'Honoured', update: 'No' },
  ];

  /** Behaviour that changed under the same API: focus, names, number formats, layout. */
  protected readonly v15Behaviour: readonly Change[] = [
    {
      before: '`aria-sort` on every sorted `wr-table` column',
      after:
        'Only on the primary sort column. The others say `none` and show their rank as a number. Tests read `getSortIndicator()` and `getSortOrder()` from `ngwr/table/testing`.',
      update: 'No',
    },
    {
      before: 'Table row and group controls named by `aria-label`',
      after:
        '`aria-labelledby`: an action word plus the row\'s first cell (the tree column in a tree) or the group\'s label, e.g. "Select row Ada". `selectRowLabel`, `expandRowLabel`, `toggleRowLabel`, `selectGroupLabel` and `toggleGroupLabel` set only the action word.',
      update: 'No',
    },
    {
      before: 'Tab moves from option to option in the `<wr-cascader>` panel',
      after:
        'The arrows or a typed letter move, as in a tree, and Tab leaves the panel. `getTabIndex()` from `ngwr/cascader/testing` is `0` for one option only.',
      update: 'No',
    },
    {
      before: '`WrWindowManager.open()` leaves focus where it was',
      after:
        'Moves focus into the window and gives it back on close. Pass `autoFocus: false` for a window that opens in the background.',
      update: 'No',
    },
    {
      before: 'A drawer with `hasBackdrop` off is modal',
      after: 'Non-modal: no focus trap, no `aria-modal`, and the page keeps scrolling.',
      update: 'No',
    },
    {
      before: 'Chart numbers: English `5k`, the `lineChart.thousands` catalog key',
      after:
        '`Intl` in `LOCALE_ID`. Line-chart ticks and bar-chart labels are compact from a thousand up (`5K`, a bar of `12500` reads `13K`) unless the full numbers are shorter; tooltips never are. Drop the key from your catalogs. For another format, pass `valueFormat`, which every chart takes.',
      update: 'No',
    },
    {
      before: '`fill` on `.wr-line-chart__tick`, an SVG `<text>`',
      after: 'HTML beside the plot. Restyle it with `color` or the `--wr-line-chart-tick-*` hooks.',
      update: 'No',
    },
    {
      before: 'A `static` flex or grid parent of a `wrAffix`',
      after:
        '`position: relative` while an affix is in it, through `.wr-affix__container`. Its absolute children anchor to it and its `z-index` applies. A position you give it wins.',
      update: 'No',
    },
  ];

  protected readonly v14Rewrites: readonly Change[] = [
    { before: '`<wr-alert closeable>`', after: '`closable`' },
    { before: '`<wr-table [totalItems]>`', after: '`[total]`' },
    { before: '`<wr-pagination [(currentPage)]>`, `(currentPageChange)`', after: '`[(page)]`, `(pageChange)`' },
    { before: '`WrPaginationHarness.with({ currentPage })`', after: '`{ page }`' },
    { before: '`[isDisabledWhenLoading]`', after: '`[disabledWhenLoading]`' },
    {
      before: "`chromeSize: 'compact' | 'normal'`, `.wr-window--chrome-compact`",
      after: "`'sm' | 'md'`, `.wr-window--chrome-sm`",
    },
    { before: '`[wrInput] wrSize`', after: '`size`' },
  ];

  protected readonly v14Manual: readonly Change[] = [
    { before: "`WrWindowHarness.getChromeSize()`: `'compact'`", after: "`'sm'`" },
    {
      before: '`<wr-loading-bar>` follows the router on its own',
      after: 'Add `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router`',
    },
    {
      before: '`<wr-tab routerLink>`',
      after: 'Add `wrTabsRouting` on `<wr-tabs>` and `WrTabsRouting` from `ngwr/tabs/router`',
    },
    { before: '`pagination.of` key', after: '`pagination.range`, `pagination.compact`' },
    { before: '`<wr-pagination ofLabel>`', after: 'Delete' },
    {
      before: '`WR_DATE_LOCALE`, `WrI18n` locales follow the browser',
      after: 'Follow `LOCALE_ID`. `DEFAULT_WR_I18N_CONFIG` drops `defaultLocale`, `availableLocales`.',
    },
    {
      before: 'Named date formats parse through `new Date()`',
      after: 'Parse through `Intl` and refuse what they cannot read. For the old leniency, pass a token `[format]`.',
    },
  ];

  protected readonly v12: readonly Change[] = [
    { before: '`ngwr/date-adapter`', after: '`ngwr/date`', update: 'Rewrites' },
    { before: '`ngwr/date-adapter-fns`', after: '`ngwr/date/adapters/fns` (removed in v15)', update: 'Rewrites' },
    { before: '`ngwr/date-adapter-luxon`', after: '`ngwr/date/adapters/luxon` (removed in v15)', update: 'Rewrites' },
    {
      before: '`readI18nText()` returns `string`',
      after: '`Signal<string>`: read it as `label()`',
      update: 'No, the compiler finds each',
    },
  ];

  protected readonly v9: readonly Change[] = [
    { before: '`<wr-checkbox value>` in a group', after: '`checkboxValue`', update: 'Rewrites' },
    { before: 'Checkbox state', after: 'The `checked` model: `[(checked)]` or `[formField]`', update: 'No' },
    {
      before: '`lucideIcons({ chevronDown })` registers `chevron-down`',
      after: 'Registers `chevronDown`',
      update: 'No',
    },
    { before: '`WrColor`', after: 'Adds `info`. An exhaustive `switch` needs the case.', update: 'No' },
  ];

  protected readonly v8: readonly Change[] = [
    {
      before: 'Density `compact`, `default`, `comfortable`',
      after: '`sm`, `md` (the default), `lg`; `touch` unchanged',
      update: 'Rewrites',
    },
    { before: '`WrPaginationSize` `xs`, `xl`', after: '`sm`, `lg`', update: 'Rewrites' },
    { before: '`wrReveal`', after: 'Removed, no replacement', update: 'Lists files' },
    { before: '`<wr-scramble-text>`', after: '`<wr-decrypt-text>`', update: 'Lists files' },
  ];

  protected readonly v7: readonly Change[] = [
    { before: '`wr-autocomplete`, `wr-chips-input`', after: '`wr-select` with `mode`' },
    { before: '`wr-time-picker`, `wr-date-time-picker`', after: '`wr-date-picker`' },
    { before: '`wr-tooltip`', after: '`wr-popover`' },
    { before: '`wr-tree-select`', after: '`wr-tree`' },
    { before: '`wr-bottom-sheet`', after: '`wr-drawer`' },
    { before: '`wr-image`', after: '`wr-lightbox`' },
    { before: '`ngwr/tag`', after: '`ngwr/badge`' },
    { before: '`wr-animated-text`', after: '`wr-typewriter`, `wr-decrypt-text` or `wr-split-text`, per mode' },
  ];

  protected readonly snippets = {
    update: `ng update ${NGWR_PACKAGE}`,

    recover: `ng update ${NGWR_PACKAGE}
git commit -am "chore: update ngwr"
ng update ngwr --migrate-only --name=migration-v14`,

    v15Providers: `- provideWrDensity({ defaultDensity: 'sm' }),
- provideWrToastConfig({ duration: 6000 }),
+ provideWr(
+   withDensity({ defaultDensity: 'sm' }),
+   withToast({ duration: 6000 }),
+ ),`,

    v15Scheme: `- .hero { background: #fff; }
- [data-theme='dark'] .hero { background: #0b1120; }
+ .hero { background: light-dark(#fff, #0b1120); }

- .panel {
-   color: #111;
-   @include theme.dark { color: #eee; }
- }
+ .panel { color: light-dark(#111, #eee); }

- <html data-theme="dark">
+ <html style="color-scheme: dark">`,

    v15Sortable: `- import { WrSortableList } from 'ngwr/drag-drop';
+ import { WrSortableList, WrSortableItem } from 'ngwr/sortable-list';

  <wr-sortable-list [(items)]="rows">
-   <ng-template let-row let-i="index">
-     <div>{{ i + 1 }}. {{ row.label }}</div>
-   </ng-template>
+   @for (row of rows(); track row.id; let i = $index) {
+     <wr-sortable-item>{{ i + 1 }}. {{ row.label }}</wr-sortable-item>
+   }
  </wr-sortable-list>`,

    v15Removed: `# Breakpoints
- protected readonly isMd = inject(WrMedia).matches('md');
+ protected readonly isMd = toSignal(
+   inject(BreakpointObserver).observe('(min-width: 768px)').pipe(map(s => s.matches)),
+   { initialValue: false },
+ );

# Feather
# needs "loader": { ".svg": "text" } and declare module '*.svg?raw'
- provideWrIcons(featherIcons({ plus: featherSource.plus }));
+ import plusSvg from 'feather-icons/dist/icons/plus.svg?raw';
+ provideWrIcons([svgIcon('plus', plusSvg)]);`,

    v15Validation: `# On one rule
+ required(path.email, { message: 'Please fill this in.' });

# Or for every field, date picker included, in your own catalog
+ provideWrI18nStaticLoader({
+   en: {
+     validation: {
+       required: 'Please fill this in.',
+       minlength: 'Minimum length is {{requiredLength}}.',
+       dateFormat: 'Expected format: {{example}}',
+       minDate: 'Choose a later date.',
+       maxDate: 'Choose an earlier date.',
+       dateFilter: 'This date is not available.',
+     },
+   },
+ }),`,

    v14: `providers: [
  provideRouter(routes),
+   provideWrLoadingBarRouter(),
]

- <wr-tabs>
+ <wr-tabs wrTabsRouting>

- pagination: { of: 'von' }
+ pagination: {
+   range: '{{from}}–{{to}} von {{total}}',
+   compact: '{{current}} / {{total}}',
+ }`,

    v13: `- wr-checkbox#agree { margin: 0; }
+ #agree { margin: 0; }                  /* the input */
+ wr-checkbox:has(#agree) { margin: 0; }  /* the whole row */`,
  };
}
