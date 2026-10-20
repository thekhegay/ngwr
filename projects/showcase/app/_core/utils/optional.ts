import { routeKey } from './since';

/**
 * Routes that document an optional part of ngwr: a general-purpose helper that
 * is not a component and that the components never need from you — CSS
 * utilities, typography, formatting pipes, validators, browser-API services.
 * Components, and whatever configures them (theme, density, i18n, icons,
 * overlay, dates), are the library itself and stay unmarked.
 *
 * A prefix covers a whole cluster. The sidebar and the page header both read
 * this list, so the two marks cannot disagree.
 */
const OPTIONAL_ROUTES: readonly string[] = [
  'guides/grid',
  'guides/typography',
  'reference/directives/affix',
  'reference/directives/autofocus',
  'reference/directives/autosize',
  'reference/directives/click-outside',
  'reference/directives/copy-to-clipboard',
  'reference/directives/typography',
  'reference/interfaces/common',
  'reference/pipes',
  'reference/services/clipboard',
  'reference/services/cookie',
  'reference/services/hotkey',
  'reference/services/meta',
  'reference/services/platform',
  'reference/services/scroll',
  'reference/utils',
  'reference/validators',
];

/** Whether a nav row or a page URL documents something optional. */
export function isOptionalLink(url: string | undefined): boolean {
  if (!url) return false;
  const key = routeKey(url.split(/[?#]/)[0]);
  return OPTIONAL_ROUTES.some(r => key === r || key.startsWith(`${r}/`));
}
