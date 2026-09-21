# Roadmap

What is planned, and nothing else. Why a gate exists, what it cannot see, which
contracts look like bugs — none of that is here. This file used to carry a
second copy of it and no longer does.

Sizes are S / M / L / XL.

## Order

Nothing is scheduled and nothing is blocked. Everything below is open but
unscheduled; everything under [Deferred](#deferred) is explicitly not now.

## E — DX, docs & distribution

- [ ] **E5. `ngwr/kit` standalone utilities** (M) — publish the internal signal
      utils / positioning / density / hotkey / storage helpers as a zero-dep
      package usable without the components. Top-of-funnel play (ngxtension:
      about 56k downloads a week in September 2026).
- [ ] **E6. Ejectable components** (L, stretch) — keep npm + `ng update`, but
      add a schematic that copies a component's source into the user's repo.
      The shadcn ownership model without abandoning the update path;
      copy-paste-only has weak traction in Angular (spartan ~21k dl/wk).
- [ ] **E9. Blocks** (L) — `ng g @ngwr/blocks:auth|dashboard|landing|settings`,
      composed from ngwr components and themed through the registry's
      `registry:theme` presets. Proven adoption driver (shadcnblocks, Ant Pro,
      Tremor); virtually no Angular block ecosystem exists.

## F — AI components (`ngwr/ai`)

A confirmed open lane: Kendo's kit is paid, NG-ZORRO is porting Ant Design X,
nobody ships a free, complete Angular AI kit.

- [ ] **F2. Chat / agent kit** (XL) — message thread, prompt input (attachments,
      slash commands via the mention plumbing), tool-call / approval /
      reasoning-trace renderers, sources panel — wired to AG-UI or
      Vercel-AI-SDK-style streams. Showcases the existing toast, command-palette
      and animation kit.

## Deferred

Open and researched, explicitly not now.

- [ ] **C9. Charts: the missing three** (M) — **area, scatter and radar do not
      exist**, and legends are implemented three times over, in `donut-chart`,
      `line-chart` and `meter-group`, rather than shared. The differentiator is
      theme-token integration and dashboard blocks — do not build a chart
      engine.
- [ ] **D5. Figma kit** (L) — the token export exists (`pnpm gen:design-tokens`);
      what is missing is a Figma FILE — component frames, variants, states,
      auto-layout geometry — none of it derivable from source, so the kit itself
      cannot come out of this repo. Cheapest additions first: density as a second
      token collection (four modes over four numeric tokens, same parser), and a
      `/guides/tokens/figma` page carrying the download plus an honest list of
      what Figma drops (easings, shadows, font stacks).

## Breaking changes on the table

- [ ] **Colour role-rename** — the values outside the theme layer that still
      name `--wr-color-{white,dark,light}` or a derivative: input defaults in
      `click-spark.ts`, `calendar-heatmap.ts`, `gauge.ts` and `knob.ts`, the
      host colour in `fuzzy-text.ts`, two attributes in `line-chart.html`, and
      the inline-code colour in `markdown/styles/_index.scss` and
      `editor/styles/_index.scss`.
      `grep -rnE 'wr-color-(white|dark|light)' projects/lib --exclude-dir=theme --exclude='*.spec.ts'`
      re-derives them, with a few comments beside them. Plus dropping `light` /
      `dark` from `WR_COLORS` / `WrColor`. Codemoddable, so it owes a
      `migration-vN` in whichever major carries it.
- [ ] **Angular 23 peer baseline** (~Nov 2026).
- [ ] **Per-entry bundle budgets enforced in CI.**
