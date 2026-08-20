/**
 * Cheap parse guards for a template fragment.
 *
 * Not every snippet on a docs page is markup that could run. Some are
 * ILLUSTRATIVE: `wr-mention` shows what the directive renders, with `<!-- -->`
 * commentary sitting inside the tag; the migration guide shows a diff whose
 * `-`/`+` lines carry CSS braces; a testing guide names `<textarea>` with no
 * closing tag because it is naming an element, not writing one. Every one of
 * them resolves cleanly against the selector map and none of them compiles, so
 * the name scan alone cannot tell them apart from a demo.
 *
 * These three checks are the shapes that turned up when the site's template
 * snippets were run through the sandbox in bulk, each phrased as the Angular
 * error it prevents. They are deliberately conservative in the safe direction:
 * a false positive costs the source fallback, a false negative costs a blank
 * page. (No script reproduces that sweep, so no count is quoted for it — the
 * three examples above are named individually because those can be looked up.)
 */

/**
 * Elements HTML closes for you. Anything else has to be closed or self-closed.
 *
 * `ng-content` is deliberately NOT here, though it reads like it belongs.
 * Angular's own tag definition says otherwise — `getHtmlTagDefinition('ng-content').isVoid`
 * is `false` — so `<ng-content></ng-content>` is the valid paired form and the
 * more common way to write it. Listing it here skipped the open and still
 * counted the close, which reported perfectly good markup as
 * "`<ng-content>` is opened and never closed". The self-closing spelling is
 * covered by the `tag[3] === '/'` branch below, the same as any other element.
 */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const OPEN_TAG = /<([a-zA-Z][\w:-]*)((?:'[^']*'|"[^"]*"|[^'">])*?)(\/?)>/g;
const CLOSE_TAG = /<\/([a-zA-Z][\w:-]*)\s*>/g;

/** Tags whose opens and closes do not balance, in source order. */
function unbalancedTags(source: string): string[] {
  const open = new Map<string, number>();
  for (const tag of source.matchAll(OPEN_TAG)) {
    const name = tag[1].toLowerCase();
    if (tag[3] === '/' || VOID_ELEMENTS.has(name)) continue;
    open.set(name, (open.get(name) ?? 0) + 1);
  }
  for (const tag of source.matchAll(CLOSE_TAG)) {
    const name = tag[1].toLowerCase();
    open.set(name, (open.get(name) ?? 0) - 1);
  }
  return [...open.entries()].filter(([, n]) => n !== 0).map(([name]) => `<${name}>`);
}

/**
 * Whether a bare `{` survives outside an interpolation or a control-flow block.
 *
 * Angular reads one as the start of an ICU message and fails the parse. Tags go
 * first and whole, which also takes their attribute values with them — a
 * `[from]="{ opacity: 0 }"` is an expression, not markup, and flagging it would
 * fail every animation demo on the site.
 */
function hasStrayBrace(source: string): boolean {
  const text = source
    .replace(OPEN_TAG, '')
    .replace(CLOSE_TAG, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')
    .replace(/@let\s[\s\S]*?;/g, '')
    .replace(/@[a-zA-Z]+(?:\s+if)?\s*(?:\([\s\S]*?\))?\s*\{/g, '');
  return text.includes('{');
}

/** Reasons the fragment cannot be parsed as a template. Empty means it can. */
function checkWellFormed(template: string): string[] {
  const source = template.replace(/<!--[\s\S]*?-->/g, '');
  const problems: string[] = [];

  // Against the RAW fragment, not the comment-stripped one, and that is the
  // whole point: `wr-mention`'s snippet annotates its attributes in place, and
  // stripping the comments first repairs the tag here while the generated
  // `app.html` still carries them and still fails to parse.
  if ([...template.matchAll(OPEN_TAG)].some(tag => tag[2].includes('<!--'))) {
    problems.push('The markup carries commentary inside a tag, so it is not a template that parses.');
  }

  const unbalanced = unbalancedTags(source);
  if (unbalanced.length > 0) {
    problems.push(`${unbalanced.join(', ')} ${unbalanced.length === 1 ? 'is' : 'are'} opened and never closed.`);
  }

  if (hasStrayBrace(source)) {
    problems.push('The markup contains a `{` outside an interpolation, which Angular reads as an ICU message.');
  }

  return problems;
}

export { checkWellFormed };
