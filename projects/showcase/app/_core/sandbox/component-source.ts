import { isTemplateLanguage, isTypeScriptLanguage } from './languages';
import type { SandboxFile } from './types';

/**
 * Recognises a snippet that is already a whole component, so the sandbox can
 * ship it verbatim instead of synthesising one around it.
 *
 * A docs snippet is usually an excerpt: a decorator with three of its
 * properties, no imports, no class body. Those cannot boot, and half-repairing
 * them — inventing the missing import lines, guessing a selector — produces a
 * file the visitor never wrote and cannot match against the page. So the test
 * below is deliberately strict, and every rejection carries a sentence: the
 * caller puts them in the generated project, where the reason travels with the
 * code rather than dying in a console.
 *
 * What is required, and why each one:
 *
 * - an `@Component` with an INLINE `template` (or a `templateUrl` this request
 *   can pair with an HTML file of its own) — nothing else has markup to render;
 * - a plain-element `selector`, because `bootstrapApplication` mounts the
 *   component by it and `index.html` has to carry the matching tag;
 * - an exported class, because `main.ts` has to import it;
 * - an `@angular/core` import that names `Component` — the cheapest proxy for
 *   "this is a file, not an excerpt". A snippet that omits it omits the rest of
 *   its imports too, and those the sandbox genuinely cannot reconstruct.
 */

/** A snippet accepted as a whole component, plus whatever it pairs with. */
interface ComponentSource {
  /** The `.ts`, as the page shows it apart from a rewritten `templateUrl`. */
  readonly code: string;
  readonly className: string;
  /** `true` when the class is the module's default export. */
  readonly isDefaultExport: boolean;
  /** Element selector `main.ts` mounts and `index.html` carries. */
  readonly selector: string;
  /** Sibling files the decorator points at, keyed by their name in `src/app/`. */
  readonly siblings: Readonly<Record<string, string>>;
}

interface ComponentSourceResult {
  readonly source: ComponentSource | null;
  /** Empty when `source` is set; otherwise why it is not. */
  readonly reasons: readonly string[];
}

const INLINE_TEMPLATE = /\btemplate\s*:/;
const TEMPLATE_URL = /\btemplateUrl\s*:\s*['"]([^'"]+)['"]/;
const STYLE_URL = /\bstyleUrls?\s*:/;
const CORE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]@angular\/core['"]/;
const SELECTOR = /\bselector\s*:\s*['"]([a-zA-Z][\w-]*)['"]/;
const EXPORTED_CLASS = /export\s+(default\s+)?class\s+([A-Za-z_$][\w$]*)/;

function readComponentSource(files: readonly SandboxFile[]): ComponentSourceResult {
  const candidates = files.filter(f => isTypeScriptLanguage(f.language) && f.code.includes('@Component'));
  if (candidates.length === 0) return { source: null, reasons: [] };
  if (candidates.length > 1) {
    return { source: null, reasons: ['The snippet declares more than one component; the sandbox wires up one.'] };
  }

  const file = candidates[0];
  const code = file.code;
  const reasons: string[] = [];

  const core = CORE_IMPORT.exec(code);
  if (!core || !/\bComponent\b/.test(core[1])) {
    reasons.push("The snippet is an excerpt — it never imports `Component` from '@angular/core'.");
  }

  const selector = SELECTOR.exec(code);
  if (!selector) reasons.push('The `@Component` has no plain element `selector` for the app to mount.');

  const exported = EXPORTED_CLASS.exec(code);
  if (!exported) reasons.push('No exported class follows the `@Component`, so nothing can be bootstrapped.');

  if (STYLE_URL.test(code)) {
    reasons.push('The `@Component` points at a stylesheet the snippet does not show.');
  }

  const siblings: Record<string, string> = {};
  let body = code;

  if (!INLINE_TEMPLATE.test(code)) {
    const url = TEMPLATE_URL.exec(code);
    const markup = files.filter(f => isTemplateLanguage(f.language) && f.code.trim().length > 0);
    if (!url) {
      reasons.push('The `@Component` has no template at all.');
    } else if (markup.length !== 1) {
      reasons.push(`The \`templateUrl\` points at ${url[1]}, which is not among the files shown.`);
    } else {
      siblings['demo.html'] = markup[0].code;
      body = code.replace(TEMPLATE_URL, "templateUrl: './demo.html'");
    }
  }

  if (reasons.length > 0) return { source: null, reasons };

  // Every guard above has run, so the three matches are present; narrowing them
  // again would only add branches no input can reach.
  return {
    source: {
      code: body,
      className: exported?.[2] ?? '',
      isDefaultExport: exported?.[1] !== undefined,
      selector: selector?.[1] ?? '',
      siblings,
    },
    reasons: [],
  };
}

export { readComponentSource, type ComponentSource };
