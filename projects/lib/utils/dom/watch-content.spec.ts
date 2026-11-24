import { afterEveryRender, Component, ElementRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it, vi } from 'vitest';

import { wrWatchContent } from './watch-content';

@Component({
  selector: 'wr-watch-host',
  template: `{{ text() }}`,
})
class WatchHost {
  readonly text = signal('one');
  readonly sync = vi.fn();
  constructor() {
    afterEveryRender(wrWatchContent(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement, this.sync));
  }
}

describe('wrWatchContent', () => {
  it('syncs on the first pass and then only after the content changed', () => {
    const fixture = TestBed.createComponent(WatchHost);
    fixture.detectChanges();
    const { sync, text } = fixture.componentInstance;
    expect(sync).toHaveBeenCalledTimes(1);

    fixture.detectChanges();
    fixture.detectChanges();
    expect(sync).toHaveBeenCalledTimes(1);

    text.set('two');
    fixture.detectChanges();
    expect(sync).toHaveBeenCalledTimes(2);

    fixture.detectChanges();
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('syncs for a change made outside a render pass', async () => {
    const fixture = TestBed.createComponent(WatchHost);
    fixture.detectChanges();
    const { sync } = fixture.componentInstance;
    sync.mockClear();

    (fixture.nativeElement as HTMLElement).appendChild(document.createTextNode('!'));
    await Promise.resolve();

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('stops watching once destroyed', async () => {
    const fixture = TestBed.createComponent(WatchHost);
    fixture.detectChanges();
    const { sync } = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;
    fixture.destroy();
    sync.mockClear();

    host.appendChild(document.createTextNode('!'));
    await Promise.resolve();

    expect(sync).not.toHaveBeenCalled();
  });
});
