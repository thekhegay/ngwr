import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrAlert } from 'ngwr/alert';
import { WrAvatar } from 'ngwr/avatar';
import { WrBackTop } from 'ngwr/back-top';
import { WrBadge, WrTag } from 'ngwr/badge';
import { WrBurger } from 'ngwr/burger';
import { WrButton, WrButtonGroup } from 'ngwr/button';
import { WrCalendar } from 'ngwr/calendar';
import { WrCard } from 'ngwr/card';
import { WrCascader } from 'ngwr/cascader';
import { WrCheckbox } from 'ngwr/checkbox';
import { WrCollapse } from 'ngwr/collapse';
import { WrColorPicker } from 'ngwr/color-picker';
import { WrComment, WrCommentComposer } from 'ngwr/comment';
import { WrCompare } from 'ngwr/compare';
import { WrContextMenuItem } from 'ngwr/context-menu';
import { WrCopyValue } from 'ngwr/copy-value';
import { WrDatePicker, WrDateRangePicker } from 'ngwr/date-picker';
import { WrDateStamp } from 'ngwr/date-stamp';
import { WrDescriptions } from 'ngwr/descriptions';
import { WrDialogFooter } from 'ngwr/dialog';
import { WrDivider } from 'ngwr/divider';
import { WrDrawerFooter } from 'ngwr/drawer';
import { WrDropdownItem } from 'ngwr/dropdown';
import { WrEditor } from 'ngwr/editor';
import { WrEventCalendar } from 'ngwr/event-calendar';
import { WrFileUpload } from 'ngwr/file-upload';
import { WrFormField, WrFormItem } from 'ngwr/form';
import { WrInput, WrInputGroup } from 'ngwr/input';
import { WrInputNumber } from 'ngwr/input-number';
import { WrInputOtp } from 'ngwr/input-otp';
import { WrKbd } from 'ngwr/keyboard';
import { WrKnob } from 'ngwr/knob';
import { WrLayout, WrLayoutSider } from 'ngwr/layout';
import { WrLightbox } from 'ngwr/lightbox';
import { WrList, WrListItem } from 'ngwr/list';
import { WrLoadState } from 'ngwr/load-state';
import { WrPagination } from 'ngwr/pagination';
import { WrProgress } from 'ngwr/progress';
import { WrRadio, WrRadioGroup } from 'ngwr/radio';
import { WrRating } from 'ngwr/rating';
import { WrResult } from 'ngwr/result';
import { WrSegmented } from 'ngwr/segmented';
import { WrOption, WrSelect } from 'ngwr/select';
import { WrSkeleton } from 'ngwr/skeleton';
import { WrSlider } from 'ngwr/slider';
import { WrSpeedDial } from 'ngwr/speed-dial';
import { WrSpinner } from 'ngwr/spinner';
import { WrSplitter } from 'ngwr/splitter';
import { WrStepper } from 'ngwr/stepper';
import { WrSwitch } from 'ngwr/switch';
import { WrTableFilter, WrTableSort } from 'ngwr/table';
import { WrTextarea } from 'ngwr/textarea';
import { WrTimeline, WrTimelineItem } from 'ngwr/timeline';
import { WrTransfer } from 'ngwr/transfer';
import { WrTree } from 'ngwr/tree';
import { WrTypography } from 'ngwr/typography';
import { WrWindowTaskbar } from 'ngwr/window';
import { describe, expect, it } from 'vitest';

import { WrTimePanel } from './date-picker/internal/time-panel';
import { WrToastHost } from './toast/toast-host';
import { WrToastItem } from './toast/toast-item';

/**
 * In a zoneless app the router inserts a routed page in one task and the first
 * update pass, which applies host bindings, runs in a later scheduler tick. A
 * base class that arrives through a binding is missing in between, so the
 * browser resolves the element with user-agent styles and the component's own
 * `transition` then animates from them. A base class in static host metadata is
 * on the element from creation, which is what every test below reads: nothing
 * here runs change detection.
 */

@Component({
  selector: 'wr-spec-static-class',
  template: '',
  host: { class: 'wr-spec', '[class]': 'extra()' },
})
class StaticAndBound {
  readonly extra = signal('wr-spec--a');
}

@Component({
  template: '<wr-spec-static-class class="mine" />',
  imports: [StaticAndBound],
})
class StaticAndBoundHost {}

describe('a static host class beside a [class] binding', () => {
  it('is on the element before the first update pass and survives every change of the binding', () => {
    const fixture = TestBed.createComponent(StaticAndBoundHost);
    const el = (fixture.nativeElement as HTMLElement).querySelector('wr-spec-static-class')!;
    const bound = fixture.debugElement.children[0].componentInstance as StaticAndBound;

    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec']);

    fixture.detectChanges();
    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec', 'wr-spec--a']);

    bound.extra.set('wr-spec--b');
    fixture.detectChanges();
    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec', 'wr-spec--b']);

    bound.extra.set('');
    fixture.detectChanges();
    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec']);

    // A binding that repeats the static class neither doubles nor drops it.
    bound.extra.set('wr-spec wr-spec--c');
    fixture.detectChanges();
    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec', 'wr-spec--c']);

    bound.extra.set('wr-spec wr-spec--d');
    fixture.detectChanges();
    expect([...el.classList].sort()).toEqual(['mine', 'wr-spec', 'wr-spec--d']);
  });
});

const COMPONENTS: readonly (readonly [base: string, type: Type<unknown>])[] = [
  ['wr-alert', WrAlert],
  ['wr-avatar', WrAvatar],
  ['wr-back-top', WrBackTop],
  ['wr-badge', WrBadge],
  ['wr-tag', WrTag],
  ['wr-burger', WrBurger],
  ['wr-btn', WrButton],
  ['wr-btn-group', WrButtonGroup],
  ['wr-calendar', WrCalendar],
  ['wr-card', WrCard],
  ['wr-cascader', WrCascader],
  ['wr-checkbox', WrCheckbox],
  ['wr-collapse', WrCollapse],
  ['wr-color-picker', WrColorPicker],
  ['wr-comment', WrComment],
  ['wr-comment-composer', WrCommentComposer],
  ['wr-compare', WrCompare],
  ['wr-context-menu-item', WrContextMenuItem],
  ['wr-copy-value', WrCopyValue],
  ['wr-date-picker', WrDatePicker],
  ['wr-date-range-picker', WrDateRangePicker],
  ['wr-date-stamp', WrDateStamp],
  ['wr-time-picker', WrTimePanel],
  ['wr-descriptions', WrDescriptions],
  ['wr-divider', WrDivider],
  ['wr-dropdown-item', WrDropdownItem],
  ['wr-editor', WrEditor],
  ['wr-event-calendar', WrEventCalendar],
  ['wr-file-upload', WrFileUpload],
  ['wr-form-field', WrFormField],
  ['wr-form-item', WrFormItem],
  ['wr-input-group', WrInputGroup],
  ['wr-input-number', WrInputNumber],
  ['wr-input-otp', WrInputOtp],
  ['wr-kbd', WrKbd],
  ['wr-knob', WrKnob],
  ['wr-layout', WrLayout],
  ['wr-layout-sider', WrLayoutSider],
  ['wr-lightbox', WrLightbox],
  ['wr-list', WrList],
  ['wr-list__item', WrListItem],
  ['wr-load-state', WrLoadState],
  ['wr-pagination', WrPagination],
  ['wr-progress', WrProgress],
  ['wr-rating', WrRating],
  ['wr-result', WrResult],
  ['wr-segmented', WrSegmented],
  ['wr-select', WrSelect],
  ['wr-option', WrOption],
  ['wr-skeleton', WrSkeleton],
  ['wr-slider', WrSlider],
  ['wr-speed-dial', WrSpeedDial],
  ['wr-spinner', WrSpinner],
  ['wr-splitter', WrSplitter],
  ['wr-stepper', WrStepper],
  ['wr-switch', WrSwitch],
  ['wr-table-filter', WrTableFilter],
  ['wr-table-sort', WrTableSort],
  ['wr-textarea', WrTextarea],
  ['wr-timeline', WrTimeline],
  ['wr-timeline-item', WrTimelineItem],
  ['wr-toast-host', WrToastHost],
  ['wr-toast', WrToastItem],
  ['wr-transfer', WrTransfer],
  ['wr-tree', WrTree],
  // `WrWindow` is not exported; importing its file ahead of `ngwr/window` breaks
  // that entry's module cycle for every later spec in the worker. The source
  // gate below still covers its host.
  ['wr-window-taskbar', WrWindowTaskbar],
];

/** Hosts a directive, or a component that needs a parent or a native element, cannot be created without. */
@Component({
  template: `
    <input wrInput data-base="wr-input" />
    <textarea wrInput data-base="wr-input"></textarea>
    <button wr-btn type="button" data-base="wr-btn">Save</button>
    <a wr-btn href="/" data-base="wr-btn">Home</a>
    <p wrTypography data-base="wr-typography"></p>
    <div wrDialogFooter data-base="wr-dialog__footer"></div>
    <div wrDrawerFooter data-base="wr-drawer__footer"></div>
    <wr-radio-group>
      <wr-radio value="a" data-base="wr-radio" />
    </wr-radio-group>
  `,
  imports: [WrInput, WrButton, WrTypography, WrDialogFooter, WrDrawerFooter, WrRadioGroup, WrRadio],
})
class TemplateHost {}

describe('the base block class before the first update pass', () => {
  it.each(COMPONENTS)('.%s is on the host', (base, type) => {
    const host = TestBed.createComponent(type).nativeElement as HTMLElement;
    expect([...host.classList]).toContain(base);
  });

  it('is on every host a template declares', () => {
    const root = TestBed.createComponent(TemplateHost).nativeElement as HTMLElement;
    const hosts = [...root.querySelectorAll<HTMLElement>('[data-base]')];

    expect(hosts).toHaveLength(8);
    expect(hosts.filter(el => !el.classList.contains(el.dataset['base']!)).map(el => el.outerHTML)).toEqual([]);
  });
});

/** A host whose `[class]` adds a class the template names, rather than a block's own. */
const NO_BASE = new Set(['charts/chart-legend/internal/chart-legend-part.ts']);

function sources(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sources(join(dir, entry.name), path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('host metadata in the library source', () => {
  const lib = join(process.cwd(), 'projects/lib');

  it('pairs every host [class] binding with a static class', () => {
    const missing = sources(lib).filter(path => {
      if (NO_BASE.has(path)) return false;
      const source = readFileSync(join(lib, path), 'utf8');
      return [...source.matchAll(/\bhost: \{([\s\S]*?)\n? *\},?\n/g)].some(
        ([, host]) => host.includes("'[class]'") && !/(^|[\s{,])class: '/.test(host)
      );
    });

    expect(missing).toEqual([]);
  });

  it('declares the block of every [class.wr-…] host binding statically', () => {
    const missing = sources(lib).filter(path => {
      const source = readFileSync(join(lib, path), 'utf8');
      return [...source.matchAll(/\bhost: \{([\s\S]*?)\n? *\},?\n/g)].some(
        ([, host]) => host.includes("'[class.wr-") && !/(^|[\s{,])class: '/.test(host)
      );
    });

    expect(missing).toEqual([]);
  });
});
