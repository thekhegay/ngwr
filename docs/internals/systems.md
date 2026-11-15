# Cross-cutting systems

Part of [AGENTS.md](../../AGENTS.md). Read this before changing a cross-cutting system.

## Cross-cutting systems

These live in their own entry points — an agent won't find them by mirroring
one component folder. Reach for them instead of hand-rolling:

- **App-wide configuration is ONE call since v15: `provideWr(...features)`**,
  in the shape Angular gives `provideRouter(routes, withX())` —
  `provideWr(withDensity(), withToast({ duration: 6000 }), withTheme(), withDates(), withStorage(), withMeta(), withWindows())`.
  `provideWr` is the only export of the ROOT entry point
  (`projects/lib/provide-wr.ts`, re-exported by `public-api.ts`): it flattens
  the features through `makeEnvironmentProviders`, works at bootstrap and in a
  route's `providers`, and throws in dev mode when one feature kind is passed
  twice. Each `withX()` lives in the entry point it configures, and the
  `WrFeature` type with its `wrFeature(kind, providers)` builder lives in
  `ngwr/utils`, so no secondary entry point imports the root one
  (`package.spec.ts` fails on a shipped source that does). Features and
  not one options object, because an object that can configure everything has
  to import everything: a feature is a function, and the ones an app does not
  import are not bundled. The five `provideWrX()` config functions it replaced
  — density, toast config, storage, meta, date adapter — were deleted outright.
  What stays its own call is what chains or costs an import:
  `provideWrIcons()`, the i18n providers and `provideWrLoadingBarRouter()`. A
  new app-wide setting is a `withX()` in its own entry point, never a new
  `provideWrX()` and never a key on `provideWr`. A feature that configures a
  ROOT service (`withDensity`, `withToast`, `withTheme`, …) is read once from
  the root injector, so in a route it does nothing — only `withDates()` scopes
  to a route, and `withToast()` warns in dev mode.
- **Overlays** (`ngwr/overlay`) — isolated from every other CDK consumer with
  no call since v15: `WR_OVERLAY_CONTAINER` and `WR_OVERLAY` are root tokens
  whose DEFAULT factories build a `WrOverlayContainer` (tagged
  `.wr-overlay-container`) and a fresh CDK `Overlay` bound to it in a child
  injector, while CDK's own root `Overlay` / `OverlayContainer` stay untouched
  for Material, NG-ZORRO and plain CDK code. `provideWrOverlay()` made that
  opt-in and is gone: an app that never called it shared NG-ZORRO's container,
  which is the collision that decided it. **A new overlay injects `WR_OVERLAY`,
  never CDK's `Overlay`** — CDK's lands it in the shared container, and nothing
  fails to say so. Overlays always float: v15 deleted the responsive bottom
  sheet (`provideWrResponsiveOverlays()`, `wrPresentAsSheet` and the
  `responsive` switch on five overlays) for the reason the Mobile primitives
  bullet gives, and a sheet on a phone is a bottom `wr-drawer` the app opens
  itself. **Every open overlay follows a runtime
  direction change through
  `wrFollowDirection(overlayRef, dir, injector, reposition?)`** — the CDK reads
  the direction once, as a string, when the overlay is created and never looks
  again, so a new overlay calls this right after `overlay.create(...)`, passing
  the callback when its own position list is direction-dependent
  (`wrMirrorOffsets`). **An anchored panel takes the one set of twelve
  positions, `WrAnchoredPosition`, and builds its CDK list with
  `wrAnchoredPositions(position, { gap, paneClass })`** — `wr-popover`,
  `wr-dropdown` and `wr-popconfirm` share the geometry and the flip chains, and
  their own position types are aliases of it. A host only picks whether its gap
  is a CDK offset (`gap`) or pane padding, and whether the links carry the
  placement class (`paneClass`) or the host writes it. **Whether global toasts
  paint over an overlay is
  `WrOverlayOrder`, never a z-index** — the top layer is ordered by promotion
  time only, and the toast host re-promotes itself on a `show()` and when an
  overlay joins the container, but only if something joined the top layer since
  its last move (`order.add`, a `beforetoggle` or `fullscreenchange` on the
  document, a node added to the container) and once a frame at most, so a
  storm of toasts moves nothing. An overlay that takes a
  `toasts: 'above' | 'below'` option (dialog, drawer) calls
  `order.add(overlayRef.hostElement, toasts)` right after `attach()` and
  subscribes the returned function to `detachments()`. The registry leaves the
  toast host alone while it sits right under the covering overlays, and
  otherwise promotes it and then them again, with every host attached after
  the first of them, in one task and with focus given back if it moved. With
  overlays stacked the newest decides: a covering overlay under an `'above'`
  one cannot go over the toasts without going over that one too.
- **Icons** (`ngwr/icon`) — `WrIcon` (`<wr-icon name="…">`) +
  `provideWrIcons(wrLucideIcons({…}))`. Both ways in live in `ngwr/icon` itself:
  `wrLucideIcons()` / `wrLucide()` for **lucide only**, the one set whose package
  ships no SVG files (its exports are `[tag, attrs]` node arrays), and
  `wrSvgIcon()` from the raw SVG for every other set — feather, tabler, phosphor,
  heroicons, iconoir, radix, bootstrap. **v15 deleted both
  `ngwr/icon/adapters/*` entry points**: lucide's moved into `ngwr/icon` under
  the same names, and feather's went without a replacement, because feather
  ships plain SVG files in `dist/icons/` and its helper only wrapped the inner
  markup of `icons.json` in the root those files already carry. No icon set is
  a dependency: the app imports the icon data, and the converter only turns
  lucide's node arrays into SVG strings. The svg-only `/icons/<set>` showcase
  catalogs, feather's included, are generated by `scripts/build/icon-sets.mjs`
  into a gitignored folder.
- **i18n** (`ngwr/i18n`) — the `wrT` pipe + `[wrT]` directive, `WrI18n` service,
  `provideWrI18n()` + `provideWrI18nStaticLoader()`; ngwr's own catalogs at
  **twenty-two catalogs**, one entry point each (`ngwr/i18n/de`, `ngwr/i18n/ja`,
  …), so an app pays only for the languages it imports, and registered through
  `provideWrI18nBaseCatalogs()`, never spread into the app's (a spread is
  shallow, so a shared namespace silently keeps one side). Codes are LANGUAGES
  wherever a language is one thing, because the resolver truncates a region to
  its language and never the reverse — `pt-BR` finds `pt`, while a bare `de`
  would never reach a `de-DE`; a region appears only where the script differs
  (`zh` is Simplified, `zh-TW` Traditional, and `zh-HK` / `zh-Hant` need mapping
  by hand). Every catalog is held to the English key set, to its placeholder
  set, and to being written in its own script by one shared
  `expectCatalogContract` in `i18n/catalog-contract.ts` — `en` and `ru` from
  their own specs, the other twenty from one table in `i18n/catalogs.spec.ts`,
  which also fails on a locale folder the table does not name. The contract is
  **not a `.spec.ts`, and that is load-bearing**:
  a file that is both a suite and a module other specs import gets its own
  `describe` attributed to whichever importer ran first, and vitest then
  reports "No test suite found" for the file itself. It stays out of the
  package through `tsconfig.lib.json`'s `exclude`, which `package.spec.ts`
  READS rather than restating, so the two cannot disagree.
  What no assertion covers is the thing most likely to be wrong: there is no
  plural machinery anywhere here, so a count has to be worded correctly for
  every value in languages with three or six plural forms, and only English
  morphology makes that mechanically visible. **Since v14 there is ONE locale
  source and it is Angular's
  `LOCALE_ID`** — `WrI18n`'s `defaultLocale` and `availableLocales`, and
  `WR_DATE_LOCALE` on the date side, all resolve through it rather than through
  `navigator.language` or a literal `'en'`, so an app that sets `LOCALE_ID`
  correctly stops formatting dates in whatever language the visitor's browser
  happens to be. Reach for `navigator.language` only by writing it explicitly.
- **`ngwr/config` is gone (v15).** `provideWrConfig()`, `WR_CONFIG` and
  `useConfigValue()` are removed because ngwr does not ship app-wide default
  overrides: `size` and `rounded` take the concrete default written in their
  `input()`, and the template reads the input directly. Do not bring back a config provider that fills a nullable input; an
  app that wants another value binds it, or wraps the component in its own. One
  thing is not that pattern and stays: the `*Label` inputs, which `useI18nText`
  fills from the catalog (see Strings & i18n).
- **Density** (`ngwr/density`) — `provideWr(withDensity())`, the `[wrDensity]`
  directive, `WrDensity` service; values sm / md / lg / touch
  drive the `--wr-density-*` multipliers. The feature also creates `WrDensity`
  at boot, which is what writes `[data-wr-density]` on `<html>`.
- **Breakpoints** (SCSS) — the mixin API via `@use 'ngwr/breakpoints'`
  (`media-up` / `media-down`). v15 removed the TypeScript service with
  `ngwr/media`: nothing in the library read it, and an app wanting a breakpoint
  signal uses the CDK's `BreakpointObserver` or `matchMedia` itself.

- **Date adapters** (`ngwr/date`) — `WrDateAdapter` powers the calendar, the
  event calendar and every date-picker mode, and since v15 it needs no provider:
  injected with nothing provided, it resolves to `WrNativeDateAdapter`, over
  `Date` and `Intl`, in the locale `wrDateLocale()` holds. That is a signal with
  a stated order: `withDates({ locale })` is a pin and wins; else
  `WrI18n.locale()` when the app calls `provideWrI18n()`, so dates follow
  `use()` (16.1); else `LOCALE_ID`. `ngwr/date` does not import `ngwr/i18n`:
  `provideWrI18n()` provides the locale signal as `WR_LIVE_LOCALE`, a token in
  `ngwr/utils`, and `wrDateLocale()` injects it as optional. `WR_DATE_LOCALE`
  stays a plain string, the pin or `LOCALE_ID`, and the internal
  `WR_DATE_LOCALE_PINNED` says which, so a bare provider of `WR_DATE_LOCALE` is
  a fallback and not a pin. The native adapter keeps its formatters, parsers
  and names per locale and drops them when it moves. Numbers (`wrNumber`,
  `wr-input-number`, …) still read `LOCALE_ID` and do not follow.
  `provideWr(withDates({ locale, timeZone, adapter }))` is for a pinned locale,
  a display time zone or an adapter of the app's own, and the one feature that also works in a route's
  `providers`, where it gives that subtree an adapter of its own. **The base
  class and the native one share one module, and that is load-bearing**: the base's injectable default names the
  subclass, so with each in its own file the base would import the file that
  extends it — an ES-module cycle that breaks at evaluation. Do not split them.
  `WrNativeDateAdapter` is the only implementation ngwr ships. **v15 deleted
  `ngwr/date/adapters/{fns,luxon}`** and the `date-fns` / `luxon` optional
  peers with them: an app on another date library extends `WrDateAdapter` and
  passes the class as `withDates({ adapter })`. Its `format` and `parse` have to
  handle every `WrDateFormat` key, the `12h` / `24h` / `Seconds` variants of
  `time` and `shortDateTime` included, which v15 added and the date picker asks
  for from `timeFormat` and `showSeconds`. The entry points
  were `ngwr/date-adapter{,-fns,-luxon}` until v12: flat and hyphenated while
  `ngwr/icon` already nested its implementations (v15 folded those back into
  `ngwr/icon`), so the catalog spelled one idea two ways. `migration-v12`
  rewrites the import paths and every symbol keeps its name. The rename
  surfaced a latent defect worth knowing about —
  `scripts/lib/build-symbol-map.ts` scanned only the TOP level, so the date
  adapters were reachable only by the accident of being flat. It reads the
  entry points from the `exports` map now, nested ones included, and skips
  `<name>/testing`: a harness is public but never belongs in `imports: []`.
  **A display time zone** (16.1): `withDates({ timeZone })` takes an IANA
  name, an offset or a function (run in an injection context, so a signal or an
  `inject()` works), and provides it as `WR_DATE_TIME_ZONE`. The adapter itself
  never moves: it reads a `Date` in the browser's zone, because the calendar
  and a date-only picker hold DAYS, and a day has no zone. `adapter.zoned()` is
  the second reading, for instants: a sibling instance whose accessors, math,
  `format` and `parse` all work on the zone's wall clock. `wrDate` /
  `wrFormatDate` (except for a date-only string), `wr-date-stamp` and the
  pickers' modes with a time use it; the pickers hand it to their panel through
  the portal's injector, so nothing in a panel converts anything. The wall
  clock is held as a `Date` read with the UTC getters (`date/time-zone.ts`),
  never as a local `Date`: a local one cannot name an hour the BROWSER's own
  daylight saving skips. That is also why `+05:30` is exact, with no
  `Etc/GMT` detour. `adapter.displayKey()` is the locale and the zone as one
  string, and a signal read: `wrDate` is impure and compares it to keep its
  last result, and both pickers fold it into their echo guard. A custom
  adapter inherits `zoned()` returning itself, so it shows the browser's zone
  until it overrides it. `wr-event-calendar` does not use `zoned()` yet.
  `wrParseDate` is the entry point's one plain function: a backend
  value (a `Date`, epoch milliseconds, an ISO string, the SQL space form Safari
  refuses) as a `Date` or `null`, never an Invalid Date. It reads a date-only
  string through the internal `wrToLocalDate`, and `wrDate`, `wrFormatDate` and
  the date validators parse through it in turn, so all four read one string as
  one instant. It must stay free of the adapter and of DI.
  **Backend values** (16.2): `wrParseDate(value, options)` takes `epochUnit`
  (`ms`, `us`, `s`, `auto`), `zonelessIn` (`browser`, `display`, `utc`) and the
  `timeZone` that `display` reads in, through the wall-clock helpers of
  `date/time-zone.ts`. `withDates({ epochUnit, zonelessIn })` provides
  `WR_DATE_INPUT`, and `adapter.parseOptions()` hands it out with the zone:
  `wrFormatDate` and `wr-date-stamp` pass that to `wrParseDate`, so the
  function itself still injects nothing. The base adapter returns `{}`, so a
  custom one honours the options only when it overrides `parseOptions()`. The
  validators and the pickers do not read them. `withDates({ stamp })` provides
  `WR_DATE_STAMP_DEFAULTS`, which lives in `ngwr/date` so that `withDates()`
  imports no component; both tokens merge over the injector above, so a
  route's call keeps the app's other keys.
  **Periods** (16.3): `wrPeriodStart`, `wrPeriodEnd`, `wrWeekOfYear` and
  `wrWeekStart` are plain functions over an adapter, for a week, month, quarter
  or year. A week starts on `getFirstDayOfWeek()` and week 1 holds 4 January,
  which with Monday first is the ISO week. `wr-calendar` takes a `granularity`
  and both pickers take the same periods as a `mode`; the value is the period's
  first day, and a range ends on the last day of its end period, as a `date`
  range ends on a day. A period is closed by `min`, `max` or `dateFilter` only
  when every day in it is. The pickers write `March 2026`, `Q1 2026`,
  `Week 12, 2026` themselves (`date-picker/internal/period-text.ts`): the month
  name and the numbers come from the adapter and the arrangement from the
  catalog, and the field reads the text back by asking the template to print
  itself with markers. **No `WrDateFormat` key was added for it**, on purpose:
  a custom adapter has to handle every key, and a new one in a minor would
  print its own name into the field of an adapter written before it.
- **Router integration is OPT-IN since v14, and lives in two nested entry
  points** — `provideWrLoadingBarRouter()` from `ngwr/loading-bar/router`, and
  `WrTabsRouting` (the `[wrTabsRouting]` attribute on the strip) from
  `ngwr/tabs/router`. `WrLoadingBar` and `WrTabs` used to inject `Router`
  themselves, which put 66–76 kB of `@angular/router` into every app whether it
  routed or not. The two fail in opposite ways and only one is safe: the tab
  strip THROWS when a tab carries a `routerLink` and no adapter is present,
  while the loading bar keeps working for manual `start()` / `complete()` and
  simply never moves for navigation — nothing throws, and this project's own
  site shipped a permanently-empty bar for the length of a release by missing
  exactly that. When you add a component that would inject `Router`, split it
  the same way rather than paying the dependency for everyone. A third nested
  entry point, `ngwr/utils/router`, holds `wrQueryParam`: a writable signal
  linked to one query parameter, batching every write of a task into one
  navigation through a root `@Service()`. Two entry points
  still import `@angular/router` directly: `ngwr/sidebar` injects `Router` and
  `ngwr/breadcrumbs` uses `RouterLink`. With the three nested ones they are the
  only importers, which is why `@angular/router` is an OPTIONAL peer.
- **Shared code — don't reinvent these.** `ngwr/utils` (`coercion` incl.
  `wrNumAttr` for input transforms; plus `dom`, `guards`, `id`, `keyboard`,
  `css-size`, `css-value`, `fn`, `math` incl. `wrDecimal` and its `Add` /
  `Subtract` / `Multiply` / `Divide` / `Compare` / `Round` siblings, the one
  `BigInt` decimal core `wr-table` summaries and `wr-input-number`'s
  `mode="decimal"` both run on, `log`), `ngwr/pipes` (`wrDate`, `wrBytes`,
  `wrTruncate`, `wrNumber`, `wrMark`, `wrPlural`, `wrRange`, `wrDuration`, and
  beside the formatting pipes the functions `wrFormatDate`, `wrFormatBytes`,
  `wrFormatNumber`, `wrFormatPlural` and `wrFormatDuration`, each the pipe's
  own implementation for a string built in TypeScript — the locale is their
  second argument, except `wrFormatDate`, which takes the adapter the pipe
  injects), and
  `ngwr/validators` (`WrValidators`). A chart builds on `ngwr/charts/core` —
  the palette, dashes and markers, `useChartNumbers`, `wrChartAxis` and the
  visually hidden `WrChartTable` behind the opt-in `dataTable` input on bar,
  line, scatter, radar, heatmap chart, calendar heatmap, funnel, waterfall,
  treemap, box plot and candlestick — every export `@internal`, so it stays out of
  `llms-full.txt` and the skill catalog; a chart that renders the table
  positions its host. **The chart theme is that entry point's stylesheet**:
  `--wr-chart-*` on `:root` (grid, axis, zero, label, stroke, marker,
  bar-radius, gap, separator, dim, track, band, duration, the palette
  `--wr-chart-1` to `-8`, `--wr-chart-seq-1` to `-5`, `--wr-chart-div-neg` /
  `-pos`), each on a role, with the measured contrast in the sheet's own
  comment and held by `charts/core/theme.spec.ts`. A chart's own
  `--wr-<chart>-*` hooks default to those tokens, so a token restyles every
  chart and a hook one. `WR_CHART_PALETTE` / `wrChartColor` resolve to the
  tokens; `wrChartLegacyColor` is the old intent palette, for the charts not
  moved yet - a chart moves by swapping the call and loading
  `charts/core/styles`. The sheet loads the theme it names the roles of, and
  also carries the shared rules: the hover-dim (`data-wr-series` on every mark
  and legend row, `wr-chart--dim` / `wr-chart-mark--on` set by
  `useChartHover`, one native listener pair per chart reading
  `data-wr-index`), the legend-beside-the-chart layout
  (`wr-chart--legend-side`) and `wr-chart-state`, the empty / loading / error
  message a chart shows over the frame it keeps (`useChartState`, keys
  `chart.empty` / `chart.loading` / `chart.error`). Beside them:
  `wrChartNumberFormat` (one `Intl.NumberFormat` per locale and options for the
  page), `wrChartRound`, `wrChartLongest` (measure a few of the longest labels,
  never all), `wrChartLabelStep` and `useChartSize` / `wrChartObserveSize` (one
  `ResizeObserver` for every chart). `wr-bar-chart` is the reference
  implementation: copy its use of each. Its legend is `ul[wr-chart-legend]`
  (`ngwr/charts/chart-legend`), whose opt-in `toggleable` rows are
  `<button aria-pressed>` over a `hiddenSeries` model the chart feeds to its
  axis, tooltip and table. Only the three charts whose legends predate the
  shared one — line, donut and meter group — provide `WR_CHART_LEGEND_BLOCK` in
  `viewProviders` (the legend reads it with `host: true`), so their old public
  `.wr-<block>__legend-item` classes stay on the same elements; a new chart
  provides nothing, and gets no legacy classes it never had.
  A chart with a colour scale (heatmap, calendar heatmap) draws `wr-chart-scale`
  in the legend's place, from the same entry point: the steps of the scale
  between its two ends, each painted with the paint the chart hands it. Marks
  that lie over one another (treemap tiles over their group, meter bands over
  the next) opt out of the opacity dim and take a veil of the surface instead,
  so no layer shows through a faded one. The reading cell's ring on the
  heatmap, the calendar and the treemap is a class set by hand on that one
  element, never a binding on every cell.
- **Scheduling** (`ngwr/event-calendar`) — `wr-event-calendar` is month / week /
  day in one component. `events` is an input it never mutates: a drag emits
  `eventChange` and the host applies it, so an unhandled output is a cancelled
  drag. Every chip lives inside the `role="gridcell"` where it starts and reaches
  out with a `calc()` width or a percentage height — a floating events layer
  would leave `role="row"` owning something other than cells, which the axe gate
  rejects. Don't hand-roll a scheduler grid.
- **`wr-table` is the data workhorse** — column pin / resize / drag-reorder, row
  selection, expandable rows, summary rows, CSV export, grouping, **tree rows**
  (`childrenKey` makes `items` the roots and the table announces a `treegrid`)
  and a virtualized body are all opt-in inputs on the one component.
  `stickyHeader` gives any mode its own scroll area under a sticky header, the
  one a virtualized body already scrolls in (host class `wr-table--sticky-head`
  for both), sized by `viewportHeight`, where `'fill'` takes the parent's
  remaining height. A pinned edge casts its shadow only over hidden columns:
  the host wears `wr-table--overflow-start` / `--overflow-end`, measured on the
  scroll area. `selectAllScope="all"` widens the header select-all from the page
  to every page of `items`, under the same on-screen rule (no collapsed group, no
  closed subtree); with `total` it stays the page and warns. `loadingMode`
  picks the form of `[loading]`: the overlay, a bar along the top edge that
  leaves the rows readable, or `'auto'`, the overlay over an empty table and
  the bar over a filled one. `(rowClick)` is one delegated listener on the
  body and pointer only; a click on a control in the row, or under
  `wrTableIgnoreRowClick` (an attribute, no directive), is not a row click.
  Header hints (`headerHint`) and cut cells (`truncate: 'tooltip'`) share ONE
  `WrPopover` per table, created on first use and pointed at the hovered or
  focused cell through `wrPopoverOrigin`; the table listens natively, so a
  `mouseover` runs no change detection. `hiddenColumns` filters
  `displayColumns`, the one list every measurement keys off, so pins, widths
  and colspans follow a hidden column with no code of their own; `columnChooser`
  adds a toolbar strip above the scroll area (the table had no place for a
  control of its own, and a header cell is gone in card mode). The list in
  its panel is `<wr-table-column-chooser [table]>`, exported for a menu of the
  consumer's own; it holds no state and goes through the table's
  `chooserColumns`, `toggleColumn` and `setHiddenColumns`, which is where the
  `hideable` and last-visible rules live. Don't write a second list. A
  `[wrTableSelectionBar]` template draws a bar over the header while rows are
  selected: it sits in a box of no height in front of the scroll area, so it
  needs no sticky rule in any mode, leaves the select-all cell uncovered and
  makes the header cells under it `inert`. `stateChange` reports reader actions
  only and is emitted from an effect, which is what folds an action that writes
  two parts into one event; `[state]` restores by object identity. A
  `[wrTableEditCell]` template makes its column editable and the table a `grid`
  (a tree stays a `treegrid`): one data cell holds a roving tab stop, the
  arrows move between rendered cells, and the header and the row controls keep
  their own tab stops. One cell edits at a time, its editor in the cell's place;
  the table emits `cellEdit` and never writes `items`. A click outside, Tab,
  Enter and a row the virtual window drops commit the value last passed to
  `set`; Escape, a sort, a hidden column and a removed row drop it. Three pairs
  are refused rather than half-supported: tree + `groupBy`, tree +
  `[wrTableExpand]`, tree + `virtualScroll`. Excel (`.xlsx`)
  export is deliberately NOT shipped (would need a third-party dep). Don't
  hand-roll selection checkboxes or a CSV writer.
- **Sortable list** (`ngwr/sortable-list`) — `<wr-sortable-list [(items)]>` with one
  `<wr-sortable-item>` per row, and `[wrDragHandle]` to restrict the grab.
  **The consumer writes the loop**, which is the v15 change: the list used to
  own it and render one unnamed `<ng-template let-row let-i="index">`, so the
  markup said nothing about where those variables came from and a row could
  carry nothing of its own. The list keeps the array, the keyboard gesture and
  the live region; a row knows only its own position, which it resolves by
  DOCUMENT ORDER rather than by registration order — a row can be added,
  removed or moved by the consumer's loop, and construction order survives none
  of those. `trackBy` went with the loop. The entry point moved with the
  component in the same release — `ngwr/drag-drop` became
  `ngwr/sortable-list`, because drag and drop is a broader idea than one
  sortable list and the name is wanted for it. `migration-v15` moves the
  import path and the `@use`, and reports a list still rendering its row
  through an `<ng-template>` or passing `trackBy`, since the loop needs the
  array name and a track key only the app knows.
  **Groups.** Lists with the same `group` exchange items. They find each other
  through the root registry `WR_SORTABLE_LISTS` and are handed to the CDK as
  `connectedTo`; `cdkDropListGroup` is not used, because it needs a common
  ancestor directive and columns can sit in separate components. `move` fires
  once, on the list the item arrived in, after both lists wrote `items`;
  `reorder` is for a move inside one list. `canEnter` and `disabled` gate the
  drag (the CDK enter predicate) and the keyboard alike, and an item can always
  return to the list it left. The keyboard crosses lists on the arrows of the
  other axis, in DOCUMENT order mirrored under RTL, stepping over a list that
  refuses; the gesture's origin travels with the row, so Escape returns it to
  the list it started in. `CdkDropList` is a HOST directive: rows are projected,
  and a projected `cdkDrag` resolves its list through the element injector,
  which never enters the component's own view. With the drop list in the
  template every row was a free drag that sorted nothing.
- **Virtual scrolling** — `wr-table`, `wr-tree` and `wr-select` (`[options]` rows)
  use hand-rolled spacer-row windowing and switch to `aria-activedescendant`
  while virtual. `ngwr/virtual-scroll` is a _separate_ public component wrapping
  `cdk-virtual-scroll-viewport`; the three above deliberately don't use it (the
  CDK viewport can't host `<tr>` / role-owned list children). Cascader is
  deferred: its roving tab stop moves REAL focus between options rather than
  through `aria-activedescendant`, so a windowed column would unrender the
  focused element. Mention is excluded (capped at `maxResults` ≈ 8).
- **`ngwr/markdown` is gone (v15).** `<wr-markdown>`, its hand-rolled parser
  and serializer and `provideWrMarkdownHighlighter()` went together: rendering
  untrusted input and keeping a parser correct are surface ngwr does not need,
  and a document an app has stored is shown by `<wr-editor readonly>`, which
  mounts no ProseMirror.
- **Rich text** (`ngwr/editor`) — `<wr-editor>` is ProseMirror behind a Signal
  Forms value control, and ProseMirror is an OPTIONAL peer: eight `prosemirror-*`
  packages in `peerDependencies` + `peerDependenciesMeta`, which `package.spec.ts`
  holds equal to what the source imports, in both directions. **Keep
  `ngwr/editor` the only entry point that imports them** — a static import
  anywhere else (a `schema-form` kind, a `form` helper) forces the peers on every
  consumer of that entry point, which is why router support was split out in v14.
  **The value has ONE format since v15: the document as a `WrEditorJson` tree,
  `null` when empty.** `format` went with the HTML and markdown codecs, so the
  schema no longer varies and underline is always there; an app that stores HTML
  or markdown converts at its own boundary. Every value and every paste is
  untrusted: a bound tree is validated against the schema and refused whole,
  never repaired; a paste goes through ProseMirror's own clipboard parser against
  that schema; and links and images pass the editor's own URL check — internal,
  with the rules `safeMarkdownUrl` had — on the way in and again in `toDOM`.
  `new EditorView` runs only after render; the server draws a static
  preview BESIDE the mount surface, never inside it, since `{ mount }` wipes its
  children. **`readonly` does not mount at all**, and that static rendering IS
  the editor there: a page of thirty saved comments was booting thirty views of
  something nobody could type into. It takes the surface's id, name, field ARIA
  and tab stop over, and the surface is not rendered — rendering both would put
  two elements under one id and a nameless empty textbox beside the text. A
  focusable `role="group"` and NOT a textbox, because every descendant of a
  textbox is presentational, so the headings, lists and tables of the document
  being shown would stop being announced, which is the whole reason for showing
  it; `aria-readonly` goes with the role that allowed it, leaving
  `.wr-editor--readonly` as the cue, the same call `wr-segmented` and `wr-tree`
  make. It is LAZY rather than permanent — the mount is an `afterRenderEffect`
  write phase, which runs the first time `readonly` is false and after the
  render that put the surface back, and going read-only again keeps the mounted
  view, since a live session's undo history costs more than the view it sits in.
  The one thing no mount would otherwise do is REFUSE a value it cannot read, so
  `sync()` makes that check itself while read-only — same warning, same
  `refused` — and a mount that follows does not say it twice. A jsdom spec stubs
  `Range.getClientRects` — ProseMirror throws from a
  DOM listener after the document has already changed, so without the stub a spec
  passes for the wrong reason.
- **Mobile primitives** (`ngwr/platform`, …) — `WrHaptics` and
  `ngwr/pull-to-refresh`. The set is deliberately small and v15 made it
  smaller: `ngwr/action-sheet` is gone and `wr-drawer`'s swipe-to-dismiss grab
  handle with it, because ngwr is not a mobile library and a mobile-only
  affordance has to earn the surface it adds to a component every desktop app
  also uses. `WrVisualViewport` and the `--wr-keyboard-inset` it published went
  too, once the command-palette sheet, its last reader, had gone; an app that
  needs the keyboard inset reads `window.visualViewport` itself.

**Responsive / touch.** Adaptive components take a `responsive` opt-in modifier
(container-query reflow). Touch ergonomics use the `touch-target` SCSS mixin
(≥44px hit area gated `@media (pointer: coarse)`); the `touch` density preset
enlarges the controls that read the multipliers — **ten stylesheets**, not every
control: `button`, `input`, `textarea`, `select`, `list`, `table`, `badge/_tag`,
`editor` (its text padding and its tools), plus `cascader` and `tree`, which only joined when a sweep found their triggers
frozen at the `md` height in every tier. A component with fixed geometry does not
move. `--wr-density-text` is published for consumers with **no `var()` reader
anywhere in the library**; `--wr-density-gap` is published for them too, and its
only readers inside the library are the gaps a layout component puts between the
controls projected into it — the controls themselves do not grow with it.
