# Roadmap

## Very high

## High

## Medium

## Low

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
