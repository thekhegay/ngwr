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
import { WrButtonHarness } from 'ngwr/button/testing';
import { WrCheckboxHarness } from 'ngwr/checkbox/testing';
import { WrInputHarness } from 'ngwr/input/testing';
import { WrSwitchHarness } from 'ngwr/switch/testing';

// The overlay ones — panels that render outside your fixture.
import { WrDialogHarness } from 'ngwr/dialog/testing';
import { WrOptionHarness, WrSelectHarness } from 'ngwr/select/testing';
import { WrToastHarness } from 'ngwr/toast/testing';

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
      description: 'Type a value in. Dispatches `input` AND `change`, so signal forms and `[(ngModel)]` both hear it.',
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
      description:
        'The menu is in the overlay, scoped to this dropdown by its menu id. Filters: `text`, `disabled`, `icon`.',
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
        '`selectDay` refuses a disabled cell instead of clicking into the void. Filters: `text`, `selected`, `disabled`, `today`, `outOfMonth`, `inRange`.',
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
