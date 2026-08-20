import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, form, required } from '@angular/forms/signals';

import { WrFormField } from 'ngwr/form';
import { provideWrIcons, svgIcon } from 'ngwr/icon';
import { WrSegmented, type WrSegmentedOption, type WrSegmentedSize } from 'ngwr/segmented';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WrSegmentedHarness } from './wr-segmented-harness';
import { WrSegmentedOptionHarness } from './wr-segmented-option-harness';

const CHECK_SVG = '<svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6" /></svg>';
const SEARCH_SVG = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /></svg>';

/**
 * The heading is OUTSIDE the control and the `aria-label` is a decoy: a segmented
 * control ships no label input, so both routes belong to the consumer and only one of
 * them is announced.
 */
@Component({
  imports: [WrSegmented],
  template: `
    <h3 id="range-question">Range</h3>

    <wr-segmented
      aria-label="Ignored"
      aria-labelledby="range-question"
      [options]="options()"
      [(value)]="picked"
      [disabled]="disabled()"
      [size]="size()"
    />
  `,
})
class Host {
  readonly options = signal<readonly WrSegmentedOption<string>[]>([
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month', disabled: true },
  ]);
  readonly picked = signal<string | null>('day');
  readonly disabled = signal(false);
  readonly size = signal<WrSegmentedSize>('md');
}

/**
 * Every rung of the naming fallback in one control: a labelled segment, an icon-only
 * one with an `ariaLabel`, an icon-only one relying on its VALUE, and one with nothing
 * to name it at all.
 */
@Component({
  imports: [WrSegmented],
  template: `<wr-segmented aria-label="View" [options]="options" [(value)]="picked" />`,
})
class IconHost {
  readonly options: readonly WrSegmentedOption<string | null>[] = [
    { value: 'list', label: 'List', icon: 'check' },
    { value: 'grid', icon: 'search', ariaLabel: 'Grid' },
    { value: 'map', icon: 'search' },
    { value: null, icon: 'search' },
  ];
  readonly picked = signal<string | null>('list');
}

/** Two controls on one page — the shape that catches one answering for the other. */
@Component({
  imports: [WrSegmented],
  template: `
    <wr-segmented aria-label="Range" size="sm" value="day" [options]="range" />
    <wr-segmented aria-label="Zoom" size="lg" value="fit" [disabled]="true" [options]="zoom" />
  `,
})
class TwoHost {
  readonly range: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];
  readonly zoom: readonly WrSegmentedOption<string>[] = [
    { value: 'fit', label: 'Fit' },
    { value: 'full', label: 'Full' },
  ];
}

/**
 * Used exactly as a consumer would: through the loader, with no internals touched.
 *
 * Every write is asserted against the HOST's model as well as against the DOM. A
 * segment that presses without moving the bound value is the failure that matters
 * here — `aria-pressed` is a binding and the value is a signal, and only one of them
 * is what the app reads.
 */
describe('WrSegmentedHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const segments = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.wr-segmented__option'),
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('is a group of toggle buttons — not a radiogroup, a tablist or native radios', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    expect(await segmented.getRole()).toBe('group');
    // The segments carry no role of their own (they are buttons) and no `aria-checked`
    // / `aria-selected`: the pressed state is the whole accessible story, which is what
    // makes the tab order below a list rather than one stop.
    for (const segment of segments()) {
      expect(segment.tagName).toBe('BUTTON');
      expect(segment.getAttribute('role')).toBeNull();
      expect(segment.getAttribute('aria-checked')).toBeNull();
      expect(segment.getAttribute('aria-selected')).toBeNull();
      expect(segment.hasAttribute('aria-pressed')).toBe(true);
    }
  });

  it('names the control through the reference, which wins over aria-label', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    // Both are wired and only one is announced: a harness preferring `aria-label`
    // would report a name nobody hears.
    expect(await segmented.getAccessibleName()).toBe('Range');
  });

  it('lists the segments in order and presses exactly the selected one', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    expect(await segmented.getOptionLabels()).toEqual(['Day', 'Week', 'Month']);
    expect(await segmented.getSelectedIndex()).toBe(0);
    expect(await segmented.getSelectedLabel()).toBe('Day');
    expect(await Promise.all((await segmented.getOptions()).map(o => o.isSelected()))).toEqual([true, false, false]);
  });

  it('keeps aria-pressed and the selected modifier on the same segment', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    await segmented.select({ label: 'Week' });

    // `isSelected()` reads the attribute because that is what is announced; the class
    // is the paint. They are two bindings over one predicate, so a divergence would
    // show a control that reads selected and looks unselected, or the reverse.
    expect(segments().map(s => s.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(segments().map(s => s.classList.contains('wr-segmented__option--selected'))).toEqual([false, true, false]);
  });

  it('selects by label and writes the picked value to the host model', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await segmented.select({ label: 'Week' });

    expect(fixture.componentInstance.picked()).toBe('week');
    expect(await segmented.getSelectedLabel()).toBe('Week');
    expect(await segmented.getSelectedIndex()).toBe(1);
    expect(await segmented.getThumbIndex()).toBe(1);
  });

  it('selects by position, and refuses an index the control does not have', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await segmented.selectAt(1);
    expect(fixture.componentInstance.picked()).toBe('week');

    // An off-by-one that resolved to nothing would otherwise read as "the click did
    // not take" three assertions later.
    await expect(segmented.selectAt(3)).rejects.toThrow(/index 3 is outside this control, which has 3 segment/);
    await expect(segmented.selectAt(-1)).rejects.toThrow(/index -1 is outside this control/);
    expect(fixture.componentInstance.picked()).toBe('week');
  });

  it('says which segments exist when none of them matched', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await expect(segmented.select({ label: 'Year' })).rejects.toThrow(/Day, Week, Month/);
  });

  it('refuses a segment disabled by its own option', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [, , month] = await segmented.getOptions();

    expect(await month.isDisabled()).toBe(true);
    // The control as a whole is NOT disabled — only this segment is, and the modifier
    // class is the only thing on the page that tells those apart.
    expect(await segmented.isDisabled()).toBe(false);

    await expect(segmented.select({ label: 'Month' })).rejects.toThrow(/still unpressed/);
    expect(fixture.componentInstance.picked()).toBe('day');
  });

  it('reports a control disabled as a whole, and stops being a tab stop at all', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    expect(await segmented.isDisabled()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await segmented.isDisabled()).toBe(true);
    expect(await segmented.getTabStopLabels()).toEqual([]);
    // The CDK's click reads the native `disabled` property and drops the `click` event,
    // so the component's handler is never even reached — and `select()` turns that
    // silent no-op into a failure that names both possible causes.
    await expect(segmented.select({ label: 'Week' })).rejects.toThrow(/whole control/);
    expect(fixture.componentInstance.picked()).toBe('day');
  });

  it('is not a disabled control just because every one of its segments is', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    fixture.componentInstance.options.set([
      { value: 'day', label: 'Day', disabled: true },
      { value: 'week', label: 'Week', disabled: true },
    ]);
    await fixture.whenStable();

    // The page now LOOKS exactly like a control disabled as a whole — every segment
    // refuses a click and nothing is a tab stop — and the `wr-segmented--disabled`
    // modifier is the only thing that tells the two apart. So `isDisabled()` reads that
    // modifier: an answer polled from the segments would say `true` here and lose the
    // distinction its own doc promises.
    expect(await Promise.all((await segmented.getOptions()).map(option => option.isDisabled()))).toEqual([true, true]);
    expect(await segmented.getTabStopLabels()).toEqual([]);
    expect(await segmented.isDisabled()).toBe(false);

    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(await segmented.isDisabled()).toBe(true);
  });

  it('follows a value written from outside', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    fixture.componentInstance.picked.set('week');
    await fixture.whenStable();

    expect(await segmented.getSelectedLabel()).toBe('Week');
    expect(await segmented.getSelectedIndex()).toBe(1);
  });

  it('parks the thumb under the first segment while nothing is selected', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    fixture.componentInstance.picked.set('year');
    await fixture.whenStable();

    // The pin for this component. `--wr-segmented-thumb-index` is `max(0, selectedIndex)`,
    // so a value matching no option publishes 0 — indistinguishable from segment one
    // being selected. A harness answering "which is selected" from the thumb would
    // report Day for a control that announces nothing at all as pressed; the selection
    // is `aria-pressed`, and the thumb is hidden by the `--unselected` modifier instead
    // of being moved anywhere.
    expect(await segmented.getSelectedIndex()).toBe(-1);
    expect(await segmented.getSelectedLabel()).toBeNull();
    expect(await segmented.getSelectedOption()).toBeNull();
    expect(await segmented.getThumbIndex()).toBe(0);
    expect(await segmented.isThumbVisible()).toBe(false);

    await segmented.select({ label: 'Day' });

    expect(await segmented.getThumbIndex()).toBe(0);
    expect(await segmented.isThumbVisible()).toBe(true);
  });

  it('gives every enabled segment its own tab stop, and focus never moves the selection', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    // A radiogroup or a tablist would be ONE stop with a roving tabindex; here the
    // component authors no tabindex at all, so Tab walks the strip and skips the
    // disabled segment.
    expect(await segmented.getTabStopLabels()).toEqual(['Day', 'Week']);
    expect(segments().map(s => s.getAttribute('tabindex'))).toEqual([null, null, null]);
    expect(await segmented.getFocusedLabel()).toBeNull();

    const [, week] = await segmented.getOptions();
    await week.focus();

    expect(await week.isFocused()).toBe(true);
    expect(await segmented.getFocusedLabel()).toBe('Week');
    // Focus moved; the selection did not. The two answers are independent here, which
    // is exactly what a roving-focus component would not allow.
    expect(await segmented.getSelectedLabel()).toBe('Day');

    // And no arrow-key handler exists to change that: the component ships none, so a
    // press that started moving the selection would mean the control had quietly
    // become a tablist without the roles or the single tab stop to match.
    segments()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();

    expect(await segmented.getFocusedLabel()).toBe('Week');
    expect(await segmented.getSelectedLabel()).toBe('Day');

    await week.blur();
    expect(await week.isFocused()).toBe(false);
    expect(await segmented.getFocusedLabel()).toBeNull();
  });

  it('leaves activation to the browser, which is why the harness clicks', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [, week] = await segmented.getOptions();
    await week.focus();

    // Enter and Space activate a `<button>` through the browser's own default action:
    // the component listens for neither, and a DOM without one implements neither. So
    // the accessible path is not the drivable path here — `select()` clicks, which
    // needs no layout — and if this ever starts moving the value, that note is what
    // needs revisiting.
    for (const key of ['Enter', ' ']) {
      segments()[1].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      segments()[1].dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    }
    await fixture.whenStable();

    expect(fixture.componentInstance.picked()).toBe('day');

    await week.select();

    expect(fixture.componentInstance.picked()).toBe('week');
  });

  it('reports the size that is rendered, md being the absence of a modifier', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    expect(await segmented.getSize()).toBe('md');

    fixture.componentInstance.size.set('sm');
    await fixture.whenStable();
    expect(await segmented.getSize()).toBe('sm');

    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();
    expect(await segmented.getSize()).toBe('lg');
  });

  it('arms the thumb transition only after the first paint', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    // The `--mounted` modifier lands in `afterNextRender`, which is why the initial
    // snap to `day` is instant and every move after it slides. Every harness read
    // stabilizes the fixture first, so by the time this is asked the class is there.
    expect(await segmented.isThumbTransitionEnabled()).toBe(true);
  });

  it('republishes the thumb geometry when the options change', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    expect(await segmented.getThumbCount()).toBe(3);

    fixture.componentInstance.options.set([
      { value: 'list', label: 'List' },
      { value: 'grid', label: 'Grid' },
    ]);
    await fixture.whenStable();

    // A count out of step with the segments is invisible to every ARIA assertion on
    // the page and leaves the thumb the wrong width, sliding to the wrong place.
    expect(await segmented.getOptionLabels()).toEqual(['List', 'Grid']);
    expect(await segmented.getThumbCount()).toBe(2);
    // The old value survives the swap and now matches nothing.
    expect(await segmented.getSelectedIndex()).toBe(-1);
    expect(await segmented.isThumbVisible()).toBe(false);
  });

  it('narrows segments by label, selected and disabled', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    await segmented.select({ label: 'Week' });

    const labels = async (filters: Parameters<typeof segmented.getOptions>[0]): Promise<string[]> =>
      Promise.all((await segmented.getOptions(filters)).map(option => option.getLabel()));

    expect(await labels({ selected: true })).toEqual(['Week']);
    expect(await labels({ selected: false })).toEqual(['Day', 'Month']);
    expect(await labels({ disabled: true })).toEqual(['Month']);
    expect(await labels({ label: /^D/ })).toEqual(['Day']);
    expect(await labels({ label: 'Month' })).toEqual(['Month']);
  });

  it('finds a single segment through the loader as well', async () => {
    const week = await loader.getHarness(WrSegmentedOptionHarness.with({ label: 'Week' }));

    await week.select();

    expect(await week.isSelected()).toBe(true);
    expect(fixture.componentInstance.picked()).toBe('week');

    // Already selected: a segmented control has no untoggle, so a second click is a
    // no-op rather than a clear.
    await week.select();
    expect(await week.isSelected()).toBe(true);
    expect(fixture.componentInstance.picked()).toBe('week');
  });
});

describe('WrSegmentedHarness — icons, and the names they fall back to', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<IconHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideWrIcons([svgIcon('check', CHECK_SVG), svgIcon('search', SEARCH_SVG)])],
    });
    fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('separates the visible label from the announced name', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [list, grid, map] = await segmented.getOptions();

    expect(await list.getText()).toBe('List');
    expect(await list.getLabel()).toBe('List');
    // No label element at all, so `null` rather than `''` — "icon only" and "an empty
    // label" are different mistakes to be looking at.
    expect(await grid.getText()).toBeNull();
    expect(await grid.getLabel()).toBe('Grid');
    // Nothing but the option's VALUE left to name it with. That the value shows up here
    // is the template's last-resort fallback, not an addressing scheme — an object
    // value would read `[object Object]`.
    expect(await map.getLabel()).toBe('map');
  });

  it('reads which icon each segment renders', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [list, grid] = await segmented.getOptions();

    // From the reflected `data-icon`: the glyph itself is markup the registry writes,
    // and an unregistered name leaves that empty while the attribute survives.
    expect(await list.hasIcon()).toBe(true);
    expect(await list.getIconName()).toBe('check');
    expect(await grid.getIconName()).toBe('search');
  });

  it('refuses to invent a label for a segment that has none', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [, , , unnamed] = await segmented.getOptions();

    expect(await unnamed.getAccessibleName()).toBeNull();
    await expect(unnamed.getLabel()).rejects.toThrow(/announces an unnamed button/);
    await expect(segmented.getOptionLabels()).rejects.toThrow(/unnamed button/);
  });

  it('lets a query for one segment survive an unnamed sibling', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    // The predicate runs against every segment, so it matches on the nullable name: a
    // `getLabel()` in there would throw a query for Grid out of the water because a
    // LATER segment has no name.
    expect(await Promise.all((await segmented.getOptions({ label: 'Grid' })).map(o => o.getText()))).toEqual([null]);
    expect(await segmented.getTabStopLabels()).toEqual(['List', 'Grid', 'map', '(unnamed)']);

    await segmented.select({ label: 'Grid' });

    expect(fixture.componentInstance.picked()).toBe('grid');
    expect(await segmented.getSelectedIndex()).toBe(1);
  });
});

describe('WrSegmentedHarness — two controls on one page', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<TwoHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(TwoHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('narrows by accessible name, size and disabled state', async () => {
    const range = await loader.getHarness(WrSegmentedHarness.with({ label: 'Range' }));
    const zoom = await loader.getHarness(WrSegmentedHarness.with({ label: /^Zo/ }));

    expect(await range.getSize()).toBe('sm');
    expect(await zoom.getSize()).toBe('lg');

    const small = await loader.getAllHarnesses(WrSegmentedHarness.with({ size: 'sm' }));
    expect(await Promise.all(small.map(s => s.getAccessibleName()))).toEqual(['Range']);

    const locked = await loader.getAllHarnesses(WrSegmentedHarness.with({ disabled: true }));
    expect(await Promise.all(locked.map(s => s.getAccessibleName()))).toEqual(['Zoom']);

    const live = await loader.getAllHarnesses(WrSegmentedHarness.with({ disabled: false }));
    expect(await Promise.all(live.map(s => s.getAccessibleName()))).toEqual(['Range']);
  });

  it('answers with only its own segments', async () => {
    const range = await loader.getHarness(WrSegmentedHarness.with({ label: 'Range' }));
    const zoom = await loader.getHarness(WrSegmentedHarness.with({ label: 'Zoom' }));

    expect(await range.getOptionLabels()).toEqual(['Day', 'Week']);
    expect(await zoom.getOptionLabels()).toEqual(['Fit', 'Full']);
    // The disabled control keeps its own selection while refusing to change it.
    expect(await zoom.getSelectedLabel()).toBe('Fit');
    expect(await zoom.getTabStopLabels()).toEqual([]);

    await range.select({ label: 'Week' });

    expect(await range.getSelectedLabel()).toBe('Week');
    expect(await zoom.getSelectedLabel()).toBe('Fit');
  });
});

/**
 * The form-field half of the surface, which only exists once the control is inside
 * one. Everything here is read off the HOST — the strip is one field, not a row of
 * them — and the sequence matters: a field publishes nothing until it is touched,
 * so a spec that asserts the copy without blurring first is asserting the empty
 * state and passing.
 */
@Component({
  imports: [FormField, WrFormField, WrSegmented],
  template: `
    <wr-form-field label="Range">
      <wr-segmented aria-label="Range" [options]="options" [formField]="schedule.range" />
    </wr-form-field>
  `,
})
class FieldHost {
  readonly options: readonly WrSegmentedOption<string>[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
  ];

  readonly model = signal({ range: '' });
  readonly schedule = form(this.model, path => {
    required(path.range);
  });
}

describe('WrSegmentedHarness — inside a form field', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<FieldHost>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => fixture.destroy());

  it('reports nothing while the field has nothing to say', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    expect(await segmented.isInvalid()).toBe(false);
    expect(await segmented.getDescriptionText()).toBeNull();
  });

  it('marks the bound field touched when focus leaves the strip', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);
    const [day] = await segmented.getOptions();

    await day.focus();
    expect(fixture.componentInstance.schedule.range().touched()).toBe(false);

    await segmented.blur();

    expect(fixture.componentInstance.schedule.range().touched()).toBe(true);
  });

  it('reads the validation copy the field then shows', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await (await segmented.getOptions())[0].focus();
    await segmented.blur();

    expect(await segmented.isInvalid()).toBe(true);
    expect(await segmented.getDescriptionText()).not.toBe('');
    expect(await segmented.getDescriptionText()).not.toBeNull();
  });

  it('writes the picked segment into the field', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await segmented.select({ label: 'Week' });

    expect(fixture.componentInstance.schedule().value()).toEqual({ range: 'week' });
  });

  it('blurs quietly when nothing inside had focus', async () => {
    const segmented = await loader.getHarness(WrSegmentedHarness);

    await expect(segmented.blur()).resolves.toBeUndefined();
    expect(fixture.componentInstance.schedule.range().touched()).toBe(false);
  });
});
