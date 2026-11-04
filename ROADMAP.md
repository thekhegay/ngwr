# Roadmap

What is planned, and nothing else. Why a gate exists, what it cannot see, which
contracts look like bugs — none of that is here. This file used to carry a
second copy of it and no longer does.

Sizes are S / M / L / XL.

## Order

Bugs come first: a known bug is fixed before any item below. Nothing else is
scheduled and nothing is blocked. Everything below is open but unscheduled;
everything under [Deferred](#deferred) is explicitly not now.

## E — DX, docs & distribution

- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal signal
      utils / positioning / density / hotkey / storage helpers as a zero-dep
      package usable without the components.
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`, but
      add a schematic that copies a component's source into the user's repo.
      Ownership of the source without abandoning the update path.

## F — Catalog

- [ ] **F1. Parity with React Bits** (XL) — `ngwr/bits` has 25 entries;
      [React Bits](https://www.reactbits.dev) lists over 200 across text
      animations, animations, components and backgrounds. Backgrounds first,
      then the text and
      cursor effects. Each one a
      Signal-input component on theme tokens, honouring
      `prefers-reduced-motion`, with a docs page under `/bits`.
- [ ] **F3. `wrDownloadBlob`** (S) — saves a `Blob` under a file name in one
      call, from `ngwr/utils`: a no-op on the server, with the deferred revoke
      Safari needs. Beside it, a `wr`-prefixed reader for the file name in a
      `Content-Disposition` header, `filename*` included. `wr-table`'s CSV
      export calls it instead of its own copy.
- [ ] **F4. `wrAction` and `wrResourceValue`** (S) — `wrAction` holds one
      async write: status, loading, reset, a single-flight run, and a keyed form
      for which row is pending. `wrResourceValue` reads a resource's value or a
      fallback without throwing in the error state, and keeps the last settled
      value across reloads.
- [ ] **F5. `WrPlatform` page state, and `wrPoll`** (S) — `pageVisible` and
      `online` signals (true on the server), a callback for coming back after a
      real absence, and polling resources on one shared ticker that pauses
      while the tab is hidden and skips a resource still loading.
- [ ] **F6. `WrStorage.signal`** (S) — a writable signal that saves on write
      and follows other tabs, beside the read-only `watch()`.
- [ ] **F7. `WrHotkey` bindings and labels** (M) — the active bindings with
      their labels as a signal, for a cheat sheet in `wr-kbd`, and a chord
      written the way the platform writes it (`⌘K` on macOS, `Ctrl+K`
      elsewhere). `KEYS` in `ngwr/utils` names keys for `keydown` handlers and
      is where the labels start.
- [ ] **F8. `wrQueryParam`** (M) — a writable signal linked to one query
      parameter, with parse and serialize, `replaceUrl`, one navigation per
      task, and a default left out of the address. In a router entry point of
      its own, the way `ngwr/tabs/router` is, since `@angular/router` stays an
      optional peer.
- [ ] **F9. `wr-comment` and a chat composer** (L) — a discussion row (avatar,
      author, time, body, actions, nested replies) with a bubble variant for
      chat, and a composer: Enter sends, Shift+Enter adds a line, IME-safe. The
      data stays with the app.
- [ ] **F10. Exact decimals in `wr-table` summaries and `wr-input-number`**
      (M) — summary aggregates over decimal strings with no float error, and a
      `wr-input-number` mode that holds the typed value as a string and accepts
      a comma and pasted spaces.
- [ ] **F11. `WrDialog.confirm` and `WrDialogRef.closeWhen`** (S) — a
      one-call confirmation that resolves `Promise<boolean>`, with
      `role="alertdialog"`, a danger tone and catalog labels; and `closeWhen`,
      which closes a dialog when a signal turns true and is owned by the dialog,
      so it cannot outlive it.
- [ ] **F12. `name` on `wr-avatar`, and `wrInitials`** (S) — one input that
      gives the alt text, two grapheme-safe initials and an optional stable
      tint hashed from the name. The initials are also a pipe and a function.
- [ ] **F13. Screen states** (M) — a `[wrAlertActions]` slot on `wr-alert`, a
      `lines` input on `wr-skeleton`, and `wr-load-state`: one wrapper that
      takes a status or a resource and draws the skeleton, the failure with a
      retry, the empty slot or the content.
- [ ] **F14. `compact` and `sticky` on `wr-page-header`** (M) — a one-line
      head with the crumbs beside the title, a second row for filters, and a
      way to stay in view.
- [ ] **F15. `wr-table` columns and types** (L) — one scope. Column keys:
      `align` (right-aligned numbers with tabular digits), `format` (a plain
      cell without a template) and `empty` (a placeholder for no value), with
      the CSV export writing what the cell shows. Generics on `wr-table` and
      `wr-select`, with a template guard on `[wrTableCell]`, so a row and a
      value arrive typed.

## Deferred

Open and researched, explicitly not now.

- Nothing deferred right now.
