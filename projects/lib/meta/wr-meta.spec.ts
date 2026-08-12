import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrMetaConfig } from './interfaces';
import { provideWrMeta } from './provide-wr-meta';
import { WrMeta } from './wr-meta';
import { WrMetaBinding } from './wr-meta-binding';

/**
 * `WrMeta`'s entire output is `document.head`, so every assertion here reads the
 * head back rather than the service's own signals — a `current()` that says
 * "Pricing" while the tab still says "Docs" is the failure, not the success.
 *
 * Two consequences shape this file:
 *
 * 1. Counts matter as much as contents. The failure mode of every head manager
 *    is APPENDING where it should update: the page keeps its old description
 *    tag, a crawler reads the first one, and nothing looks wrong in devtools
 *    unless you scroll. So the description / canonical cases assert the number
 *    of matching nodes, not just the value of the first.
 * 2. There is one `document.head` for the whole vitest file tree, and this spec
 *    writes into it. Anything left behind would be found by the next spec's
 *    `querySelector` and quietly satisfy it, so `afterEach` restores the head
 *    node-for-node instead of removing the tags we think we added.
 */

/** Host for the directive cases — uses `[wrMeta]` exactly the way a route would. */
@Component({
  imports: [WrMetaBinding],
  template: `<div [wrMeta]="config()"></div>`,
})
class Host {
  readonly config = signal<WrMetaConfig>({ title: 'Pricing', description: 'Plans for every team.' });
}

describe('WrMeta', () => {
  let originalTitle: string;
  let originalHead: ChildNode[];

  const setup = (defaults: WrMetaConfig = {}): WrMeta => {
    TestBed.configureTestingModule({ providers: [provideWrMeta(defaults)] });
    return TestBed.inject(WrMeta);
  };

  // Queried off `document`, not `document.head`: a duplicate that landed
  // anywhere else is still a duplicate the crawler sees.
  const tags = (selector: string): Element[] => [...document.querySelectorAll(selector)];
  const content = (selector: string): string | null | undefined => tags(selector)[0]?.getAttribute('content');
  const named = (name: string): string => `meta[name='${name}']`;
  const prop = (property: string): string => `meta[property='${property}']`;
  const canonicals = (): HTMLLinkElement[] => [...document.querySelectorAll<HTMLLinkElement>("link[rel='canonical']")];

  beforeEach(() => {
    // Resetting first destroys the previous test's injector — and with it any
    // `bind()` effect still holding a reference to the head.
    TestBed.resetTestingModule();
    originalTitle = document.title;
    originalHead = [...document.head.childNodes];
  });

  afterEach(() => {
    for (const node of [...document.head.childNodes]) if (!originalHead.includes(node)) node.remove();
    document.title = originalTitle;
  });

  describe('title', () => {
    it('writes the title to the document', () => {
      setup().set({ title: 'Pricing' });

      expect(document.title).toBe('Pricing');
    });

    it('runs the title through the template registered by provideWrMeta', () => {
      setup({ titleTemplate: '{{ title }} · ngwr' }).set({ title: 'Pricing' });

      expect(document.title).toBe('Pricing · ngwr');
    });

    it('accepts %s as the placeholder as well', () => {
      setup({ titleTemplate: '%s — ngwr' }).set({ title: 'Pricing' });

      expect(document.title).toBe('Pricing — ngwr');
    });

    it('re-applies the template to every later title', () => {
      const meta = setup({ titleTemplate: '{{ title }} · ngwr' });
      meta.set({ title: 'Pricing' });
      meta.set({ title: 'Docs' });

      // A template resolved once at bootstrap looks right on the landing page
      // and wrong on every route after it.
      expect(document.title).toBe('Docs · ngwr');
    });

    it('leaves the tab empty rather than showing the suffix alone', () => {
      const meta = setup({ titleTemplate: '{{ title }} · ngwr' });
      meta.set({ title: 'Pricing' });
      meta.reset();

      // The defaults carry a template but no title, so there is nothing to
      // render — " · ngwr" on its own is the bug this pins.
      expect(document.title).toBe('');
    });
  });

  describe('description', () => {
    it('writes one description tag into the head', () => {
      setup().set({ description: 'Plans for every team.' });

      expect(tags(named('description'))).toHaveLength(1);
      expect(content(named('description'))).toBe('Plans for every team.');
      expect(tags(named('description'))[0].parentElement).toBe(document.head);
    });

    it('updates the existing tag on the second call instead of adding another', () => {
      const meta = setup();
      meta.set({ description: 'Everything ngwr.' });
      meta.set({ description: 'Plans for every team.' });

      // The classic head-manager defect: one `addTag` per navigation leaves a
      // trail of description tags, and a crawler reads the FIRST — so the page
      // keeps advertising the copy it had three routes ago.
      expect(tags(named('description'))).toHaveLength(1);
      expect(content(named('description'))).toBe('Plans for every team.');
    });

    it('adopts a description tag that shipped in the served HTML', () => {
      const existing = document.createElement('meta');
      existing.setAttribute('name', 'description');
      existing.setAttribute('content', 'from index.html');
      document.head.appendChild(existing);

      setup().set({ description: 'Plans for every team.' });

      // The showcase prerenders every route, so the document already carries a
      // description before the service ever runs; creating a SECOND one on
      // hydration is an SSR-only duplicate that never shows up in `ng serve`.
      // The count and the content are the contract — whether the service updates
      // that node or replaces it is not, and asserting the identity would pin an
      // implementation detail the DOM cannot tell apart.
      expect(tags(named('description'))).toHaveLength(1);
      expect(content(named('description'))).toBe('Plans for every team.');
    });

    it('removes the tag when the metadata no longer carries a description', () => {
      const meta = setup();
      meta.set({ description: 'Plans for every team.' });
      meta.reset();

      expect(tags(named('description'))).toHaveLength(0);
    });
  });

  describe('scalar tags', () => {
    it('joins keywords into one comma-separated tag', () => {
      setup().set({ keywords: ['angular', 'ui', 'components'] });

      expect(content(named('keywords'))).toBe('angular, ui, components');
    });

    it('writes no keywords tag at all for an empty list', () => {
      setup().set({ keywords: [] });

      // `[].join()` is `''`, and an empty keywords tag is noise, not metadata.
      expect(tags(named('keywords'))).toHaveLength(0);
    });

    it('writes theme-color under its dashed name', () => {
      setup().set({ themeColor: '#0b5fff' });

      // The config field is camelCase; the tag the browser reads is not.
      expect(content(named('theme-color'))).toBe('#0b5fff');
      expect(tags(named('themeColor'))).toHaveLength(0);
    });
  });

  describe('open graph', () => {
    it('writes og tags on `property`, which is the attribute scrapers match', () => {
      setup().set({
        og: { title: 'Pricing', type: 'website', siteName: 'ngwr', image: 'https://ngwr.dev/og.png' },
      });

      expect(content(prop('og:title'))).toBe('Pricing');
      expect(content(prop('og:type'))).toBe('website');
      expect(content(prop('og:image'))).toBe('https://ngwr.dev/og.png');
      // `siteName` becomes `og:site_name` — the one tag name that is not a
      // straight kebab of the field.
      expect(content(prop('og:site_name'))).toBe('ngwr');
      // Open Graph on `name=` is invisible to Facebook's parser, and mixing the
      // two attributes up is the usual way a share card comes back blank.
      expect(tags(named('og:title'))).toHaveLength(0);
    });

    it('falls back to the page title, description and canonical', () => {
      setup().set({ title: 'Pricing', description: 'Plans.', canonical: 'https://ngwr.dev/pricing' });

      expect(content(prop('og:title'))).toBe('Pricing');
      expect(content(prop('og:description'))).toBe('Plans.');
      expect(content(prop('og:url'))).toBe('https://ngwr.dev/pricing');
    });

    it('prefers an explicit og value over that fallback', () => {
      setup().set({
        title: 'Pricing',
        description: 'Plans.',
        canonical: 'https://ngwr.dev/pricing',
        og: { title: 'ngwr pricing', description: 'Share copy.', url: 'https://ngwr.dev/pricing?share' },
      });

      expect(content(prop('og:title'))).toBe('ngwr pricing');
      expect(content(prop('og:description'))).toBe('Share copy.');
      expect(content(prop('og:url'))).toBe('https://ngwr.dev/pricing?share');
    });

    it('shares the untemplated title, not the one in the tab', () => {
      setup({ titleTemplate: '{{ title }} · ngwr' }).set({ title: 'Pricing' });

      // Pinned because it is a decision, not an accident: the template is tab
      // furniture, and a card reading "Pricing · ngwr" beside `og:site_name`
      // says the site name twice.
      expect(document.title).toBe('Pricing · ngwr');
      expect(content(prop('og:title'))).toBe('Pricing');
    });
  });

  describe('twitter card', () => {
    it('writes twitter tags on `name`, the mirror image of open graph', () => {
      setup().set({ twitter: { card: 'summary_large_image', creator: '@thekhegay' } });

      expect(content(named('twitter:card'))).toBe('summary_large_image');
      expect(content(named('twitter:creator'))).toBe('@thekhegay');
      expect(tags(prop('twitter:card'))).toHaveLength(0);
    });

    it('falls back to the page title and description, and to the og image', () => {
      setup().set({ title: 'Pricing', description: 'Plans.', og: { image: 'https://ngwr.dev/og.png' } });

      expect(content(named('twitter:title'))).toBe('Pricing');
      expect(content(named('twitter:description'))).toBe('Plans.');
      // One image serves both cards; demanding it twice is how a Twitter
      // preview ends up empty next to a working Facebook one.
      expect(content(named('twitter:image'))).toBe('https://ngwr.dev/og.png');
    });

    it('prefers its own image over the og one', () => {
      setup().set({ og: { image: 'https://ngwr.dev/og.png' }, twitter: { image: 'https://ngwr.dev/twitter.png' } });

      expect(content(named('twitter:image'))).toBe('https://ngwr.dev/twitter.png');
      expect(content(prop('og:image'))).toBe('https://ngwr.dev/og.png');
    });
  });

  describe('canonical link', () => {
    it('appends one canonical link to the head', () => {
      setup().set({ canonical: 'https://ngwr.dev/pricing' });

      expect(canonicals()).toHaveLength(1);
      expect(canonicals()[0].getAttribute('href')).toBe('https://ngwr.dev/pricing');
      expect(canonicals()[0].parentElement).toBe(document.head);
    });

    it('rewrites the href of the existing link rather than adding a second', () => {
      const meta = setup();
      meta.set({ canonical: 'https://ngwr.dev/pricing' });
      meta.set({ canonical: 'https://ngwr.dev/docs' });

      // Two canonicals are worse than none — a search engine discards both.
      expect(canonicals()).toHaveLength(1);
      expect(canonicals()[0].getAttribute('href')).toBe('https://ngwr.dev/docs');
    });

    it('adopts a canonical link that shipped in the served HTML', () => {
      const existing = document.createElement('link');
      existing.setAttribute('rel', 'canonical');
      existing.setAttribute('href', 'https://ngwr.dev/prerendered');
      document.head.appendChild(existing);

      setup().set({ canonical: 'https://ngwr.dev/pricing' });

      expect(canonicals()).toHaveLength(1);
      expect(canonicals()[0]).toBe(existing);
      expect(existing.getAttribute('href')).toBe('https://ngwr.dev/pricing');
    });

    it('removes the link when the canonical goes away', () => {
      const meta = setup();
      meta.set({ canonical: 'https://ngwr.dev/pricing' });
      meta.reset();

      expect(canonicals()).toHaveLength(0);
    });
  });

  describe('layering', () => {
    it('applies the defaults as soon as the service is injected', () => {
      setup({ title: 'ngwr', description: 'Angular UI components' });

      // No `set()` here: a route that never touches `WrMeta` still needs a head.
      expect(document.title).toBe('ngwr');
      expect(content(named('description'))).toBe('Angular UI components');
    });

    it('merges a pushed layer over the one below', () => {
      const meta = setup();
      meta.set({ title: 'Docs', description: 'Everything ngwr.' });
      meta.push({ title: 'Select' });

      expect(document.title).toBe('Select');
      // A push is an override, not a replacement — if it were the latter every
      // partial push would blank the fields it did not mention.
      expect(content(named('description'))).toBe('Everything ngwr.');
    });

    it('restores the layer below when the handle pops', () => {
      const meta = setup();
      meta.set({ title: 'Docs', description: 'Everything ngwr.' });
      const handle = meta.push({ title: 'Select', description: 'The select component.' });
      handle.pop();

      expect(document.title).toBe('Docs');
      expect(content(named('description'))).toBe('Everything ngwr.');
    });

    it('set() replaces the top layer instead of stacking another one', () => {
      const meta = setup();
      meta.set({ title: 'Docs', description: 'Everything ngwr.' });
      meta.set({ title: 'Select' });

      // Two `set()`s are two route activations, not a nesting: the first
      // route's description must not leak onto the second.
      expect(document.title).toBe('Select');
      expect(tags(named('description'))).toHaveLength(0);
    });

    it('deep-merges the og group instead of dropping the defaults', () => {
      const meta = setup({ og: { siteName: 'ngwr', type: 'website' } });
      meta.set({ og: { image: 'https://ngwr.dev/og.png' } });

      // `og` is a GROUP: a page that only supplies an image still belongs to
      // the same site, so a plain scalar spread would silently drop site_name.
      expect(content(prop('og:site_name'))).toBe('ngwr');
      expect(content(prop('og:type'))).toBe('website');
      expect(content(prop('og:image'))).toBe('https://ngwr.dev/og.png');
    });

    it('reset() goes back to the provided defaults, not to nothing', () => {
      const meta = setup({ description: 'Angular UI components', og: { siteName: 'ngwr' } });
      meta.set({ title: 'Pricing', description: 'Plans.' });
      meta.reset();

      expect(document.title).toBe('');
      expect(content(named('description'))).toBe('Angular UI components');
      expect(content(prop('og:site_name'))).toBe('ngwr');
    });

    it('pop() never eats the defaults layer', () => {
      const meta = setup({ description: 'Angular UI components' });
      meta.pop();
      meta.pop();

      // An unbalanced pop is a bug in the caller; losing the app's baseline
      // metadata because of it is a bug here.
      expect(content(named('description'))).toBe('Angular UI components');
    });

    it('current() reports the merged stack, not the last argument', () => {
      const meta = setup({ description: 'Angular UI components', og: { siteName: 'ngwr' } });
      meta.set({ title: 'Pricing' });

      const snapshot = meta.current();

      expect(snapshot.title).toBe('Pricing');
      expect(snapshot.description).toBe('Angular UI components');
      expect(snapshot.og?.siteName).toBe('ngwr');
      // It is a snapshot of what is in the head, so it has to agree with it.
      expect(snapshot.description).toBe(content(named('description')));
    });
  });

  describe('bind', () => {
    it('re-applies the head when a signal the factory read changes', () => {
      const meta = setup({ titleTemplate: '{{ title }} · ngwr' });
      const locale = signal('en');
      const handle = meta.bind(() => ({ title: locale() === 'en' ? 'Pricing' : 'Цены' }));
      TestBed.tick();

      expect(document.title).toBe('Pricing · ngwr');

      locale.set('ru');
      TestBed.tick();

      // This is the whole point of `bind` over `set`: a locale switch has to
      // reach the tab without the caller re-setting anything.
      expect(document.title).toBe('Цены · ngwr');
      handle.pop();
    });

    it('keeps a single layer of its own however often it re-runs', () => {
      const meta = setup();
      meta.set({ title: 'Docs' });
      const step = signal(1);
      const handle = meta.bind(() => ({ title: `Step ${step()}` }));
      TestBed.tick();

      step.set(2);
      TestBed.tick();
      step.set(3);
      TestBed.tick();

      handle.pop();

      // One pop has to undo the whole binding. If each re-run pushed a fresh
      // layer the title would look right the entire time and only betray it
      // here, surfacing "Step 2" instead of the route underneath.
      expect(document.title).toBe('Docs');
    });

    it('stops writing to the head once the handle pops', () => {
      const meta = setup();
      const title = signal('Pricing');
      const handle = meta.bind(() => ({ title: title() }));
      TestBed.tick();
      expect(document.title).toBe('Pricing');

      handle.pop();
      title.set('Docs');
      TestBed.tick();

      // Both halves of `pop` are under test: the layer is gone (so the title
      // is empty, not "Pricing") and the effect is destroyed (so the later
      // signal write does not resurrect it as "Docs").
      expect(document.title).toBe('');
    });
  });

  describe('[wrMeta]', () => {
    it('pushes the bound config when the host renders', () => {
      setup();
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      expect(document.title).toBe('Pricing');
      expect(content(named('description'))).toBe('Plans for every team.');
    });

    it('swaps its layer when the binding changes, without stacking', () => {
      setup();
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      fixture.componentInstance.config.set({ title: 'Docs' });
      fixture.detectChanges();

      expect(document.title).toBe('Docs');
      // The previous config's description would still resolve if the old layer
      // were left sitting underneath the new one.
      expect(tags(named('description'))).toHaveLength(0);
    });

    it('pops its layer when the host is destroyed', () => {
      setup({ title: 'ngwr' });
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      fixture.destroy();

      // Auto-revert on destroy is the reason to use the directive over `set()`:
      // leaving the route's metadata behind is what makes a SPA advertise the
      // wrong page after a navigation.
      expect(document.title).toBe('ngwr');
      expect(tags(named('description'))).toHaveLength(0);
    });
  });
});
