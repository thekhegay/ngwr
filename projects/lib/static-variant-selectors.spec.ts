import { createRequire } from 'node:module';
import { join } from 'node:path';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrTag } from 'ngwr/badge';
import { WrButton } from 'ngwr/button';
import { WrInput, WrInputGroup } from 'ngwr/input';
import { describe, expect, it } from 'vitest';

/**
 * A variant written as a static attribute (`<wr-btn outlined size="sm">`) still
 * becomes a class only in the first update pass, which in a zoneless app can run
 * a frame after the element is in the document. So the rule of each such variant
 * also matches the attribute itself, and the element is born looking the way it
 * will: no `transition` runs from the base look to the variant.
 *
 * Read off the COMPILED sheet, as `table/stylesheet.spec.ts` does. `sass` is
 * resolved through `@angular/build`.
 */
interface Sass {
  compileString(source: string, options: { loadPaths: string[]; style: 'expanded' }): { css: string };
}

const sass = createRequire(createRequire(import.meta.url).resolve('@angular/build/package.json'))('sass') as Sass;

const sheets = new Map<string, string[][]>();

/** A selector list split on its own commas, not on the ones inside `:not(a, b)`. */
function topLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (list[i] === ',' && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  return [...parts, list.slice(start)];
}

/** The selector list of every rule in an entry point's sheet. */
function selectorLists(entry: string): string[][] {
  let lists = sheets.get(entry);
  if (!lists) {
    const css = sass
      .compileString(`@use '${entry}/styles';`, { loadPaths: [join(process.cwd(), 'projects/lib')], style: 'expanded' })
      .css.replace(/\/\*[\s\S]*?\*\//g, '');
    lists = [...css.matchAll(/(?:^|\n)\s*([^{}@]+)\{/g)].map(([, list]) =>
      topLevel(list).map(part => part.trim().replace(/\s+/g, ' '))
    );
    sheets.set(entry, lists);
  }
  return lists;
}

const flag = (name: string): string => `:where([${name}]:not([${name}=false]))`;
const value = (name: string, v: string): string => `:where([${name}=${v}])`;
const sizes = (entry: string, block: string): [string, string, string][] =>
  ['sm', 'lg'].map(size => [entry, `.${block}--${size}`, `.${block}${value('size', size)}`]);

const VARIANTS: [entry: string, byClass: string, byAttribute: string][] = [
  ...sizes('button', 'wr-btn'),
  ['button', '.wr-btn--block', `.wr-btn${flag('block')}`],
  ['button', '.wr-btn--outlined', `.wr-btn${flag('outlined')}`],
  ['button', '.wr-btn--outlined:hover', `.wr-btn${flag('outlined')}:hover`],
  ['button', '.wr-btn--primary', `.wr-btn${value('color', 'primary')}`],
  ['button', '.wr-btn--danger:hover', `.wr-btn${value('color', 'danger')}:hover`],
  ['button', '.wr-btn--primary.wr-btn--outlined', `.wr-btn${value('color', 'primary')}${flag('outlined')}`],
  ...sizes('input', 'wr-input'),
  ['input', '.wr-input--rounded', `.wr-input${flag('rounded')}`],
  ['input', '.wr-input-group--rounded', `.wr-input-group${flag('rounded')}`],
  [
    'input',
    '.wr-input-group--rounded .wr-input-group__toggle',
    `.wr-input-group${flag('rounded')} .wr-input-group__toggle`,
  ],
  ['badge', '.wr-tag--rounded', `.wr-tag${flag('rounded')}`],
  ['badge', '.wr-tag--success', `.wr-tag${value('color', 'success')}`],
  ['badge', '.wr-tag--success.wr-tag--outlined', `.wr-tag${value('color', 'success')}${flag('outlined')}`],
  ['badge', '.wr-tag--success.wr-tag--transparent', `.wr-tag${value('color', 'success')}${flag('transparent')}`],
  ...sizes('select', 'wr-select'),
  ['select', '.wr-select--rounded', `.wr-select${flag('rounded')}`],
  ...sizes('textarea', 'wr-textarea'),
  ...sizes('input-number', 'wr-input-number'),
  ...sizes('input-otp', 'wr-input-otp'),
  ...sizes('cascader', 'wr-cascader'),
  // The pickers size their group and trigger from the host, with no rule of the host's own.
  ...['wr-date-picker', 'wr-date-range-picker'].flatMap(block =>
    sizes('date-picker', block).map(([entry, byClass, byAttribute]): [string, string, string] => [
      entry,
      `${byClass} > .wr-input-group`,
      `${byAttribute} > .wr-input-group`,
    ])
  ),
  ...sizes('checkbox', 'wr-checkbox'),
  ...sizes('radio', 'wr-radio'),
  ...sizes('switch', 'wr-switch'),
  ...sizes('badge', 'wr-tag'),
  ['badge', '.wr-tag--sm.wr-tag--rounded', `.wr-tag${value('size', 'sm')}${flag('rounded')}`],
  ...sizes('progress', 'wr-progress'),
  ...sizes('slider', 'wr-slider'),
  ...sizes('color-picker', 'wr-color-picker'),
  ...sizes('transfer', 'wr-transfer'),
  // These two keep their hooks on the parts, so a size is a rule per part.
  ...[
    ['file-upload', 'wr-file-upload', ['zone', 'icon', 'hint', 'list', 'item']] as const,
    ['transfer', 'wr-transfer', ['head', 'title', 'search', 'item', 'empty']] as const,
  ].flatMap(([entry, block, parts]) =>
    parts.flatMap(element =>
      sizes(entry, block).map(([, byClass, byAttribute]): [string, string, string] => [
        entry,
        `${byClass} .${block}__${element}`,
        `${byAttribute} .${block}__${element}`,
      ])
    )
  ),
];

describe('a variant set by a static attribute', () => {
  it.each(VARIANTS)('%s: every rule of %s also matches %s', (entry, byClass, byAttribute) => {
    const rules = selectorLists(entry).filter(list => list.includes(byClass));

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.filter(list => !list.includes(byAttribute))).toEqual([]);
  });

  it('reads the modifier of a descendant rule off the host as well', () => {
    const steppers = selectorLists('input-number').filter(list =>
      list.includes('.wr-input-number--rounded .wr-input-number__steppers.wr-input-group__affix')
    );

    expect(steppers.length).toBeGreaterThan(0);
    for (const list of steppers) {
      expect(list).toContain(`.wr-input-number${flag('rounded')} .wr-input-number__steppers.wr-input-group__affix`);
    }
  });

  // `:where()` keeps the attribute form at the specificity of the modifier class
  // it stands beside, so no rule that used to win now loses.
  it('never adds specificity: the attribute part is always inside :where()', () => {
    const bare = [...new Set(VARIANTS.map(([entry]) => entry))].flatMap(entry =>
      selectorLists(entry)
        .flat()
        .filter(selector => /\[(size|color|outlined|block|rounded|transparent)[=\]]/.test(selector))
        .filter(selector =>
          /\[(size|color|outlined|block|rounded|transparent)[=\]]/.test(
            selector.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '')
          )
        )
    );

    expect(bare).toEqual([]);
  });
});

@Component({
  template: `
    <wr-btn outlined size="sm" color="danger" />
    <wr-btn outlined="false" />
    <wr-input-group rounded><input wrInput size="lg" /></wr-input-group>
    <wr-tag color="success" transparent />
  `,
  imports: [WrButton, WrInputGroup, WrInput, WrTag],
})
class Host {}

describe('before the first update pass', () => {
  /** Every selector of `entry` that matches `el`, reduced to the ones written by attribute. */
  function attributeMatches(entry: string, el: Element): string[] {
    return selectorLists(entry)
      .flat()
      .filter(selector => selector.includes(':where([') && !selector.startsWith(':where('))
      .filter(selector => !/:(hover|active|focus|has|dir)/.test(selector) && el.matches(selector));
  }

  it('the compiled sheet already resolves the variants of a host created without change detection', () => {
    const root = TestBed.createComponent(Host).nativeElement as HTMLElement;
    const [button, plain] = root.querySelectorAll('wr-btn');
    const group = root.querySelector('wr-input-group')!;
    const input = root.querySelector('input')!;
    const tag = root.querySelector('wr-tag')!;

    expect([...button.classList]).toEqual(['wr-btn']);
    expect(attributeMatches('button', button)).toEqual([
      `.wr-btn${value('size', 'sm')}`,
      `.wr-btn${flag('outlined')}`,
      `.wr-btn${value('color', 'danger')}`,
      `.wr-btn${value('color', 'danger')}${flag('outlined')}`,
    ]);
    expect(attributeMatches('button', plain)).toEqual([]);
    expect(attributeMatches('input', group)).toEqual([`.wr-input-group${flag('rounded')}`]);
    expect(attributeMatches('input', input)).toEqual([`.wr-input${value('size', 'lg')}`]);
    expect(attributeMatches('badge', tag)).toEqual([
      `.wr-tag${value('color', 'success')}`,
      `.wr-tag${value('color', 'success')}${flag('transparent')}`,
    ]);
  });

  it('the update pass then adds the classes those selectors stand beside', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect([...root.querySelector('wr-btn')!.classList].sort()).toEqual([
      'wr-btn',
      'wr-btn--danger',
      'wr-btn--outlined',
      'wr-btn--sm',
    ]);
    expect([...root.querySelectorAll('wr-btn')[1].classList]).toEqual(['wr-btn']);
    expect([...root.querySelector('wr-input-group')!.classList].sort()).toEqual([
      'wr-input-group',
      'wr-input-group--rounded',
    ]);
    expect([...root.querySelector('input')!.classList].sort()).toEqual(['wr-input', 'wr-input--lg']);
  });
});
