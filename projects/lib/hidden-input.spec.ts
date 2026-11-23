import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrCheckbox } from 'ngwr/checkbox';
import { afterEach, describe, expect, it } from 'vitest';

import { compileSass } from './spec-sass';

/**
 * A control that hides its native input with `position: absolute` must be the
 * input's containing block. Otherwise the input is placed against the nearest
 * positioned ancestor, which can sit outside a scroller between them (a
 * `wr-table` host around its scrolling body): the input then overflows that
 * ancestor, and focusing it makes the browser scroll the ancestor, which moves
 * everything inside it out of view.
 */
@Component({
  imports: [WrCheckbox],
  template: `<div class="outer">
    <div class="scroller"><wr-checkbox>Row</wr-checkbox></div>
  </div>`,
})
class CheckboxHost {}

const CASES: readonly { name: string; host: Type<unknown>; block: string }[] = [
  { name: 'checkbox', host: CheckboxHost, block: 'wr-checkbox' },
];

describe('a visually hidden native input', () => {
  let style: HTMLStyleElement | null = null;

  afterEach(() => {
    style?.remove();
    style = null;
  });

  for (const { name, host, block } of CASES) {
    it(`has its ${name} as its containing block, not a positioned ancestor outside the scroller`, () => {
      style = document.createElement('style');
      style.textContent = `${compileSass(`@use '${name}/styles';`)}
        .outer { position: relative; overflow: hidden; height: 40px; }
        .scroller { overflow: auto; height: 40px; }`;
      document.head.append(style);

      const fixture = TestBed.createComponent(host);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector<HTMLInputElement>(`.${block}__input`)!;
      expect(getComputedStyle(input).position).toBe('absolute');

      let containing = input.parentElement;
      while (containing && getComputedStyle(containing).position === 'static') containing = containing.parentElement;
      expect(containing?.classList.contains(block)).toBe(true);
      fixture.destroy();
    });
  }
});
