/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { wrEn } from 'ngwr/i18n/en';
import { describe, expect, it } from 'vitest';

import { expectCatalogContract } from '../catalog-contract';

/**
 * The shipped English catalog, checked as DATA rather than through the service.
 *
 * It takes the shared contract like the other twenty-one, minus the one
 * assertion that cannot mean anything against the reference itself — whether a
 * catalog was translated out of English, which `expectCatalogContract` skips
 * here. Below it is the rule that is English's alone.
 */
describe('wrEn', () => {
  expectCatalogContract('en', wrEn);

  it('never puts a plural noun straight after a count', () => {
    // There is no plural machinery here — `wrInterpolate` substitutes and
    // nothing else — so `{{count}} items` reads wrong at one. The two shapes
    // that stay honest are the count LAST (`Matches available: {{count}}`) or a
    // count-neutral word after it (`+{{count}} more`), which is why this looks
    // for a trailing -s rather than for any word at all.
    //
    // This assertion is HERE rather than in the shared contract on purpose: the
    // rule holds in every language and only English morphology makes it
    // mechanically visible. Twenty-one other catalogs have to obey it with no
    // gate able to say so, which is a limit worth stating rather than papering
    // over with a check that would pass on anything.
    const flat = (node: unknown, path = '', out: Record<string, string> = {}): Record<string, string> => {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const dotted = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) flat(value, dotted, out);
        else out[dotted] = value as string;
      }
      return out;
    };

    for (const [key, value] of Object.entries(flat(wrEn))) {
      expect(value, `${key} reads wrong at a count of one`).not.toMatch(/\{\{count\}\}\s+[a-z]+s\b/i);
    }
  });
});
