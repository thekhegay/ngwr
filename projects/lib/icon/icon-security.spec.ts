import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { feather } from './adapters/feather/adapter';
import { lucide, type LucideIconNode } from './adapters/lucide/adapter';
import { WrIcon } from './icon';
import { provideWrIcons } from './providers/provide-wr-icons';
import { svgIcon } from './svg-icon';

/**
 * The payloads, verbatim, from an audit of ngwr 13.0.0 that ran them against a
 * production build of a real Angular app. Eight of these executed there:
 * `<wr-icon>` assigned `WrIconDef.data` to `innerHTML`, and nothing on the path
 * from `provideWrIcons()` sanitized anything. Each calls `window.__hit(id)`
 * exactly as the corpus does, so the strings here are the strings that ran.
 *
 * Keep them intact. Softening a payload — dropping the handler, closing the tag
 * "properly" — turns this file into a test that asserts sanitization of
 * something that was never dangerous.
 *
 * jsdom fires no `onerror` and loads no resource, so "did it execute" is not a
 * question this suite can ask directly. It asks the two questions that decide
 * the answer instead: the payload IS live markup (proved against the old sink,
 * `element.innerHTML = data`, in the same test), and after `<wr-icon>` renders
 * it the executable part is not in the document at all.
 */
const PAYLOADS = {
  svgOnload: `<svg viewBox="0 0 24 24" onload="window.__hit('icon-svg-onload')"><path d="M0 0h24v24H0z"/></svg>`,
  imageOnerror: `<svg viewBox="0 0 24 24"><image href="x" onerror="window.__hit('icon-img-onerror')"/></svg>`,
  htmlSibling: `<svg viewBox="0 0 24 24"></svg><img src=x onerror="window.__hit('icon-html-img-onerror')">`,
  foreignObject: `<svg viewBox="0 0 24 24"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror="window.__hit('icon-foreignobject')"></body></foreignObject></svg>`,
  script: `<svg viewBox="0 0 24 24"></svg><script>window.__hit('icon-script')</script>`,
  animate: `<svg viewBox="0 0 24 24"><a><animate attributeName="href" values="javascript:window.__hit('icon-animate')"/><text x="0" y="12">click</text></a></svg>`,
} as const;

/** Inner SVG handed to `feather()`, which interpolates it into a fixed shell. */
const FEATHER_INNER = {
  image: `<image href="x" onerror="window.__hit('feather-inner-image')"/>`,
  shellEscape: `</svg><img src=x onerror="window.__hit('feather-shell-escape')">`,
} as const;

/** IconNode tuples handed to `lucide()`, whose serializer built `${key}="${value}"`. */
const LUCIDE_NODE: Record<'attrName' | 'valueBreakout', LucideIconNode> = {
  attrName: [['image', { href: 'x', onerror: `window.__hit('lucide-attr-name')` }]],
  valueBreakout: [['image', { href: `x" onerror="window.__hit('lucide-value-breakout')` }]],
};

@Component({
  imports: [WrIcon],
  template: `<wr-icon [name]="name()" />`,
})
class Host {
  readonly name = signal('evil');
}

describe('WrIcon treats registered icon data as untrusted', () => {
  let warnings: string[];

  const render = (data: string): HTMLElement => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideWrIcons([svgIcon('evil', data)])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('wr-icon')!;
  };

  /**
   * The old sink, reproduced. Every assertion below that says "gone" is only
   * worth reading next to this: it shows the same string putting the same
   * executable node into the same jsdom, which is what makes the payload a
   * payload rather than a well-formed icon.
   */
  const throughInnerHtml = (data: string): HTMLElement => {
    const el = document.createElement('div');
    el.innerHTML = data;
    return el;
  };

  /** Every attribute in the subtree, host included, flattened for inspection. */
  const attributesOf = (root: Element): string[] => {
    const names: string[] = [];
    const walk = (el: Element): void => {
      for (const attribute of Array.from(el.attributes)) names.push(attribute.name);
      for (const child of Array.from(el.children)) walk(child);
    };
    walk(root);
    return names;
  };

  beforeEach(() => {
    warnings = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => void warnings.push(args.join(' ')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('direct registration', () => {
    it('drops an onload handler off the svg root', () => {
      expect(throughInnerHtml(PAYLOADS.svgOnload).querySelector('svg')!.hasAttribute('onload')).toBe(true);

      const host = render(PAYLOADS.svgOnload);

      expect(host.querySelector('svg')).not.toBeNull();
      expect(attributesOf(host)).not.toContain('onload');
      // The icon itself still arrives — this is a rebuild, not a rejection.
      expect(host.querySelector('path')!.getAttribute('d')).toBe('M0 0h24v24H0z');
    });

    it('drops an <image>, whose onerror fires on any unreachable href', () => {
      expect(throughInnerHtml(PAYLOADS.imageOnerror).querySelector('image')).not.toBeNull();

      const host = render(PAYLOADS.imageOnerror);

      expect(host.querySelector('image')).toBeNull();
      expect(attributesOf(host)).not.toContain('onerror');
    });

    it('drops an <img> smuggled in after a closed </svg>', () => {
      // The most quietly dangerous of the six: the icon markup ahead of it is
      // impeccable, so anything inspecting "the icon" sees a valid glyph.
      expect(throughInnerHtml(PAYLOADS.htmlSibling).querySelector('img')).not.toBeNull();

      const host = render(PAYLOADS.htmlSibling);

      expect(host.querySelector('img')).toBeNull();
      expect(host.querySelectorAll('svg')).toHaveLength(1);
    });

    it('drops a <foreignObject> and the XHTML inside it', () => {
      expect(throughInnerHtml(PAYLOADS.foreignObject).querySelector('img')).not.toBeNull();

      const host = render(PAYLOADS.foreignObject);

      expect(host.querySelector('foreignObject')).toBeNull();
      expect(host.querySelector('img')).toBeNull();
      expect(attributesOf(host)).not.toContain('onerror');
    });

    it('drops a <script>, which innerHTML alone left in the DOM', () => {
      // This one never executed through innerHTML — the boundary is worth
      // pinning, because "it did not fire" was a property of the browser, not
      // of the library, and a future sink might not inherit it.
      expect(throughInnerHtml(PAYLOADS.script).querySelector('script')).not.toBeNull();

      expect(render(PAYLOADS.script).querySelector('script')).toBeNull();
    });

    it('drops SMIL animation and the <a> it would retarget', () => {
      // Blocked in current Chromium rather than by anything ngwr did; an
      // `<animate attributeName="href">` reaching a javascript: URL is one
      // engine change away from being live again.
      expect(throughInnerHtml(PAYLOADS.animate).querySelector('animate')).not.toBeNull();

      const host = render(PAYLOADS.animate);

      expect(host.querySelector('animate')).toBeNull();
      // A refused element takes its subtree with it, so the `<text>` inside
      // this `<a>` goes too. Hoisting the children of a refused element would
      // keep more of a hand-drawn icon and is exactly the kind of cleverness
      // that turns "what did the parser see" into a question — so the rule is
      // the blunt one, and the dev-mode warning names what went.
      expect(host.querySelector('a')).toBeNull();
      expect(host.querySelector('text')).toBeNull();
      expect(host.querySelector('svg')).not.toBeNull();
    });

    it('names what it removed, once, in dev mode', () => {
      // A silently stripped icon is the failure this rebuild could introduce:
      // a consumer's own glyph renders wrong and nothing says why.
      render(PAYLOADS.foreignObject);

      expect(warnings.join(' ')).toContain('foreignObject');
      expect(warnings.join(' ')).toContain('evil');
    });
  });

  describe('through the shipped adapters', () => {
    it('neutralises inner SVG carrying a handler', () => {
      const host = render(feather('plus', FEATHER_INNER.image).data);

      expect(host.querySelector('image')).toBeNull();
      expect(attributesOf(host)).not.toContain('onerror');
    });

    it('neutralises inner SVG that closes the envelope early', () => {
      // `innerSvg` is markup by construction, so `feather()` cannot escape it
      // and stay the adapter it is. Only the first <svg> root is rebuilt, so
      // what the payload opens after closing the shell is not a child of
      // anything and never lands.
      const data = feather('plus', FEATHER_INNER.shellEscape).data;
      expect(throughInnerHtml(data).querySelector('img')).not.toBeNull();

      const host = render(data);

      expect(host.querySelector('img')).toBeNull();
    });

    it('serializes a hostile attribute value without letting it break out', () => {
      // The serialiser defect, tested where it lives: the quote in the value
      // used to close `href` and open `onerror` as a second, real attribute.
      const data = lucide('evil', LUCIDE_NODE.valueBreakout).data;

      expect(data).not.toContain('onerror="');
      expect(data).toContain('&quot;');
      expect(throughInnerHtml(data).querySelector('[onerror]')).toBeNull();
      expect(attributesOf(render(data))).not.toContain('onerror');
    });

    it('refuses a handler smuggled in as an attribute NAME', () => {
      // Escaping cannot help here — `onerror` is a valid attribute name and
      // `onerror="…"` is its only honest serialisation. The sink is what
      // refuses it, and `<image>` with it.
      const data = lucide('evil', LUCIDE_NODE.attrName).data;
      expect(throughInnerHtml(data).querySelector('[onerror]')).not.toBeNull();

      const host = render(data);

      expect(host.querySelector('image')).toBeNull();
      expect(attributesOf(host)).not.toContain('onerror');
    });
  });

  describe('what a legitimate icon keeps', () => {
    it('leaves a real stroke icon byte-identical in structure', () => {
      const real =
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ` +
        `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
        `class="wr-icon__svg lucide"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

      const svg = render(real).querySelector('svg')!;

      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.getAttribute('class')).toBe('wr-icon__svg lucide');
      expect(svg.getAttribute('stroke-linejoin')).toBe('round');
      expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
      expect(Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d'))).toEqual(['M5 12h14', 'M12 5v14']);
      expect(warnings).toEqual([]);
    });

    it('keeps a filled icon with fill-rule and clip-rule', () => {
      // The Heroicons/Tabler shape: solid paths carrying the even-odd pair.
      const real =
        `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">` +
        `<path fill-rule="evenodd" clip-rule="evenodd" d="M8 3a5 5 0 100 10A5 5 0 008 3z" fill="#0F172A"/></svg>`;

      const path = render(real).querySelector('path')!;

      expect(path.getAttribute('fill-rule')).toBe('evenodd');
      expect(path.getAttribute('clip-rule')).toBe('evenodd');
      expect(path.getAttribute('fill')).toBe('#0F172A');
      expect(warnings).toEqual([]);
    });

    it('keeps every shape primitive the shipped sets use', () => {
      const real =
        `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><ellipse cx="4" cy="4" rx="2" ry="1"/>` +
        `<line x1="1" y1="1" x2="2" y2="2"/><rect x="0" y="0" width="4" height="4" rx="1"/>` +
        `<polyline points="1,1 2,2"/><polygon points="0,0 1,1 2,0"/><path d="M1 1" opacity="0.5"/></svg>`;

      const svg = render(real).querySelector('svg')!;

      for (const tag of ['circle', 'ellipse', 'line', 'rect', 'polyline', 'polygon', 'path']) {
        expect(svg.querySelector(tag), tag).not.toBeNull();
      }
      expect(svg.querySelector('rect')!.getAttribute('rx')).toBe('1');
      expect(warnings).toEqual([]);
    });

    it('keeps a gradient, a clip path and the fragment references into them', () => {
      // The shape a hand-drawn brand logo takes. None of the four shipped sets
      // needs it, so excluding it would have broken exactly the consumers this
      // API exists for, silently.
      const real =
        `<svg viewBox="0 0 24 24"><title>Logo</title><defs>` +
        `<linearGradient id="g" gradientUnits="userSpaceOnUse" gradientTransform="rotate(20)">` +
        `<stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<clipPath id="c"><rect x="0" y="0" width="8" height="8"/></clipPath></defs>` +
        `<g clip-path="url(#c)"><path d="M1 1" fill="url(#g)"/></g><use href="#c"/></svg>`;

      const svg = render(real).querySelector('svg')!;

      expect(svg.querySelector('title')!.textContent).toBe('Logo');
      expect(svg.querySelector('linearGradient')!.getAttribute('gradientTransform')).toBe('rotate(20)');
      expect(svg.querySelectorAll('stop')).toHaveLength(2);
      expect(svg.querySelector('g')!.getAttribute('clip-path')).toBe('url(#c)');
      expect(svg.querySelector('path')!.getAttribute('fill')).toBe('url(#g)');
      expect(svg.querySelector('use')!.getAttribute('href')).toBe('#c');
      expect(warnings).toEqual([]);
    });
  });

  describe('references that leave the document', () => {
    it('drops an href that is not a same-document fragment', () => {
      // `<use>` is the one element that legitimately dereferences something,
      // and a remote one is a fetch the page never asked for.
      const host = render(`<svg viewBox="0 0 24 24"><use href="https://example.test/sprite.svg#x"/></svg>`);

      expect(host.querySelector('use')).not.toBeNull();
      expect(host.querySelector('use')!.hasAttribute('href')).toBe(false);
    });

    it('drops a javascript: href outright', () => {
      const host = render(`<svg viewBox="0 0 24 24"><use href="javascript:window.__hit('use')"/></svg>`);

      expect(attributesOf(host)).not.toContain('href');
    });

    it('drops a url() reference pointing off-document', () => {
      const host = render(`<svg viewBox="0 0 24 24"><path d="M1 1" fill="url(https://example.test/#g)"/></svg>`);

      expect(host.querySelector('path')!.hasAttribute('fill')).toBe(false);
    });

    it('stops recursing past the depth cap, and says where it stopped', () => {
      // The cap exists so a hostile registration cannot recurse the rebuild
      // into a stack overflow. The deepest icon in the four shipped sets nests
      // three levels, so nothing real comes near it.
      const deep = `<svg viewBox="0 0 24 24">${'<g>'.repeat(40)}<path d="M1 1"/>${'</g>'.repeat(40)}</svg>`;

      const host = render(deep);

      expect(host.querySelector('svg')).not.toBeNull();
      expect(host.querySelectorAll('g').length).toBeLessThan(40);
      expect(host.querySelector('path')).toBeNull();
      expect(warnings.join(' ')).toContain('deeper than');
    });

    it('drops a style attribute, which no icon set uses and any CSS fits in', () => {
      const host = render(
        `<svg viewBox="0 0 24 24"><path d="M1 1" style="background-image:url(https://example.test/beacon)"/></svg>`
      );

      expect(host.querySelector('path')!.hasAttribute('style')).toBe(false);
      expect(warnings.join(' ')).toContain('style');
    });
  });
});
