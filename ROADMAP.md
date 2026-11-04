# Roadmap

## Very high

- **`wrDownloadBlob`**: saves a `Blob` under a file name in one call, from
  `ngwr/utils`: a no-op on the server, with the deferred revoke Safari needs.
  Beside it, a `wr`-prefixed reader for the file name in a `Content-Disposition`
  header, `filename*` included. `wr-table`'s CSV export calls it instead of its
  own copy.
- **`wrAction` and `wrResourceValue`**: `wrAction` holds one async write: status,
  loading, reset, a single-flight run, and a keyed form for which row is pending.
  `wrResourceValue` reads a resource's value or a fallback without throwing in the
  error state, and keeps the last settled value across reloads.

## High

- **`wr-table` columns and types**: one scope. Column keys: `align` (right-aligned
  numbers with tabular digits), `format` (a plain cell without a template) and
  `empty` (a placeholder for no value), with the CSV export writing what the cell
  shows. Generics on `wr-table` and `wr-select`, with a template guard on
  `[wrTableCell]`, so a row and a value arrive typed.
- **`WrPlatform` page state, and `wrPoll`**: `pageVisible` and `online` signals
  (true on the server), a callback for coming back after a real absence, and
  polling resources on one shared ticker that pauses while the tab is hidden and
  skips a resource still loading.

## Medium

- **`WrStorage.signal`**: a writable signal that saves on write and follows other
  tabs, beside the read-only `watch()`.
- **`WrHotkey` bindings and labels**: the active bindings with their labels as a
  signal, for a cheat sheet in `wr-kbd`, and a chord written the way the platform
  writes it (`⌘K` on macOS, `Ctrl+K` elsewhere). `KEYS` in `ngwr/utils` names keys
  for `keydown` handlers and is where the labels start.
- **`wrQueryParam`**: a writable signal linked to one query parameter, with parse
  and serialize, `replaceUrl`, one navigation per task, and a default left out of
  the address. In a router entry point of its own, the way `ngwr/tabs/router` is,
  since `@angular/router` stays an optional peer.
- **`wr-comment` and a chat composer**: a discussion row (avatar, author, time,
  body, actions, nested replies) with a bubble variant for chat, and a composer:
  Enter sends, Shift+Enter adds a line, IME-safe. The data stays with the app.
- **`--wr-border-base` as a fill**: `prefers-contrast: more` darkens this token so
  borders stay visible, which also darkens any fill mixed from it, and the text on
  that fill loses contrast. Check what the chart stylesheets mix from it, move each
  fill to a `--wr-color-fill*` role, and measure.
- **`exportAs` on directives**: most public directives have none, so a template
  cannot write `#x="wrFoo"`. Add one to each public directive with state or methods
  a template would call, named after the selector.

## Low

- **Exact decimals in `wr-table` summaries and `wr-input-number`**: summary
  aggregates over decimal strings with no float error, and a `wr-input-number` mode
  that holds the typed value as a string and accepts a comma and pasted spaces.
- **`WrDialog.confirm` and `WrDialogRef.closeWhen`**: a one-call confirmation that
  resolves `Promise<boolean>`, with `role="alertdialog"`, a danger tone and catalog
  labels; and `closeWhen`, which closes a dialog when a signal turns true and is
  owned by the dialog, so it cannot outlive it.
- **`name` on `wr-avatar`, and `wrInitials`**: one input that gives the alt text,
  two grapheme-safe initials and an optional stable tint hashed from the name. The
  initials are also a pipe and a function.
- **Screen states**: a `[wrAlertActions]` slot on `wr-alert`, a `lines` input on
  `wr-skeleton`, and `wr-load-state`: one wrapper that takes a status or a resource
  and draws the skeleton, the failure with a retry, the empty slot or the content.
- **`compact` and `sticky` on `wr-page-header`**: a one-line head with the crumbs
  beside the title, a second row for filters, and a way to stay in view.
- **`wr-graph` zoom and pan**: zoom in and out and drag the field, like NG-ZORRO's
  graph. Selection and highlight come after that.
- **Bits docs notes**: see-also lists, the ripple-grid strength slider range, the
  credit wording, and the playground headings at 390px.
- **`check:nav`**: compares `dist/showcase/prerendered-routes.json` with the sidebar
  configs, so a page with no route or a route with no nav row fails the run.

## Very low

- **Parity with React Bits**: backgrounds first, then the text and cursor effects.
  Each one a Signal-input component on theme tokens, honouring
  `prefers-reduced-motion`, with a docs page under `/bits`.
- **`ngwr/kit` standalone utilities**: publish the internal signal utils,
  positioning, density, hotkey and storage helpers as a zero-dep package usable
  without the components.
- **Ejectable components**: keep npm and `ng update`, and add a schematic that
  copies a component's source into the user's repo.
