import { describe, expect, it } from 'vitest';

import { lucide, lucideIcons, type LucideIconNode } from './adapter';

/** What `lucide` hands out: `[tag, attrs]` tuples for the inner SVG children. */
const PLUS: LucideIconNode = [
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'M12 5v14' }],
];

/**
 * The adapter is a string builder, and the string is the whole product: it is inlined
 * into the DOM by `WrIcon`, so a lost attribute is an icon that renders at the wrong
 * size, in the wrong colour, or not at all.
 *
 * Two things are worth pinning above all. The envelope has to stay
 * byte-for-byte what upstream's own `createElement` emits, or a Lucide icon beside a
 * hand-written one stops matching. And the registered name is the key VERBATIM —
 * every other adapter behaves that way, and a helper that quietly kebab-cased or
 * lower-cased its keys would break `<wr-icon name>` lookups that look correct in the
 * source.
 */
describe('lucide adapter', () => {
  it('wraps the children in the upstream envelope', () => {
    const { data } = lucide('plus', PLUS);

    expect(data.startsWith('<svg ')).toBe(true);
    expect(data.endsWith('</svg>')).toBe(true);
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
    // `wr-icon__svg` is what the icon component's own stylesheet sizes; `lucide` is
    // upstream's marker, kept so a consumer's Lucide-wide CSS still applies.
    expect(lucide('plus', PLUS).data).toContain('class="wr-icon__svg lucide"');
  });

  it('renders every child as a self-closing tag, in order', () => {
    const { data } = lucide('plus', PLUS);

    expect(data).toContain('<path d="M5 12h14"/><path d="M12 5v14"/>');
  });

  it('keeps numeric attributes as numbers rather than dropping them', () => {
    const circle: LucideIconNode = [['circle', { cx: 12, cy: 12, r: 10 }]];

    expect(lucide('circle', circle).data).toContain('<circle cx="12" cy="12" r="10"/>');
  });

  it('drops an attribute that is undefined, and only that one', () => {
    // Upstream's tuples carry optional slots; emitting `key="undefined"` would put a
    // literal string into the SVG and, for something like `stroke`, paint it.
    const partial: LucideIconNode = [['path', { d: 'M5 12h14', stroke: undefined, fill: 'none' }]];

    const { data } = lucide('partial', partial);
    expect(data).toContain('<path d="M5 12h14" fill="none"/>');
    expect(data).not.toContain('undefined');
  });

  it('takes the name exactly as given', () => {
    expect(lucide('chevron-down', PLUS).name).toBe('chevron-down');
    expect(lucide('ChevronDown', PLUS).name).toBe('ChevronDown');
  });

  it('renders an icon with no children as an empty envelope', () => {
    const { data } = lucide('blank', []);

    expect(data).toContain('<svg ');
    expect(data).toContain('></svg>');
  });

  it('wraps a bag of icons, keys verbatim and order preserved', () => {
    const defs = lucideIcons({ plus: PLUS, 'chevron-down': PLUS });

    expect(defs.map(def => def.name)).toEqual(['plus', 'chevron-down']);
    expect(defs[0].data).toBe(lucide('plus', PLUS).data);
  });

  it('accepts an empty bag', () => {
    expect(lucideIcons({})).toEqual([]);
  });

  /**
   * The serializer built `${key}="${value}"` out of caller-supplied strings and
   * escaped neither half, so a `Record<string, string>` whose signature looks
   * inert could write markup. Both payloads are the audit's, verbatim.
   */
  describe('hostile input', () => {
    it('escapes a value that would otherwise close its own attribute', () => {
      const node: LucideIconNode = [['image', { href: `x" onerror="window.__hit('lucide-value-breakout')` }]];

      const { data } = lucide('evil', node);

      expect(data).not.toContain('onerror="');
      expect(data).toContain('&quot;');
    });

    it('escapes the four characters that can leave an attribute', () => {
      const node: LucideIconNode = [['path', { d: `a&b<c>d"e` }]];

      expect(lucide('escapes', node).data).toContain('<path d="a&amp;b&lt;c&gt;d&quot;e"/>');
    });

    it('refuses an attribute name that is not a name', () => {
      // A key carrying a quote or a space breaks out through the NAME half,
      // which no amount of value escaping reaches.
      const node: LucideIconNode = [['path', { d: 'M1 1', 'x" onerror="alert(1)': '2' }]];

      const { data } = lucide('evil', node);

      expect(data).toContain('<path d="M1 1"/>');
      expect(data).not.toContain('onerror');
    });

    it('refuses a tag that is not a name, and emits nothing for it', () => {
      const node: LucideIconNode = [['path onload="alert(1)" x', { d: 'M1 1' }]];

      expect(lucide('evil', node).data).toContain('></svg>');
    });

    it('still serializes a plain handler NAME, which the render sink refuses', () => {
      // `onerror` is a valid attribute name, so `onerror="…"` is its only
      // honest serialisation — escaping cannot express the difference. What
      // keeps it out of the DOM is `<wr-icon>` rebuilding from an allowlist;
      // pinned here so nobody reads this adapter as the control.
      const node: LucideIconNode = [['image', { href: 'x', onerror: `window.__hit('lucide-attr-name')` }]];

      expect(lucide('evil', node).data).toContain('onerror=');
    });
  });
});
