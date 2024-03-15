import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { isArray } from 'showcase/@shared/utils/rxjs/is-array';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    @Inject(DOCUMENT)
    private readonly doc: Document,
    private readonly title: Title,
    private readonly meta: Meta
  ) {}

  setTitle(titleOrTitleKeys: string[] | string): void {
    let title = '';

    if (isArray(titleOrTitleKeys)) {
      for (const key of titleOrTitleKeys) {
        title = title.concat(`${key} · `);
      }
    } else {
      title = title.concat(`${titleOrTitleKeys} · `);
    }

    this.title.setTitle(`${title}NGWR`);
    this.setOgTitle(`${title}NGWR`);
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

  setRobots(robots: string = 'index, follow'): void {
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
}
