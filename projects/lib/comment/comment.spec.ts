import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrComment } from './comment';
import type { WrCommentSide, WrCommentVariant } from './types';

/**
 * The pattern for a component spec here: a tiny host that uses the component
 * the way a consumer would, and assertions against the RENDERED DOM. The
 * `.wr-comment*` classes and the slot attributes are public API.
 */
@Component({
  imports: [WrComment],
  template: `
    <wr-comment
      [author]="author()"
      [time]="time()"
      [datetime]="datetime()"
      [variant]="variant()"
      [side]="side()"
      [repliesLabel]="repliesLabel()"
    >
      <span wrCommentAvatar class="avatar">AN</span>
      Looks good to me.
      <div wrCommentActions><button type="button">Reply</button></div>
      @for (reply of replies(); track reply) {
        <wr-comment [author]="reply">Thanks!</wr-comment>
      }
    </wr-comment>
  `,
})
class Host {
  readonly author = signal('Ann');
  readonly time = signal('2 hours ago');
  readonly datetime = signal<Date | string | null>(null);
  readonly variant = signal<WrCommentVariant>('row');
  readonly side = signal<WrCommentSide>('start');
  readonly repliesLabel = signal<string | null>(null);
  readonly replies = signal<string[]>([]);
}

@Component({
  imports: [WrComment],
  template: `
    <wr-comment>
      <a wrCommentAuthor href="/ann">Ann</a>
      Plain body.
    </wr-comment>
  `,
})
class SlotAuthorHost {}

@Component({
  imports: [WrComment],
  template: `
    <wr-comment author="Root">
      Level one.
      <wr-comment author="Child">
        Level two.
        <wr-comment author="Grandchild">
          Level three.
          <wr-comment author="Great-grandchild">Level four.</wr-comment>
        </wr-comment>
      </wr-comment>
    </wr-comment>
  `,
})
class DeepHost {}

describe('WrComment', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-comment')!;
  const query = <T extends HTMLElement>(selector: string): T | null => host().querySelector<T>(`:scope > ${selector}`);

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is an article named after the author', () => {
    expect(host().getAttribute('role')).toBe('article');
    expect(host().getAttribute('aria-label')).toBe('Ann');
    expect(host().classList.contains('wr-comment')).toBe(true);
  });

  it('drops the name when no author is given, so a projected author is not shadowed', () => {
    fixture.componentInstance.author.set('');
    fixture.detectChanges();

    expect(host().hasAttribute('aria-label')).toBe(false);
    expect(host().querySelector('.wr-comment__author')).toBeNull();
  });

  it('prints the author, the time and the body', () => {
    expect(host().querySelector('.wr-comment__author')?.textContent?.trim()).toBe('Ann');
    expect(host().querySelector('.wr-comment__time')?.textContent?.trim()).toBe('2 hours ago');
    expect(host().querySelector('.wr-comment__body')?.textContent?.trim()).toBe('Looks good to me.');
  });

  it('prints the time as plain text until a datetime is given', () => {
    expect(host().querySelector('.wr-comment__time')?.tagName).toBe('SPAN');
    expect(host().querySelector('time')).toBeNull();
  });

  it('renders a real <time> with an ISO datetime from a Date', () => {
    fixture.componentInstance.datetime.set(new Date(Date.UTC(2026, 10, 5, 9, 41)));
    fixture.detectChanges();

    const time = host().querySelector<HTMLTimeElement>('time.wr-comment__time');
    expect(time?.getAttribute('datetime')).toBe('2026-11-05T09:41:00.000Z');
    expect(time?.textContent?.trim()).toBe('2 hours ago');
  });

  it('passes a string datetime through as given', () => {
    fixture.componentInstance.datetime.set('2026-11-05');
    fixture.detectChanges();

    expect(host().querySelector('time')?.getAttribute('datetime')).toBe('2026-11-05');
  });

  it('refuses an invalid Date rather than writing "Invalid Date" into the attribute', () => {
    fixture.componentInstance.datetime.set(new Date('nope'));
    fixture.detectChanges();

    expect(host().querySelector('time')).toBeNull();
    expect(host().querySelector('.wr-comment__time')?.tagName).toBe('SPAN');
  });

  it('renders no time element at all without a printed time', () => {
    fixture.componentInstance.time.set('');
    fixture.componentInstance.datetime.set('2026-11-05');
    fixture.detectChanges();

    expect(host().querySelector('.wr-comment__time')).toBeNull();
  });

  it('projects the avatar and the actions into their own slots', () => {
    expect(query('.wr-comment__avatar')?.querySelector('.avatar')?.textContent).toBe('AN');
    expect(query('.wr-comment__main')?.querySelector('.wr-comment__actions button')?.textContent).toBe('Reply');
  });

  it('projects a [wrCommentAuthor] element into the head', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(SlotAuthorHost) as unknown as typeof fixture;
    fixture.detectChanges();

    const head = host().querySelector('.wr-comment__head');
    expect(head?.querySelector('a[href="/ann"]')?.textContent).toBe('Ann');
    expect(head?.querySelector('.wr-comment__author')).toBeNull();
    expect(host().hasAttribute('aria-label')).toBe(false);
  });

  it('keeps the replies group empty, and so hidden by its own rule, until there are replies', () => {
    const replies = query('.wr-comment__replies')!;
    expect(replies.getAttribute('role')).toBe('group');
    expect(replies.getAttribute('aria-label')).toBe('Replies');
    expect(replies.children.length).toBe(0);
  });

  it('nests replies written as wr-comment children inside the replies group', () => {
    fixture.componentInstance.replies.set(['Bob', 'Cy']);
    fixture.detectChanges();

    const replies = query('.wr-comment__replies')!;
    const nested = replies.querySelectorAll(':scope > wr-comment');
    expect([...nested].map(el => el.getAttribute('aria-label'))).toEqual(['Bob', 'Cy']);
    expect(nested[0].querySelector('.wr-comment__body')?.textContent?.trim()).toBe('Thanks!');
    // The reply is an article of its own, not part of the parent's body.
    expect(query('.wr-comment__main')?.querySelector('wr-comment')).toBeNull();
  });

  it('names the replies group through the override input', () => {
    fixture.componentInstance.repliesLabel.set('Ответы');
    fixture.detectChanges();

    expect(query('.wr-comment__replies')?.getAttribute('aria-label')).toBe('Ответы');
  });

  it('nests to any depth, each level its own article in its parent group', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(DeepHost) as unknown as typeof fixture;
    fixture.detectChanges();

    const path = 'wr-comment > .wr-comment__replies > wr-comment';
    const depthFour = root().querySelector(`${path} > .wr-comment__replies > ${path}`);
    expect(depthFour?.getAttribute('aria-label')).toBe('Great-grandchild');
    expect(depthFour?.querySelector('.wr-comment__body')?.textContent?.trim()).toBe('Level four.');
  });

  it('carries no variant class in the row variant', () => {
    expect(host().className).toBe('wr-comment');
  });

  it('marks a bubble with its side, and the side changes nothing for a row', () => {
    fixture.componentInstance.side.set('end');
    fixture.detectChanges();
    expect(host().className).toBe('wr-comment');

    fixture.componentInstance.variant.set('bubble');
    fixture.detectChanges();
    expect(host().classList.contains('wr-comment--bubble')).toBe(true);
    expect(host().classList.contains('wr-comment--end')).toBe(true);

    fixture.componentInstance.side.set('start');
    fixture.detectChanges();
    expect(host().classList.contains('wr-comment--start')).toBe(true);
    expect(host().classList.contains('wr-comment--end')).toBe(false);
  });
});
