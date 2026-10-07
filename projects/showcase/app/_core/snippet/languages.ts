import type { SandboxFile } from './types';

import type { ShikiLang } from '#core/shiki';

/**
 * Which snippet languages can become a running app, and the reason this module
 * is deliberately tiny: the "Open in StackBlitz" button asks the question on
 * every docs page, so the answer has to be reachable without pulling in the
 * selector map or the project builder. Everything heavy sits behind the
 * dynamic import in {@link SandboxService.open}.
 */

/** Angular templates — the fragment shape most snippets on the site are. */
const TEMPLATE: ReadonlySet<ShikiLang> = new Set<ShikiLang>(['html', 'angular-html', 'angular-template']);

/** TypeScript — may or may not carry a whole `@Component`; the builder decides. */
const TYPESCRIPT: ReadonlySet<ShikiLang> = new Set<ShikiLang>(['typescript', 'angular-ts']);

const isTemplateLanguage = (language: ShikiLang): boolean => TEMPLATE.has(language);

const isTypeScriptLanguage = (language: ShikiLang): boolean => TYPESCRIPT.has(language);

/**
 * Whether a sandbox is worth offering at all.
 *
 * `bash`, `scss`, `diff` and `markdown` snippets are not code an app can run —
 * a `ng add ngwr` transcript opened as an Angular project is noise, and an
 * empty preview pane reads as a broken feature rather than an inapplicable
 * one. So the button is absent there, not disabled: nothing to explain.
 */
const canSandbox = (files: readonly SandboxFile[]): boolean =>
  files.some(f => f.code.trim().length > 0 && (isTemplateLanguage(f.language) || isTypeScriptLanguage(f.language)));

export { canSandbox, isTemplateLanguage, isTypeScriptLanguage };
