import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrFileUpload } from './file-upload';
import type { WrFileUploadSize } from './types';

@Component({
  imports: [WrFileUpload],
  template: `<wr-file-upload [size]="size()" />`,
})
class Host {
  readonly size = signal<WrFileUploadSize>('md');
}

/**
 * The class half of `size`. What each size does to the hooks is read off the
 * compiled sheet in `size-hooks.spec.ts`.
 */
describe('WrFileUpload size', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;

  const host = (): HTMLElement => (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('wr-file-upload')!;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('paints no size modifier at md, the default', () => {
    expect(host().classList.contains('wr-file-upload')).toBe(true);
    expect(host().className).not.toMatch(/wr-file-upload--(sm|md|lg)/);
  });

  it.each(['sm', 'lg'] as const)('adds wr-file-upload--%s and drops it on the way back to md', async size => {
    fixture.componentInstance.size.set(size);
    await fixture.whenStable();

    expect(host().classList.contains(`wr-file-upload--${size}`)).toBe(true);

    fixture.componentInstance.size.set('md');
    await fixture.whenStable();

    expect(host().className).not.toMatch(/wr-file-upload--(sm|md|lg)/);
  });
});
