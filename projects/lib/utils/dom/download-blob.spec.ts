/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrDownloadBlob } from './download-blob';

/**
 * jsdom has no `URL.createObjectURL` and does not navigate on an anchor click,
 * so both are stubbed. What is under test is the sequence around them: the
 * anchor's attributes at the moment of the click, that it is in the document
 * then and gone after, and that the URL outlives the click.
 */
describe('wrDownloadBlob', () => {
  const blob = new Blob(['a,b\r\n1,2'], { type: 'text/csv' });
  let create: ReturnType<typeof vi.spyOn>;
  let revoke: ReturnType<typeof vi.spyOn>;
  let click: ReturnType<typeof vi.spyOn>;
  let clicked: { href: string; download: string; connected: boolean } | null;

  beforeEach(() => {
    vi.useFakeTimers();
    clicked = null;
    create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:ngwr/one');
    revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download, connected: this.isConnected };
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clicks an anchor that points at the object URL and names the file', () => {
    wrDownloadBlob(blob, 'report.csv');

    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(clicked).toEqual({ href: 'blob:ngwr/one', download: 'report.csv', connected: true });
  });

  it('removes the anchor once it has been clicked', () => {
    wrDownloadBlob(blob, 'report.csv');

    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('revokes the URL later, never in the same tick', () => {
    wrDownloadBlob(blob, 'report.csv');

    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:ngwr/one');
  });

  it('does nothing without a document, which is every SSR render', () => {
    vi.stubGlobal('document', undefined);

    expect(() => wrDownloadBlob(blob, 'report.csv')).not.toThrow();
    expect(create).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });
});
