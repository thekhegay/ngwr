import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrPlatform } from 'ngwr/platform';
import { afterEach, describe, expect, it } from 'vitest';

import { GlowBorder } from './glow-border';

@Component({
  imports: [GlowBorder],
  template: `<a href="#start" ngwrGlowBorder [active]="active()">Get started</a>`,
})
class Host {
  readonly active = signal(true);
}

const platform = (reduced: boolean, visible = true): unknown => ({
  provide: WrPlatform,
  useValue: { prefersReducedMotion: signal(reduced), pageVisible: signal(visible) },
});

describe('GlowBorder', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const render = (providers: unknown[]): void => {
    TestBed.configureTestingModule({ providers: providers as never[] });
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  };

  const link = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('a')!;
  const live = (): boolean => link().classList.contains('ngwr-glow-border--live');

  afterEach(() => TestBed.resetTestingModule());

  it('turns the arc in the browser and adds no children', () => {
    render([platform(false)]);

    expect(link().classList.contains('ngwr-glow-border')).toBe(true);
    expect(live()).toBe(true);
    expect(link().children.length).toBe(0);
    expect(link().textContent).toBe('Get started');
  });

  it('holds the arc still under reduced motion', () => {
    render([platform(true)]);

    expect(live()).toBe(false);
  });

  it('holds the arc still while the page is hidden', () => {
    render([platform(false, false)]);

    expect(live()).toBe(false);
  });

  it('can be stopped by the host', () => {
    render([platform(false)]);
    fixture.componentInstance.active.set(false);
    fixture.detectChanges();

    expect(live()).toBe(false);
  });

  it('never turns on the server', () => {
    render([{ provide: PLATFORM_ID, useValue: 'server' }]);

    expect(link().classList.contains('ngwr-glow-border')).toBe(true);
    expect(live()).toBe(false);
  });
});
