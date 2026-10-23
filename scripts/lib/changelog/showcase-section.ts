/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * Moves the docs site's own entries out of a release's library sections.
 *
 * A commit scoped `showcase` (or `showcase-…`, `showcase/…`) changes ngwr.dev,
 * not the package, yet the preset files it under Features or Bug Fixes beside
 * the library's changes, where it is most of the list. Each such entry, from
 * every `###` section of the release, moves to one `### Showcase` section at the
 * end. The `showcase` part of its scope is dropped since the heading now says
 * it, a sub-scope after a slash stays, and a section left empty is removed.
 */

const RELEASE = /^## /;
const SECTION = /^### /;
const ENTRY = /^\* /;
const SHOWCASE_ENTRY = /^\* \*\*showcase(?:-[\w-]+)?(?:\/([\w/-]+))?:\*\* /;

/** One `### ` section: its heading line and its body lines. */
interface Section {
  readonly heading: string;
  readonly lines: string[];
}

/** Applies the move to one release section (from `## [x.y.z]` to the next). */
function moveInRelease(release: string[]): string[] {
  const head: string[] = [];
  const sections: Section[] = [];
  for (const line of release) {
    if (SECTION.test(line)) sections.push({ heading: line, lines: [] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
    else head.push(line);
  }

  const moved: string[] = [];
  for (const section of sections) {
    const kept: string[] = [];
    let moving = false;
    for (const line of section.lines) {
      // An entry runs until the next one; a breaking note can wrap.
      if (ENTRY.test(line)) moving = SHOWCASE_ENTRY.test(line);
      (moving ? moved : kept).push(line);
    }
    section.lines.splice(0, section.lines.length, ...kept);
  }
  if (!moved.length) return release;

  const live = sections.filter(section => section.lines.some(line => ENTRY.test(line)));
  const out = [...head];
  for (const section of live) out.push(section.heading, ...trimEnd(section.lines), '');
  out.push(
    '### Showcase',
    '',
    ...moved
      .filter(line => line.trim() !== '')
      .map(line => line.replace(SHOWCASE_ENTRY, (_, sub?: string) => (sub ? `* **${sub}:** ` : '* '))),
    ''
  );
  return out;
}

function trimEnd(lines: readonly string[]): string[] {
  const out = [...lines];
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  return out;
}

/** Applies the move to every release in `text`, a whole changelog or one section. */
export function moveShowcaseEntries(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let release: string[] | null = null;
  for (const line of lines) {
    if (RELEASE.test(line)) {
      if (release) out.push(...moveInRelease(release));
      release = [line];
    } else if (release) {
      release.push(line);
    } else {
      out.push(line);
    }
  }
  if (release) out.push(...moveInRelease(release));
  return out.join('\n');
}
