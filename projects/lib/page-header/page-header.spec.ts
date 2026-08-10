import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrPageHeader } from './page-header';

@Component({
  imports: [WrPageHeader],
  template: `
    <wr-page-header [title]="title()" [subtitle]="subtitle()" [responsive]="responsive()">
      <span wrPageHeaderBreadcrumbs class="crumbs">Home / Docs</span>
      <button type="button" wrPageHeaderActions class="action">Edit</button>
      <span wrPageHeaderExtra class="extra">v2</span>
    </wr-page-header>
  `,
})
class Host {
  readonly title = signal('Settings');
  readonly subtitle = signal('Everything about this project');
  readonly responsive = signal(false);
}

describe('WrPageHeader', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-page-header')!;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the title as the page heading', () => {
    // An `<h1>`: this is the component that names the page, so the level is part
    // of the contract rather than a styling choice.
    const title = root().querySelector('.wr-page-header__title')!;
    expect(title.tagName).toBe('H1');
    expect(title.textContent.trim()).toBe('Settings');
    expect(root().querySelector('.wr-page-header__subtitle')!.tagName).toBe('P');
  });

  it('drops the heading and the subtitle when they are empty', () => {
    fixture.componentInstance.title.set('');
    fixture.componentInstance.subtitle.set('');
    fixture.detectChanges();

    expect(root().querySelector('.wr-page-header__title')).toBeNull();
    expect(root().querySelector('.wr-page-header__subtitle')).toBeNull();
  });

  it('routes each slot to its own region', () => {
    expect(root().querySelector('.wr-page-header__breadcrumbs')!.querySelector('.crumbs')).not.toBeNull();
    expect(root().querySelector('.wr-page-header__actions')!.querySelector('.action')).not.toBeNull();
    expect(root().querySelector('.wr-page-header__extra')!.querySelector('.extra')).not.toBeNull();
  });

  it('takes the responsive modifier only when asked', () => {
    expect(host().className).toBe('wr-page-header');

    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();
    expect(host().className).toContain('wr-page-header--responsive');
  });
});
