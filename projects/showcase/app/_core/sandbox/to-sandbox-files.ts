import type { SandboxFile } from './types';

import type { ShikiLang } from '#core/shiki';
import { stripIndent } from '#core/utils';

/**
 * Normalises the `files` / `code` + `language` pair every doc component takes
 * into the snippet the sandbox reads.
 *
 * Shared rather than written twice, because the two callers must agree: if
 * `<ngwr-doc-snippet>` de-indented and `<ngwr-doc-playground>` did not, the
 * same snippet would open as two different projects depending on which
 * component the page happened to use. De-indenting is the part that matters —
 * the page writes its source inside an indented template literal, and the
 * generated `app.html` is a real file where that indentation would show.
 */
function toSandboxFiles(
  files: readonly SandboxFile[] | null,
  code: string,
  language: ShikiLang
): readonly SandboxFile[] {
  const source = files && files.length > 0 ? files : [{ label: language, language, code }];
  return source.filter(f => f.code.trim().length > 0).map(f => ({ ...f, code: stripIndent(f.code) }));
}

export { toSandboxFiles };
