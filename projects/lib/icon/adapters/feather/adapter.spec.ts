import { describe, expect, it } from 'vitest';

import { feather, featherIcons } from './adapter';

/** What `feather-icons` ships in `dist/icons.json`: inner SVG markup, no wrapper. */
const PLUS = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';

/**
 * The counterpart to the Lucide adapter, and deliberately simpler: Feather already
 * hands over rendered inner markup, so this one only supplies the envelope. That
 * makes the envelope the entire contract — it has to stay what `feather.replace()`
 * emits in a browser, or an icon registered through here stops matching one the
 * consumer pasted from upstream.
 *
 * The keys are ALIASES, which is the difference worth pinning: the bulk helper lets a
 * project register `close` for what upstream calls `x`, so the name is taken verbatim
 * and never derived from the markup.
 */
describe('feather adapter', () => {
  it('wraps the markup in the upstream envelope', () => {
    const { data } = feather('plus', PLUS);

    expect(data.startsWith('<svg ')).toBe(true);
    expect(data.endsWith(`${PLUS}</svg>`)).toBe(true);
    for (const attribute of [
      'xmlns="http://www.w3.org/2000/svg"',
      'width="24"',
      'height="24"',
      'viewBox="0 0 24 24"',
      'fill="none"',
      'stroke="currentColor"',
      'stroke-width="2"',
      'stroke-linecap="round"',
      'stroke-linejoin="round"',
    ]) {
      expect(data).toContain(attribute);
    }
  });

  it('carries both classes the library styles against', () => {
    expect(feather('plus', PLUS).data).toContain('class="wr-icon__svg feather"');
  });

  it('passes the inner markup through untouched', () => {
    // No parsing, no re-serialising: whatever upstream ships is what renders, which is
    // why an icon set can be upgraded without touching this adapter.
    expect(feather('plus', PLUS).data).toContain(PLUS);
  });

  it('registers under the alias it was given, not under anything derived', () => {
    expect(feather('close', PLUS).name).toBe('close');
    expect(featherIcons({ close: PLUS, 'chevron-down': PLUS }).map(def => def.name)).toEqual(['close', 'chevron-down']);
  });

  it('renders an empty icon as an empty envelope', () => {
    expect(feather('blank', '').data).toContain('></svg>');
  });

  it('accepts an empty bag', () => {
    expect(featherIcons({})).toEqual([]);
  });

  it('builds each entry exactly as the single helper would', () => {
    expect(featherIcons({ plus: PLUS })[0]).toEqual(feather('plus', PLUS));
  });
});
