import { DOCUMENT, effect, inject, Service, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Service()
export class MetaService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly productName = 'ngwr';

  private readonly currentTitle = signal(this.productName);
  private readonly titleStack = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.title.setTitle(this.currentTitle());
    });
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

  setCanonicalURL(): void {
    const canURL = this.doc.URL.replace('http', 'https');
    const link: HTMLLinkElement = this.doc.createElement('link');
    link.setAttribute('rel', 'canonical');
    this.doc.head.appendChild(link);
    link.setAttribute('href', canURL);
    this.meta.updateTag({ property: 'og:url', content: canURL });
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
