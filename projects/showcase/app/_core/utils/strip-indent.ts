/**
 * Removes common leading whitespace from every line in a template string.
 *
 * Lets you write indented multi-line code in TS without that indentation
 * appearing in the rendered output.
 *
 * @example
 * ```ts
 * const code = stripIndent(`
 *   <wr-btn>Click</wr-btn>
 *   <wr-btn>Another</wr-btn>
 * `);
 * // → '<wr-btn>Click</wr-btn>\n<wr-btn>Another</wr-btn>'
 * ```
 */
export function stripIndent(input: string): string {
  const lines = input.split('\n');

  // Drop leading/trailing blank lines
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

  // Find minimum indent across non-empty lines
  const indents = lines.filter(l => l.trim().length > 0).map(l => /^(\s*)/.exec(l)?.[1].length ?? 0);

  const min = indents.length ? Math.min(...indents) : 0;

  return lines.map(l => l.slice(min)).join('\n');
}
