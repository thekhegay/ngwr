import type { ShikiLang } from '#core/shiki';

/**
 * Which snippet languages are template markup. `useExampleFiles` asks on every
 * docs page whether a snippet gets a TS tab, so this stays free of the selector
 * map.
 */

/** Angular templates — the fragment shape most snippets on the site are. */
const TEMPLATE: ReadonlySet<ShikiLang> = new Set<ShikiLang>(['html', 'angular-html', 'angular-template']);

const isTemplateLanguage = (language: ShikiLang): boolean => TEMPLATE.has(language);

export { isTemplateLanguage };
