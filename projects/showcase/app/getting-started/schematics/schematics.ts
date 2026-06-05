import { Component } from '@angular/core';

import { DocCodeComponent, DocPageComponent, DocSectionComponent } from '#core/components';

@Component({
  selector: 'ngwr-gs-schematics-page',
  templateUrl: './schematics.html',
  imports: [DocPageComponent, DocSectionComponent, DocCodeComponent],
})
export default class SchematicsPage {
  protected readonly snippets = {
    ngAdd: `# Drop-in install — prompts for styles, date adapter, density, theme.
ng add ngwr`,

    ngAddPrompts: `# Sample run (defaults shown in brackets):
?  How should ngwr styles be wired?
   ❯ All — one \`@use 'ngwr';\` import (recommended)
     None — opt in per-component later

?  Wire a date adapter? (Used by calendar / date-picker.)
   ❯ None — skip (you can add later)
     Native — built-in Date, no extra deps
     date-fns — small, modular
     Luxon — Intl-backed, locale-rich

?  Pick a density preset
   ❯ None — use lib defaults
     Comfortable — relaxed spacing
     Compact — tight spacing

?  Theme starter?
   ❯ None — stay on lib defaults
     Light
     Dark
     System — auto-switch via prefers-color-scheme`,

    ngAddFlags: `# Skip prompts:
ng add ngwr --styles=all --dateAdapter=date-fns --density=comfortable --theme=auto

# CI / monorepo — skip the install task:
ng add ngwr --skipPeerInstall`,

    iconSet: `# Generate a tree-shaken icon barrel under src/app/icons.ts.
ng g ngwr:icon-set                                  # defaults to the "basic" set
ng g ngwr:icon-set checkout --set=forms             # named file + curated set
ng g ngwr:icon-set --icons=plus,trash,checkmark     # explicit list
ng g ngwr:icon-set --set=navigation --icons=star,heart   # combine both`,

    iconSetOutput: `// src/app/icons.ts (generated)
import { Check, Copy, Pencil, Plus, Search, Trash2, X } from 'lucide';
import { lucideIcons } from 'ngwr/icon/adapters/lucide';

export const APP_ICONS = lucideIcons({
  checkmark: Check,
  close: X,
  add: Plus,
  edit: Pencil,
  trash: Trash2,
  search: Search,
  copy: Copy,
});

// Then wire into bootstrap:
import { provideWrIcons } from 'ngwr/icon';
import { APP_ICONS } from './icons';

providers: [provideWrIcons(APP_ICONS)],`,

    use: `# Add the import + splice into a component's @Component imports array.
ng g ngwr:use WrButton src/app/pages/checkout/checkout.ts
ng g ngwr:use WrSelect src/app/pages/checkout/checkout.ts

# 338 symbols recognized — every public Wr* export across the catalog.`,

    useBefore: `// Before: src/app/pages/checkout/checkout.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.html',
  imports: [FormsModule],
})
export class CheckoutPage {}`,

    useAfter: `// After running \`ng g ngwr:use WrButton …\`:
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WrButton } from 'ngwr/button';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.html',
  imports: [FormsModule, WrButton],
})
export class CheckoutPage {}`,

    provider: `# Splice a provideWr*() call into bootstrapApplication's providers array.
ng g ngwr:provider overlay
ng g ngwr:provider toast
ng g ngwr:provider date-adapter

# Available: overlay | icons | toast | i18n | date-adapter | density |
#            loading-bar | cookie | storage | theme`,

    componentStyle: `# Append \`@use 'ngwr/<name>';\` to the project's global stylesheet.
# Pairs with \`--styles=none\` on \`ng add\`.
ng g ngwr:component-style button
ng g ngwr:component-style select
ng g ngwr:component-style theme    # always include the theme first`,

    page: `# Scaffold a starter page wired up with ngwr components.
ng g ngwr:page form signup
ng g ngwr:page table users
ng g ngwr:page dashboard overview

# Creates <name>.ts + <name>.html + <name>.scss under
# <sourceRoot>/app/pages/<name>/`,

    update: `# Auto-rewrite the v6 entry-points that v7 consolidated.
ng update ngwr@7`,

    updateMap: `// Templates: 8 tag rewrites across .html
<wr-autocomplete …>     →  <wr-select mode="search" …>
<wr-chips-input …>      →  <wr-select mode="tag" …>
<wr-time-picker …>      →  <wr-date-picker mode="time" …>
<wr-date-time-picker …> →  <wr-date-picker mode="datetime" …>
[wrTooltip]="…"         →  [wrPopover]="…" mode="tooltip"
<wr-tree-select …>      →  <wr-tree openOn="overlay" …>
<wr-bottom-sheet …>     →  <wr-drawer position="bottom" …>
<wr-count-up-text …>    →  <wr-count-up …>

// Imports (.ts): module-path + symbol renames
'ngwr/autocomplete'     →  'ngwr/select'         (WrAutocomplete    → WrSelect)
'ngwr/chips-input'      →  'ngwr/select'         (WrChipsInput      → WrSelect)
'ngwr/time-picker'      →  'ngwr/date-picker'    (WrTimePicker      → WrDatePicker)
'ngwr/date-time-picker' →  'ngwr/date-picker'    (WrDateTimePicker  → WrDatePicker)
'ngwr/tooltip'          →  'ngwr/popover'        (WrTooltip         → WrPopover)
'ngwr/tree-select'      →  'ngwr/tree'           (WrTreeSelect      → WrTree)
'ngwr/bottom-sheet'     →  'ngwr/drawer'         (WrBottomSheet     → WrDrawer)
'ngwr/count-up-text'    →  'ngwr/count-up'       (WrCountUpText     → WrCountUp)

// Stylesheets: @use / @import / @forward
@use 'ngwr/autocomplete';   →  @use 'ngwr/select';
// …same set as imports.`,
  };
}
