import type { SandboxFile } from './types';

import type { ShikiLang } from '#core/shiki';

/**
 * Which snippet languages are template markup or TypeScript. `useExampleFiles`
 * asks on every docs page whether a snippet gets a TS tab, so this stays free
 * of the selector map.
 */

/** Angular templates — the fragment shape most snippets on the site are. */
const TEMPLATE: ReadonlySet<ShikiLang> = new Set<ShikiLang>(['html', 'angular-html', 'angular-template']);

/** TypeScript — may or may not carry a whole `@Component`; the builder decides. */
const TYPESCRIPT: ReadonlySet<ShikiLang> = new Set<ShikiLang>(['typescript', 'angular-ts']);

const isTemplateLanguage = (language: ShikiLang): boolean => TEMPLATE.has(language);

const isTypeScriptLanguage = (language: ShikiLang): boolean => TYPESCRIPT.has(language);

/**
 * Whether the StackBlitz button was worth offering for a snippet: only for
 * template or TypeScript code, never for `bash`, `scss`, `diff` or `markdown`.
 * Left over from the sandbox v15 removed; nothing imports it.
 */
const canSandbox = (files: readonly SandboxFile[]): boolean =>
  files.some(f => f.code.trim().length > 0 && (isTemplateLanguage(f.language) || isTypeScriptLanguage(f.language)));

export { canSandbox, isTemplateLanguage, isTypeScriptLanguage };
