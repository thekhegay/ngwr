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
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';

const rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);`,

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
  ];
}
