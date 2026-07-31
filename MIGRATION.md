# Migration guide

Every major ships an `ng update` codemod that rewrites your templates,
TypeScript and stylesheets in place. Commit first, run the migration, then
review with `git diff` — a handful of edge cases always need a manual
touch-up.

```bash
# Runs the version-matched migration for the major you land on.
ng update ngwr@8
```

Sections are newest-first. If you are skipping a major, run each migration
in order (`ngwr@7`, then `ngwr@8`, …) rather than jumping straight to the
latest.

---

## v8 → v9

> **Unreleased.** These changes are on `main` but not yet published, so
> `ng update ngwr@9` only becomes available with the v9 release. The
> codemod itself is already written and registered.

Three breaking changes. One is auto-fixed; the other two need a manual
pass, and both fail **silently** — no template error, no build error, the
behaviour just changes.

### `<wr-checkbox>` — `value` → `checkboxValue`

`WrCheckbox` is now a Signal Forms-native `FormCheckboxControl`, and that
contract reserves `value` for the form value. So the checkbox's own state
is the boolean `checked` model, and group membership moved to a separate
input:

| v8                      | v9                                      |
| ----------------------- | --------------------------------------- |
| `value="autosave"`      | `checkboxValue="autosave"`              |
| `[value]` / `[(value)]` | `[checkboxValue]` / `[(checkboxValue)]` |
| the checked state       | the `checked` model (`[(checked)]`)     |

```diff
  <wr-checkbox-group [formField]="form.features">
-   <wr-checkbox value="autosave">Autosave</wr-checkbox>
-   <wr-checkbox value="notifications">Notifications</wr-checkbox>
+   <wr-checkbox checkboxValue="autosave">Autosave</wr-checkbox>
+   <wr-checkbox checkboxValue="notifications">Notifications</wr-checkbox>
  </wr-checkbox-group>
```

**This one fails silently.** A leftover `value="autosave"` raises no
template error — it lands on the host as a plain DOM attribute, so every
checkbox in the group keeps the default identity (`null`) and they all
toggle together. `ng update ngwr@9` rewrites `value=`, `[value]=` and
`[(value)]=` scoped to the `<wr-checkbox` open tag, in both `.html` files
and inline `.ts` templates.

### Lucide icon names are registered verbatim

`lucideIcons()` used to kebab-case its keys; it now registers them exactly
as written, matching the singular `lucide()` helper and every other
adapter. Quote multi-word keys:

```diff
- provideWrIcons(lucideIcons({ chevronDown: ChevronDown }))
+ provideWrIcons(lucideIcons({ 'chevron-down': ChevronDown }))
```

**No codemod** — the key is yours to name, and we can't know which spelling
your templates use. Also silent: `<wr-icon name="chevron-down">` simply
stops rendering.

### `info` added to `WR_COLORS` / `WrColor`

The palette always had an `info` role; the type now matches it. Ordinary
usage is unaffected — only exhaustive `switch`es over `WrColor` and
`Record<WrColor, …>` maps need the new key. No codemod.

---

## v7 → v8

Three breaking changes. `ng update ngwr@8` auto-fixes density and
pagination, and warns — with file paths — about the two removed
components, which have no automatic replacement.

### Density values renamed

| v7              | v8                         |
| --------------- | -------------------------- |
| `'compact'`     | `'sm'`                     |
| `'default'`     | `'md'` — still the default |
| `'comfortable'` | `'lg'`                     |
| `'touch'`       | unchanged                  |

Affects `provideWrDensity({ defaultDensity })`, the `wrDensity` directive
and the `[data-wr-density]` selector:

```diff
- provideWrDensity({ defaultDensity: 'comfortable' })
+ provideWrDensity({ defaultDensity: 'lg' })

- <aside wrDensity="compact">…</aside>
+ <aside wrDensity="sm">…</aside>

- [data-wr-density='comfortable'] { … }
+ [data-wr-density='lg'] { … }
```

### Pagination sizes trimmed

`WrPaginationSize` drops `xs` and `xl` — it is now `'sm' | 'md' | 'lg'`.
The codemod rewrites `size="xs"` to `"sm"` and `size="xl"` to `"lg"`, scoped
to `<wr-pagination>` so a `size` on any other element is untouched.

### Removed components

`WrReveal` (the `wrReveal` directive in `ngwr/directives`) and
`WrScrambleText` (`ngwr/scramble-text`) were removed — both were
unreliable. There is no drop-in replacement; the codemod lists every file
that uses them so you can swap them out by hand.

```diff
- <div wrReveal [threshold]="0.5">…</div>
+ <div>…</div>

- <wr-scramble-text>Hover me</wr-scramble-text>
+ <wr-decrypt-text text="Hover me" />
```

---

## v6 → v7

v7 aligned the library with the current
[Angular style guide](https://angular.dev/style-guide) and
[Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html).
The visible change is the **drop of class- and file-name suffixes**
(`*Component`, `*Directive`, `*Pipe`, `*Service`); alongside it, a batch of
single-purpose entry points was folded into shared components.

`ng update ngwr@7` handles the class renames, the entry-point rewrites and
the SCSS `@use` paths — ≥ 95 % of the work.

### Class names

| v6                            | v7                       |
| ----------------------------- | ------------------------ |
| `WrButtonComponent`           | `WrButton`               |
| `WrButtonGroupComponent`      | `WrButtonGroup`          |
| `WrCheckboxComponent`         | `WrCheckbox`             |
| `WrToastService`              | `WrToast`                |
| `WrThemeService`              | `WrTheme`                |
| `WrTypographyDirective`       | `WrTypography`           |
| `WrBytesPipe`                 | `WrBytes`                |
| _… every other component / directive / pipe / service follows the same rule_ ||

### File names

| v6                            | v7                       |
| ----------------------------- | ------------------------ |
| `button.component.ts`         | `button.ts`              |
| `button.component.html`       | `button.html`            |
| `button.component.scss`       | `button.scss`            |
| `toast.service.ts`            | `toast.ts`               |
| `tooltip.directive.ts`        | `tooltip.ts`             |

Tests stay on `.spec.ts`.

### Selectors

Mostly unchanged — `<wr-btn>`, `[wrSquircle]`, `[wrTypography]` and
`wrBytes` (pipe) all behave exactly as in v6. The exception is the
tooltip: `ngwr/tooltip` and its `[wrTooltip]` directive were folded into
`ngwr/popover`, which covers the same job in `mode="tooltip"`.

```diff
- <button wr-btn wrTooltip="Save changes">Save</button>
+ <button wr-btn [wrPopover]="'Save changes'" mode="tooltip">Save</button>
```

The other consolidations follow the same shape, and the codemod rewrites
all of them: `wr-autocomplete` / `wr-chips-input` → `wr-select` (with
`mode`), `wr-time-picker` / `wr-date-time-picker` → `wr-date-picker`,
`wr-tree-select` → `wr-tree openOn="overlay"`, `wr-bottom-sheet` →
`wr-drawer position="bottom"`, `ngwr/count-up` / `ngwr/count-up-text` →
`ngwr/counter` (the `<wr-count-up>` tag is unchanged), `ngwr/tag` →
`ngwr/badge`, `ngwr/form-field` → `ngwr/form`, `wr-image` →
`wr-lightbox`, and `wr-animated-text` → `wr-typewriter` /
`wr-decrypt-text` / `wr-split-text` (per mode).

### Collision map

A handful of packages had two classes that would collapse to the same
bare name. The consumer-facing class keeps the bare name; the other gets
a descriptive label:

| v6                            | v7                              | Reason                                      |
| ----------------------------- | ------------------------------- | ------------------------------------------- |
| `WrPopconfirmComponent`       | `WrPopconfirmPanel`             | `WrPopconfirmDirective` → `WrPopconfirm`    |
| `WrToastComponent`            | `WrToastItem`                   | `WrToastService` → `WrToast`                |
| `WrContextMenuComponent`      | `WrContextMenuPanel`            | `WrContextMenuDirective` → `WrContextMenu`  |
| `WrSquircleComponent`         | `WrSquircleHost`                | `WrSquircleDirective` → `WrSquircle`        |
| `WrMetaDirective`             | `WrMetaBinding`                 | `WrMetaService` → `WrMeta`                  |
| `WrHotkeyDirective`           | `WrHotkeyBinding`               | `WrHotkeyService` → `WrHotkey`              |

### Type renames

These were data types that collided with a class once the suffix dropped:

| v6 type    | v7 type           | Class that took the old name |
| ---------- | ----------------- | ---------------------------- |
| `WrIcon`   | `WrIconDef`       | `WrIcon` (component)         |
| `WrTableSort` | `WrTableSortState` | `WrTableSort` (directive) |

Usage sites in your code (`provideWrIcons([{ … } satisfies WrIconDef])`,
`signal<readonly WrTableSortState[]>([])`) are automatically rewritten by
the codemod.

### Manual review checklist

After running `ng update ngwr@7`, sanity-check:

- [ ] **Imports compile**: `tsc --noEmit` (or `ng build`) has no `cannot
      find name 'WrXxxComponent'` errors.
- [ ] **Re-export aliases**: if you re-export a v6 class under its old
      name (`export { WrButtonComponent as MyButton }`), update to the
      v7 class.
- [ ] **String references**: code that builds class lookup strings (rare)
      isn't touched by the codemod — search for the literal string
      `"WrButtonComponent"` etc.
- [ ] **`exportAs` references**: template refs like `#menu="wrDropdownMenu"`
      still work, but anything pointing at a consolidated entry point (the
      tooltip, autocomplete, chips-input, …) needs the replacement's name.

### Why we made the change

The previous Angular style guide explicitly recommended the suffixes;
the current one ([angular.dev/style-guide](https://angular.dev/style-guide))
drops them. Angular Material already shipped this pattern (`MatButton`,
not `MatButtonComponent`). v7 brought ngwr in line with the framework's
canonical style.

If you have v6 code that you can't immediately migrate, pin to
`ngwr@^6.1.1` — it stays installable.
