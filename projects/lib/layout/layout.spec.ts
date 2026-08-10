import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrLayout } from './layout';
import { WrLayoutContent } from './layout-content';
import { WrLayoutFooter } from './layout-footer';
import { WrLayoutHeader } from './layout-header';
import { WrLayoutSider } from './layout-sider';

@Component({
  imports: [WrLayout, WrLayoutHeader, WrLayoutContent, WrLayoutFooter, WrLayoutSider],
  template: `
    <wr-layout>
      <wr-layout-header>header</wr-layout-header>
      @if (withSider()) {
        <wr-layout-sider
          [(collapsed)]="collapsed"
          [width]="width()"
          [collapsedWidth]="collapsedWidth()"
          [reverse]="reverse()"
          (collapsedChanged)="events.push($event)"
        >
          nav
        </wr-layout-sider>
      }
      <wr-layout-content>content</wr-layout-content>
      <wr-layout-footer>footer</wr-layout-footer>
    </wr-layout>
  `,
})
class Host {
  readonly withSider = signal(true);
  readonly collapsed = signal(false);
  readonly width = signal('16rem');
  readonly collapsedWidth = signal('4rem');
  readonly reverse = signal(false);
  readonly events: boolean[] = [];
}

/**
 * The layout's own job is one class derived from a `contentChildren` query, which
 * is worth pinning because it is content-dependent: the class has to appear when a
 * sider is projected and go away when one is removed at runtime.
 *
 * The landmark roles are the other half — header / complementary / main /
 * contentinfo, one of each, which is what lets a reader jump straight to the
 * content.
 */
describe('WrLayout', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const layout = (): HTMLElement => root().querySelector<HTMLElement>('wr-layout')!;
  const sider = (): HTMLElement | null => root().querySelector<HTMLElement>('wr-layout-sider');

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('gives each region its landmark role', () => {
    expect(root().querySelector('wr-layout-header')!.getAttribute('role')).toBe('banner');
    expect(root().querySelector('wr-layout-content')!.getAttribute('role')).toBe('main');
    expect(root().querySelector('wr-layout-footer')!.getAttribute('role')).toBe('contentinfo');
    expect(sider()!.getAttribute('role')).toBe('complementary');
  });

  it('notices the sider it was given, and notices it leaving', () => {
    expect(layout().className).toBe('wr-layout wr-layout--has-sider');

    fixture.componentInstance.withSider.set(false);
    fixture.detectChanges();
    expect(layout().className).toBe('wr-layout');
  });

  it('sizes the sider from whichever width applies', () => {
    expect(sider()!.style.width).toBe('16rem');

    fixture.componentInstance.collapsed.set(true);
    fixture.detectChanges();
    expect(sider()!.style.width).toBe('4rem');
    expect(sider()!.className).toContain('wr-layout-sider--collapsed');
  });

  it('reports a collapse the host drove, not only a toggle', () => {
    // The output is documented as firing whenever `collapsed` changes, and used
    // to fire only from `toggle()` — so the documented `[(collapsed)]` binding
    // was silent.
    fixture.componentInstance.collapsed.set(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.events).toEqual([true]);
  });

  it('reports a toggle exactly once', () => {
    const instance = fixture.debugElement.query(By.directive(WrLayoutSider)).componentInstance as WrLayoutSider;

    instance.toggle();
    fixture.detectChanges();

    expect(fixture.componentInstance.collapsed()).toBe(true);
    expect(fixture.componentInstance.events).toEqual([true]);
  });

  it('says nothing about the initial state', () => {
    // The first read of the signal is not a change; emitting there would report a
    // collapse that never happened.
    expect(fixture.componentInstance.events).toEqual([]);
  });

  it('puts the sider on the far edge when reversed', () => {
    fixture.componentInstance.reverse.set(true);
    fixture.detectChanges();

    expect(sider()!.className).toContain('wr-layout-sider--reverse');
  });
});
