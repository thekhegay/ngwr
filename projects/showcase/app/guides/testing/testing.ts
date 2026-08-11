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
      url: ['/reference/directives', 'input'],
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
  ];
}
