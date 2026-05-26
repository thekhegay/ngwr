# Migration guide: ngwr v6 → v7

ngwr v7 aligns the library with the current
[Angular style guide](https://angular.dev/style-guide) and
[Google TypeScript style guide](https://google.github.io/styleguide/tsguide.html).
The visible change for consumers is the **drop of class- and file-name
suffixes** (`*Component`, `*Directive`, `*Pipe`, `*Service`). Selectors are
unchanged — your templates keep working as-is.

> If you maintained code against v6 (the `WrButtonComponent` era), the
> automated codemod handles ≥ 95 % of the rewrites.

---

## Run the codemod

The library ships a Node-based codemod. Point it at your `src` and it
rewrites imports + path strings in place:

```bash
# Once your project is on ngwr v7:
pnpm tsx node_modules/ngwr/scripts/migrate-v2.ts --path ./src

# Or dry-run first to see the plan:
pnpm tsx node_modules/ngwr/scripts/migrate-v2.ts --path ./src --dry-run
```

It does three passes:

1. **Class names** — `WrButtonComponent` → `WrButton`, `WrToastService` →
   `WrToast`, etc.
2. **Disambiguated collisions** — see [collision map](#collision-map).
3. **Type renames** — `WrIcon` (the data type) → `WrIconDef`, etc.

The codemod is idempotent — running it twice is safe.

---

## What changed

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

**No changes.** `<wr-btn>`, `<wr-toast>`, `<wr-tooltip>`, `[wrSquircle]`,
`[wrTypography]`, `wrBytes` (pipe) all behave exactly as in v6.

### Collision map

A handful of packages had two classes that would collapse to the same
bare name. The consumer-facing class keeps the bare name; the other gets
a descriptive label:

| v6                            | v7                              | Reason                                      |
| ----------------------------- | ------------------------------- | ------------------------------------------- |
| `WrTooltipComponent`          | `WrTooltipPanel`                | `WrTooltipDirective` → `WrTooltip`          |
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

---

## Manual review checklist

After running the codemod, sanity-check:

- [ ] **Imports compile**: `tsc --noEmit` (or `ng build`) has no `cannot
      find name 'WrXxxComponent'` errors.
- [ ] **Re-export aliases**: if you re-export a v6 class under its old
      name (`export { WrButtonComponent as MyButton }`), update to the
      v7 class.
- [ ] **String references**: code that builds class lookup strings (rare)
      isn't touched by the codemod — search for the literal string
      `"WrButtonComponent"` etc.
- [ ] **Template selectors**: no changes expected, but verify nothing
      relied on `<ng-template #foo="WrTooltipComponent">` (exportAs).

---

## Why we made the change

The previous Angular style guide explicitly recommended the suffixes;
the current one ([angular.dev/style-guide](https://angular.dev/style-guide))
drops them. Angular Material already shipped this pattern (`MatButton`,
not `MatButtonComponent`). v7 brings ngwr in line with the framework's
canonical style.

If you have v6 code that you can't immediately migrate, pin to
`ngwr@^6.1.1` — it stays installable.
