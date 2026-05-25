import type { Router } from '@angular/router';

import type { WrCommandItem } from 'ngwr/command-palette';

import { routes } from '#routing';

/** Convert `'colorPicker'` / `'wr-number'` → `'Color Picker'` / `'Wr Number'`. */
function humanize(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Build the flat list of palette items from `routes.docs`. */
export function buildCommandItems(router: Router): readonly WrCommandItem[] {
  const out: WrCommandItem[] = [];

  // Components — flat string entries only.
  for (const [key, value] of Object.entries(routes.docs.components)) {
    if (key === 'index' || typeof value !== 'string') continue;
    const url = `/docs/components/${value}`;
    out.push({
      id: `components-${value}`,
      label: humanize(key),
      group: 'Components',
      icon: 'cog',
      action: () => void router.navigateByUrl(url),
    });
  }

  // Core — same shape, but pipes is nested (one entry per pipe).
  for (const [key, value] of Object.entries(routes.docs.core)) {
    if (key === 'index') continue;
    if (typeof value === 'string') {
      out.push({
        id: `core-${value}`,
        label: humanize(key),
        group: 'Core',
        icon: 'cog',
        action: () => void router.navigateByUrl(`/docs/core/${value}`),
      });
    } else {
      // Nested (e.g. pipes/{wrNumber, wrBytes, …}).
      for (const [childKey, childValue] of Object.entries(value)) {
        if (childKey === 'index' || typeof childValue !== 'string') continue;
        out.push({
          id: `core-${key}-${childValue}`,
          label: humanize(childKey),
          group: humanize(key),
          icon: 'cog',
          action: () => void router.navigateByUrl(`/docs/core/${value.index}/${childValue}`),
        });
      }
    }
  }

  return out;
}
