import type { ShikiLang } from '#core/shiki';

/**
 * One source file exactly as the docs page shows it — the same shape
 * `<ngwr-doc-code>` renders, so a page hands the sandbox what it already has
 * instead of restating its own snippet in a second place.
 *
 * Structurally identical to `DocCodeFile`, and declared separately anyway: a
 * `readonly DocCodeFile[]` passes straight in, while `#core/sandbox` stays free
 * of a dependency on `#core/components` that would point back at it.
 */
export interface SandboxFile {
  /** Tab label — `'TS'`, `'HTML'`, `'release-notes.md'`. */
  readonly label: string;
  readonly language: ShikiLang;
  readonly code: string;
}

/** What a docs page asks the sandbox to open. */
export interface SandboxRequest {
  /** Project title on StackBlitz. Usually the page + section heading. */
  readonly title: string;
  readonly description?: string;
  /** The snippet, in the order the page shows it. */
  readonly files: readonly SandboxFile[];
}

/**
 * How the request was turned into an app — reported so a caller can tell a
 * wired-up demo from the `pre` fallback without re-deriving it.
 *
 * - `component` — a snippet that already declared its own `@Component`.
 * - `template`  — a fragment wrapped in a synthesised component.
 * - `source`    — nothing resolved; the project renders the snippet as text.
 */
export type SandboxKind = 'component' | 'template' | 'source';

/** A bootable project: every file StackBlitz needs, plus the one to open. */
export interface SandboxProject {
  readonly files: Readonly<Record<string, string>>;
  /** Path StackBlitz opens in the editor pane. */
  readonly openFile: string;
  readonly kind: SandboxKind;
  /**
   * Why the project fell back to `source`, when it did. Empty otherwise.
   * Written into the generated app as a comment, so the reason travels with
   * the code rather than living only in a console the user never opens.
   */
  readonly reasons: readonly string[];
}
