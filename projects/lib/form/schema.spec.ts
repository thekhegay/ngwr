/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { email, form, metadata, required, schema } from '@angular/forms/signals';

import { describe, expect, it } from 'vitest';

import { WR_FIELD, wrFieldLabel } from './schema';

interface User {
  readonly workEmail: string;
  readonly role: string;
  readonly notes: string;
}

/**
 * The presentation rides on the SAME schema as the validators, through Angular's
 * own `metadata()`. That is the whole design decision, and these pin the two
 * properties it was chosen for: one description of a form rather than two, and a
 * `LogicFn` underneath, so a label or a set of options may depend on another
 * field's value.
 */
describe('WR_FIELD metadata', () => {
  const userSchema = schema<User>(path => {
    required(path.workEmail);
    email(path.workEmail);
    metadata(path.workEmail, WR_FIELD, () => ({ kind: 'input', type: 'email' }));
    metadata(path.role, WR_FIELD, ctx => {
      // Reactive on purpose: an admin gets a longer list than anyone else, and
      // the schema is where that belongs rather than in a template branch.
      const admin = ctx.stateOf(path.workEmail).value().endsWith('@ngwr.dev');
      return {
        kind: 'select',
        options: admin
          ? [
              { value: 'admin', label: 'Admin' },
              { value: 'user', label: 'User' },
            ]
          : [{ value: 'user', label: 'User' }],
      };
    });
  });

  it('carries the presentation alongside the rules, on one schema', () => {
    TestBed.runInInjectionContext(() => {
      const model = signal<User>({ workEmail: 'ada@example.com', role: 'user', notes: '' });
      const f = form(model, userSchema);

      expect(f.workEmail().metadata(WR_FIELD)?.()).toEqual({ kind: 'input', type: 'email' });
      // The rules are still Angular's, on the same field.
      expect(f.workEmail().errors()).toEqual([]);
    });
  });

  it('re-evaluates when the field it depends on changes', () => {
    TestBed.runInInjectionContext(() => {
      const model = signal<User>({ workEmail: 'ada@example.com', role: 'user', notes: '' });
      const f = form(model, userSchema);

      expect(f.role().metadata(WR_FIELD)?.()?.options).toHaveLength(1);

      model.set({ workEmail: 'ada@ngwr.dev', role: 'user', notes: '' });
      expect(f.role().metadata(WR_FIELD)?.()?.options).toHaveLength(2);
    });
  });

  it('leaves a field with no metadata undescribed rather than guessing', () => {
    TestBed.runInInjectionContext(() => {
      const model = signal<User>({ workEmail: '', role: 'user', notes: '' });
      const f = form(model, userSchema);

      // `notes` carries no `WR_FIELD`. A form renders nothing for it — a schema
      // is allowed to describe more than one screen shows. Note the accessor
      // itself is `M | undefined`: an unset key has no SIGNAL, not a signal of
      // undefined, which is why every read here is optional-called.
      expect(f.notes().metadata(WR_FIELD)?.()).toBeUndefined();
    });
  });
});

describe('wrFieldLabel', () => {
  it.each<[string, string]>([
    ['workEmail', 'Work email'],
    ['role', 'Role'],
    ['first_name', 'First name'],
    ['billing-address', 'Billing address'],
  ])('%s becomes %s', (key, expected) => {
    expect(wrFieldLabel(key)).toBe(expected);
  });
});
