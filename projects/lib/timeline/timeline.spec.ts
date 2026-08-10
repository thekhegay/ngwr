import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WrTimelineColor } from './interfaces';
import { WrTimeline } from './timeline';
import { WrTimelineItem } from './timeline-item';

@Component({
  imports: [WrTimeline, WrTimelineItem],
  template: `
    <wr-timeline [orientation]="orientation()">
      <wr-timeline-item title="Created" time="09:00" [color]="color()">Opened the ticket</wr-timeline-item>
      <wr-timeline-item title="Closed">Shipped</wr-timeline-item>
    </wr-timeline>
  `,
})
class Host {
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly color = signal<WrTimelineColor>('primary');
}

describe('WrTimeline', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const host = (): HTMLElement => root().querySelector<HTMLElement>('wr-timeline')!;
  const items = (): HTMLElement[] => [...root().querySelectorAll<HTMLElement>('wr-timeline-item')];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('carries its orientation, always as a modifier', () => {
    // Both directions are named, unlike most modifiers here: the layout differs
    // enough that neither is a no-op default.
    expect(host().className).toBe('wr-timeline wr-timeline--vertical');

    fixture.componentInstance.orientation.set('horizontal');
    fixture.detectChanges();
    expect(host().className).toBe('wr-timeline wr-timeline--horizontal');
  });

  it('renders each event with its time, title and content', () => {
    const first = items()[0];
    expect(first.querySelector('.wr-timeline-item__time')!.textContent.trim()).toBe('09:00');
    expect(first.querySelector('.wr-timeline-item__title')!.textContent.trim()).toBe('Created');
    expect(first.querySelector('.wr-timeline-item__content')!.textContent.trim()).toBe('Opened the ticket');
  });

  it('drops the header lines it was not given', () => {
    const second = items()[1];
    expect(second.querySelector('.wr-timeline-item__time')).toBeNull();
    expect(second.querySelector('.wr-timeline-item__title')).not.toBeNull();
  });

  it('colours each dot and keeps it out of the accessible tree', () => {
    expect(items()[0].className).toBe('wr-timeline-item wr-timeline-item--primary');
    expect(items()[1].className).toBe('wr-timeline-item wr-timeline-item--primary');

    fixture.componentInstance.color.set('success');
    fixture.detectChanges();
    expect(items()[0].className).toContain('wr-timeline-item--success');

    // The dot is drawn by CSS on an empty span — nothing to announce.
    expect(items()[0].querySelector('.wr-timeline-item__dot')!.getAttribute('aria-hidden')).toBe('true');
  });
});
