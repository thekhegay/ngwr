import { DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { SITE_NAME, SITE_OG_IMAGE, SITE_OG_IMAGE_ALT, siteUrl } from '#core/constants/site';

@Service()
export class MetaService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly productName = 'ngwr';

  private readonly currentTitle = signal(this.productName);
  private readonly titleStack = signal<string[]>([]);

  constructor() {
    this.setStaticSocialTags();

    effect(() => {
      const title = this.currentTitle();
      this.title.setTitle(title);
      // og:title mirrors the document title — without it, shares fall back to
      // the URL and every page previews identically.
      this.setOgTitle(title);
    });
  }

  /**
   * Tags that are identical on every page. Set once, on service creation, so a
   * page that never calls into the per-page setters still previews correctly.
   */
  private setStaticSocialTags(): void {
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:image', content: SITE_OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: SITE_OG_IMAGE_ALT });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:image', content: SITE_OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:image:alt', content: SITE_OG_IMAGE_ALT });
  }

  setTitle(value: string | string[] | null, withProductName = true): void {
    this.currentTitle.set(this.buildTitle(value, withProductName));
  }

  pushTitle(value: string | string[] | null, withProductName = true): void {
    this.titleStack.update(stack => [...stack, this.currentTitle()]);
    this.currentTitle.set(this.buildTitle(value, withProductName));
  }

  popTitle(): void {
    const stack = this.titleStack();
    const previousTitle = stack.at(-1) ?? this.productName;

    this.titleStack.set(stack.slice(0, -1));
    this.currentTitle.set(previousTitle);
  }

  resetTitle(): void {
    this.titleStack.set([]);
    this.currentTitle.set(this.productName);
  }

  setDescription(description: string): void {
    this.setOgDescription(description);
    this.meta.updateTag({
      name: 'description',
      content: description,
    });
  }

  setKeywords(keywords: string[]): void {
    const predefinedKeywords = [
      'angular',
      'ngwr',
      'web',
      'ui',
      'components',
      'standalone',
      'ng',
      'wr',
      'responsive',
      'typescript',
      'scss',
      'css',
      'open source',
      ...keywords,
    ];
    this.meta.updateTag({
      name: 'keywords',
      content: predefinedKeywords.join(','),
    });
  }

  setRobots(robots = 'index, follow'): void {
    this.meta.updateTag({
      name: 'robots',
      content: robots,
    });
  }

  /**
   * Point `<link rel="canonical">` and `og:url` at the published site.
   *
   * The URL is built from {@link SITE_ORIGIN} plus the current path — never from
   * `document.URL`, whose origin is `http://ng-localhost/` while prerendering
   * and would otherwise be baked into every static page.
   */
  setCanonicalURL(): void {
    const canonical = siteUrl(this.currentPath());

    // Reuse the existing element. The previous version appended a fresh <link>
    // on every call, so client-side navigation stacked up duplicate canonicals.
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    this.meta.updateTag({ property: 'og:url', content: canonical });
  }

  /**
   * Advertise the page's markdown twin — `<link rel="alternate" type="text/markdown">`
   * pointing at the same URL plus `.md`, written by `scripts/gen-md-docs.ts`.
   *
   * An agent that lands on the HTML should be able to find the cheap version of
   * the same page without guessing the convention, which is the whole reason the
   * export exists. Only doc pages have a twin, so this is opt-in per page rather
   * than folded into {@link setCanonicalURL}.
   */
  setMarkdownAlternate(): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="alternate"][type="text/markdown"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('type', 'text/markdown');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', `${siteUrl(this.currentPath())}.md`);
  }

  /** Current route path, without origin, query or fragment. */
  private currentPath(): string {
    try {
      return new URL(this.doc.URL).pathname;
    } catch {
      return '/';
    }
  }

  private setOgTitle(title: string): void {
    this.meta.updateTag({
      property: 'og:title',
      content: title,
    });
  }

  private setOgDescription(description: string): void {
    this.meta.updateTag({
      property: 'og:description',
      content: description,
    });
  }

  private buildTitle(value: string | string[] | null, withProductName: boolean): string {
    const parts = this.normalizeTitleParts(value);
    if (parts.length === 0) return this.productName;
    return withProductName ? [...parts, this.productName].join(' · ') : parts.join(' · ');
  }

  private normalizeTitleParts(value: string | string[] | null): string[] {
    const parts = Array.isArray(value) ? value : value ? [value] : [];
    return parts.map(part => part.trim()).filter((part): part is string => part.length > 0);
  }
}
