import { routeKey } from './since';

import { DOC_ROUTES } from '#core/generated/deps';

const KIND_TONES: Readonly<Record<string, DocLabelTone>> = {
  Component: 'component',
  Directive: 'directive',
  Service: 'service',
  Pipe: 'pipe',
  Util: 'util',
  Validator: 'validator',
  Type: 'type',
  Guide: 'guide',
  Animation: 'animation',
};

/**
 * What an animation runs on, as a trait with a hue of its own: the cost a
 * reader weighs when choosing one. A plain trait is neutral; these are not.
 */
const TECH_TONES: Readonly<Record<string, DocLabelTone>> = {
  CSS: 'css',
  DOM: 'dom',
  SVG: 'svg',
  Canvas: 'canvas',
  WebGL: 'webgl',
};

/** What a page is, written as a label: the kinds plus their plurals and the old "Interface". */
const KIND_ALIASES: Readonly<Record<string, string>> = {
  Components: 'Component',
  Directives: 'Directive',
  Interface: 'Type',
};

/** The colour a label wears: its kind's own, or neutral for a trait. */
export type DocLabelTone =
  | 'component'
  | 'directive'
  | 'service'
  | 'pipe'
  | 'util'
  | 'validator'
  | 'type'
  | 'guide'
  | 'animation'
  | 'css'
  | 'dom'
  | 'svg'
  | 'canvas'
  | 'webgl'
  | 'neutral';

/** A label's colour: a kind and an animation's technology get their own, every other trait is neutral. */
export function labelTone(label: string): DocLabelTone {
  return KIND_TONES[KIND_ALIASES[label] ?? label] ?? TECH_TONES[label] ?? 'neutral';
}

/** A label as a URL segment: `Signal Forms` → `signal-forms`. */
export function labelSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * The labels a page shows: its kind first, then the traits it declares. A
 * second kind is dropped, so `['Service', 'Directives']` on a service page
 * reads as a service, except on an animation page, where the effect's own
 * declarable (`Directive`, `Component`, `Service`) is what an author imports
 * and stands beside `Animation`.
 */
export function pageLabels(url: string): readonly string[] {
  const page = DOC_ROUTES[routeKey(url.split(/[?#]/)[0])];
  if (!page) return [];
  const keepKinds = page.kind === 'Animation';
  const traits = page.labels.filter(l => {
    const kind = KIND_ALIASES[l] ?? l;
    return kind !== page.kind && (keepKinds || !KIND_TONES[kind]);
  });
  return page.kind ? [page.kind, ...traits] : traits;
}

/** One page carrying a label. */
export interface DocLabelledPage {
  readonly route: string;
  readonly title: string;
  readonly kind: string | null;
}

/** Every label in use, by slug, with the pages that carry it. */
export function labelIndex(): ReadonlyMap<
  string,
  { readonly label: string; readonly pages: readonly DocLabelledPage[] }
> {
  const index = new Map<string, { label: string; pages: DocLabelledPage[] }>();
  for (const [route, page] of Object.entries(DOC_ROUTES)) {
    for (const label of pageLabels(route)) {
      const slug = labelSlug(label);
      const entry = index.get(slug) ?? { label, pages: [] };
      entry.pages.push({ route, title: page.title, kind: page.kind });
      index.set(slug, entry);
    }
  }
  for (const entry of index.values()) entry.pages.sort((a, b) => a.title.localeCompare(b.title));
  return index;
}
