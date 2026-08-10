import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrDescriptionItem } from './description-item';
import { WrDescriptions } from './descriptions';

@Component({
  imports: [WrDescriptions, WrDescriptionItem],
  template: `
    <wr-descriptions [title]="title()" [inline]="inline()" [bordered]="bordered()" [responsive]="responsive()">
      <wr-description-item label="Name">Ada Lovelace</wr-description-item>
      <wr-description-item label="Email">ada@example.com</wr-description-item>
    </wr-descriptions>
  `,
})
class Host {
  readonly title = signal('Account');
  readonly inline = signal(false);
  readonly bordered = signal(false);
  readonly responsive = signal(false);
}

/**
 * The roles are the interesting part. A real `<dl>` cannot be used — the rows are
 * their own component, so the DOM would be `<dl><wr-description-item><dt>`, which
 * the content model forbids and which breaks the term/definition pairing in AT.
 * `role="term"` / `role="definition"` carry the same semantics with no required
 * parent, and that is what this pins.
 */
describe('WrDescriptions', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-descriptions')!;
  /** The class SET, sorted: a `[class]` binding is applied class by class, so DOM
   * order is diff order rather than the order the component composed them in. */
  const classes = (el: HTMLElement): string[] => [...el.classList].sort();
  const labels = (): string[] =>
    [...root().querySelectorAll('.wr-descriptions__label')].map(el => el.textContent.trim());
  const values = (): string[] =>
    [...root().querySelectorAll('.wr-descriptions__value')].map(el => el.textContent.trim());

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('pairs each label with its value through term and definition roles', () => {
    expect(labels()).toEqual(['Name', 'Email']);
    expect(values()).toEqual(['Ada Lovelace', 'ada@example.com']);
    expect(root().querySelector('.wr-descriptions__label')!.getAttribute('role')).toBe('term');
    expect(root().querySelector('.wr-descriptions__value')!.getAttribute('role')).toBe('definition');
  });

  it('renders the title above the list, and drops it when empty', () => {
    expect(root().querySelector('.wr-descriptions__title')!.textContent.trim()).toBe('Account');

    fixture.componentInstance.title.set('');
    fixture.detectChanges();
    expect(root().querySelector('.wr-descriptions__title')).toBeNull();
  });

  it('carries a class per layout option, and none by default', () => {
    expect(host().className).toBe('wr-descriptions');

    fixture.componentInstance.inline.set(true);
    fixture.componentInstance.bordered.set(true);
    fixture.componentInstance.responsive.set(true);
    fixture.detectChanges();

    expect(classes(host())).toEqual([
      'wr-descriptions',
      'wr-descriptions--bordered',
      'wr-descriptions--inline',
      'wr-descriptions--responsive',
    ]);
  });

  it('marks every row so the layout can address it', () => {
    expect(root().querySelectorAll('.wr-descriptions__row').length).toBe(2);
  });
});
