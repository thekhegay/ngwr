import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrTypography } from 'ngwr/typography';

import {
  DocApiComponent,
  type DocApiRow,
  DocCodeComponent,
  DocPageComponent,
  DocSectionComponent,
  DocSeeAlsoComponent,
  type DocSeeAlsoLink,
} from '#core/components';

@Component({
  selector: 'ngwr-gs-testing-page',
  templateUrl: './testing.html',
  imports: [
    RouterLink,
    WrTypography,
    DocPageComponent,
    DocSectionComponent,
    DocCodeComponent,
    DocApiComponent,
    DocSeeAlsoComponent,
  ],
})
export default class TestingGuidePageComponent {
  protected readonly snippets = {
    install: `// The harnesses live beside the components they drive, one entry point each.
// 34 so far: every form control, every overlay, both data views, the whole
// navigation / disclosure set, and <wr-markdown>.
import { WrButtonHarness } from 'ngwr/button/testing';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrCheckboxHarness } from 'ngwr/checkbox/testing';
import { WrRadioGroupHarness } from 'ngwr/radio/testing';
import { WrFormFieldHarness } from 'ngwr/form/testing';

// The overlay ones — panels that render outside your fixture.
import { WrSelectHarness } from 'ngwr/select/testing';
import { WrDialogHarness } from 'ngwr/dialog/testing';
import { WrContextMenuHarness } from 'ngwr/context-menu/testing';
import { WrCommandPaletteHarness } from 'ngwr/command-palette/testing';

// The data views come as families.
import { WrTableHarness, WrTableRowHarness } from 'ngwr/table/testing';
import { WrTreeHarness, WrTreeNodeHarness } from 'ngwr/tree/testing';

// The environment comes from the CDK, which is already a peer dependency.
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';`,

    first: `import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { WrButtonHarness } from 'ngwr/button/testing';

it('saves the form', async () => {
  const fixture = TestBed.createComponent(CheckoutPage);
  fixture.detectChanges();

  const loader = TestbedHarnessEnvironment.loader(fixture);
  const save = await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));

  expect(await save.isDisabled()).toBe(true);   // nothing filled in yet
});`,

    filters: `// Every harness ships a \`with()\` predicate. A string is an exact match, a
// RegExp is tested, and several options AND together.
await loader.getHarness(WrButtonHarness.with({ text: 'Save' }));
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

    overlay: `// A component that renders into an overlay is NOT inside the fixture, so load
// it from the document root instead.
const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);

it('confirms before deleting', async () => {
  await (await loader.getHarness(WrButtonHarness.with({ text: 'Delete' }))).click();

  const dialog = await rootLoader.getHarness(WrDialogHarness);
  expect(await dialog.getTitleText()).toBe('Delete item');

  // A dialog is a content CONTAINER: harnesses resolve inside it, so a second
  // dialog's buttons can't be picked up by mistake.
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

  // Filtered-out options stay in the DOM and collapse via CSS — the harness
  // drops them, so this is the list a user can actually reach.
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

  // Focus starts on the first ENABLED item and the arrows skip the rest.
  expect(await menu.getFocusedItemText()).toBe('Rename');

  await menu.clickItem({ text: 'Rename' });
  // Picking does not close the menu — there is no close-on-select.
  expect(await menu.isOpen()).toBe(true);
});`,

    datePicker: `// A picker needs a date adapter, the same one your app provides.
TestBed.configureTestingModule({
  providers: [provideWrOverlay(), provideWrDateAdapter({ locale: 'en-US' })],
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

  // selectDay() refuses a disabled cell instead of clicking into the void.
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

  await tip.open();                       // hover, focus or click — whichever this one takes
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

    actionSheet: `it('offers a choice, and names itself either way', async () => {
  const sheet = await rootLoader.getHarness(WrActionSheetHarness);

  // No visible title, so the name is the screen-reader-only fallback.
  expect(await sheet.getAccessibleName()).toBe('Actions');
  expect(await sheet.isNamed()).toBe(true);

  expect(await sheet.getActionGroups()).toEqual([
    ['Take Photo', 'Choose from Library', 'Delete'],
    ['Cancel'],
  ]);

  // Picking emits and closes in one call, so the harness goes stale after it.
  await sheet.select({ role: 'destructive' });
  expect(await sheet.isOpen()).toBe(false);
});`,

    colorPicker: `it('picks a colour through the fields, not a drag', async () => {
  const trigger = await loader.getHarness(WrColorPickerTriggerHarness);
  const picker = await trigger.open();

  await picker.setHex('#3969e2');
  expect(await picker.getHex()).toBe('#3969e2ff');

  await picker.setTab('rgb');
  expect(await picker.getRgb()).toEqual({ r: 57, g: 105, b: 226 });

  await picker.setAlphaPercent(50);
  // The surfaces followed, and the thumbs say so without any layout.
  expect((await picker.getThumbs()).alpha).toBe(50);
});`,

    tour: `it('walks the tour', async () => {
  tour.start(steps);
  await fixture.whenStable();

  const first = await rootLoader.getHarness(WrTourHarness);
  expect(await first.getTitle()).toBe('Search');
  expect(await first.hasBack()).toBe(false);

  await first.next();

  // The card is rebuilt per step, so fetch a fresh harness rather than reusing one.
  const second = await rootLoader.getHarness(WrTourHarness);
  expect(await second.getProgress()).toEqual({ current: 2, total: 2 });
  expect(await second.getPrimaryLabel()).toBe('Done');
});`,

    lightbox: `it('opens the full image', async () => {
  const lightbox = await loader.getHarness(WrLightboxHarness.with({ alt: 'Mountain' }));

  // Nothing to read yet — the viewer is an overlay that does not exist while shut.
  await expect(lightbox.getFullSrc()).rejects.toThrow();

  await lightbox.open();
  expect(await lightbox.isModal()).toBe(true);
  expect(await lightbox.getFullSrc()).toContain('/photo.jpg');

  await lightbox.sendEscape();
  expect(await lightbox.isOpen()).toBe(false);
});`,

    speedDial: `it('fans out and picks', async () => {
  const dial = await loader.getHarness(WrSpeedDialHarness);

  // Closed, the buttons are in the DOM but unreachable — so the harness refuses.
  await expect(dial.getActions()).rejects.toThrow();

  await dial.open();
  expect(await dial.getActionLabels()).toEqual(['Share', 'Copy link']);

  await dial.sendEscape();
  expect(await dial.isTriggerFocused()).toBe(true);
});`,

    knob: `it('turns the dial from the keyboard', async () => {
  const knob = await loader.getHarness(WrKnobHarness);

  await knob.setValue(60);

  // The announced number and the printed string are different questions.
  expect(await knob.getValue()).toBe(60);
  expect(await knob.getDisplayValue()).toBe('60%');

  await knob.pressEnd();
  expect(await knob.getValue()).toBe(await knob.getMax());
});`,

    splitter: `it('resizes from the keyboard', async () => {
  const splitter = await loader.getHarness(WrSplitterHarness);

  // Panes side by side; the divider drawn between them is a vertical line.
  expect(await splitter.getOrientation()).toBe('horizontal');
  expect(await splitter.getDividerOrientation()).toBe('vertical');

  await splitter.setPosition(70);
  expect(await splitter.getPaneSizes()).toEqual({ start: 70, end: 30 });

  // Home and End are semantic — they never mirror under RTL.
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

  // Nothing is picked yet, so the tab stop is option one — NOT the selection.
  expect(await group.getTabStopLabel()).toBe('Small');

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

  // Keyboard-driven on purpose: a unit test has no layout, so a drag would write
  // the wrong number or NaN. This is the accessible path anyway.
  await slider.setValue(70);
  expect(await slider.getValue()).toBe(70);

  await slider.stepUp();
  await slider.toMax();
  expect(await slider.getValue()).toBe(await slider.getMax());
});

it('moves the far end of a range first', async () => {
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

    upload: `it('takes a dropped file and drops a rejected one', async () => {
  const upload = await loader.getHarness(WrFileUploadHarness);

  await upload.dropFiles([new File(['hello'], 'notes.txt', { type: 'text/plain' })]);
  expect(await upload.getFileNames()).toEqual(['notes.txt']);

  await upload.removeFileNamed('notes.txt');
  expect(await upload.getFileCount()).toBe(0);
});`,

    contextMenu: `it('copies from the context menu', async () => {
  const menu = await loader.getHarness(WrContextMenuHarness);

  await menu.open();                        // a real \`contextmenu\` event, not a click
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

  // The query field owns the list through aria-activedescendant, so the
  // highlighted row is announced without focus ever leaving the input.
  expect(await palette.isActiveItemAnnounced()).toBe(true);

  await palette.runActiveItem();
});`,

    cascader: `it('picks a path', async () => {
  const cascader = await loader.getHarness(WrCascaderHarness);

  await cascader.open();
  expect(await cascader.getColumnCount()).toBe(1);

  // Each column is one level, and opening a parent is what creates the next.
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
  // Per SIBLING GROUP, not per flat list — 'app' and 'main.ts' are the two
  // children of 'src'.
  expect(await app.getSetSize()).toBe(2);
  expect(await app.getPosInSet()).toBe(1);
});`,

    mention: `it('mentions a teammate', async () => {
  const mention = await loader.getHarness(WrMentionHarness);

  await mention.type('hey @ad');
  expect(await mention.isOpen()).toBe(true);
  expect(await mention.getOptionLabels()).toEqual(['Ada Lovelace']);

  await mention.commit();
  expect(await mention.getValue()).toBe('hey @ada ');
});`,

    formField: `it('shows a message the app never wrote', async () => {
  const field = await loader.getHarness(WrFormFieldHarness);
  const email = await loader.getHarness(WrInputHarness);

  await email.setValue('nope');
  await email.blur();

  // No <wr-form-error> in the template: the copy comes from the i18n catalog
  // through provideWrFormErrors(), which is the whole point of the component.
  expect(await field.getErrorText('email')).toBeTruthy();
  expect(await field.isInvalid()).toBe(true);

  // And the control is actually wired to it — a message nothing points at is
  // decoration a screen reader never reads.
  expect(await field.getAnnouncedDescription()).toBe(await field.getErrorText('email'));
  expect(await field.isLabelLinkedToControl()).toBe(true);
});`,

    tabs: `it('switches tabs', async () => {
  const tabs = await loader.getHarness(WrTabsHarness);

  expect(await tabs.getTabLabels()).toEqual(['Overview', 'Details', 'Locked']);
  expect(await tabs.getSelectedLabel()).toBe('Overview');

  await tabs.select({ label: 'Details' });
  expect(await tabs.getSelectedLabel()).toBe('Details');

  // The panel has to be the one THIS tab names, or a screen reader lands nowhere.
  const details = (await tabs.getTabs({ label: 'Details' }))[0];
  expect(await details.isPanelBound()).toBe(true);
});

it('walks focus without moving the selection', async () => {
  const tabs = await loader.getHarness(WrTabsHarness);

  await tabs.focusTabStop();
  await tabs.pressArrowRight();

  // Two different questions. A strip that answered the selection for both would
  // look right in a test and be dead to a keyboard user.
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

  // A linear stepper refuses a jump, and says so rather than doing nothing.
  expect(await stepper.canGoTo(2)).toBe(false);
  await expect(stepper.goTo(2)).rejects.toThrow();
});`,

    pagination: `it('pages through', async () => {
  const pager = await loader.getHarness(WrPaginationHarness);

  expect(await pager.getCurrentPage()).toBe(1);
  expect(await pager.isPreviousDisabled()).toBe(true);

  // The gaps are not pages. \`getStrip()\` shows them for what they are.
  expect(await pager.getPages()).toEqual([1, 2, 3, 4, 5, 10]);
  expect(await pager.getStrip()).toEqual([1, 2, 3, 4, 5, '…', 10]);

  await pager.goToPage(10);
  expect(await pager.isNextDisabled()).toBe(true);

  // The page-size control is a wr-select, so compose its harness rather than
  // querying a panel that already has one.
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

  // Nothing staged, so the button is disabled — and the harness refuses rather
  // than pressing it and resolving as if something had happened.
  await expect(transfer.moveTo('target')).rejects.toThrow(/nothing staged/);
});`,

    markdown: `import { WrMarkdownHarness } from 'ngwr/markdown/testing';

const md = await loader.getHarness(WrMarkdownHarness);

expect(await md.getHeadings()).toEqual([
  { level: 1, text: 'Release notes', id: 'user-content-release-notes' },
]);

// Links carry what a reviewer actually cares about. \`rel\` is only set when
// the host opts into a target — this one renders linkTarget="_blank".
const [link] = await md.getLinks();
expect(link.href).toBe('https://ngwr.dev');
expect(link.rel).toBe('noopener noreferrer');

// Code blocks are their own harness.
const block = await md.getCodeBlock({ language: 'ts' });
expect(await block.getCode()).toBe('const a = 1;');
expect(await block.canCopy()).toBe(true);
await block.copy();

// Task state is a field, not something to parse out of the text.
expect(await md.getTaskItems()).toEqual([
  { text: 'ship it', checked: true, stateLabel: 'Done:' },
]);

// Mid-stream, the host says so.
expect(await md.isStreaming()).toBe(true);`,
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
    { name: 'getText()', description: "The button's visible label, trimmed.", type: 'Promise<string>', default: '—' },
    {
      name: 'isDisabled()',
      description:
        'Whether the button refuses interaction. Reads both `disabled` and `aria-disabled`, and answers `true` for a loading button.',
      type: 'Promise<boolean>',
      default: '—',
    },
    { name: 'isLoading()', description: 'Whether the spinner is showing.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'getColor()',
      description: 'The intent modifier, matched against `WR_COLORS`. `null` when the button carries none.',
      type: 'Promise<WrColor | null>',
      default: '—',
    },
    { name: 'click()', description: 'Click the button.', type: 'Promise<void>', default: '—' },
    { name: 'focus()', description: 'Move keyboard focus to it.', type: 'Promise<void>', default: '—' },
    { name: 'isFocused()', description: 'Whether it currently has focus.', type: 'Promise<boolean>', default: '—' },
  ];

  protected readonly inputApi: readonly DocApiRow[] = [
    { name: 'getValue()', description: 'The current value.', type: 'Promise<string>', default: '—' },
    {
      name: 'setValue(value)',
      description:
        "Type a value in. `input` carries the value — signal forms AND `[(ngModel)]` both listen to that one. `change` follows it for a consumer's own `(change)` handler, which a browser would only fire on commit.",
      type: 'Promise<void>',
      default: '—',
    },
    { name: 'clear()', description: 'Empty the field, same events.', type: 'Promise<void>', default: '—' },
    { name: 'getPlaceholder()', description: 'The placeholder text.', type: 'Promise<string>', default: '—' },
    { name: 'isDisabled()', description: 'Whether the field is disabled.', type: 'Promise<boolean>', default: '—' },
    { name: 'isReadonly()', description: 'Whether the field is read-only.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'isInvalid()',
      description: 'Whether `aria-invalid` is set — what a screen reader is told, not what the model thinks.',
      type: 'Promise<boolean>',
      default: '—',
    },
    { name: 'getTagName()', description: "`'input'` or `'textarea'`.", type: 'Promise<string>', default: '—' },
    {
      name: 'focus() / blur() / isFocused()',
      description: 'Focus management.',
      type: 'Promise<void> | Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly checkboxApi: readonly DocApiRow[] = [
    { name: 'getLabel()', description: 'The projected label, trimmed.', type: 'Promise<string>', default: '—' },
    { name: 'isChecked()', description: 'Whether the box is ticked.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'isIndeterminate()',
      description: 'Whether it is in the third state. Read from the DOM property, which is where that state lives.',
      type: 'Promise<boolean>',
      default: '—',
    },
    { name: 'isDisabled()', description: 'Whether the box is disabled.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'getCheckboxValue()',
      description: 'The group identity — `checkboxValue`, not the form value.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'toggle() / check() / uncheck()',
      description: '`check` and `uncheck` are no-ops when the box is already in that state.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'focus() / isFocused()',
      description: 'Focus lands on the real control inside the label.',
      type: 'Promise<void> | Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly switchApi: readonly DocApiRow[] = [
    { name: 'getLabel()', description: 'The projected label, trimmed.', type: 'Promise<string>', default: '—' },
    { name: 'isOn()', description: 'Whether the switch is on.', type: 'Promise<boolean>', default: '—' },
    { name: 'isDisabled()', description: 'Whether the switch is disabled.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'getRole()',
      description: "`'switch'` — the difference between this control and a checkbox.",
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'toggle() / turnOn() / turnOff()',
      description: '`turnOn` and `turnOff` are no-ops when the switch is already there.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'focus() / isFocused()',
      description: 'Focus management.',
      type: 'Promise<void> | Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly selectApi: readonly DocApiRow[] = [
    {
      name: 'open() / close()',
      description:
        '`open()` throws rather than resolving quietly when no panel appears — a tag-mode select has none, and a `minChars` select opens on the query.',
      type: 'Promise<void>',
      default: '—',
    },
    { name: 'isOpen()', description: 'Whether the panel is showing.', type: 'Promise<boolean>', default: '—' },
    {
      name: 'getValueText()',
      description:
        "The trigger's current selection: the chip labels joined by `', '`, the single label, or the search input's text.",
      type: 'Promise<string>',
      default: '—',
    },
    {
      name: 'getPlaceholder()',
      description: 'The placeholder, or `null` when a selection is hiding it.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getOptions(filters?)',
      description:
        'The options a user can actually reach — filtered-out ones are dropped. Throws while the panel is closed. Filters: `text`, `selected`, `disabled`.',
      type: 'Promise<WrOptionHarness[]>',
      default: '—',
    },
    {
      name: 'getOptionLabels()',
      description: 'Those options as plain strings, in DOM order.',
      type: 'Promise<string[]>',
      default: '—',
    },
    {
      name: 'selectOption(filters)',
      description: 'Open if needed, then click the first matching option.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'typeSearch(query)',
      description: "Replace a search or tag select's query.",
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getChipLabels() / removeChip(label)',
      description: 'The visible chips in multi and tag modes. The `+N more` overflow chip is not one of them.',
      type: 'Promise<string[]> | Promise<void>',
      default: '—',
    },
    { name: 'clear()', description: 'Click the clear (×) control.', type: 'Promise<void>', default: '—' },
    {
      name: 'getNoResultsText() / isLoading()',
      description: "The panel's empty and async-loading rows.",
      type: 'Promise<string | null> | Promise<boolean>',
      default: '—',
    },
    {
      name: 'isMultiple() / isDisabled() / focus()',
      description: 'Mode and state.',
      type: 'Promise<boolean> | Promise<void>',
      default: '—',
    },
  ];

  protected readonly optionApi: readonly DocApiRow[] = [
    { name: 'getText()', description: "The option's label, trimmed.", type: 'Promise<string>', default: '—' },
    {
      name: 'isSelected() / isDisabled() / isActive()',
      description:
        '`isActive` is the keyboard cursor, not focus — a virtualized panel moves it with `aria-activedescendant`.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'isHidden()',
      description:
        'Whether a search query filtered this option out. It stays in the DOM so registration order survives.',
      type: 'Promise<boolean>',
      default: '—',
    },
    { name: 'click()', description: 'Click the option.', type: 'Promise<void>', default: '—' },
  ];

  protected readonly dialogApi: readonly DocApiRow[] = [
    {
      name: 'getTitleText() / getContentText()',
      description: 'The `[wrDialogTitle]` and `[wrDialogContent]` text, or `null` when the dialog projects neither.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getHarness(…)',
      description:
        'Inherited from `ContentContainerComponentHarness` — resolves any harness INSIDE this dialog, so a stacked dialog cannot answer instead.',
      type: 'Promise<T>',
      default: '—',
    },
    {
      name: 'getRole() / isModal()',
      description:
        'Set on the OVERLAY element, not on your component — a consumer looking for them on their own host would not find them.',
      type: 'Promise<string | null> | Promise<boolean>',
      default: '—',
    },
    {
      name: 'isClosable() / getCloseLabel() / close()',
      description: 'The built-in dismiss button. `close()` throws on a dialog opened `closable: false`.',
      type: 'Promise<boolean> | Promise<string | null> | Promise<void>',
      default: '—',
    },
    {
      name: 'sendEscape()',
      description: 'Press Escape. A dialog opened `closeOnEscape: false` ignores it — assert, do not assume.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'isFocusTrapped()',
      description: 'Whether focus is inside the dialog, where the trap should hold it.',
      type: 'Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly toastApi: readonly DocApiRow[] = [
    {
      name: 'getMessage() / getTitle()',
      description: 'The two text lines. `getTitle()` is `null` for a toast shown without one.',
      type: 'Promise<string> | Promise<string | null>',
      default: '—',
    },
    {
      name: 'getType()',
      description: 'The intent, from the `wr-toast--*` modifier.',
      type: 'Promise<WrToastType | null>',
      default: '—',
    },
    {
      name: 'getRole() / getLiveLevel()',
      description:
        'How urgently the toast announces itself: `alert` / `assertive` for danger, `status` / `assertive` for warning, `status` / `polite` otherwise.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'isDismissible() / dismiss()',
      description: 'The close button. `dismiss()` throws on a toast shown `dismissible: false`.',
      type: 'Promise<boolean> | Promise<void>',
      default: '—',
    },
    {
      name: 'hasCopyAction() / copy()',
      description: 'The copy button, present only with `showCopy: true`.',
      type: 'Promise<boolean> | Promise<void>',
      default: '—',
    },
    {
      name: 'hasProgressBar()',
      description: 'Whether the auto-dismiss bar is showing — it needs both `showProgress` and a non-zero duration.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'hover() / mouseAway()',
      description: 'Hovering is what pauses the auto-dismiss timer.',
      type: 'Promise<void>',
      default: '—',
    },
  ];

  protected readonly dropdownApi: readonly DocApiRow[] = [
    {
      name: 'open() / openByKeyboard() / close()',
      description:
        '`open()` hovers then clicks, so it works whatever the `trigger` mode is. `openByKeyboard()` is the third route — the component takes ArrowDown in every mode.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'isOpen() / getTriggerText()',
      description: 'The trigger publishes `aria-controls` only while its menu is up, which is what `isOpen()` reads.',
      type: 'Promise<boolean> | Promise<string>',
      default: '—',
    },
    {
      name: 'getItems(filters?) / getItemTexts()',
      description: 'The menu is in the overlay, scoped to this dropdown by its menu id. Filters: `text`, `disabled`.',
      type: 'Promise<WrDropdownItemHarness[]> | Promise<string[]>',
      default: '—',
    },
    {
      name: 'clickItem(filters)',
      description:
        'Open if needed, then click the first match. Picking does NOT close the menu — there is no close-on-select.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getFocusedItemText()',
      description:
        'Where the roving focus is now. It starts on the first ENABLED item and the arrows step over disabled ones.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getMenuRole() / isMenuLabelledByTrigger()',
      description: 'The menu announces `menu` and names itself from the trigger.',
      type: 'Promise<string | null> | Promise<boolean>',
      default: '—',
    },
    {
      name: 'clickTrigger() / hoverTrigger() / mouseAwayFromTrigger()',
      description: 'One gesture at a time, when you want to assert that a mode ignores the other.',
      type: 'Promise<void>',
      default: '—',
    },
  ];

  protected readonly dropdownItemApi: readonly DocApiRow[] = [
    { name: 'getText()', description: 'The label, without a leading icon.', type: 'Promise<string>', default: '—' },
    {
      name: 'getRole() / isDisabled() / isFocused()',
      description: 'Role, state and whether the roving focus is on it.',
      type: 'Promise<string | null> | Promise<boolean>',
      default: '—',
    },
    {
      name: 'hasIcon() / getIconName()',
      description: 'The leading icon, if the item has one.',
      type: 'Promise<boolean> | Promise<string | null>',
      default: '—',
    },
    { name: 'click()', description: 'Click the item.', type: 'Promise<void>', default: '—' },
  ];

  protected readonly datePickerApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / isOpen()',
      description:
        "`close()` toggles this picker's own trigger rather than sending Escape, which would go to whichever overlay opened last.",
      type: 'Promise<void> | Promise<boolean>',
      default: '—',
    },
    {
      name: 'getValueText() / setValueText(text) / clear()',
      description:
        'The text in the field. Typing is how a user enters a date, so `setValueText` goes through the input.',
      type: 'Promise<string> | Promise<void>',
      default: '—',
    },
    {
      name: 'getPanelHeader() / getView() / getWeekdayLabels()',
      description:
        '`getView()` is `day` / `month` / `year`; the header reads `January 2025`, `2025` or `2016 – 2027` to match.',
      type: 'Promise<string> | Promise<string[]>',
      default: '—',
    },
    {
      name: 'next() / previous() / zoomOut()',
      description:
        'One step means what the nav button says it means: a month in the day view, a year in the month view, twelve years in the year view.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'selectMonth(month) / selectYear(year)',
      description: 'Pick from the zoomed-out views. A month takes a 0-based index or the label the locale renders.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getDays(filters?) / getDay(n) / selectDay(n)',
      description:
        '`selectDay` refuses a disabled cell instead of clicking into the void. Filters: `text`, `selected`, `disabled`, `inRange` — today and the out-of-month padding are questions you ask a cell harness, not the query.',
      type: 'Promise<WrDatePickerDayHarness[]> | Promise<void>',
      default: '—',
    },
    {
      name: 'getTime() / setTime(fields) / stepTime(unit, ±1) / toggleMeridiem()',
      description: 'The `time` and `datetime` modes only. Ordering settles on blur, not per keystroke.',
      type: 'Promise<string> | Promise<void>',
      default: '—',
    },
    {
      name: 'getMode() / isDisabled() / isReadonly() / focus() / blur() / isFocused()',
      description: 'Mode and field state. A readonly picker still opens; a readonly RANGE picker does not.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly datePickerDayApi: readonly DocApiRow[] = [
    {
      name: 'getDayOfMonth() / getText()',
      description: 'The number the cell shows.',
      type: 'Promise<number> | Promise<string>',
      default: '—',
    },
    {
      name: 'isSelected() / isDisabled() / isToday() / isInRange()',
      description: 'Cell state, read from ARIA and the `wr-calendar__day--*` modifiers.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'isOutOfMonth()',
      description: "Whether this is a neighbouring month's padding cell — those are real, clickable days.",
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'isActive()',
      description:
        'The roving tab stop, which is NOT the same as selected. At most one cell answers true, and after a month step none does.',
      type: 'Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly dateRangeApi: readonly DocApiRow[] = [
    {
      name: 'getStartText() / getEndText() / getSeparator()',
      description: 'The two fields and the separator between them.',
      type: 'Promise<string>',
      default: '—',
    },
    {
      name: 'setStartText(text) / setEndText(text) / clear()',
      description: 'Type into one end without disturbing the other.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'focus(end) / blur(end) / isFocused(end) / getPlaceholder(end)',
      description: "Every per-end method takes `'start'` or `'end'`.",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getTime(end) / setTime(end, fields) / stepTime(end, unit, ±1) / toggleMeridiem(end)',
      description: 'A datetime range renders one stepper per end — stepping one must not drag the other with it.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Everything on the day grid',
      description: 'The panel methods above are shared: both pickers extend the same base.',
      type: '—',
      default: '—',
    },
  ];

  protected readonly popoverApi: readonly DocApiRow[] = [
    {
      name: 'getMode()',
      description:
        'Read from ARIA, not from the `mode` input: a bound `[mode]` never reaches the DOM. It gates what `open()` does and which attribute names the panel.',
      type: "Promise<'popover' | 'tooltip'>",
      default: '—',
    },
    {
      name: 'open(timeout?) / close(timeout?)',
      description:
        'Performs the gesture this instance takes, then WAITS: both modes have show / hide delays, so an immediate assertion would read the frame before.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'waitUntilOpen(timeout?) / waitUntilClosed(timeout?)',
      description: 'The wait on its own, for when you drove the gesture yourself.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'click() / hover() / mouseAway() / focus() / blur() / sendEscape()',
      description: 'One gesture, no waiting — assert that a click-mode popover ignores a hover.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getContentText() / getDescriptionText()',
      description:
        'The panel text. A tooltip also names its trigger through `aria-describedby`, which is what a screen reader reads — `getDescriptionText()` follows that reference.',
      type: 'Promise<string> | Promise<string | null>',
      default: '—',
    },
    {
      name: 'getRole() / getLabel() / isModal()',
      description: '`tooltip` in tooltip mode, `dialog` in popover mode.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getPosition() / isSheet()',
      description: 'The placement modifier, and whether it collapsed to a bottom sheet on a small viewport.',
      type: 'Promise<WrPopoverPosition | null> | Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly drawerApi: readonly DocApiRow[] = [
    {
      name: 'isOpen()',
      description: "Whether this drawer's pane is attached to the document — a disposed pane is not open.",
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'getTitleText() / getContentText()',
      description: 'The `[wrDrawerTitle]` and `[wrDrawerContent]` text.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getPosition() / isSheet() / isRounded() / hasSafeArea() / hasHandle()',
      description: 'Which edge it came from and how it is presented.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getRole() / isModal() / isLabelledByTitle()',
      description:
        'Written onto the OVERLAY element by both flavours, not onto your markup. `isLabelledByTitle()` resolves the reference rather than trusting that one is present.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isClosable() / getCloseLabel() / close() / sendEscape()',
      description: '`close()` throws on a drawer opened `closable: false`; Escape is a separate opt-out.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'hasBackdrop() / clickBackdrop()',
      description: 'The backdrop belonging to THIS drawer, not whichever one is on top.',
      type: 'Promise<boolean> | Promise<void>',
      default: '—',
    },
    {
      name: 'isFocusTrapped()',
      description: 'Whether focus is inside the drawer, where the trap should hold it.',
      type: 'Promise<boolean>',
      default: '—',
    },
  ];

  protected readonly actionSheetApi: readonly DocApiRow[] = [
    {
      name: 'isOpen() / getTitle() / getMessage()',
      description:
        'A sheet you are HOLDING; a closed one has no harness to get. Title and message are `null` when the sheet was opened without them.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getAccessibleName() / isTitleVisible() / isNamed()',
      description:
        'An untitled sheet still names its dialog, with a string only a screen reader gets. `isNamed()` resolves the panel’s `aria-labelledby` rather than trusting that the attribute is there.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getActions(filters?) / getActionLabels() / getActionGroups() / hasCancelGroup()',
      description:
        'The rows, flat and grouped. The grouping is what pins the cancel row to its own block. Filters: `label`, `role`, `disabled`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'select(filters) / sendEscape()',
      description:
        'The two ways out. Picking emits `action` and closes; Escape closes and emits nothing. A disabled or unmatched row throws instead of doing nothing quietly.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'Row: getLabel() / getRole() / isDisabled() / hasIcon() / getIconName() / click() / focus() / isFocused()',
      description:
        '`WrActionSheetActionHarness`. The role is `default` / `destructive` / `cancel` as the component painted it; the icon name comes from `wr-icon`’s reflected `data-icon`, the only place it reaches the DOM.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly colorPickerApi: readonly DocApiRow[] = [
    {
      name: 'getHex() / setHex(text) / blurHex() / isHexFocused()',
      description:
        'The canonical colour — 8 digits with alpha, 6 without. Typed rather than assigned, because the field commits on every keystroke; text that never parses leaves the colour alone until the blur snaps the field back.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getTab() / setTab(tab) / getTabs()',
      description:
        'Which numeric fields are showing. The switcher is a `<wr-segmented>`, so `getTabs()` hands back `WrSegmentedHarness` rather than re-querying its buttons.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getRgb() / setRgbChannel(ch, n) / getHsl() / setHslChannel(ch, n)',
      description:
        'The channels of the ACTIVE tab; reading the other tab’s throws, naming `setTab`. A write lands once rather than per keystroke — typing 128 would commit 1, then 12, and clearing first would commit 0, since `Number("")` is 0.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getAlphaPercent() / setAlphaPercent(n) / hasAlpha()',
      description:
        'Alpha as the whole percent the numeric tabs show. `null` means the picker has no alpha; the HEX tab throws instead, because there the alpha is the last two hex digits.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getSwatches() / pickSwatch(color) / getThumbs() / isDisabled()',
      description:
        'Presets are matched on the string the consumer passed — the button’s accessible name — because the painted background comes back normalised. `getThumbs()` is the inline percentages, the only position a spec without layout can read.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Trigger: isOpen() / open() / close() / toggle() / sendEscape() / getPicker() / isDisabled()',
      description:
        '`WrColorPickerTriggerHarness`. `open()` hands back the picker, scoped by the panel id the trigger publishes through `aria-controls` — two triggers open at once answer with their own.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly tourApi: readonly DocApiRow[] = [
    {
      name: 'getTitle() / getContent() / getProgressText() / getProgress()',
      description:
        'The step as printed. `getProgress()` parses the two numbers out of the line and answers `null` rather than guessing if a catalog spells them differently; its `total` counts the steps the tour was STARTED with, skipped ones included.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'next() / back() / skipTour() / hasBack()',
      description:
        'The three buttons, driven through `WrButtonHarness`. `back()` throws on the first step, where the button is not rendered at all.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'getPrimaryLabel() / getBackLabel() / getSkipLabel()',
      description:
        '`getPrimaryLabel()` is how you tell the last step: the service looks ahead for a reachable target, so it reads "Done" one card early when the final step is hidden — which no count can show.',
      type: 'Promise<string>',
      default: '\u2014',
    },
    {
      name: 'isShowing() / isModal() / getAccessibleName()',
      description:
        '`isShowing()` is for a harness you are HOLDING — it goes false when the step is torn down. The card is an `aria-modal` dialog named by its title plus the progress line, or by the progress line alone.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
  ];

  protected readonly lightboxApi: readonly DocApiRow[] = [
    {
      name: 'isOpen() / open() / close() / clickImage() / sendEscape()',
      description:
        'Open state from the host modifier — the viewer itself is gone when closed, so a query for it cannot tell "shut" from "never opened". `clickImage()` drives the zoom-out affordance, which is not a tab stop.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'getAlt() / getThumbSrc() / getFullSrc()',
      description:
        'The thumbnail shows `preview` when there is one and never swaps to `src`, so the two sources are different questions.',
      type: 'Promise<string>',
      default: '\u2014',
    },
    {
      name: 'getCaption() / getViewerLabel() / getCloseLabel() / isModal() / isFocusTrapped()',
      description:
        'Everything inside the viewer, and all of it throws while closed. `isFocusTrapped()` is what makes `aria-modal` true rather than a claim — hand jsdom a box first, or the trap finds nothing tabbable.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'isInteractive() / getOpenLabel() / isLoading() / isViewerBound()',
      description:
        '`disablePreview` removes the button entirely. `isLoading()` clears on a FAILED load too — the loading state hides the image, so a broken src would otherwise shimmer for ever.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
  ];

  protected readonly speedDialApi: readonly DocApiRow[] = [
    {
      name: 'isOpen() / open() / close() / toggle() / sendEscape()',
      description:
        'Open state from the trigger’s `aria-expanded`. Escape closes AND returns focus to the trigger, which is the half worth asserting.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'getActions(filters?) / getActionLabels() / pick(filters) / getActionCount()',
      description:
        'The first three refuse while the dial is closed — the buttons are still in the DOM and only `visibility` hides them. `pick()` opens first, then clicks. Filters: `label`, `disabled`.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'getTriggerLabel() / getTriggerIcon() / getDirection() / hasSafeArea() / isDisabled()',
      description:
        'The trigger is icon-only, so its `aria-label` is its ONLY name. Direction comes from the host modifier.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'getMenuRole() / isMenuBound()',
      description:
        'The `aria-controls` pairing, checked in both directions: the menu must be this dial’s own, and no other element may answer to the same id.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
    {
      name: 'Action: getLabel() / getInitial() / hasIcon() / getIconName() / getRole() / isDisabled() / click()',
      description:
        '`WrSpeedDialActionHarness`. `getLabel()` is the accessible name; `getInitial()` is the single glyph drawn when there is no icon — a whole emoji, not half a surrogate pair.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
  ];

  protected readonly knobApi: readonly DocApiRow[] = [
    {
      name: 'getValue() / getMin() / getMax()',
      description: 'The dial as `role="slider"` reports it — the three `aria-value*` attributes.',
      type: 'Promise<number>',
      default: '\u2014',
    },
    {
      name: 'getDisplayValue() / getSuffix()',
      description:
        'The text in the middle of the dial, suffix included, or `null` when `showValue` is off. Not the same as the announced value, and deliberately not merged with it.',
      type: 'Promise<string | null>',
      default: '\u2014',
    },
    {
      name: 'pressArrow(arrow, { shift }) / pressHome() / pressEnd() / setValue(n)',
      description:
        'All four arrows are live, and `shift` is ten steps. `setValue` walks and measures the step as it goes, then asserts its landing; a target between grid points throws with where it stopped.',
      type: 'Promise<void>',
      default: '\u2014',
    },
    {
      name: 'getHandlePosition()',
      description:
        'The handle dot in viewBox units, from its `cx` / `cy` — the arc and the dot are the whole visual, and neither can be measured without layout.',
      type: 'Promise<{ x: number; y: number }>',
      default: '\u2014',
    },
    {
      name: 'isDisabled() / isReadonly() / isFocusable() / focus() / blur() / getLabel()',
      description:
        'Both off states leave the tab order, so `isFocusable()` is worth asking separately: a read-only dial a keyboard cannot reach is one nobody can read either. `blur()` is what emits `touch`.',
      type: 'Promise<\u2026>',
      default: '\u2014',
    },
  ];

  protected readonly splitterApi: readonly DocApiRow[] = [
    {
      name: 'getPosition() / getMinPosition() / getMaxPosition()',
      description: 'The divider, from the `aria-value*` trio it publishes as a `role="separator"`.',
      type: 'Promise<number>',
      default: '—',
    },
    {
      name: 'getOrientation() / getDividerOrientation()',
      description:
        'The component’s axis and the divider’s, which are opposites: panes side by side need a vertical line between them.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'pressArrow(arrow, { shift }) / pressHome() / pressEnd() / setPosition(n)',
      description:
        'The key a user presses, not a semantic direction — under RTL the start pane is on the right, so ArrowRight shrinks. `setPosition` walks and asserts its landing.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getPaneSizes() / getStartText() / getEndText()',
      description:
        'The share each pane asks for, from the inline `flex-basis` — a measured width is zero for both in a unit test.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isDisabled() / isDividerFocusable() / focusDivider() / isDividerFocused() / getDividerLabel()',
      description:
        'Announced state and tab stop, asked separately: a divider announced as disabled that is still a tab stop is a control the keyboard can reach and not use.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly tableApi: readonly DocApiRow[] = [
    {
      name: 'getRole() / isTree()',
      description:
        'A flat table sets no role and announces the native `table`. `childrenKey` makes it a `treegrid` — and that role is the only place the hierarchy exists for a screen reader; the indent is decoration.',
      type: "Promise<'treegrid' | 'table'>",
      default: '—',
    },
    {
      name: 'getHeaderCells(filters?) / getHeaderTexts()',
      description:
        'Columns are addressed by their header TITLE — the `columns` key never reaches the DOM. The selection and expand headers are not columns.',
      type: 'Promise<WrTableHeaderCellHarness[]> | Promise<string[]>',
      default: '—',
    },
    {
      name: 'sortByColumn(title) / getSortDirection(title)',
      description:
        'One step of none → ascending → descending. `<wr-table>` publishes the intent and never reorders `items` itself, so a spec expecting rows to move has to sort the data too.',
      type: 'Promise<void> | Promise<…>',
      default: '—',
    },
    {
      name: 'getRows(filters?) / getCellTexts()',
      description:
        'The rows RENDERED, in order — which for a virtualized body is the window, not the dataset. Group bands, subtotals, detail rows and the empty row are not rows.',
      type: 'Promise<WrTableRowHarness[]> | Promise<string[][]>',
      default: '—',
    },
    {
      name: 'hasSelectAll() / isAllSelected() / isPartiallySelected() / toggleSelectAll()',
      description:
        "Its scope is the render list: a collapsed group's rows are out, a virtualized table's off-window rows are IN. While the selection is partial the box reads unchecked, so one click selects everything.",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getGroupLabels() / isGroupCollapsed(label) / toggleGroup(label)',
      description:
        'The built-in bands. A `[wrTableGroupHeader]` template replaces the label with your own markup, and then this list is empty.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getDetailTexts()',
      description:
        'Each open detail row. A detail row sits NEXT TO its row, so it is neither a row nor one of its cells.',
      type: 'Promise<string[]>',
      default: '—',
    },
    {
      name: 'getFooterTexts() / getEmptyText() / isLoading() / isVirtual() / getAriaRowCount()',
      description:
        '`isVirtual()` answers what actually happened: `virtualScroll` is a request the table drops whenever the layout stops being uniform.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly tableRowApi: readonly DocApiRow[] = [
    {
      name: 'getCells(filters?) / getCellTexts()',
      description: "The row's cells, lead cells excluded so they line up with the header list.",
      type: 'Promise<WrTableCellHarness[]> | Promise<string[]>',
      default: '—',
    },
    {
      name: 'isSelectable() / isSelected() / toggleSelection() / select() / deselect()',
      description: '`select` and `deselect` are no-ops when the row is already there.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isExpandable() / isExpanded() / toggleExpand()',
      description: "Both the `[wrTableExpand]` detail row and a tree row's children.",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getLevel() / getPosInSet() / getSetSize() / getRowIndex()',
      description:
        'What a tree row announces. `aria-setsize` counts the sibling set INCLUDING this row, and `aria-posinset` is per sibling group, not per flat list.',
      type: 'Promise<number | null>',
      default: '—',
    },
  ];

  protected readonly tableCellApi: readonly DocApiRow[] = [
    { name: 'getText()', description: 'The cell text, whitespace collapsed.', type: 'Promise<string>', default: '—' },
    {
      name: 'getColumnTitle()',
      description: 'Which column this cell belongs to — useful when a filter or a drag has moved the columns.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getPin()',
      description: 'Whether the column is pinned, and to which edge.',
      type: "Promise<'left' | 'right' | null>",
      default: '—',
    },
    {
      name: 'Header cells add: isSortable() / sort() / getSortDirection() / isFilterable()',
      description: '`isFilterable()` needs a NON-EMPTY `filterItems` — an empty array renders no control.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly radioApi: readonly DocApiRow[] = [
    {
      name: 'getRadios(filters?) / getRadioLabels()',
      description: 'The options in DOM order, scoped to THIS group. Filters: `label`, `value`, `checked`, `disabled`.',
      type: 'Promise<WrRadioHarness[]> | Promise<string[]>',
      default: '—',
    },
    {
      name: 'getSelectedRadio() / getSelectedLabel() / select(filters)',
      description:
        '`select()` throws if the option is still unchecked after the click — which is what a disabled option does, silently.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getTabStopLabel() / focusTabStop() / getFocusedLabel()',
      description:
        'The roving tab stop is the CHECKED option, or the first enabled one while the question is unanswered — not the same thing, and the difference is what a keyboard user feels.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getName()',
      description:
        'Read off the radios, because that is where a bound `[name]` lands. A literal `name="size"` also survives on the group element — do not "simplify" a lookup into that trap.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getAccessibleName()',
      description:
        '`aria-labelledby` first, then `aria-label` — the order the name computation uses. They are not interchangeable.',
      type: 'Promise<string | null>',
      default: '—',
    },
    {
      name: 'getRole() / isDisabled()',
      description: '`radiogroup`. The group counts as disabled only when every option is.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'One radio: getLabel() / getValue() / isChecked() / isDisabled() / getSize() / hasIcon() / isLabelBound() / check() / focus() / blur() / isFocused()',
      description:
        '`getLabel()` is the text only — an icon lives in the dot, and a consumer icon carrying a `<title>` would otherwise join the label.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly textareaApi: readonly DocApiRow[] = [
    {
      name: 'getValue() / setValue(text) / clear()',
      description:
        'The `<textarea>` value never reaches its text content, so this is the property. A write refuses on a disabled or readonly field instead of pretending.',
      type: 'Promise<string> | Promise<void>',
      default: '—',
    },
    {
      name: 'getLabel() / getPlaceholder()',
      description: "`getLabel()` answers `null`, not `''`, for a field with neither an `ariaLabel` nor a placeholder.",
      type: 'Promise<string | null> | Promise<string>',
      default: '—',
    },
    {
      name: 'isDisabled() / isReadonly() / isInvalid()',
      description:
        'Read off the native element, where the form and a screen reader read them. A native `aria-invalid="false"` wins over one on the wrapper rather than falling through to it.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'isAutosizing() / hasFittedHeight() / getRows() / getSize() / getResizeDirection()',
      description:
        'Autosize is reported as the handover it is: whether the component has written a height at all. jsdom has no layout, so a harness that claimed to measure one would be lying.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'focus() / blur() / isFocused()',
      description: 'Focus lands on the native element inside the wrapper.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly numberApi: readonly DocApiRow[] = [
    {
      name: 'getValue(locale?) / getValueText()',
      description:
        'Two different questions. The text is what the field shows — a separator, a prefix, a half-typed number; `getValue()` parses it and THROWS when the field holds something the control has not accepted yet.',
      type: 'Promise<number | null> | Promise<string>',
      default: '—',
    },
    {
      name: 'setValue(n) / setValueText(text) / clear()',
      description: '`setValueText` is the mid-type state; `setValue` is the committed one.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'increment() / decrement() / isIncrementDisabled() / isDecrementDisabled() / hasSteppers()',
      description: 'The buttons, including how they disable at a bound.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'stepUp() / stepDown()',
      description: 'The keyboard path — ArrowUp / ArrowDown on the field, which works with no steppers rendered.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getPrefix() / getSuffix() / getPlaceholder() / getAriaLabel()',
      description: 'The decorations around the field, which are part of why the text is not the value.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isDisabled() / isReadonly() / focus() / blur() / isFocused()',
      description: 'State and focus.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly otpApi: readonly DocApiRow[] = [
    {
      name: 'getValue() / getBoxValues() / isComplete() / getLength()',
      description:
        'The code assembled from the boxes. It can differ from the bound model: a value the boxes cannot hold (a letter in numeric mode) leaves the model holding what the harness cannot see.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'setValue(code) / type(text) / paste(code) / backspace() / clear()',
      description:
        '`paste` drives the real `paste` event, which is how a user delivers a code from an SMS. `clear()` skips boxes that are already empty, so it does not drag focus through the control or re-fire `touch`.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getBoxes(filters?) / getBox(i) / getFocusedIndex() / moveFocus(i)',
      description: "Per-box access. Filters: `value`, `empty`, `label` (the box's `aria-label`, e.g. `Digit 3`).",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isMasked() / getInputMode() / getSize() / getPlaceholder() / getLabel() / isDisabled()',
      description: 'How the control presents itself, including the keyboard a phone will show.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'focus() / blur()',
      description: '`blur()` blurs the box that HAS focus, not box zero.',
      type: 'Promise<void>',
      default: '—',
    },
  ];

  protected readonly sliderApi: readonly DocApiRow[] = [
    {
      name: 'setValue(n) / setRange(low, high)',
      description:
        'Keyboard-driven, and not a shortcut: a unit test has no layout, so a coordinate write produces a bound or `NaN`. The walk takes the ten-step stride first, then single steps, and THROWS if it settles anywhere but the value asked for — including a `max` that is not a whole number of steps from `min`.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getValue()',
      description: 'A number, or a `[low, high]` tuple on a range slider.',
      type: 'Promise<number | [number, number]>',
      default: '—',
    },
    {
      name: 'stepUp() / stepDown() / toMin() / toMax()',
      description: 'One press each — arrows, Home and End.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getThumbs() / getLowThumb() / getHighThumb()',
      description:
        'A thumb harness carries the ARIA range trio, its label, its role and `largeStepUp/Down`. On a range slider each thumb bounds the other, which is why `setRange` moves the far end first.',
      type: 'Promise<WrSliderThumbHarness[]>',
      default: '—',
    },
    {
      name: 'isRange() / isDisabled() / getMin() / getMax() / getLabelText() / focus() / isFocused()',
      description: 'Shape and state.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly ratingApi: readonly DocApiRow[] = [
    {
      name: 'setValue(n) / clear() / stepUp() / stepDown()',
      description: 'Picking by click (clicks need no coordinates) and the keyboard path.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getValue() / getMax() / getCount() / getFills()',
      description: '`getFills()` is the per-item fill fraction — how a half rating actually renders.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getItems()',
      description:
        'An item harness answers `getFill()`, `isFilled()`, `isPartiallyFilled()`, `isInteractive()`, and drives `click()`, `clickHalf()` and `hover()`.',
      type: 'Promise<WrRatingItemHarness[]>',
      default: '—',
    },
    {
      name: 'unhover()',
      description: 'Ends a hover preview, which otherwise leaves the control showing a value it does not hold.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getRole() / getLabel() / getSize() / isReadonly() / isDisabled() / isFocusable() / focus() / blur() / isFocused()',
      description: 'Shape, state and focus.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly uploadApi: readonly DocApiRow[] = [
    {
      name: 'selectFiles(files)',
      description:
        'Goes through the hidden `<input type="file">` — the one method that reaches past the zone, because `FileList` cannot be constructed by hand and the CDK has no file API.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'dropFiles(files) / dragOver() / dragLeave() / isDragging()',
      description:
        'A real drag: `dragenter`, `dragover`, then `drop`, each carrying a `DataTransfer`. The zone is reachable by class even though coordinates are not.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getFileNames() / getFileSizes() / getFileCount()',
      description: 'The rendered list. Sizes are as SHOWN (`4.9 KB`) — the byte count never reaches the DOM.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'removeFile(i) / removeFileNamed(name)',
      description: 'By index or by an EXACT name — a substring match would take `backup-a.png` when asked for `a.png`.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getLabel() / getPickText() / getDropText() / getHelperText() / getAccept() / isMultiple() / isDisabled()',
      description: '`accept` and `multiple` are read off the picker; everything else off the zone.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'focus() / isFocused()',
      description: 'Focus goes to the ZONE, which is the tab stop — the picker is `aria-hidden` and `tabindex="-1"`.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly contextMenuApi: readonly DocApiRow[] = [
    {
      name: 'open() / rightClick() / openByLongPress() / close() / closeByOutsidePress()',
      description:
        'A context menu opens on a real `contextmenu` event, so `open()` sends one rather than clicking. The close paths WAIT for the pane to be disposed — it lingers for its exit animation, and a harness that returned early would report a menu that is on its way out as gone.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'isOpen()',
      description:
        "Read from the target's `aria-controls`, not from whether a pane exists: during the exit animation both are true of the DOM and only one is true of the component.",
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'getItems(filters?) / getItemTexts() / clickItem(filters)',
      description: 'Filters: `text`, `disabled`, `hasSubmenu`. Dividers are not items and never appear here.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getDividerCount()',
      description:
        'Counted by `role="separator"`, so a separator you wrote yourself counts too — the role is what tells a screen reader where one group ends.',
      type: 'Promise<number>',
      default: '—',
    },
    {
      name: 'getMenuRole() / getMenuText() / getTargetText()',
      description: 'The menu announces `menu`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'An item adds: hasSubmenu() / isSubmenuOpen() / openSubmenu() / openSubmenuByHover() / closeSubmenu() / getSubmenuItems() / clickSubmenuItem()',
      description:
        'Each submenu is its own overlay pane, scoped by the id its parent item publishes — so the same harness walks any depth without the panes reading each other.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly popconfirmApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / confirm() / cancel() / sendEscape() / clickOutside()',
      description:
        'Four ways out, and they are not equivalent: confirm emits `confirmed`, the other three emit `cancelled`.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getMessage() / getConfirmText() / getCancelText() / getActionLabels()',
      description: 'The copy, including whatever the i18n catalog resolved the button labels to.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getRole() / isModal() / getLabel() / getDescriptionText()',
      description:
        'A popconfirm is a NON-modal dialog that names itself and has the question as its description — it deliberately does not trap focus, so the description is how a screen-reader user hears the question.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getConfirmColor() / getPosition() / getFocusedActionLabel() / isTriggerFocused()',
      description: 'Intent, placement and where focus sits.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly paletteApi: readonly DocApiRow[] = [
    {
      name: 'open() / close() / pressTrigger() / pressHotkey() / clickBackdrop()',
      description: 'Every route in and out, including the hotkey the palette owns.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'setQuery(text) / getQuery() / getPlaceholder()',
      description: 'The search field drives the list.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getItems(filters?) / getItemLabels() / runItem(filters) / getGroups() / getGroupTitles()',
      description: 'The results as filtered, grouped the way the palette groups them.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getActiveItem() / getActiveItemLabel() / getActiveItemIndex() / moveToNextItem() / moveToPreviousItem() / moveToFirstItem() / moveToLastItem() / runActiveItem()',
      description: 'The highlighted row and the arrow-key walk.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isActiveItemAnnounced() / isSearchWiredToList()',
      description:
        'The palette keeps focus in the input and points at the highlighted row with `aria-activedescendant`. These two check that link holds — without it a screen-reader user hears nothing as the arrows move.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'getRole() / isModal() / getLabel() / isPresentedAsSheet() / getEmptyText() / focus() / blur() / isSearchInputFocused()',
      description: 'Shape, state and focus.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly cascaderApi: readonly DocApiRow[] = [
    {
      name: 'getColumns() / getColumnCount() / getColumn(i) / getColumnLabels()',
      description:
        'One column per level, and which columns exist depends on what is open — that relationship IS the component. A column harness answers its options and its active one.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'selectPath(labels) / getOption(path) / getActiveTrail()',
      description:
        '`selectPath` walks level by level, opening each parent before reaching for the next — the same order a user does it in.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'open() / close() / clickTrigger() / clear() / focus() / blur() / isFocused()',
      description: 'The trigger.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getValueText() / getPlaceholder() / getAccessibleName() / isDisabled() / isOpen()',
      description: 'What the trigger shows and announces.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getPopupRole() / getPanelRole() / getPanelId() / isPanelWiredToTrigger()',
      description:
        "The panel reference the harness itself relies on: one cascader cannot answer with another's options while both are open.",
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly treeApi: readonly DocApiRow[] = [
    {
      name: 'getNodes(filters?) / getNodeLabels() / getNode(filters)',
      description:
        'The VISIBLE nodes in order. While the tree is virtualized this is the window, not the dataset — the spacer rows are not nodes.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'selectNode(filters) / getSelectedLabels() / expandAll() / clear()',
      description: 'Selection and bulk expansion.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'focusNext() / focusPrevious() / focusFirst() / focusLast() / expandActive() / collapseActive() / selectActive() / getActiveNodeLabel()',
      description:
        'The keyboard walk. While virtual the tree moves a cursor with `aria-activedescendant` rather than real focus, which is why these are named for the ACTIVE node.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isOverlay() / isOpen() / open() / close() / getValueText() / getChipLabels() / getOverflowText() / removeChip(label)',
      description: 'The select-like shape, for a tree used as a picker.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getRole() / isMultiple() / getSelectionMode() / isVirtual() / isDisabled()',
      description: 'Shape and mode.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'A node adds: getLabel() / getLevel() / getPosInSet() / getSetSize() / getIndex() / isExpandable() / isExpanded() / expand() / collapse() / isSelected() / isDisabled() / isActive() / click() / ctrlClick()',
      description:
        "`aria-setsize` counts the node's SIBLING GROUP including itself and `aria-posinset` is its place in that group — neither is a position in the flat list, and reading them that way is a classic tree bug.",
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly mentionApi: readonly DocApiRow[] = [
    {
      name: 'type(text) / setValue(text) / getValue() / clear()',
      description:
        'Typing is the only way in: the panel opens off a trigger character the directive detects at the caret, so a value written straight to the field does not open anything.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getOptions(filters?) / getOptionLabels() / pick(filters)',
      description: 'The suggestions, capped at `maxResults`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'nextOption() / previousOption() / getActiveOptionLabel() / getActiveOptionIndex() / getActiveOptionId() / commit() / commitWithTab()',
      description: 'The arrow walk and the two commit keys, which insert the mention into the field.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'dismiss() / blur() / isOpen()',
      description:
        'Escape dismisses without picking. Note the harness sends a real keydown AND keyup pair, which is what a browser does — and what exposed a bug where the keyup reopened the panel Escape had just closed.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getAutocomplete() / getPopupRole() / getListboxRole() / getListboxLabel() / getStatusMessage()',
      description: 'The combobox wiring the field publishes while the panel is up.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly formFieldApi: readonly DocApiRow[] = [
    {
      name: 'getErrors() / getErrorTexts() / getErrorText(key)',
      description:
        'The messages the field is SHOWING, by validator key. `getErrorText` throws rather than answering `null`, and its message says which of the two happened: the key is not in error, or its copy resolved to nothing.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getSuppressedErrorKeys() / hasEmptyErrorBlock()',
      description:
        'Keys in error with no copy to show. That combination is the failure this component exists to prevent — a field that knows it is invalid and cannot say why.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getLabel() / isRequired() / isOptional() / getHint()',
      description: 'The surrounding copy.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isLabelLinkedToControl() / getLabelFor() / getControlId()',
      description:
        'A real `<label for>` link to the projected control. An `aria-label` on the wrapper does NOT reach the native control inside it, so this link is why the field is nameable at all.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getDescribedByIds() / getAnnouncedDescription()',
      description:
        'What the control points at, resolved to text: the hint and the error a screen reader will actually read. A message nothing references is decoration.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isInvalid() / isControlInvalid() / focusControl() / blurControl()',
      description:
        'Two different questions: what the field PAINTS, and what the control announces through `aria-invalid`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'WrFormItemHarness: getLabel() / isInvalid() / getErrorTexts()',
      description: 'The same three questions for `<wr-form-item>`.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly tabsApi: readonly DocApiRow[] = [
    {
      name: 'getTabLabels() / getTabs(filters?) / getSelectedLabel() / select(filters) / selectByIndex(i)',
      description:
        '`select()` verifies the tab actually became selected and throws if it did not — a disabled content tab fires no click at all, and a router strip may navigate somewhere else entirely. Filters: `label`, `selected`, `disabled`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getTabStopLabels() / isRoving() / getFocusedLabel() / focusTabStop()',
      description:
        'The roving tab stop, which is NOT the selection once focus has moved. A strip that answered one for the other would look correct in a test and be dead to a keyboard user. A disabled tab is never a tab stop, even when it is the active one.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'pressArrowRight() / pressArrowLeft() / pressHome() / pressEnd()',
      description:
        'Sent at the `role="tablist"` strip, which owns the handler. The arrows mirror under `dir="rtl"`; Home and End do not.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'isRouterMode() / getRole() / getOrientation() / getSize() / getFades()',
      description: "Shape and chrome. `getFades()` reads the edge fades from the strip's scroll metrics.",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'A tab adds: getLabel() / isSelected() / isDisabled() / isTabStop() / isLink() / getHref() / getPanelId() / isPanelBound() / getPanelText()',
      description:
        '`isPanelBound()` walks the `aria-controls` / `aria-labelledby` round trip both ways — a panel wired to the wrong header is invisible to a sighted user and fatal to a screen-reader one.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly stepperApi: readonly DocApiRow[] = [
    {
      name: 'getStepLabels() / getSteps(filters?) / getActiveLabel() / getActiveIndex() / getCompletedLabels()',
      description:
        'The steps and where the flow is. Filters: `label`, `active`, `completed`, `disabled`, `reachable`, `optional`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'next() / previous() / goTo(i) / goToLabel(label) / canGoTo(i)',
      description:
        'A LINEAR stepper refuses a jump, so `canGoTo()` answers first and `goTo()` throws rather than silently doing nothing.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getActiveStepText() / getStepTexts()',
      description: 'The content of the active step, and of each.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'isLinear() / getOrientation() / isResponsive() / getListRole() / getTabStopLabels() / getFocusedLabel()',
      description: 'Shape, and the roving tab stop again.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'A step adds: getLabel() / getDescription() / isOptional() / getAccessibleName() / isActive() / isCompleted() / isReachable() / select()',
      description: '`isReachable()` is the linear question per step; `select()` respects it.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly carouselApi: readonly DocApiRow[] = [
    {
      name: 'getSlideCount() / getSlideTexts() / getActiveIndex() / getActiveSlideText()',
      description: 'What is on show.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'next() / previous() / goTo(i)',
      description:
        'Next stays next in both directions — only the travel mirrors under `dir="rtl"`. A drag is pointer-driven and jsdom has no layout, so there is no drag method: the buttons and the keyboard are the honest paths.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'hasDots() / getDotCount() / getDotLabels() / hasArrows() / getPreviousLabel() / getNextLabel()',
      description: 'The controls, including their accessible names.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'hover() / mouseAway()',
      description: 'What pauses and resumes autoplay.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'getRole() / getRoleDescription() / getSlideRoleDescriptions() / getAccessibleName() / getTrackOffsetPercent()',
      description:
        'What the carousel announces. The track offset is the one geometric answer, read from the inline style rather than measured.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly paginationApi: readonly DocApiRow[] = [
    {
      name: 'getPages() / getStrip() / getCurrentPage() / getTotalPages()',
      description:
        '`getPages()` is the numbers only; `getStrip()` shows the ellipsis gaps for what they are. A gap is a `<span>`, not a page, and counting it as one is the classic pager bug.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'goToPage(n) / goToFirst() / goToLast() / next() / previous()',
      description: 'Moving. `aria-current` is what says where you landed.',
      type: 'Promise<void>',
      default: '—',
    },
    {
      name: 'isNextDisabled() / isPreviousDisabled() / isDisabled()',
      description: 'The ends, and the whole control.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'hasPageSizeChanger() / getPageSizeSelect() / getPageSize() / setPageSize(n)',
      description:
        'The size control is a `wr-select`, so `getPageSizeSelect()` hands back `WrSelectHarness` rather than re-querying a panel that already has a harness.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'hasTotal() / getTotalText() / getLabel() / getSize() / isResponsive()',
      description: 'The surrounding copy and chrome.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly segmentedApi: readonly DocApiRow[] = [
    {
      name: 'getOptionLabels() / getOptions(filters?) / getSelectedLabel() / getSelectedIndex() / select(filters) / selectAt(i)',
      description: 'The options and the choice. Filters: `label`, `selected`, `disabled`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getTabStopLabels() / getFocusedLabel()',
      description: 'The roving tab stop, separate from the selection as everywhere else.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getThumbIndex() / getThumbCount() / isThumbVisible() / isThumbTransitionEnabled()',
      description:
        'The sliding thumb is decoration, so these read what is actually there — its index comes from the inline custom property the component writes, not from a measured position jsdom does not have.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'getRole() / getAccessibleName() / getSize() / isDisabled()',
      description: 'Shape and state.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly collapseApi: readonly DocApiRow[] = [
    {
      name: 'Group: getPanelTitles() / getPanels(filters?) / getPanel(filters) / getPanelAt(i) / getOpenTitles()',
      description: 'The accordion. Filters: `title`, `open`, `disabled`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Group: openPanel(filters) / closePanel(filters) / closeAll() / getFocusedTitle()',
      description: 'In accordion mode opening one closes the rest — assert that, it is the interesting behaviour.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Panel: isOpen() / open() / close() / toggle() / getContentText()',
      description:
        "Open and closed come from the header's `aria-expanded`, never from a measured height — the animation is invisible in jsdom, and a harness that measured it would answer about a frame.",
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Panel: getRegionId() / isRegionBound() / isContentHidden()',
      description: 'The `aria-controls` pairing between header and region, checked in both directions.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly markdownApi: readonly DocApiRow[] = [
    {
      name: 'getText()',
      description: 'The whole document as prose, whitespace collapsed, hidden task labels left out.',
      type: 'Promise<string>',
      default: '—',
    },
    {
      name: 'getHeadings()',
      description:
        'Level, text and id per heading. The level comes from the element, so it also asserts that a real `<h2>` was rendered rather than a styled div.',
      type: 'Promise<WrMarkdownHarnessHeading[]>',
      default: '—',
    },
    {
      name: 'getLinks()',
      description:
        'Text, `href`, `title`, `target` and `rel`. A `_blank` without `rel="noopener noreferrer"` is the assertion worth writing.',
      type: 'Promise<WrMarkdownHarnessLink[]>',
      default: '—',
    },
    {
      name: 'getCodeBlocks(filters?)',
      description:
        'Every fenced block, nested ones included. `getCodeBlock(filters?)` returns the first match and throws naming the languages present.',
      type: 'Promise<WrMarkdownCodeBlockHarness[]>',
      default: '—',
    },
    {
      name: 'getTaskItems()',
      description: 'Text, checked state and the screen-reader label that carries it.',
      type: 'Promise<WrMarkdownHarnessTaskItem[]>',
      default: '—',
    },
    {
      name: 'getTables()',
      description:
        'Headers, rows and per-column alignment, read from the inline style the renderer wrote rather than from computed style — a `<th>` centres by default, which would make "no alignment" indistinguishable from `center`.',
      type: 'Promise<WrMarkdownHarnessTable[]>',
      default: '—',
    },
    {
      name: 'getParagraphs() / getListItems() / getQuotes() / getInlineCode() / getImages() / getRuleCount()',
      description: 'The rest of the document, each in the terms a reader would use.',
      type: 'Promise<string[]> etc.',
      default: '—',
    },
    {
      name: 'isStreaming() / isEmpty()',
      description:
        '`isStreaming()` reads the host modifier that paints the caret. `isEmpty()` means nothing rendered at all, which is not the same as no text.',
      type: 'Promise<boolean>',
      default: '—',
    },
    {
      name: 'WrMarkdownCodeBlockHarness',
      description:
        '`getLanguage()`, `getCode()` (exact, never trimmed), `isHighlighted()`, `canCopy()`, `getCopyLabel()`, `copy()`.',
      type: 'ComponentHarness',
      default: '—',
    },
  ];

  protected readonly transferApi: readonly DocApiRow[] = [
    {
      name: 'getPane(side)',
      description:
        "The two panes are symmetric, so the API takes a side — `'source'` or `'target'` — rather than duplicating every method.",
      type: 'Promise<WrTransferPaneHarness>',
      default: '—',
    },
    {
      name: 'canMoveTo(side) / moveTo(side) / moveAllTo(side) / getMoveLabel(side)',
      description:
        '`moveTo()` refuses a disabled button instead of pressing it: a native disabled `<button>` swallows the click before Angular sees it, so the call would otherwise resolve having moved nothing. The error names the pane that is empty.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Pane: getItemLabels() / getItems(filters?) / getItem(filters) / getCheckedLabels() / getEmptyText()',
      description: 'The rows a pane is showing. Filters: `label`, `checked`, `disabled`.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Pane: toggleSelectAll() / checkAll() / uncheckAll() / isAllChecked() / isPartiallyChecked() / isSelectAllDisabled()',
      description: 'Select-all is scoped to what the pane is SHOWING — a search narrows it.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'Pane: hasSearch() / search(query) / getSearchValue() / getCountText() / getTitle() / getListRole()',
      description: 'The per-pane search and header. `search()` throws when `searchable` is off.',
      type: 'Promise<…>',
      default: '—',
    },
    {
      name: 'An item adds: getLabel() / isChecked() / isDisabled() / toggle() / check() / uncheck()',
      description: '`check` and `uncheck` are no-ops when the row is already there; a disabled row refuses.',
      type: 'Promise<…>',
      default: '—',
    },
  ];

  protected readonly seeAlso: readonly DocSeeAlsoLink[] = [
    {
      title: 'wr-btn',
      kind: 'Component',
      description: 'The component WrButtonHarness drives.',
      url: ['/reference/components', 'button'],
    },
    {
      title: '[wrInput]',
      kind: 'Directive',
      description: 'The directive WrInputHarness drives.',
      url: ['/reference/components', 'input'],
    },
    {
      title: 'wr-checkbox',
      kind: 'Component',
      description: 'Including the `checkboxValue` identity the harness reads.',
      url: ['/reference/components', 'checkbox'],
    },
    {
      title: 'wr-switch',
      kind: 'Component',
      description: 'The `role="switch"` control behind WrSwitchHarness.',
      url: ['/reference/components', 'switch'],
    },
    {
      title: 'wr-select',
      kind: 'Component',
      description: 'Single, multi, tag and search — one harness covers all four.',
      url: ['/reference/components', 'select'],
    },
    {
      title: 'WrDialog',
      kind: 'Service',
      description: 'Opens the panel WrDialogHarness drives.',
      url: ['/reference/components', 'dialog'],
    },
    {
      title: 'WrToast',
      kind: 'Service',
      description: 'Shows the toasts WrToastHarness reads.',
      url: ['/reference/components', 'toast'],
    },
    {
      title: 'wr-table',
      kind: 'Component',
      description: 'Sorting, selection, tree rows — the harness family mirrors them.',
      url: ['/reference/components', 'table'],
    },
    {
      title: 'wr-date-picker',
      kind: 'Component',
      description: 'Date, time and datetime in one component.',
      url: ['/reference/components', 'date-picker'],
    },
    {
      title: '[wrDropdown]',
      kind: 'Directive',
      description: 'The trigger WrDropdownHarness drives.',
      url: ['/reference/components', 'dropdown'],
    },
    {
      title: '[wrPopover]',
      kind: 'Directive',
      description: 'Popover and tooltip modes behind one harness.',
      url: ['/reference/components', 'popover'],
    },
  ];
}
