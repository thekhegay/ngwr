import { Component } from '@angular/core';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocNgtrueComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-testing-page',
  templateUrl: './testing.html',
  imports: [
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocApiComponent,
    DocNgtrueComponent,
    DocSeeAlsoComponent,
  ],
})
export default class TestingGuidePageComponent {
  protected readonly snippets = {
    axeTriage: `const results = await new AxeBuilder({ page }).analyze();
expect(results.violations).toEqual([]);

// Only if your gate also reads \`incomplete\`: drop the closed-combobox nodes.
const forReview = results.incomplete.filter(
  r =>
    r.id !== 'aria-valid-attr-value' ||
    r.nodes.some(n => !/aria-controls/.test(n.html) || !/aria-expanded="false"/.test(n.html)),
);
expect(forReview).toEqual([]);`,

    tableName: `<!-- The visible heading names the region. -->
<section role="region" aria-labelledby="open-orders-heading">
  <h2 id="open-orders-heading">Open orders</h2>
  <wr-table [columns]="cols" [items]="orders()" />
</section>

<!-- No heading? Name the region directly. -->
<section role="region" aria-label="Archived orders">
  <wr-table [columns]="cols" [items]="archived()" />
</section>`,

    first: `import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { WrButtonHarness } from 'ngwr/button/testing';

it('disables Save until the form is filled', async () => {
  const fixture = TestBed.createComponent(CheckoutPage);
  fixture.detectChanges();

  const loader = TestbedHarnessEnvironment.loader(fixture);
  const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));

  expect(await save.isDisabled()).toBe(true);
});`,

    filters: `await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
await loader.getAllHarnesses(WrButtonHarness.with({ text: /^S/ }));
await loader.getAllHarnesses(WrButtonHarness.with({ disabled: true }));

await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
await loader.getHarness(WrSwitchHarness.with({ label: 'Dark mode', on: false }));`,

    form: `it('enables Save once the form is valid', async () => {
  const loader = TestbedHarnessEnvironment.loader(fixture);

  const email = await loader.getHarness(WrInputHarness.with({ placeholder: 'Email' }));
  const terms = await loader.getHarness(WrCheckboxHarness.with({ label: 'I agree' }));
  const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));

  await email.setValue('ada@example.test');
  await terms.check();

  expect(await save.isDisabled()).toBe(false);
});`,

    overlay: `const loader = TestbedHarnessEnvironment.loader(fixture);
const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);

it('confirms before deleting', async () => {
  await (await loader.getHarness(WrButtonHarness.with({ text: 'Delete' }))).click();

  const dialog = await rootLoader.getHarness(WrDialogHarness);
  expect(await dialog.getTitleText()).toBe('Delete item');

  // Searches inside this dialog only.
  await (await dialog.getHarness(WrButtonHarness.with({ text: 'Confirm' }))).click();

  const toast = await rootLoader.getHarness(WrToastHarness.with({ type: 'success' }));
  expect(await toast.getMessage()).toBe('Item deleted');
});`,

    select: `it('picks a size', async () => {
  const select = await loader.getHarness(WrSelectHarness);

  await select.open();
  expect(await select.getOptionLabels()).toEqual(['Small', 'Medium', 'Large']);

  await select.selectOption({ text: 'Medium' });
  expect(await select.getValueText()).toBe('Medium');
});

it('filters as you type', async () => {
  const select = await loader.getHarness(WrSelectHarness);

  await select.open();
  await select.typeSearch('la');
  expect(await select.getOptionLabels()).toEqual(['Large']);
});

it('builds up a multi selection', async () => {
  const select = await loader.getHarness(WrSelectHarness);

  await select.selectOption({ text: 'Small' });
  await select.selectOption({ text: 'Large' });
  expect(await select.getChipLabels()).toEqual(['Small', 'Large']);

  await select.removeChip('Small');
  expect(await select.getChipLabels()).toEqual(['Large']);
});`,

    dropdown: `it('renames from the menu', async () => {
  const menu = await loader.getHarness(WrDropdownHarness.with({ text: 'Actions' }));

  await menu.open();
  expect(await menu.getItemTexts()).toEqual(['Rename', 'Duplicate', 'Delete']);
  expect(await menu.getFocusedItemText()).toBe('Rename');

  await menu.clickItem({ text: 'Rename' });
  expect(await menu.isOpen()).toBe(true);   // picking does not close the menu
});`,

    datePicker: `// Pin the locale your assertions are written in.
TestBed.configureTestingModule({
  providers: [provideWr(withDates({ locale: 'en-US' }))],
});

it('picks a departure date', async () => {
  const picker = await loader.getHarness(WrDatePickerHarness);

  await picker.open();
  expect(await picker.getPanelHeader()).toBe('January 2025');
  expect(await picker.getWeekdayLabels()).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);

  await picker.selectDay(20);
  expect(await picker.getValueText()).toBe('20.01.2025');
});

it('reads the state of a day cell', async () => {
  const picker = await loader.getHarness(WrDatePickerHarness);
  await picker.open();

  const day = await picker.getDay(15);
  expect(await day.isSelected()).toBe(true);
  expect(await day.isToday()).toBe(false);

  await expect(picker.selectDay(5)).rejects.toThrow(/disabled/);
});

it('sets a time and steps it', async () => {
  const picker = await loader.getHarness(WrDatePickerHarness);   // mode="datetime"
  await picker.open();

  await picker.setTime({ hours: 9, minutes: 30 });
  await picker.stepTime('minutes', 1);
  expect(await picker.getTime()).toBe('09:31');
});`,

    popover: `it('explains itself on hover', async () => {
  const tip = await loader.getHarness(WrPopoverHarness.with({ mode: 'tooltip' }));

  await tip.open();                       // hover for a tooltip, click for a popover
  expect(await tip.getContentText()).toBe('Save changes');
  expect(await tip.getRole()).toBe('tooltip');

  await tip.close();
});`,

    drawer: `it('closes the drawer', async () => {
  const drawer = await rootLoader.getHarness(WrDrawerHarness);

  expect(await drawer.getTitleText()).toBe('Filters');
  expect(await drawer.getPosition()).toBe('end');
  expect(await drawer.isLabelledByTitle()).toBe(true);

  await drawer.close();
});`,

    colorPicker: `it('picks a colour through the fields', async () => {
  const trigger = await loader.getHarness(WrColorPickerTriggerHarness);
  const picker = await trigger.open();

  await picker.setHex('#3969e2');
  expect(await picker.getHex()).toBe('#3969e2ff');

  await picker.setTab('rgb');
  expect(await picker.getRgb()).toEqual({ r: 57, g: 105, b: 226 });

  await picker.setAlphaPercent(50);
  expect((await picker.getThumbs()).alpha).toBe(50);
});`,

    animations: `it('animates text without losing it', async () => {
  const headline = await loader.getHarness(WrBlurTextHarness);

  expect(await headline.getAccessibleText()).toBe('Welcome to ngwr');
  expect(await headline.getPieces()).toEqual(['Welcome', 'to', 'ngwr']);
  expect(await headline.isTextHidden()).toBe(true);
  expect(await headline.getRenderedText()).toBe(await headline.getAccessibleText());
});`,

    charts: `it('reads the data, not the drawing', async () => {
  const bars = await loader.getHarness(WrBarChartHarness);

  expect(await bars.getLabels()).toEqual(['Mon', 'Tue', 'Wed']);
  expect(await bars.getAccessibleNames()).toEqual(['Mon: 12', 'Tue: 24', 'Wed: 6']);
  expect((await bars.getBars()).map(b => b.heightPercent)).toEqual([50, 100, 25]);

  const donut = await loader.getHarness(WrDonutChartHarness);
  expect(await donut.getLegend()).toEqual([{ label: 'Direct', value: '30' }]);
});`,

    eventCalendar: `it('moves an event with the keyboard', async () => {
  const calendar = await loader.getHarness(WrEventCalendarHarness);

  expect(await calendar.getView()).toBe('month');
  expect(await calendar.getChipLabels()).toHaveLength(3);

  const [standup] = await calendar.getChips({ title: 'Standup' });
  await standup.move('right');

  // The calendar only emits eventChange; the host applies it.
  expect(changed()?.kind).toBe('move');
  expect(changed()?.start.getDate()).toBe(15);
});`,

    imageCropper: `it('opens a crop window once the image is measured', async () => {
  const cropper = await loader.getHarness(WrImageCropperHarness);

  // jsdom has no layout: give the image a size first.
  const img = fixture.nativeElement.querySelector('.wr-image-cropper__image');
  img.getBoundingClientRect = () => ({ width: 400, height: 400, x: 0, y: 0 });
  Object.defineProperty(img, 'naturalWidth', { value: 800 });
  Object.defineProperty(img, 'naturalHeight', { value: 800 });

  await cropper.dispatchImageLoad();

  expect(await cropper.getCropBox()).toEqual({ x: 80, y: 80, width: 240, height: 240 });
});`,

    window: `it('minimizes to the taskbar and back', async () => {
  windows.open(EditorComponent, { title: 'Untitled.md' });
  await fixture.whenStable();

  const win = await rootLoader.getHarness(WrWindowHarness.with({ title: 'Untitled.md' }));
  await win.minimize();

  expect(await win.isOpen()).toBe(true);   // minimized is still open
  expect(await win.getState()).toBe('minimized');

  const taskbar = await loader.getHarness(WrWindowTaskbarHarness);
  expect(await taskbar.getTabTitles()).toEqual(['Untitled.md']);

  await taskbar.restore('Untitled.md');
  expect(await win.getState()).toBe('normal');
});`,

    calendar: `it('picks a day and walks the views', async () => {
  const calendar = await loader.getHarness(WrCalendarHarness);

  expect(await calendar.getHeaderLabel()).toBe('March 2026');
  await (await calendar.getDay(20)).click();
  expect(await calendar.getSelectedDayNumbers()).toEqual([20]);

  await calendar.clickHeader();               // day -> month
  await calendar.selectChip('Jun');           // and back down
  expect(await calendar.getHeaderLabel()).toBe('June 2026');
});`,

    tour: `it('walks the tour', async () => {
  tour.start(steps);
  await fixture.whenStable();

  const first = await rootLoader.getHarness(WrTourHarness);
  expect(await first.getTitle()).toBe('Search');
  expect(await first.hasBack()).toBe(false);

  await first.next();

  // Each step is a new card, so get a fresh harness.
  const second = await rootLoader.getHarness(WrTourHarness);
  expect(await second.getProgress()).toEqual({ current: 2, total: 2 });
  expect(await second.getPrimaryLabel()).toBe('Done');
});`,

    lightbox: `it('opens the full image', async () => {
  const lightbox = await loader.getHarness(WrLightboxHarness.with({ alt: 'Mountain' }));

  await expect(lightbox.getFullSrc()).rejects.toThrow();   // no viewer while closed

  await lightbox.open();
  expect(await lightbox.isModal()).toBe(true);
  expect(await lightbox.getFullSrc()).toContain('/photo.jpg');

  await lightbox.sendEscape();
  expect(await lightbox.isOpen()).toBe(false);
});`,

    speedDial: `it('fans out and picks', async () => {
  const dial = await loader.getHarness(WrSpeedDialHarness);

  await expect(dial.getActions()).rejects.toThrow();   // closed

  await dial.open();
  expect(await dial.getActionLabels()).toEqual(['Share', 'Copy link']);

  await dial.sendEscape();
  expect(await dial.isTriggerFocused()).toBe(true);
});`,

    knob: `it('turns the dial from the keyboard', async () => {
  const knob = await loader.getHarness(WrKnobHarness);

  await knob.setValue(60);
  expect(await knob.getValue()).toBe(60);
  expect(await knob.getDisplayValue()).toBe('60%');

  await knob.pressEnd();
  expect(await knob.getValue()).toBe(await knob.getMax());
});`,

    splitter: `it('resizes from the keyboard', async () => {
  const splitter = await loader.getHarness(WrSplitterHarness);

  // Side-by-side panes have a vertical divider.
  expect(await splitter.getOrientation()).toBe('horizontal');
  expect(await splitter.getDividerOrientation()).toBe('vertical');

  await splitter.setPosition(70);
  expect(await splitter.getPaneSizes()).toEqual({ start: 70, end: 30 });

  await splitter.pressHome();
  expect(await splitter.getPosition()).toBe(await splitter.getMinPosition());
});`,

    table: `it('sorts, selects and expands', async () => {
  const table = await loader.getHarness(WrTableHarness);

  expect(await table.getHeaderTexts()).toEqual(['Name', 'Role']);
  expect(await table.getCellTexts()).toEqual([
    ['Ada', 'admin'],
    ['Grace', 'user'],
  ]);

  await table.sortByColumn('Name');
  expect(await table.getSortDirection('Name')).toBe('ascending');

  const [first] = await table.getRows();
  await first.select();
  expect(await first.isSelected()).toBe(true);
  expect(await table.isPartiallySelected()).toBe(true);

  await first.toggleExpand();
  expect(await table.getDetailTexts()).toEqual(['Joined 2024']);
});

it('announces a tree', async () => {
  const table = await loader.getHarness(WrTableHarness);   // childrenKey set

  expect(await table.getRole()).toBe('treegrid');

  const [root] = await table.getRows();
  expect(await root.getLevel()).toBe(1);
  expect(await root.isExpandable()).toBe(true);
});`,

    radio: `it('answers the size question', async () => {
  const group = await loader.getHarness(WrRadioGroupHarness);

  expect(await group.getRadioLabels()).toEqual(['Small', 'Medium', 'Large']);
  expect(await group.getSelectedLabel()).toBeNull();
  expect(await group.getTabStopLabel()).toBe('Small');   // nothing picked yet

  await group.select({ label: 'Large' });
  expect(await group.getSelectedLabel()).toBe('Large');
  expect(await group.getTabStopLabel()).toBe('Large');
});`,

    number: `it('clamps at the maximum', async () => {
  const qty = await loader.getHarness(WrInputNumberHarness);

  await qty.setValue(3);
  expect(await qty.getValue()).toBe(3);

  await qty.increment();                    // step is 1, max is 4
  await qty.increment();
  expect(await qty.getValue()).toBe(4);
  expect(await qty.isIncrementDisabled()).toBe(true);
});

it('separates the field text from the value', async () => {
  const price = await loader.getHarness(WrInputNumberHarness);

  await price.setValueText('1 234,5');      // mid-type, not committed
  expect(await price.getValueText()).toBe('1 234,5');
  expect(await price.getValue()).toBe(1234.5);
});`,

    otp: `it('takes a pasted code', async () => {
  const otp = await loader.getHarness(WrInputOtpHarness);

  await otp.paste('123456');
  expect(await otp.getValue()).toBe('123456');
  expect(await otp.isComplete()).toBe(true);

  await otp.backspace();
  expect(await otp.getBoxValues()).toEqual(['1', '2', '3', '4', '5', '']);
  expect(await otp.getFocusedIndex()).toBe(5);
});`,

    slider: `it('moves the slider', async () => {
  const slider = await loader.getHarness(WrSliderHarness);

  await slider.setValue(70);
  expect(await slider.getValue()).toBe(70);

  await slider.stepUp();
  await slider.toMax();
  expect(await slider.getValue()).toBe(await slider.getMax());
});

it('sets a range', async () => {
  const slider = await loader.getHarness(WrSliderHarness);   // range

  await slider.setRange(90, 95);
  expect(await slider.getValue()).toEqual([90, 95]);
});`,

    rating: `it('takes a rating', async () => {
  const rating = await loader.getHarness(WrRatingHarness);

  await rating.setValue(4);
  expect(await rating.getValue()).toBe(4);

  const items = await rating.getItems();
  expect(await items[3].isFilled()).toBe(true);
  expect(await items[4].isFilled()).toBe(false);

  await rating.clear();
  expect(await rating.getValue()).toBe(0);
});`,

    upload: `it('takes a dropped file and removes it', async () => {
  const upload = await loader.getHarness(WrFileUploadHarness);

  await upload.dropFiles([new File(['hello'], 'notes.txt', { type: 'text/plain' })]);
  expect(await upload.getFileNames()).toEqual(['notes.txt']);

  await upload.removeFileNamed('notes.txt');
  expect(await upload.getFileCount()).toBe(0);
});`,

    contextMenu: `it('copies from the context menu', async () => {
  const menu = await loader.getHarness(WrContextMenuHarness);

  await menu.open();
  expect(await menu.getItemTexts()).toEqual(['Copy', 'Cut', 'Paste']);

  await menu.clickItem({ text: 'Copy' });
  expect(await menu.isOpen()).toBe(false);
});

it('walks into a submenu', async () => {
  const menu = await loader.getHarness(WrContextMenuHarness);
  await menu.open();

  const [more] = await menu.getItems({ hasSubmenu: true });
  await more.openSubmenu();
  expect(await more.isSubmenuOpen()).toBe(true);

  await more.clickSubmenuItem({ text: 'As PNG' });
});`,

    popconfirm: `it('asks before deleting', async () => {
  const ask = await loader.getHarness(WrPopconfirmHarness);

  await ask.open();
  expect(await ask.getMessage()).toBe('Delete this item?');
  expect(await ask.getActionLabels()).toEqual(['Cancel', 'Delete']);

  await ask.confirm();
  expect(await ask.isOpen()).toBe(false);
  expect(host.deleted()).toBe(true);
});`,

    palette: `it('runs a command', async () => {
  const palette = await loader.getHarness(WrCommandPaletteHarness);

  await palette.open();
  await palette.setQuery('set');
  expect(await palette.getItemLabels()).toEqual(['Settings', 'Set theme']);

  await palette.moveToNextItem();
  expect(await palette.getActiveItemLabel()).toBe('Set theme');
  expect(await palette.isActiveItemAnnounced()).toBe(true);

  await palette.runActiveItem();
});`,

    cascader: `it('picks a path', async () => {
  const cascader = await loader.getHarness(WrCascaderHarness);

  await cascader.open();
  expect(await cascader.getColumnCount()).toBe(1);

  await cascader.selectPath(['Europe', 'Portugal', 'Lisbon']);

  expect(await cascader.getValueText()).toBe('Europe / Portugal / Lisbon');
  expect(await cascader.isOpen()).toBe(false);
});`,

    tree: `it('expands and selects', async () => {
  const tree = await loader.getHarness(WrTreeHarness);

  const root = await tree.getNode({ label: 'src' });
  expect(await root.isExpandable()).toBe(true);
  await root.expand();

  expect(await tree.getNodeLabels()).toEqual(['src', 'app', 'main.ts', 'README.md']);

  await tree.selectNode({ label: 'main.ts' });
  expect(await tree.getSelectedLabels()).toEqual(['main.ts']);
});

it('announces the hierarchy', async () => {
  const tree = await loader.getHarness(WrTreeHarness);
  const app = await tree.getNode({ label: 'app' });

  expect(await app.getLevel()).toBe(2);
  // Per sibling group: 'app' and 'main.ts' are the children of 'src'.
  expect(await app.getSetSize()).toBe(2);
  expect(await app.getPosInSet()).toBe(1);
});`,

    graph: `it('reads the structure, not the drawing', async () => {
  const graph = await loader.getHarness(WrGraphHarness.with({ ariaLabel: 'Team structure' }));

  expect(await graph.getEdges()).toEqual([
    { from: 'lead', to: 'design' },
    { from: 'lead', to: 'build' },
  ]);

  const design = await graph.getNode({ label: 'Design' });
  expect(await design.getText()).toBe('Design');
  expect(await design.getRelationText()).toBe('Parents: Lead');
});`,

    mention: `it('mentions a teammate', async () => {
  const mention = await loader.getHarness(WrMentionHarness);

  await mention.type('hey @ad');
  expect(await mention.isOpen()).toBe(true);
  expect(await mention.getOptionLabels()).toEqual(['Ada Lovelace']);

  await mention.commit();
  expect(await mention.getValue()).toBe('hey @ada ');
});`,

    editor: `// jsdom has no Range geometry. Delete these again in afterEach.
beforeEach(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  document.elementFromPoint = () => null;
});

it('writes through the editor, and reads the value from the model', async () => {
  const body = await loader.getHarness(WrEditorHarness.with({ label: 'Body' }));

  await body.setText('Release notes');
  await body.selectAll();
  await (await body.getTool('Bold')).click();

  expect(await body.getText()).toBe('Release notes');
  expect(await body.isToolPressed('Bold')).toBe(true);
  expect(fixture.componentInstance.body()).toEqual({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Release notes', marks: [{ type: 'strong' }] }] }],
  });

  await body.setLink('javascript:alert(1)');
  expect(await body.getLinkError()).toBe('This address cannot be used as a link.');
});`,

    formField: `it('shows the message the rule carries', async () => {
  const field = await loader.getHarness(WrFormFieldHarness);
  const email = await loader.getHarness(WrInputHarness);

  await email.setValue('nope');
  await email.blur();

  // From the rule: email(path.email, { message: 'Enter a valid email address.' })
  expect(await field.getErrorText('email')).toBe('Enter a valid email address.');
  expect(await field.isInvalid()).toBe(true);

  expect(await field.getAnnouncedDescription()).toBe(await field.getErrorText('email'));
  expect(await field.isLabelLinkedToControl()).toBe(true);
});`,

    tabs: `it('switches tabs', async () => {
  const tabs = await loader.getHarness(WrTabsHarness);

  expect(await tabs.getTabLabels()).toEqual(['Overview', 'Details', 'Locked']);
  expect(await tabs.getSelectedLabel()).toBe('Overview');

  await tabs.select({ label: 'Details' });
  expect(await tabs.getSelectedLabel()).toBe('Details');

  const details = (await tabs.getTabs({ label: 'Details' }))[0];
  expect(await details.isPanelBound()).toBe(true);
});

it('walks focus without moving the selection', async () => {
  const tabs = await loader.getHarness(WrTabsHarness);

  await tabs.focusTabStop();
  await tabs.pressArrowRight();

  expect(await tabs.getFocusedLabel()).toBe('Details');
  expect(await tabs.getSelectedLabel()).toBe('Overview');
});`,

    stepper: `it('walks the steps', async () => {
  const stepper = await loader.getHarness(WrStepperHarness);

  expect(await stepper.getStepLabels()).toEqual(['Cart', 'Address', 'Payment']);
  expect(await stepper.getActiveLabel()).toBe('Cart');

  await stepper.next();
  expect(await stepper.getActiveLabel()).toBe('Address');
  expect(await stepper.getCompletedLabels()).toEqual(['Cart']);

  // A linear stepper refuses a jump.
  expect(await stepper.canGoTo(2)).toBe(false);
  await expect(stepper.goTo(2)).rejects.toThrow();
});`,

    pagination: `it('pages through', async () => {
  const pager = await loader.getHarness(WrPaginationHarness);

  expect(await pager.getCurrentPage()).toBe(1);
  expect(await pager.isPreviousDisabled()).toBe(true);

  expect(await pager.getPages()).toEqual([1, 2, 3, 4, 5, 10]);
  expect(await pager.getStrip()).toEqual([1, 2, 3, 4, 5, '…', 10]);

  await pager.goToPage(10);
  expect(await pager.isNextDisabled()).toBe(true);

  await pager.setPageSize(50);
  expect(await pager.getPageSize()).toBe(50);
});`,

    collapse: `it('opens one panel at a time', async () => {
  const group = await loader.getHarness(WrCollapseGroupHarness);

  await group.openPanel({ title: 'Shipping' });
  expect(await group.getOpenTitles()).toEqual(['Shipping']);

  // Accordion mode: opening the next one closes the first.
  await group.openPanel({ title: 'Payment' });
  expect(await group.getOpenTitles()).toEqual(['Payment']);

  const shipping = await group.getPanel({ title: 'Shipping' });
  expect(await shipping.isOpen()).toBe(false);
  expect(await shipping.isRegionBound()).toBe(true);
});`,

    transfer: `it('moves a row across', async () => {
  const transfer = await loader.getHarness(WrTransferHarness);
  const source = await transfer.getPane('source');

  await (await source.getItem({ label: 'Write' })).check();
  expect(await transfer.canMoveTo('target')).toBe(true);

  await transfer.moveTo('target');
  expect(await (await transfer.getPane('target')).getItemLabels()).toEqual(['Write']);

  await expect(transfer.moveTo('target')).rejects.toThrow(/nothing staged/);
});`,

    own: `import { ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

export class MyWidgetHarness extends ComponentHarness {
  static hostSelector = 'my-widget';

  static with(options: { title?: string } = {}) {
    return new HarnessPredicate(MyWidgetHarness, options).addOption('title', options.title, (harness, title) =>
      HarnessPredicate.stringMatches(harness.getTitle(), title)
    );
  }

  async getTitle(): Promise<string> {
    return (await this.locatorFor('.my-widget__title')()).text();
  }
}`,
  };

  protected readonly buttonApi: readonly DocApiRow[] = [
    { name: 'getText()', description: 'The visible label.', type: 'Promise<string>' },
    {
      name: 'isDisabled()',
      description: '`true` when disabled, `aria-disabled` or loading.',
      type: 'Promise<boolean>',
    },
    { name: 'isLoading()', description: 'Whether the spinner shows.', type: 'Promise<boolean>' },
    { name: 'getColor()', description: 'The intent, or `null`.', type: 'Promise<WrColor | null>' },
    { name: 'click()', description: 'Clicks the button.', type: 'Promise<void>' },
    { name: 'focus() / isFocused()', description: 'Focus.', type: 'Promise<void> | Promise<boolean>' },
  ];

  protected readonly inputApi: readonly DocApiRow[] = [
    { name: 'getValue()', description: 'The current value.', type: 'Promise<string>' },
    { name: 'setValue(value)', description: 'Types a value: fires `input`, then `change`.', type: 'Promise<void>' },
    { name: 'clear()', description: 'Empties the field.', type: 'Promise<void>' },
    { name: 'getPlaceholder()', description: 'The placeholder.', type: 'Promise<string>' },
    { name: 'isDisabled() / isReadonly()', description: 'Field state.', type: 'Promise<boolean>' },
    { name: 'isInvalid()', description: 'Whether `aria-invalid` is set.', type: 'Promise<boolean>' },
    { name: 'getTagName()', description: "`'input'` or `'textarea'`.", type: 'Promise<string>' },
    { name: 'focus() / blur() / isFocused()', description: 'Focus.', type: 'Promise<void> | Promise<boolean>' },
  ];

  protected readonly checkboxApi: readonly DocApiRow[] = [
    { name: 'getLabel()', description: 'The label.', type: 'Promise<string>' },
    { name: 'isChecked() / isIndeterminate() / isDisabled()', description: 'Box state.', type: 'Promise<boolean>' },
    {
      name: 'getCheckboxValue()',
      description: 'The `checkboxValue` group identity, or `null` when it is not a primitive.',
      type: 'Promise<string | null>',
    },
    {
      name: 'toggle() / check() / uncheck()',
      description: '`check` and `uncheck` do nothing when already there.',
      type: 'Promise<void>',
    },
    { name: 'focus() / isFocused()', description: 'Focus.', type: 'Promise<void> | Promise<boolean>' },
  ];

  protected readonly switchApi: readonly DocApiRow[] = [
    { name: 'getLabel()', description: 'The label.', type: 'Promise<string>' },
    { name: 'isOn() / isDisabled()', description: 'Switch state.', type: 'Promise<boolean>' },
    { name: 'getRole()', description: "`'switch'`.", type: 'Promise<string | null>' },
    {
      name: 'toggle() / turnOn() / turnOff()',
      description: '`turnOn` and `turnOff` do nothing when already there.',
      type: 'Promise<void>',
    },
    { name: 'focus() / isFocused()', description: 'Focus.', type: 'Promise<void> | Promise<boolean>' },
  ];

  protected readonly selectApi: readonly DocApiRow[] = [
    {
      name: 'open() / close()',
      description: '`open()` throws when no panel appears, as in tag mode or before `minChars`.',
      type: 'Promise<void>',
    },
    { name: 'isOpen()', description: 'Whether the panel shows.', type: 'Promise<boolean>' },
    {
      name: 'getValueText()',
      description: "The selection as shown: chips joined by `', '`, the label, or the search text.",
      type: 'Promise<string>',
    },
    {
      name: 'getPlaceholder()',
      description: 'The placeholder, or `null` when a selection hides it.',
      type: 'Promise<string | null>',
    },
    {
      name: 'getOptions(filters?)',
      description: 'Reachable options; throws while closed. Filters: `text`, `selected`, `disabled`.',
      type: 'Promise<WrOptionHarness[]>',
    },
    { name: 'getOptionLabels()', description: 'Those options as strings.', type: 'Promise<string[]>' },
    {
      name: 'selectOption(filters)',
      description: 'Opens if needed, then clicks the first match.',
      type: 'Promise<void>',
    },
    { name: 'typeSearch(query)', description: 'Replaces the search or tag query.', type: 'Promise<void>' },
    {
      name: 'getChipLabels() / removeChip(label)',
      description: 'Chips in multi and tag modes, without the `+N more` chip.',
      type: 'Promise<string[]> | Promise<void>',
    },
    { name: 'clear()', description: 'Clicks the clear control.', type: 'Promise<void>' },
    {
      name: 'getNoResultsText() / isLoading()',
      description: 'The empty and loading rows.',
      type: 'Promise<string | null> | Promise<boolean>',
    },
    {
      name: 'isMultiple() / isDisabled() / focus()',
      description: 'Mode and state.',
      type: 'Promise<boolean> | Promise<void>',
    },
    {
      name: 'Option: getText() / hasLeading()',
      description: '`WrOptionHarness`: the drawn text, and whether a `wrOptionLeading` visual shows.',
      type: 'Promise<string> | Promise<boolean>',
    },
    {
      name: 'Option: isSelected() / isDisabled() / isActive() / isHidden()',
      description: '`isActive` is the keyboard cursor; `isHidden` means filtered out.',
      type: 'Promise<boolean>',
    },
    { name: 'Option: click()', description: 'Clicks the option.', type: 'Promise<void>' },
  ];

  protected readonly dialogApi: readonly DocApiRow[] = [
    {
      name: 'getTitleText() / getContentText()',
      description: 'The title and content text, or `null`.',
      type: 'Promise<string | null>',
    },
    { name: 'getHarness(…)', description: 'Finds a harness inside this dialog only.', type: 'Promise<T>' },
    {
      name: 'getRole() / isModal()',
      description: 'Read from the overlay element.',
      type: 'Promise<string | null> | Promise<boolean>',
    },
    {
      name: 'isClosable() / getCloseLabel() / close()',
      description: '`close()` throws when opened with `closable: false`.',
      type: 'Promise<boolean> | Promise<string | null> | Promise<void>',
    },
    {
      name: 'sendEscape()',
      description: 'Presses Escape; ignored with `closeOnEscape: false`.',
      type: 'Promise<void>',
    },
    { name: 'isFocusTrapped()', description: 'Whether focus is inside the dialog.', type: 'Promise<boolean>' },
  ];

  protected readonly toastApi: readonly DocApiRow[] = [
    {
      name: 'getMessage() / getTitle()',
      description: "The text; `getTitle()` is `null` without a title, `getMessage()` is `''` without a message.",
      type: 'Promise<string> | Promise<string | null>',
    },
    { name: 'getType()', description: 'The intent.', type: 'Promise<WrToastType | null>' },
    {
      name: 'getRole() / getLiveLevel()',
      description: 'Danger: `alert` / `assertive`. Warning: `status` / `assertive`. Others: `status` / `polite`.',
      type: 'Promise<string | null>',
    },
    {
      name: 'isDismissible() / dismiss()',
      description: '`dismiss()` throws when shown with `dismissible: false`.',
      type: 'Promise<boolean> | Promise<void>',
    },
    {
      name: 'hasCopyAction() / copy()',
      description: 'The copy button, with `showCopy: true`.',
      type: 'Promise<boolean> | Promise<void>',
    },
    {
      name: 'hasProgressBar()',
      description: 'Needs `showProgress` and a non-zero duration.',
      type: 'Promise<boolean>',
    },
    { name: 'hover() / mouseAway()', description: 'Hover pauses auto-dismiss.', type: 'Promise<void>' },
  ];

  protected readonly dropdownApi: readonly DocApiRow[] = [
    {
      name: 'open() / openByKeyboard() / close()',
      description: '`open()` works in any `trigger` mode; `openByKeyboard()` presses ArrowDown.',
      type: 'Promise<void>',
    },
    {
      name: 'isOpen() / getTriggerText()',
      description: 'Menu state and trigger label.',
      type: 'Promise<boolean> | Promise<string>',
    },
    {
      name: 'getItems(filters?) / getItemTexts()',
      description: 'The menu items. Filters: `text`, `disabled`.',
      type: 'Promise<WrDropdownItemHarness[]> | Promise<string[]>',
    },
    {
      name: 'clickItem(filters)',
      description: 'Opens if needed, then clicks the first match. The menu stays open.',
      type: 'Promise<void>',
    },
    {
      name: 'getFocusedItemText()',
      description: 'Where the roving focus is.',
      type: 'Promise<string | null>',
    },
    {
      name: 'getMenuRole() / isMenuLabelledByTrigger()',
      description: 'The menu role and name.',
      type: 'Promise<string | null> | Promise<boolean>',
    },
    {
      name: 'clickTrigger() / hoverTrigger() / mouseAwayFromTrigger()',
      description: 'Single gestures, to test one `trigger` mode.',
      type: 'Promise<void>',
    },
    {
      name: 'Item: getText() / hasIcon() / getIconName()',
      description: '`WrDropdownItemHarness`: the label and its leading icon.',
      type: 'Promise<…>',
    },
    {
      name: 'Item: getRole() / isDisabled() / isFocused() / click()',
      description: 'Role, state and click.',
      type: 'Promise<…>',
    },
  ];

  protected readonly datePickerApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / isOpen()',
      description: "`close()` toggles this picker's own trigger.",
      type: 'Promise<void> | Promise<boolean>',
    },
    {
      name: 'getValueText() / setValueText(text) / clear()',
      description: 'The field text; `setValueText` types it.',
      type: 'Promise<string> | Promise<void>',
    },
    {
      name: 'getPanelHeader() / getView() / getWeekdayLabels()',
      description: '`getView()` is `day`, `month` or `year`.',
      type: 'Promise<string> | Promise<string[]>',
    },
    {
      name: 'next() / previous() / zoomOut()',
      description: 'One step of the current view.',
      type: 'Promise<void>',
    },
    {
      name: 'selectMonth(month) / selectYear(year)',
      description: 'A month takes a 0-based index or its label.',
      type: 'Promise<void>',
    },
    {
      name: 'getDays(filters?) / getDay(n) / selectDay(n)',
      description: '`selectDay` throws on a disabled day. Filters: `text`, `selected`, `disabled`, `inRange`.',
      type: 'Promise<WrDatePickerDayHarness[]> | Promise<void>',
    },
    {
      name: 'getTime() / setTime(fields) / stepTime(unit, ±1) / toggleMeridiem()',
      description: '`time` and `datetime` modes only.',
      type: 'Promise<string> | Promise<void>',
    },
    {
      name: 'getMode() / isDisabled() / isReadonly() / focus() / blur() / isFocused()',
      description: 'Mode and field state.',
      type: 'Promise<…>',
    },
    {
      name: 'Day: getDayOfMonth() / getText()',
      description: '`WrDatePickerDayHarness`: the day number.',
      type: 'Promise<number> | Promise<string>',
    },
    {
      name: 'Day: isSelected() / isDisabled() / isToday() / isInRange() / isOutOfMonth() / isActive()',
      description: 'Cell state. `isActive` is the tab stop, not the selection.',
      type: 'Promise<boolean>',
    },
    {
      name: 'Range: getStartText() / getEndText() / getSeparator()',
      description: '`WrDateRangePickerHarness`: the two fields and the separator.',
      type: 'Promise<string>',
    },
    {
      name: 'Range: setStartText(text) / setEndText(text) / clear()',
      description: 'Types into one end.',
      type: 'Promise<void>',
    },
    {
      name: 'Range: focus(end) / blur(end) / isFocused(end) / getPlaceholder(end)',
      description: "`end` is `'start'` or `'end'`.",
      type: 'Promise<…>',
    },
    {
      name: 'Range: getTime(end) / setTime(end, fields) / stepTime(end, unit, ±1) / toggleMeridiem(end)',
      description: 'Time per end. The panel methods above work on both pickers.',
      type: 'Promise<…>',
    },
  ];

  protected readonly popoverApi: readonly DocApiRow[] = [
    {
      name: 'getMode()',
      description: '`popover` or `tooltip`.',
      type: "Promise<'popover' | 'tooltip'>",
    },
    {
      name: 'open(timeout?) / close(timeout?)',
      description: 'The right gesture for the mode, then waits for the panel.',
      type: 'Promise<void>',
    },
    {
      name: 'waitUntilOpen(timeout?) / waitUntilClosed(timeout?)',
      description: 'Only the wait.',
      type: 'Promise<void>',
    },
    {
      name: 'click() / hover() / mouseAway() / focus() / blur() / sendEscape()',
      description: 'One gesture, no wait.',
      type: 'Promise<void>',
    },
    {
      name: 'getContentText() / getDescriptionText()',
      description: "The panel text, and a tooltip's `aria-describedby` text.",
      type: 'Promise<string> | Promise<string | null>',
    },
    { name: 'getRole() / getLabel() / isModal()', description: '`tooltip` or `dialog`.', type: 'Promise<…>' },
    { name: 'getPosition()', description: 'The placement.', type: 'Promise<WrPopoverPosition | null>' },
  ];

  protected readonly drawerApi: readonly DocApiRow[] = [
    { name: 'isOpen()', description: 'Whether the pane is attached.', type: 'Promise<boolean>' },
    {
      name: 'getTitleText() / getContentText()',
      description: 'Title and content text.',
      type: 'Promise<string | null>',
    },
    {
      name: 'getPosition() / isSheet() / isRounded() / hasSafeArea()',
      description: 'Edge and presentation.',
      type: 'Promise<…>',
    },
    {
      name: 'getRole() / isModal() / isLabelledByTitle()',
      description: 'Read from the overlay element.',
      type: 'Promise<…>',
    },
    {
      name: 'isClosable() / getCloseLabel() / close() / sendEscape()',
      description: '`close()` throws when opened with `closable: false`.',
      type: 'Promise<…>',
    },
    {
      name: 'hasBackdrop() / clickBackdrop()',
      description: "This drawer's backdrop.",
      type: 'Promise<boolean> | Promise<void>',
    },
    { name: 'isFocusTrapped()', description: 'Whether focus is inside the drawer.', type: 'Promise<boolean>' },
  ];

  protected readonly colorPickerApi: readonly DocApiRow[] = [
    {
      name: 'getHex() / setHex(text) / blurHex() / isHexFocused()',
      description: 'The colour as hex, 8 digits with alpha. Not the same as `value`.',
      type: 'Promise<…>',
    },
    {
      name: 'getTab() / setTab(tab) / getTabs()',
      description: 'The field tab; `getTabs()` returns a `WrSegmentedHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'getRgb() / setRgbChannel(ch, n) / getHsl() / setHslChannel(ch, n)',
      description: 'Channels of the active tab; the other tab throws.',
      type: 'Promise<…>',
    },
    {
      name: 'getAlphaPercent() / setAlphaPercent(n) / hasAlpha()',
      description: 'Alpha in percent; `null` without alpha. Throws on the HEX tab.',
      type: 'Promise<…>',
    },
    {
      name: 'getSwatches() / pickSwatch(color) / getThumbs() / isDisabled()',
      description: 'Presets by the string you passed, and the thumb positions.',
      type: 'Promise<…>',
    },
    {
      name: 'Trigger: isOpen() / open() / close() / toggle() / sendEscape() / getPicker() / isDisabled()',
      description: '`WrColorPickerTriggerHarness`. `open()` returns the picker.',
      type: 'Promise<…>',
    },
  ];

  protected readonly animationApi: readonly DocApiRow[] = [
    {
      name: 'Text splitters: getAccessibleText() / getPieces() / getRenderedText() / isTextHidden() / hasStagedMotion()',
      description: '`WrBlurTextHarness`, `WrSplitTextHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'Circular / rotating: getAccessibleText() / getCharacters() / getCharacterAngles() / getOrbitOffsets() / isBonkers() / getWordCount() / isSettled()',
      description: '`WrCircularTextHarness`, `WrRotatingTextHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'Typewriter / decrypt: getText() / getAccessibleText() / hasCursor() / getCursorBlinkDuration() / getRevealedIndices() / getEncryptedCount() / isFullyRevealed() / hover() / click()',
      description: '`WrTypewriterHarness`, `WrDecryptTextHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'CSS-driven text: getText() / getCloneText() / isCloneTextInSync() / getDurations() / getColors() / getGradient() / isPaused() / isYoyo() / pausesOnHover()',
      description: '`WrGlitchTextHarness`, `WrGradientTextHarness`, `WrShinyTextHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'Surfaces: getWords() / getHighlightedWords() / release() / getCopyCount() / getAnnouncedCopyCount() / getItems() / isScrollable() / isSingleRay() / getSpeedSeconds()',
      description: '`WrFallingTextHarness`, `WrMarqueeHarness`, `WrStarBorderHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'Pointer effects: movePointerTo(x, y) / leave() / isFlat() / getTilt() / getSpotlightPosition() / hasGlare() / getGlarePosition()',
      description:
        '`WrTiltHarness`, `WrSpotlightHarness`, `WrSpotlightCardHarness`, `WrBorderGlowHarness`. Stub `getBoundingClientRect` first.',
      type: 'Promise<…>',
    },
    {
      name: 'Canvas-backed: getText() / isDecorative() / hasCanvas() / isTextVisuallyHidden() / isPainted() / getLineGapPx() / getGapPx() / getDotSizePx() / getLineCount() / getLineWidthPx() / getCellSizePx() / isFullscreen()',
      description:
        '`WrFuzzyTextHarness`, `WrWavesHarness`, `WrDotGridHarness`, `WrThreadsHarness`, `WrRippleGridHarness`, `WrSplashCursorHarness`. DOM only; `isPainted()` is false in jsdom.',
      type: 'Promise<…>',
    },
  ];

  protected readonly chartApi: readonly DocApiRow[] = [
    {
      name: 'Every chart: getAccessibleName()',
      description: 'The name the chart announces. On all sixteen chart harnesses and the legend harness.',
      type: 'Promise<string | null>',
    },
    {
      name: 'Data table: hasDataTable() / getTableColumns() / getTableRows()',
      description:
        'The hidden `dataTable` on the bar, line, scatter, radar, heatmap chart, calendar heatmap, funnel, waterfall, treemap, box plot and candlestick harnesses. The table reads throw while `dataTable` is off.',
      type: 'Promise<…>',
    },
    {
      name: 'Bar: getBars() / getLabels() / getAccessibleNames() / getBarCount() / hasValues() / getPlotHeight() / hasLegend()',
      description:
        "`WrBarChartHarness`. Heights are a percent of the chart's maximum. Filters: `ariaLabel`, `barLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Bar: getOrientation() / isStacked() / getSeriesBars() / getValues() / getZeroPercent() / getLines() / getLineCount()',
      description: 'Series, stacked, horizontal and combo modes.',
      type: 'Promise<…>',
    },
    {
      name: 'Line: getSeriesLabels() / getLineCount() / getDotCount() / getYTicks() / getXLabels() / getPlotHeight() / hasGrid()',
      description: '`WrLineChartHarness`. Filters: `ariaLabel`, `seriesLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Line: hasLegend() / hasArea() / getAreaCount() / isStacked()',
      description: 'The legend, and the area and stacked modes.',
      type: 'Promise<…>',
    },
    {
      name: 'Line: hasTooltip() / getTooltipLabel() / getTooltipRows()',
      description: 'Reads the tooltip. There is no `hoverAt()`.',
      type: 'Promise<…>',
    },
    {
      name: 'Donut: getSliceCount() / getLegend() / getCenterValue() / getCenterLabel() / getSize() / isPie() / hasLegend()',
      description: '`WrDonutChartHarness`. `isPie()` reads the `pie` mode. Filters: `ariaLabel`, `sliceLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Sparkline: isDecorative() / getRole() / hasLine() / hasArea() / hasTip() / getColor()',
      description: '`WrSparklineHarness`. Named is `role="img"`, unnamed is `aria-hidden`. Filters: `ariaLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Gauge: getRole() / getValue() / getMin() / getMax() / getValueText() / getDisplayValue() / getSuffix() / getSize()',
      description: '`WrGaugeHarness`. Filters: `ariaLabel`, `value`.',
      type: 'Promise<…>',
    },
    {
      name: 'Meter group: getRole() / getValue() / getMax() / getSlices() / getLegendLabels() / getLegendValues() / hasLegend()',
      description: '`WrMeterGroupHarness`. Filters: `ariaLabel`, `sliceLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Calendar heatmap: getRole() / getCellCount() / getCells() / getValueFor(iso) / getWeekdayLabels() / getMonthLabels() / hasLabels()',
      description: '`WrCalendarHeatmapHarness`. Filters: `ariaLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Scatter: getPoints() / getPointCount() / getSeriesLabels() / hasLegend()',
      description:
        '`WrScatterChartHarness`. Points are read from the markers; there is no hover method. Filters: `ariaLabel`, `seriesLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Scatter: getXTicks() / getYTicks() / getAxisTitles() / getPlotHeight() / hasGrid()',
      description: 'The axes.',
      type: 'Promise<…>',
    },
    {
      name: 'Radar: getAxisLabels() / getRingLabels() / getPolygons() / getPolygonCount() / getAreaCount() / getDotCount() / getSize()',
      description:
        "`WrRadarChartHarness`. `getPolygons()` gives each outline's colour, dash and whether it closes. Filters: `ariaLabel`, `axisLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Radar: hasGrid() / hasLegend()',
      description: 'The rings and spokes, and the legend.',
      type: 'Promise<boolean>',
    },
    {
      name: 'Radar: getVariant()',
      description: "`'polygon'` or `'polar-area'`, read off the host's modifier class.",
      type: 'Promise<WrRadarVariant>',
    },
    {
      name: 'Heatmap chart: getRowLabels() / getColumnLabels() / getCells() / getCell(row, column) / getCellCount()',
      description:
        '`WrHeatmapChartHarness`. Cells are read from what the component wrote: value, level, empty. No hover method. Filters: `ariaLabel`, `rowLabel`, `columnLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Heatmap chart: hasLegend() / getScaleRange() / getLevelCount() / getNoDataLabel()',
      description: 'The colour scale. Its reads throw when the chart draws none.',
      type: 'Promise<…>',
    },
    {
      name: 'Funnel: getStages() / getStageCount() / getLabels() / getGapLabels() / getBandCount() / hasValues()',
      description:
        '`WrFunnelChartHarness`. Each stage carries its value and both conversions; there is no hover method. Filters: `ariaLabel`, `stageLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'Waterfall: getSteps() / getStepCount() / getLabels() / getConnectorCount() / hasValues()',
      description:
        "`WrWaterfallChartHarness`. Each step's kind, running totals and bar ends in percent; there is no hover method. Filters: `ariaLabel`, `stepLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Waterfall: getYTicks() / getZeroPercent() / getPlotHeight() / hasGrid()',
      description: 'The value axis.',
      type: 'Promise<…>',
    },
    {
      name: 'Treemap: getTiles() / getTileCount() / getGroupCount() / getLeafCount() / getLabels() / getPlotHeight()',
      description:
        "`WrTreemapChartHarness`. `getTiles()` gives each tile's name, value, kind, colour and box; no hover method. Filters: `ariaLabel`, `tileLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Bullet: getLabel() / getSubLabel() / getValueExtent() / getTargetPosition() / getRanges() / getScaleLabels() / getDescription() / hasScale()',
      description:
        '`WrBulletChartHarness`. Extents and the target are shares of the scale, from 0 to 1. Filters: `ariaLabel`, `label`.',
      type: 'Promise<…>',
    },
    {
      name: 'Box plot: getGroups() / getGroupLabels() / getGroupCount() / getYTicks() / getAxisTitles() / getPlotHeight() / hasGrid()',
      description:
        "`WrBoxplotChartHarness`. Each group's five numbers, outliers and positions; there is no hover method. Filters: `ariaLabel`, `groupLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Candlestick: getCandles() / getCandleCount() / isDense() / getYTicks() / getXLabels() / getPlotHeight() / hasGrid()',
      description:
        "`WrCandlestickChartHarness`. Each candle's prices and direction; there is no hover method. Filters: `ariaLabel`.",
      type: 'Promise<…>',
    },
    {
      name: 'Legend: getItems() / getLabels() / getItemCount() / getHidden() / isToggleable() / toggle(index)',
      description:
        '`WrChartLegendHarness`, standalone or from `getLegendHarness()` on the bar, line, donut, meter group, scatter and radar harnesses. Filters: `ariaLabel`, `itemLabel`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly eventCalendarApi: readonly DocApiRow[] = [
    {
      name: 'getView() / getTitle() / previous() / next() / goToday() / setView(label) / getViewLabels() / getActiveViewLabel()',
      description: 'Navigation. `setView` takes the label the switcher shows.',
      type: 'Promise<…>',
    },
    {
      name: 'getChips(filters?) / getChipLabels() / getCellChips(day, minutes?)',
      description: 'One chip per event, in its start cell. Filters: `label`, `title`, `band`.',
      type: 'Promise<…>',
    },
    {
      name: 'clickCell(day, minutes?) / getCellLabel(day, minutes?) / focusCell(day, minutes?) / getCursor() / pressArrow(arrow) / pressHome() / pressEnd()',
      description: '`minutes` from midnight, or -1 for a month cell or the all-day row.',
      type: 'Promise<…>',
    },
    {
      name: 'getWeekdayNames() / getDayNumbers() / getSlotLabels() / hasAllDayRow() / getOverflowLabels() / openOverflow()',
      description: 'Grid labels and the “+N more” button.',
      type: 'Promise<…>',
    },
    {
      name: 'Chip: getLabel() / getTitle() / getTime() / isBand() / continuesBefore() / continuesAfter() / click() / move(arrow) / resize(arrow)',
      description: '`WrEventCalendarChipHarness`. `move()` is Alt + arrow; `resize()` adds Shift.',
      type: 'Promise<…>',
    },
  ];

  protected readonly imageCropperApi: readonly DocApiRow[] = [
    {
      name: 'isEmpty() / getEmptyText() / getImageSrc() / isReady()',
      description: 'A cropper with a `src` is not ready until its image is measured.',
      type: 'Promise<…>',
    },
    {
      name: 'dispatchImageLoad()',
      description: "Fires `load`. Stub the image's `getBoundingClientRect()` and `naturalWidth` first.",
      type: 'Promise<void>',
    },
    {
      name: 'getCropBox() / getHandles() / hasBackdrop()',
      description: 'The crop window in display pixels.',
      type: 'Promise<…>',
    },
  ];

  protected readonly windowApi: readonly DocApiRow[] = [
    {
      name: 'getTitle() / getState() / isOpen() / getBodyText() / getStatusBarText() / getTitleExtraText()',
      description: '`isOpen()` stays true while minimized.',
      type: 'Promise<…>',
    },
    {
      name: 'close() / minimize() / maximize() / doubleClickChrome() / sendEscape() / focusWindow()',
      description: 'A button the chrome does not render throws.',
      type: 'Promise<void>',
    },
    {
      name: 'getBox() / getZIndex() / isResizable() / getResizeHandles()',
      description: 'Position, size and stack order.',
      type: 'Promise<…>',
    },
    {
      name: 'getCloseLabel() / getMinimizeLabel() / getMaximizeLabel() / hasCloseButton() / hasMinimizeButton() / hasMaximizeButton() / getOs() / getChromeSize()',
      description: 'The chrome buttons; labels change with state and OS.',
      type: 'Promise<…>',
    },
    {
      name: 'getRole() / isLabelledByTitle() / isHiddenFromAssistiveTech() / isActive()',
      description: 'A non-modal dialog named by its title. `isActive()` is the window the keyboard is in.',
      type: 'Promise<…>',
    },
    {
      name: 'startKeyboardMove() / startKeyboardResize() / getKeyboardMode() / getAnnouncement()',
      description: 'Alt+F7 / Alt+F8. Then `sendKeys` arrows, Enter or Escape to the window.',
      type: 'Promise<…>',
    },
    {
      name: 'Taskbar: isEmpty() / getTabTitles() / restore(title) / closeTab(title) / getRestoreLabel(title) / getRailLabel() / getPosition()',
      description: '`WrWindowTaskbarHarness`. `closeTab()` closes without restoring.',
      type: 'Promise<…>',
    },
    {
      name: 'Taskbar: getActiveTabTitle() / isTabPressed(title)',
      description: 'With `show="all"`: the active window\'s tab, the one with `aria-pressed="true"`.',
      type: 'Promise<string | null> | Promise<boolean>',
    },
  ];

  protected readonly calendarApi: readonly DocApiRow[] = [
    {
      name: 'getView() / getHeaderLabel() / clickHeader() / previous() / next()',
      description: 'The header walks day, month, year; `clickHeader()` throws at the top.',
      type: 'Promise<…>',
    },
    {
      name: 'getDays(filters?) / getDay(n) / getSelectedDayNumbers() / getInRangeDayNumbers() / getActiveDayNumber()',
      description:
        'Days of the shown month. `getActiveDayNumber()` can be `null` after paging. Filters: `text`, `selected`, `disabled`, `inRange`.',
      type: 'Promise<…>',
    },
    {
      name: 'getMonths() / getYears() / selectChip(label)',
      description: 'The month and year views; throws in the day view.',
      type: 'Promise<…>',
    },
    {
      name: 'pressArrow(arrow) / pressHome() / pressEnd() / pressPageUp({ shift }) / pressPageDown({ shift }) / pressEnter()',
      description: 'Home and End go to the ends of the week; `shift` pages a year.',
      type: 'Promise<void>',
    },
    {
      name: 'getWeekdayNames() / getWeekCount() / getGridRole() / getPreviousLabel() / getNextLabel() / getMode() / isDisabled()',
      description: 'Shape and labels.',
      type: 'Promise<…>',
    },
    {
      name: 'Day: getText() / getAccessibleName() / getDayOfMonth() / isSelected() / isDisabled() / isToday() / isOutOfMonth() / isInRange() / isActive() / click()',
      description: '`WrCalendarDayHarness`, also exported as `WrDatePickerDayHarness`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly tourApi: readonly DocApiRow[] = [
    {
      name: 'getTitle() / getContent() / getProgressText() / getProgress()',
      description: 'The step. `getProgress()` counts skipped steps too.',
      type: 'Promise<…>',
    },
    {
      name: 'next() / back() / skipTour() / hasBack()',
      description: '`back()` throws on the first step.',
      type: 'Promise<…>',
    },
    {
      name: 'getPrimaryLabel() / getBackLabel() / getSkipLabel()',
      description: '`getPrimaryLabel()` reads “Done” on the last reachable step.',
      type: 'Promise<string>',
    },
    {
      name: 'isShowing() / isModal() / getAccessibleName()',
      description: '`isShowing()` turns false when the step is torn down.',
      type: 'Promise<…>',
    },
  ];

  protected readonly lightboxApi: readonly DocApiRow[] = [
    {
      name: 'isOpen() / open() / close() / clickImage() / sendEscape()',
      description: 'Open state, and the ways in and out.',
      type: 'Promise<…>',
    },
    {
      name: 'getAlt() / getThumbSrc() / getFullSrc()',
      description: 'Alt text, thumbnail and full image.',
      type: 'Promise<string>',
    },
    {
      name: 'getCaption() / getViewerLabel() / getCloseLabel() / isModal() / isFocusTrapped()',
      description: 'The viewer; throws while closed.',
      type: 'Promise<…>',
    },
    {
      name: 'isInteractive() / getOpenLabel() / isLoading() / isViewerBound()',
      description: '`isInteractive()` is false with `disablePreview`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly speedDialApi: readonly DocApiRow[] = [
    {
      name: 'isOpen() / open() / close() / toggle() / sendEscape()',
      description: 'Escape closes and focuses the trigger.',
      type: 'Promise<…>',
    },
    {
      name: 'getActions(filters?) / getActionLabels() / pick(filters) / getActionCount()',
      description:
        '`getActions()` and `getActionLabels()` throw while closed; `pick()` opens first. Filters: `label`, `disabled`.',
      type: 'Promise<…>',
    },
    {
      name: 'getTriggerLabel() / getTriggerIcon() / getDirection() / hasSafeArea() / isDisabled()',
      description: 'The trigger and layout.',
      type: 'Promise<…>',
    },
    { name: 'getMenuRole() / isMenuBound()', description: 'The trigger-to-menu link.', type: 'Promise<…>' },
    {
      name: 'Action: getLabel() / getInitial() / hasIcon() / getIconName() / isDisabled() / click()',
      description: '`WrSpeedDialActionHarness`. `getLabel()` is the name; `getInitial()` the drawn glyph.',
      type: 'Promise<…>',
    },
  ];

  protected readonly knobApi: readonly DocApiRow[] = [
    { name: 'getValue() / getMin() / getMax()', description: 'The `aria-value*` numbers.', type: 'Promise<number>' },
    {
      name: 'getDisplayValue() / getSuffix()',
      description: 'The printed text with suffix, or `null` with `showValue` off.',
      type: 'Promise<string | null>',
    },
    {
      name: 'pressArrow(arrow, { shift }) / pressHome() / pressEnd() / setValue(n)',
      description: '`shift` is ten steps. `setValue` throws if it cannot land exactly.',
      type: 'Promise<void>',
    },
    {
      name: 'getHandlePosition()',
      description: 'The handle in viewBox units.',
      type: 'Promise<{ x: number; y: number }>',
    },
    {
      name: 'isDisabled() / isReadonly() / isFocusable() / focus() / blur() / getLabel()',
      description: 'State and focus. `blur()` emits `touch`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly splitterApi: readonly DocApiRow[] = [
    {
      name: 'getPosition() / getMinPosition() / getMaxPosition()',
      description: "The divider's `aria-value*` numbers.",
      type: 'Promise<number>',
    },
    {
      name: 'getOrientation() / getDividerOrientation()',
      description: 'Opposites: side-by-side panes have a vertical divider.',
      type: 'Promise<…>',
    },
    {
      name: 'pressArrow(arrow, { shift }) / pressHome() / pressEnd() / setPosition(n)',
      description:
        'The key pressed, not a direction: in RTL, ArrowRight shrinks. `setPosition` throws if it cannot land.',
      type: 'Promise<void>',
    },
    {
      name: 'getPaneSizes() / getStartText() / getEndText()',
      description: 'Pane sizes, from the inline `flex-basis`.',
      type: 'Promise<…>',
    },
    {
      name: 'isDisabled() / isDividerFocusable() / focusDivider() / isDividerFocused() / getDividerLabel()',
      description: 'Divider state and focus.',
      type: 'Promise<…>',
    },
  ];

  protected readonly tableApi: readonly DocApiRow[] = [
    {
      name: 'getRole() / isTree()',
      description: '`treegrid` with `childrenKey`, else `table`.',
      type: "Promise<'treegrid' | 'table'>",
    },
    {
      name: 'getHeaderCells(filters?) / getHeaderTexts()',
      description: 'Columns by header title.',
      type: 'Promise<WrTableHeaderCellHarness[]> | Promise<string[]>',
    },
    {
      name: 'sortByColumn(title) / getSortDirection(title)',
      description:
        "One sort step. The table does not reorder `items`; your app does. `getSortDirection()` reads `aria-sort`: only the primary column announces a direction, and every other sortable column, a secondary key included, answers `'none'`.",
      type: 'Promise<void> | Promise<…>',
    },
    {
      name: 'getSortIndicator(title) / getSortOrder(title)',
      description: 'The drawn direction and the 1-based place in the sort, for every sorted column.',
      type: "Promise<'ascending' | 'descending' | null> | Promise<number | null>",
    },
    {
      name: 'getRows(filters?) / getCellTexts()',
      description: 'Rendered rows only; a virtual body renders a window.',
      type: 'Promise<WrTableRowHarness[]> | Promise<string[][]>',
    },
    {
      name: 'hasSelectAll() / isAllSelected() / isPartiallySelected() / toggleSelectAll()',
      description: 'The select-all box.',
      type: 'Promise<…>',
    },
    {
      name: 'getGroupLabels() / isGroupCollapsed(label) / toggleGroup(label)',
      description: 'Group bands; empty with a custom group header.',
      type: 'Promise<…>',
    },
    { name: 'getDetailTexts()', description: 'Open detail rows.', type: 'Promise<string[]>' },
    {
      name: 'getFooterTexts() / getEmptyText() / isLoading() / isVirtual() / getAriaRowCount()',
      description: '`getAriaRowCount()` is the total row count.',
      type: 'Promise<…>',
    },
    {
      name: 'Row: getCells(filters?) / getCellTexts()',
      description: "`WrTableRowHarness`: the row's data cells.",
      type: 'Promise<WrTableCellHarness[]> | Promise<string[]>',
    },
    {
      name: 'Row: isSelectable() / isSelected() / toggleSelection() / select() / deselect()',
      description: 'Row selection.',
      type: 'Promise<…>',
    },
    {
      name: 'Row: isExpandable() / isExpanded() / toggleExpand()',
      description: 'Detail rows and tree children.',
      type: 'Promise<…>',
    },
    {
      name: 'Row: getLevel() / getPosInSet() / getSetSize() / getRowIndex()',
      description: 'Tree position, per sibling group.',
      type: 'Promise<number | null>',
    },
    {
      name: 'Cell: getText() / getColumnTitle() / getPin()',
      description: '`WrTableCellHarness`: text, column title and pinned edge.',
      type: 'Promise<…>',
    },
    {
      name: 'Header cell: isSortable() / sort() / getSortDirection() / getSortIndicator() / getSortOrder() / isFilterable()',
      description: '`WrTableHeaderCellHarness`. `isFilterable()` needs non-empty `filterItems`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly radioApi: readonly DocApiRow[] = [
    {
      name: 'getRadios(filters?) / getRadioLabels()',
      description: "This group's radios. Filters: `label`, `value`, `checked`, `disabled`.",
      type: 'Promise<WrRadioHarness[]> | Promise<string[]>',
    },
    {
      name: 'getSelectedRadio() / getSelectedLabel() / select(filters)',
      description: '`select()` throws if the radio stays unchecked.',
      type: 'Promise<…>',
    },
    {
      name: 'getTabStopLabel() / focusTabStop() / getFocusedLabel()',
      description: 'The tab stop: the checked radio, else the first enabled one.',
      type: 'Promise<…>',
    },
    { name: 'getName()', description: "The radios' `name`; throws for an empty group.", type: 'Promise<string>' },
    {
      name: 'getAccessibleName()',
      description: 'From `aria-labelledby`, then `aria-label`.',
      type: 'Promise<string | null>',
    },
    {
      name: 'getRole() / isDisabled()',
      description: '`radiogroup`; disabled only when every radio is.',
      type: 'Promise<…>',
    },
    {
      name: 'Radio: getLabel() / getValue() / isChecked() / isDisabled() / getSize() / hasIcon() / isLabelBound() / check() / focus() / blur() / isFocused()',
      description: '`WrRadioHarness`. `getLabel()` is the text only.',
      type: 'Promise<…>',
    },
  ];

  protected readonly textareaApi: readonly DocApiRow[] = [
    {
      name: 'getValue() / setValue(text) / clear()',
      description: 'The value. Writes throw on a disabled or readonly field.',
      type: 'Promise<string> | Promise<void>',
    },
    {
      name: 'getLabel() / getPlaceholder()',
      description: '`getLabel()` is `null` with no `ariaLabel` or placeholder.',
      type: 'Promise<string | null> | Promise<string>',
    },
    {
      name: 'isDisabled() / isReadonly() / isInvalid()',
      description: 'Read from the native element.',
      type: 'Promise<boolean>',
    },
    {
      name: 'isAutosizing() / hasFittedHeight() / getRows() / getSize() / getResizeDirection()',
      description: 'Sizing. `hasFittedHeight()` means a height was written.',
      type: 'Promise<…>',
    },
    { name: 'focus() / blur() / isFocused()', description: 'Focus.', type: 'Promise<…>' },
  ];

  protected readonly numberApi: readonly DocApiRow[] = [
    {
      name: 'getValue(locale?) / getValueText()',
      description:
        'The number and the shown text. `getValue()` throws on text the control has not accepted; pass your `LOCALE_ID`.',
      type: 'Promise<number | null> | Promise<string>',
    },
    {
      name: 'setValue(n) / setValueText(text) / clear()',
      description: '`setValueText` leaves it mid-type; `setValue` commits.',
      type: 'Promise<void>',
    },
    {
      name: 'increment() / decrement() / isIncrementDisabled() / isDecrementDisabled() / hasSteppers()',
      description: 'The stepper buttons.',
      type: 'Promise<…>',
    },
    { name: 'stepUp() / stepDown()', description: 'ArrowUp and ArrowDown.', type: 'Promise<void>' },
    {
      name: 'getPrefix() / getSuffix() / getPlaceholder() / getAriaLabel()',
      description: 'Field decorations.',
      type: 'Promise<…>',
    },
    {
      name: 'isDisabled() / isReadonly() / focus() / blur() / isFocused()',
      description: 'State and focus.',
      type: 'Promise<…>',
    },
  ];

  protected readonly otpApi: readonly DocApiRow[] = [
    {
      name: 'getValue() / getBoxValues() / isComplete() / getLength()',
      description: 'The code in the boxes. After an outside write, assert your model too.',
      type: 'Promise<…>',
    },
    {
      name: 'setValue(code) / type(text) / paste(code) / backspace() / clear()',
      description: '`paste` fires a real `paste` event.',
      type: 'Promise<void>',
    },
    {
      name: 'getBoxes(filters?) / getBox(i) / getFocusedIndex() / moveFocus(i)',
      description: 'Per box. Filters: `value`, `empty`, `label`.',
      type: 'Promise<…>',
    },
    {
      name: 'isMasked() / getInputMode() / getSize() / getPlaceholder() / getLabel() / isDisabled()',
      description: 'Presentation.',
      type: 'Promise<…>',
    },
    { name: 'focus() / blur()', description: '`blur()` blurs the focused box.', type: 'Promise<void>' },
  ];

  protected readonly sliderApi: readonly DocApiRow[] = [
    {
      name: 'setValue(n) / setRange(low, high)',
      description: 'Walks with the keys; throws if the value cannot be reached.',
      type: 'Promise<void>',
    },
    {
      name: 'getValue()',
      description: 'A number, or `[low, high]` on a range.',
      type: 'Promise<number | readonly [number, number]>',
    },
    { name: 'stepUp() / stepDown() / toMin() / toMax()', description: 'Arrows, Home and End.', type: 'Promise<void>' },
    {
      name: 'getThumbs() / getLowThumb() / getHighThumb()',
      description: 'A `WrSliderThumbHarness` per thumb.',
      type: 'Promise<WrSliderThumbHarness[]>',
    },
    {
      name: 'isRange() / isDisabled() / getMin() / getMax() / getLabelText() / focus() / isFocused()',
      description: 'Shape and state.',
      type: 'Promise<…>',
    },
  ];

  protected readonly ratingApi: readonly DocApiRow[] = [
    {
      name: 'setValue(n) / clear() / stepUp() / stepDown()',
      description: 'Click or keyboard.',
      type: 'Promise<void>',
    },
    {
      name: 'getValue() / getMax() / getCount() / getFills()',
      description: "`getFills()` is each item's fill fraction.",
      type: 'Promise<…>',
    },
    {
      name: 'getItems()',
      description:
        '`WrRatingItemHarness`: `getFill()`, `isFilled()`, `isPartiallyFilled()`, `isInteractive()`, `click()`, `clickHalf()`, `hover()`.',
      type: 'Promise<WrRatingItemHarness[]>',
    },
    { name: 'unhover()', description: 'Ends a hover preview.', type: 'Promise<void>' },
    {
      name: 'getRole() / getLabel() / getSize() / isReadonly() / isDisabled() / isFocusable() / focus() / blur() / isFocused()',
      description: 'Shape, state and focus.',
      type: 'Promise<…>',
    },
  ];

  protected readonly uploadApi: readonly DocApiRow[] = [
    { name: 'selectFiles(files)', description: 'Through the hidden file input.', type: 'Promise<void>' },
    {
      name: 'dropFiles(files) / dragOver() / dragLeave() / isDragging()',
      description: 'A full drag: `dragenter`, `dragover`, `drop`.',
      type: 'Promise<…>',
    },
    {
      name: 'getFileNames() / getFileSizes() / getFileCount()',
      description: 'The file list. Sizes as shown, like `4.9 KB`.',
      type: 'Promise<…>',
    },
    { name: 'removeFile(i) / removeFileNamed(name)', description: 'By index or exact name.', type: 'Promise<void>' },
    {
      name: 'getLabel() / getPickText() / getDropText() / getHelperText() / getAccept() / isMultiple() / isDisabled()',
      description: 'Copy and settings.',
      type: 'Promise<…>',
    },
    { name: 'focus() / isFocused()', description: 'Focus goes to the drop zone.', type: 'Promise<…>' },
  ];

  protected readonly contextMenuApi: readonly DocApiRow[] = [
    {
      name: 'open() / rightClick() / openByLongPress() / close() / closeByOutsidePress()',
      description: '`open()` fires `contextmenu`. Closing waits until the pane is gone.',
      type: 'Promise<void>',
    },
    { name: 'isOpen()', description: "From the target's `aria-controls`.", type: 'Promise<boolean>' },
    {
      name: 'getItems(filters?) / getItemTexts() / clickItem(filters)',
      description: 'Items, without dividers. Filters: `text`, `disabled`, `hasSubmenu`.',
      type: 'Promise<…>',
    },
    { name: 'getDividerCount()', description: 'Counts `role="separator"`.', type: 'Promise<number>' },
    {
      name: 'getMenuRole() / getMenuText() / getTargetText()',
      description: 'The menu and its target.',
      type: 'Promise<…>',
    },
    {
      name: 'Item: hasSubmenu() / isSubmenuOpen() / openSubmenu() / openSubmenuByHover() / closeSubmenu() / getSubmenuItems() / clickSubmenuItem()',
      description: '`WrContextMenuItemHarness`. Submenus at any depth.',
      type: 'Promise<…>',
    },
  ];

  protected readonly popconfirmApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / confirm() / cancel() / sendEscape() / clickOutside()',
      description: '`confirm()` emits `confirmed`; cancel, Escape and an outside click emit `cancelled`.',
      type: 'Promise<void>',
    },
    {
      name: 'getMessage() / getConfirmText() / getCancelText() / getActionLabels()',
      description: 'The question and button labels.',
      type: 'Promise<…>',
    },
    {
      name: 'getRole() / isModal() / getLabel() / getDescriptionText()',
      description: 'A non-modal dialog; the question is its description.',
      type: 'Promise<…>',
    },
    {
      name: 'getConfirmColor() / getPosition() / getFocusedActionLabel() / isTriggerFocused()',
      description: 'Intent, placement and focus.',
      type: 'Promise<…>',
    },
  ];

  protected readonly paletteApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / pressTrigger() / pressHotkey() / clickBackdrop()',
      description: 'Ways in and out.',
      type: 'Promise<void>',
    },
    { name: 'setQuery(text) / getQuery() / getPlaceholder()', description: 'The search field.', type: 'Promise<…>' },
    {
      name: 'getItems(filters?) / getItemLabels() / runItem(filters) / getGroups() / getGroupTitles()',
      description: 'Filtered results and their groups.',
      type: 'Promise<…>',
    },
    {
      name: 'getActiveItem() / getActiveItemLabel() / getActiveItemIndex() / moveToNextItem() / moveToPreviousItem() / moveToFirstItem() / moveToLastItem() / runActiveItem()',
      description: 'The highlighted row and the arrow keys.',
      type: 'Promise<…>',
    },
    {
      name: 'isActiveItemAnnounced() / isSearchWiredToList()',
      description: 'Whether `aria-activedescendant` points at the highlighted row.',
      type: 'Promise<boolean>',
    },
    {
      name: 'getRole() / isModal() / getLabel() / getEmptyText() / focus() / blur() / isSearchInputFocused()',
      description: 'Shape, state and focus.',
      type: 'Promise<…>',
    },
  ];

  protected readonly cascaderApi: readonly DocApiRow[] = [
    {
      name: 'getColumns() / getColumnCount() / getColumn(i) / getColumnLabels()',
      description: 'One column per open level.',
      type: 'Promise<…>',
    },
    {
      name: 'selectPath(labels) / getOption(path) / getActiveTrail()',
      description: '`selectPath` opens each level in turn.',
      type: 'Promise<…>',
    },
    {
      name: 'open() / close() / clickTrigger() / clear() / focus() / blur() / isFocused()',
      description: 'The trigger.',
      type: 'Promise<…>',
    },
    {
      name: 'getValueText() / getPlaceholder() / getAccessibleName() / isDisabled() / isOpen()',
      description: 'What the trigger shows.',
      type: 'Promise<…>',
    },
    {
      name: 'getPopupRole() / getPanelRole() / getPanelId() / isPanelWiredToTrigger()',
      description: 'The trigger-to-panel link.',
      type: 'Promise<…>',
    },
  ];

  protected readonly treeApi: readonly DocApiRow[] = [
    {
      name: 'getNodes(filters?) / getNodeLabels() / getNode(filters)',
      description: 'Visible nodes; a window when virtual.',
      type: 'Promise<…>',
    },
    {
      name: 'selectNode(filters) / getSelectedLabels() / expandAll() / clear()',
      description: 'Selection and expansion.',
      type: 'Promise<…>',
    },
    {
      name: 'focusNext() / focusPrevious() / focusFirst() / focusLast() / expandActive() / collapseActive() / selectActive() / getActiveNodeLabel()',
      description: 'The keyboard walk, on the active node.',
      type: 'Promise<…>',
    },
    {
      name: 'isOverlay() / isOpen() / open() / close() / getValueText() / getChipLabels() / getOverflowText() / removeChip(label)',
      description: 'For a tree used as a picker.',
      type: 'Promise<…>',
    },
    {
      name: 'getRole() / isMultiple() / getSelectionMode() / isVirtual() / isDisabled()',
      description: 'Shape and mode.',
      type: 'Promise<…>',
    },
    {
      name: 'Node: getLabel() / getLevel() / getPosInSet() / getSetSize() / getIndex() / isExpandable() / isExpanded() / expand() / collapse() / isSelected() / isDisabled() / isActive() / click() / ctrlClick()',
      description: '`WrTreeNodeHarness`. Set size and position are per sibling group.',
      type: 'Promise<…>',
    },
  ];

  protected readonly graphApi: readonly DocApiRow[] = [
    {
      name: 'getAccessibleName() / getNodes(filters?) / getNode(filters)',
      description: 'Nodes in reading order. Filters: `label`. Graph filters: `ariaLabel`, `nodeLabel`.',
      type: 'Promise<…>',
    },
    {
      name: 'getEdges()',
      description: '`{ from, to }` per line, by node id. Throws on a graph with no nodes.',
      type: 'Promise<{ from: string; to: string }[]>',
    },
    {
      name: 'Node: getText() / getRelationText()',
      description: '`WrGraphNodeHarness`: the drawn text, and the parents and children sentence.',
      type: 'Promise<…>',
    },
  ];

  protected readonly editorApi: readonly DocApiRow[] = [
    {
      name: 'getText() / getLabel() / getPlaceholder() / isMounted()',
      description:
        'What the surface draws; read the value from your model. Filters: `label`, `text`, `disabled`, `readonly`.',
      type: 'Promise<…>',
    },
    {
      name: 'setText(text) / paste(text) / pasteHtml(html, text?) / selectAll() / pressKey(key, modifiers?)',
      description: 'Edits. `pressKey` refuses a printable key with no modifier.',
      type: 'Promise<void>',
    },
    {
      name: 'getTool(label) / getToolLabels() / isToolPressed(label) / getToolShortcuts(label) / getToolbarTabStop()',
      description: 'Toolbar tools; `getTool` returns a `WrButtonHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'openLinkPanel() / setLink(url) / removeLink() / getLinkError() / isLinkPanelOpen()',
      description: 'The link panel. A refused URL leaves it open with an error.',
      type: 'Promise<…>',
    },
  ];

  protected readonly mentionApi: readonly DocApiRow[] = [
    {
      name: 'type(text) / setValue(text) / getValue() / clear()',
      description: 'Only `type()` opens the panel.',
      type: 'Promise<…>',
    },
    {
      name: 'getOptions(filters?) / getOptionLabels() / pick(filters)',
      description: 'Suggestions, up to `maxResults`.',
      type: 'Promise<…>',
    },
    {
      name: 'nextOption() / previousOption() / getActiveOptionLabel() / getActiveOptionIndex() / getActiveOptionId() / commit() / commitWithTab()',
      description: 'The arrow walk and the two commit keys.',
      type: 'Promise<…>',
    },
    { name: 'dismiss() / blur() / isOpen()', description: 'Escape closes without picking.', type: 'Promise<…>' },
    {
      name: 'getAutocomplete() / getPopupRole() / getListboxRole() / getListboxLabel() / getStatusMessage()',
      description: 'Combobox ARIA while the panel is open.',
      type: 'Promise<…>',
    },
  ];

  protected readonly formFieldApi: readonly DocApiRow[] = [
    {
      name: 'getErrors() / getErrorTexts() / getErrorText(key)',
      description: 'Shown messages by key. `getErrorText` throws when none shows.',
      type: 'Promise<…>',
    },
    {
      name: 'getSuppressedErrorKeys() / hasEmptyErrorBlock()',
      description: 'Keys in error with no copy to show.',
      type: 'Promise<…>',
    },
    {
      name: 'getLabel() / isRequired() / isOptional() / getHint()',
      description: 'Label and hint.',
      type: 'Promise<…>',
    },
    {
      name: 'isLabelLinkedToControl() / getLabelFor() / getControlId()',
      description: 'The `<label for>` link to the control.',
      type: 'Promise<…>',
    },
    {
      name: 'getDescribedByIds() / getAnnouncedDescription()',
      description: 'What `aria-describedby` reads out.',
      type: 'Promise<…>',
    },
    {
      name: 'isInvalid() / isControlInvalid() / focusControl() / blurControl()',
      description: "The field's painted state, and the control's `aria-invalid`.",
      type: 'Promise<…>',
    },
    {
      name: 'WrFormItemHarness: getLabel() / isInvalid() / getErrorTexts()',
      description: 'The same for `<wr-form-item>`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly tabsApi: readonly DocApiRow[] = [
    {
      name: 'getTabLabels() / getTabs(filters?) / getSelectedLabel() / select(filters) / selectByIndex(i)',
      description: '`select()` throws if the tab does not become selected. Filters: `label`, `selected`, `disabled`.',
      type: 'Promise<…>',
    },
    {
      name: 'getTabStopLabels() / isRoving() / getFocusedLabel() / focusTabStop()',
      description: 'The roving tab stop, separate from the selection.',
      type: 'Promise<…>',
    },
    {
      name: 'pressArrowRight() / pressArrowLeft() / pressHome() / pressEnd()',
      description: 'Arrows mirror in RTL; Home and End do not.',
      type: 'Promise<void>',
    },
    {
      name: 'isRouterMode() / getRole() / getOrientation() / getSize() / getFades()',
      description: 'Shape and edge fades.',
      type: 'Promise<…>',
    },
    {
      name: 'Tab: getLabel() / isSelected() / isDisabled() / isTabStop() / isLink() / getHref() / getPanelId() / isPanelBound() / getPanelText()',
      description: '`WrTabHarness`. `isPanelBound()` checks the tab and panel point at each other.',
      type: 'Promise<…>',
    },
  ];

  protected readonly stepperApi: readonly DocApiRow[] = [
    {
      name: 'getStepLabels() / getSteps(filters?) / getActiveLabel() / getActiveIndex() / getCompletedLabels()',
      description: 'Steps and progress. Filters: `label`, `active`, `completed`, `disabled`, `reachable`, `optional`.',
      type: 'Promise<…>',
    },
    {
      name: 'next() / previous() / goTo(i) / goToLabel(label) / canGoTo(i)',
      description: 'In a linear stepper, `goTo()` throws on a jump.',
      type: 'Promise<…>',
    },
    { name: 'getActiveStepText() / getStepTexts()', description: 'Step content.', type: 'Promise<…>' },
    {
      name: 'isLinear() / getOrientation() / isResponsive() / getListRole() / getTabStopLabels() / getFocusedLabel()',
      description: 'Shape and tab stop.',
      type: 'Promise<…>',
    },
    {
      name: 'Step: getLabel() / getDescription() / isOptional() / getAccessibleName() / isActive() / isCompleted() / isReachable() / select()',
      description: '`WrStepHarness`. `select()` respects `isReachable()`.',
      type: 'Promise<…>',
    },
  ];

  protected readonly carouselApi: readonly DocApiRow[] = [
    {
      name: 'getSlideCount() / getSlideTexts() / getActiveIndex() / getActiveSlideText()',
      description: 'What is shown.',
      type: 'Promise<…>',
    },
    {
      name: 'next() / previous() / goTo(i)',
      description: 'Next stays next in RTL. There is no drag method.',
      type: 'Promise<void>',
    },
    {
      name: 'hasDots() / getDotCount() / getDotLabels() / hasArrows() / getPreviousLabel() / getNextLabel()',
      description: 'Dots, arrows and their labels.',
      type: 'Promise<…>',
    },
    { name: 'hover() / mouseAway()', description: 'Pauses and resumes autoplay.', type: 'Promise<void>' },
    {
      name: 'getRole() / getRoleDescription() / getSlideRoleDescriptions() / getAccessibleName() / getTrackOffsetPercent()',
      description: 'Roles, name and track offset.',
      type: 'Promise<…>',
    },
  ];

  protected readonly paginationApi: readonly DocApiRow[] = [
    {
      name: 'getPages() / getStrip() / getCurrentPage() / getTotalPages()',
      description: "`getPages()` is numbers only; `getStrip()` includes the `'…'` gaps.",
      type: 'Promise<…>',
    },
    {
      name: 'goToPage(n) / goToFirst() / goToLast() / next() / previous()',
      description: 'Moving between pages.',
      type: 'Promise<void>',
    },
    {
      name: 'isNextDisabled() / isPreviousDisabled() / isDisabled()',
      description: 'The ends, and the whole control.',
      type: 'Promise<boolean>',
    },
    {
      name: 'hasPageSizeChanger() / getPageSizeSelect() / getPageSize() / setPageSize(n)',
      description: '`getPageSizeSelect()` returns a `WrSelectHarness`.',
      type: 'Promise<…>',
    },
    {
      name: 'hasTotal() / getTotalText() / getLabel() / getSize() / isResponsive()',
      description: 'Copy and chrome.',
      type: 'Promise<…>',
    },
  ];

  protected readonly segmentedApi: readonly DocApiRow[] = [
    {
      name: 'getOptionLabels() / getOptions(filters?) / getSelectedLabel() / getSelectedIndex() / select(filters) / selectAt(i)',
      description: 'Options and the choice. Filters: `label`, `selected`, `disabled`.',
      type: 'Promise<…>',
    },
    {
      name: 'getTabStopLabels() / getFocusedLabel()',
      description: 'The roving tab stop.',
      type: 'Promise<…>',
    },
    {
      name: 'getThumbIndex() / getThumbCount() / isThumbVisible() / isThumbTransitionEnabled()',
      description: 'The sliding thumb.',
      type: 'Promise<…>',
    },
    {
      name: 'getRole() / getAccessibleName() / getSize() / isDisabled()',
      description: 'Shape and state.',
      type: 'Promise<…>',
    },
  ];

  protected readonly collapseApi: readonly DocApiRow[] = [
    {
      name: 'Group: getPanelTitles() / getPanels(filters?) / getPanel(filters) / getPanelAt(i) / getOpenTitles()',
      description: '`WrCollapseGroupHarness`. Filters: `title`, `open`, `disabled`.',
      type: 'Promise<…>',
    },
    {
      name: 'Group: openPanel(filters) / closePanel(filters) / closeAll() / getFocusedTitle()',
      description: 'In accordion mode, opening one closes the rest.',
      type: 'Promise<…>',
    },
    {
      name: 'Panel: isOpen() / open() / close() / toggle() / getContentText()',
      description: '`WrCollapseHarness`. Open state comes from `aria-expanded`.',
      type: 'Promise<…>',
    },
    {
      name: 'Panel: getRegionId() / isRegionBound() / isContentHidden()',
      description: 'The header and region point at each other.',
      type: 'Promise<…>',
    },
  ];

  protected readonly transferApi: readonly DocApiRow[] = [
    { name: 'getPane(side)', description: "`'source'` or `'target'`.", type: 'Promise<WrTransferPaneHarness>' },
    {
      name: 'canMoveTo(side) / moveTo(side) / moveAllTo(side) / getMoveLabel(side)',
      description: '`moveTo()` throws when nothing is staged.',
      type: 'Promise<…>',
    },
    {
      name: 'Pane: getItemLabels() / getItems(filters?) / getItem(filters) / getCheckedLabels() / getEmptyText()',
      description: 'The rows shown. Filters: `label`, `checked`, `disabled`.',
      type: 'Promise<…>',
    },
    {
      name: 'Pane: toggleSelectAll() / checkAll() / uncheckAll() / isAllChecked() / isPartiallyChecked() / isSelectAllDisabled()',
      description: 'Select-all covers the rows shown.',
      type: 'Promise<…>',
    },
    {
      name: 'Pane: hasSearch() / search(query) / getSearchValue() / getCountText() / getTitle() / getListRole()',
      description: '`search()` throws without `searchable`.',
      type: 'Promise<…>',
    },
    {
      name: 'Item: getLabel() / isChecked() / isDisabled() / toggle() / check() / uncheck()',
      description: '`WrTransferItemHarness`. A disabled row refuses.',
      type: 'Promise<…>',
    },
  ];

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    { title: 'Forms', kind: 'Guide', url: ['/guides', 'forms'] },
    { title: 'Overlay', kind: 'Guide', url: ['/guides', 'overlay'] },
    { title: 'wr-select', kind: 'Component', url: ['/reference/components', 'select'] },
    { title: 'wr-table', kind: 'Component', url: ['/reference/components', 'table'] },
  ];
}
