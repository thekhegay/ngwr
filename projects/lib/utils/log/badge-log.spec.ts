/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { badgeError } from './badge-error';
import { badgeLog } from './badge-log';
import { badgeWarn } from './badge-warn';

const STYLE = `
    display: inline-block;
    border: 1px solid #3969e2;
    color: #3969e2;
    padding: 1px 3px;
    border-radius: 4px;
    margin-right: 0
  `;

const LOGGERS = [
  { name: 'badgeLog', fn: badgeLog, method: 'log' },
  { name: 'badgeWarn', fn: badgeWarn, method: 'warn' },
  { name: 'badgeError', fn: badgeError, method: 'error' },
] as const;

describe('badge loggers', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(LOGGERS)('$name logs the label, the pill style and the payload through console.$method', ({ fn, method }) => {
    const spies = {
      log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
    };
    const payload = { name: 'plus' };

    fn('icons', '#3969e2', payload);

    expect(spies[method]).toHaveBeenCalledTimes(1);
    expect(spies[method]).toHaveBeenCalledWith('%cicons', STYLE, payload);
    for (const other of LOGGERS.filter(logger => logger.method !== method)) {
      expect(spies[other.method]).not.toHaveBeenCalled();
    }
  });

  it('paints the three with one style', () => {
    const calls = LOGGERS.map(({ fn, method }) => {
      const spy = vi.spyOn(console, method).mockImplementation(() => undefined);
      fn('ws', 'rebeccapurple', 1);
      return spy.mock.calls[0][1] as string;
    });

    expect(calls[0]).toContain('border: 1px solid rebeccapurple');
    expect(calls[1]).toBe(calls[0]);
    expect(calls[2]).toBe(calls[0]);
  });
});
