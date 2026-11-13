/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { ComponentHarness, type EventData, HarnessPredicate, type TestElement } from '@angular/cdk/testing';

import type { WrFileUploadSize, WrFileUploadState } from 'ngwr/file-upload';

import type { WrFileUploadHarnessFilters } from './types';

/**
 * A `DataTransfer` carrying `files`.
 *
 * `FileList` has no constructor anywhere — a browser mints one only as a side
 * effect of `new DataTransfer()`, and jsdom ships neither (`new FileList()` is an
 * illegal constructor there, and the `files` IDL setter refuses anything that is
 * not the genuine article). So: the real thing where it can be had, and an
 * array-like stand-in otherwise, which is all the component ever reads — it does
 * `Array.from(files)` and nothing else.
 */
function dataTransferFor(files: readonly File[]): DataTransfer {
  const Transfer = (globalThis as { DataTransfer?: new () => DataTransfer }).DataTransfer;

  if (Transfer) {
    try {
      const transfer = new Transfer();
      for (const file of files) transfer.items.add(file);
      return transfer;
    } catch {
      // A DataTransfer that cannot take items is no use — fall through.
    }
  }

  const list: Record<PropertyKey, unknown> = { ...files };
  list['length'] = files.length;
  list['item'] = (index: number): File | null => files[index] ?? null;
  list[Symbol.iterator] = function* (): Generator<File> {
    yield* files;
  };

  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: list,
    items: [],
    types: files.length > 0 ? ['Files'] : [],
  } as unknown as DataTransfer;
}

/**
 * The payload `TestElement.dispatchEvent` merges onto the event it fires.
 *
 * One transfer is shared by every event of a drag, the way a real one is: the
 * component writes `dropEffect` on it during `dragover` and reads `files` back
 * out on `drop`.
 */
function dragPayload(transfer: DataTransfer): Record<string, EventData> {
  return { dataTransfer: transfer } as unknown as Record<string, EventData>;
}

/** The native element behind a `TestElement`, or `null` when there is no DOM to reach. */
function nativeElement(element: TestElement): Element | null {
  const candidate = (element as Partial<{ element: unknown }>).element;
  return typeof Element !== 'undefined' && candidate instanceof Element ? candidate : null;
}

function isFileInput(element: Element | null): element is HTMLInputElement {
  return element !== null && element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'file';
}

/** Put `files` on the picker, whichever way this environment allows. */
function setPickerFiles(input: HTMLInputElement, files: readonly File[]): void {
  const list = dataTransferFor(files).files;

  try {
    input.files = list;
    if (input.files?.length === files.length) return;
  } catch {
    // jsdom's IDL setter refuses a stand-in FileList. Shadow the accessor instead.
  }

  // An own data property wins over the prototype accessor, so the component still
  // reads its files off the REAL input — which matters, because the alternative
  // (forging `event.target`) would let a harness pass on a component that never
  // touches the element the user operated.
  Object.defineProperty(input, 'files', { configurable: true, value: list });
}

/**
 * Test harness for `<wr-file-upload>`.
 *
 * The control a user operates is the `.wr-file-upload__zone` — a `role="button"`
 * div that is the single tab stop; the `<input type="file">` behind it is
 * `aria-hidden` and `tabindex="-1"`, and exists only so a click can be forwarded
 * to it. So focus, drag and disabled state are all read off the zone, plus the
 * `wr-file-upload--*` host modifiers and the rendered file list. The picker is
 * touched only where it is the one that carries the state — `accept` and
 * `multiple` land on it, and {@link selectFiles} has to hand it the files.
 *
 * What this component does NOT have, so this harness does not either:
 * - **no upload.** `<wr-file-upload>` picks files and uploading them is the app's
 *   job. What the app says through `[status]` is readable, per file, with
 *   {@link getFileStatus}; the percent is on the row's `wr-progress`.
 * - **no thumbnail pixels.** {@link hasPreview} says a thumbnail is in the row.
 *   jsdom decodes no image, so whether it shows the file cannot be read.
 * - **no rendered error.** A file refused for its type, its size or the file count
 *   leaves NOTHING in the DOM — no `aria-invalid`, no message, and a list that
 *   simply did not grow. The `(rejected)` output is the only channel, so a spec
 *   asserts on the host's handler. See {@link selectFiles}.
 * - **no `maxSize` / `maxFiles` readback.** Neither reaches the DOM (unlike
 *   `accept` and `multiple`, which land on the picker), so they can only be
 *   observed by offering a file that breaks them.
 *
 * Two traps worth knowing before writing assertions. The bound value's SHAPE
 * follows `multiple` — a bare `File` (or `null`) in single mode, a `File[]` in
 * multi — and `[showList]="false"` renders no list at all, so {@link getFileNames}
 * answers `[]` for a component that is holding files. Assert the bound value in
 * that case.
 *
 * @example
 * ```ts
 * const upload = await loader.getHarness(WrFileUploadHarness.with({ label: 'Avatar' }));
 * await upload.selectFiles(new File(['…'], 'me.png', { type: 'image/png' }));
 *
 * expect(await upload.getFileNames()).toEqual(['me.png']);
 * await upload.removeFileNamed('me.png');
 * ```
 *
 * @see https://ngwr.dev/guides/testing
 */
export class WrFileUploadHarness extends ComponentHarness {
  static hostSelector = 'wr-file-upload';

  /** Build a predicate that narrows the query — pass to `getHarness` / `getAllHarnesses`. */
  static with(options: WrFileUploadHarnessFilters = {}): HarnessPredicate<WrFileUploadHarness> {
    return new HarnessPredicate(WrFileUploadHarness, options)
      .addOption('label', options.label, (harness, label) => HarnessPredicate.stringMatches(harness.getLabel(), label))
      .addOption('multiple', options.multiple, async (harness, multiple) => (await harness.isMultiple()) === multiple)
      .addOption('disabled', options.disabled, async (harness, disabled) => (await harness.isDisabled()) === disabled);
  }

  private readonly zone = this.locatorFor('.wr-file-upload__zone');
  private readonly picker = this.locatorFor('input.wr-file-upload__picker');
  private readonly items = this.locatorForAll('.wr-file-upload__item');
  private readonly names = this.locatorForAll('.wr-file-upload__name');
  private readonly sizes = this.locatorForAll('.wr-file-upload__size');
  private readonly removeButtons = this.locatorForAll('.wr-file-upload__remove');

  /**
   * The accessible name of the trigger — what a screen-reader user is told this
   * control is.
   *
   * The `dropZoneLabel` override when one is set, read off `aria-label`. Otherwise
   * the text of what `aria-labelledby` points at, in order: the field's label
   * inside a `<wr-form-field>`, then the zone's visible copy. Resolved through the
   * ids rather than read off the zone's own text, because the field's label sits
   * outside the zone.
   */
  async getLabel(): Promise<string> {
    const zone = await this.zone();
    const override = await zone.getAttribute('aria-label');
    if (override) return override;

    const ids = ((await zone.getAttribute('aria-labelledby')) ?? '').split(/\s+/).filter(Boolean);
    const root = this.documentRootLocatorFactory();
    const parts = await Promise.all(ids.map(async id => (await root.locatorForOptional(`[id="${id}"]`)())?.text()));
    return parts
      .filter((part): part is string => !!part)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** The visible call-to-action line — the `pickLabel` input. */
  async getPickText(): Promise<string> {
    return (await this.locatorFor('.wr-file-upload__hint strong')()).text();
  }

  /** The visible instruction below the CTA — the `dropLabel` input. */
  async getDropText(): Promise<string> {
    return (await this.locatorFor('.wr-file-upload__hint span')()).text();
  }

  /** The optional `helperText` line, or `null` when the component was given none. */
  async getHelperText(): Promise<string | null> {
    const helper = await this.locatorForOptional('.wr-file-upload__hint small')();
    return helper === null ? null : helper.text();
  }

  /** The `accept` list the picker advertises, or `null` when it accepts anything. */
  async getAccept(): Promise<string | null> {
    return (await this.picker()).getAttribute('accept');
  }

  /**
   * Whether more than one file can be held.
   *
   * Read as the DOM PROPERTY: the template writes the attribute as an empty string
   * (`[attr.multiple]="multiple() ? '' : null"`), and `''` is falsy — an attribute
   * read would report a multi-file upload as single.
   */
  async isMultiple(): Promise<boolean> {
    return (await this.picker()).getProperty<boolean>('multiple');
  }

  /** The control size. `'md'` is the default and paints no modifier of its own. */
  async getSize(): Promise<WrFileUploadSize> {
    const host = await this.host();
    if (await host.hasClass('wr-file-upload--sm')) return 'sm';
    if (await host.hasClass('wr-file-upload--lg')) return 'lg';
    return 'md';
  }

  /**
   * Whether the control refuses interaction.
   *
   * Read from the zone's `aria-disabled`. The host also carries
   * `wr-file-upload--disabled` and the picker its own `disabled`, but the zone is
   * a `role="button"` div — `aria-disabled` is the only one of the three that
   * tells a screen-reader user the trigger is inert.
   */
  async isDisabled(): Promise<boolean> {
    return (await (await this.zone()).getAttribute('aria-disabled')) === 'true';
  }

  /**
   * Whether the zone is armed for a drop.
   *
   * The `wr-file-upload--dragging` host modifier is the whole signal — a drop
   * target has no ARIA state, so there is nothing better to read here.
   */
  async isDragging(): Promise<boolean> {
    return (await this.host()).hasClass('wr-file-upload--dragging');
  }

  /** How many files the list is RENDERING. Zero with `[showList]="false"`, always. */
  async getFileCount(): Promise<number> {
    return (await this.items()).length;
  }

  /** The file names in the rendered list, in order. */
  async getFileNames(): Promise<string[]> {
    const names = await this.names();
    return Promise.all(names.map(name => name.text()));
  }

  /**
   * The file sizes in the rendered list, as SHOWN — `'4.9 KB'`, not `5000`.
   *
   * The component formats bytes for display and the byte count never reaches the
   * DOM, so this is the string a user reads. Assert the `File` itself if the exact
   * size matters.
   */
  async getFileSizes(): Promise<string[]> {
    const sizes = await this.sizes();
    return Promise.all(sizes.map(size => size.text()));
  }

  /**
   * Hand files to the picker, the way choosing them in the browser dialog does.
   *
   * This is the one method that reaches past `TestElement` to the native
   * `<input type="file">`, and it has to: `TestElement` has no file API, and it
   * cannot grow one portably, because a `FileList` is not constructible and a
   * remote WebDriver session cannot be handed a `File` object at all. Everything
   * else on this harness is environment-agnostic; this needs a DOM behind it
   * (`TestbedHarnessEnvironment`), and says so with an error when it does not have
   * one. The input is found through this harness's own locator rather than a
   * `document` query, so it is still THIS component's picker that gets the files.
   *
   * Rejected files are silent: nothing appears in the DOM, so pair this with the
   * host's `(rejected)` handler when a file is meant to be refused. In single mode
   * the LAST accepted file wins, which is also how a drop of several files onto a
   * single-file zone behaves.
   *
   * @throws if called with no files, on a disabled upload, or outside a DOM
   *   environment.
   */
  async selectFiles(...files: File[]): Promise<void> {
    if (files.length === 0) {
      throw new Error(
        'WrFileUploadHarness.selectFiles(): pass at least one file. Cancelling the browser dialog fires no ' +
          '`change` at all, so "picked nothing" is not a state a user can put the component in.'
      );
    }

    if (await this.isDisabled()) {
      // The component guards its drop handler but not its `change` handler — it
      // does not need to, since a disabled `<input type="file">` cannot be
      // operated. Forcing the event through anyway would smuggle a file past the
      // disabled state and leave a consumer's spec proving something no user can do.
      throw new Error(
        'WrFileUploadHarness.selectFiles(): the upload is disabled, and a disabled picker cannot be opened. ' +
          'Enable it first, or use dropFiles() to assert that a disabled zone refuses what is dropped on it.'
      );
    }

    const picker = await this.picker();
    const input = nativeElement(picker);

    if (!isFileInput(input)) {
      throw new Error(
        'WrFileUploadHarness.selectFiles(): no DOM element behind the harness. Files can only be handed to a ' +
          'real <input type="file">, so this method needs TestbedHarnessEnvironment; a remote WebDriver ' +
          'environment cannot carry a File across. Every other method on this harness works in both.'
      );
    }

    setPickerFiles(input, files);
    await picker.dispatchEvent('change');
  }

  /**
   * Drag files over the zone and drop them.
   *
   * Driven by dispatching the drag sequence AT the zone rather than by coordinates:
   * nothing has layout in a unit test — `getBoundingClientRect` is all zeros — so a
   * pointer-driven drag would land nowhere. From the component's side it is the
   * same event either way; it reads `dataTransfer.files` and never a position.
   *
   * A disabled upload refuses the drop itself, so this stays a no-op there rather
   * than throwing the way {@link selectFiles} does — that refusal is the
   * component's own, and worth asserting.
   */
  async dropFiles(...files: File[]): Promise<void> {
    const zone = await this.zone();
    const payload = dragPayload(dataTransferFor(files));

    await zone.dispatchEvent('dragenter', payload);
    await zone.dispatchEvent('dragover', payload);
    await zone.dispatchEvent('drop', payload);
  }

  /** Drag over the zone without letting go — arms {@link isDragging}. */
  async dragOver(): Promise<void> {
    const zone = await this.zone();
    const payload = dragPayload(dataTransferFor([]));

    await zone.dispatchEvent('dragenter', payload);
    await zone.dispatchEvent('dragover', payload);
  }

  /**
   * Drag back out of the zone, disarming {@link isDragging}.
   *
   * Dispatched at the zone itself on purpose: the component ignores a `dragleave`
   * whose target is one of the zone's children, because crossing the icon or the
   * hint text is not leaving the zone.
   */
  async dragLeave(): Promise<void> {
    await (await this.zone()).dispatchEvent('dragleave');
  }

  /**
   * Remove the file at `index` from the rendered list.
   *
   * On a disabled upload the remove buttons are disabled too, so this is a no-op
   * there — assert the result rather than assuming it.
   */
  async removeFile(index: number): Promise<void> {
    const buttons = await this.removeButtons();

    if (index < 0 || index >= buttons.length) {
      throw new Error(
        `WrFileUploadHarness.removeFile(${index}): the rendered list holds ${buttons.length} file(s). ` +
          'With [showList]="false" it holds none no matter what is selected.'
      );
    }

    await buttons[index].click();
  }

  /** Remove the file with this name. Names come from {@link getFileNames}. */
  async removeFileNamed(name: string): Promise<void> {
    await this.removeFile(await this.indexNamed('removeFileNamed', name));
  }

  /**
   * The upload state the app set for this file through `[status]`: `'pending'`,
   * `'uploading'`, `'done'` or `'error'`, or `null` for a file with no entry.
   *
   * Read off the row's `wr-file-upload__item--<state>` modifier, the one place
   * every state leaves a mark: `pending` draws no part of its own.
   */
  async getFileStatus(name: string): Promise<WrFileUploadState | null> {
    const row = await this.rowNamed('getFileStatus', name);
    for (const state of ['pending', 'uploading', 'done', 'error'] as const) {
      if (await row.hasClass(`wr-file-upload__item--${state}`)) return state;
    }
    return null;
  }

  /**
   * Press the retry button of this file's row, which emits `(retry)` with the file.
   *
   * @throws if the file is not in the `error` state: only a failed row has the button.
   */
  async retry(name: string): Promise<void> {
    const index = await this.indexNamed('retry', name);
    const button = await this.locatorForOptional(
      `.wr-file-upload__item:nth-child(${index + 1}) .wr-file-upload__retry`
    )();

    if (button === null) {
      throw new Error(
        `WrFileUploadHarness.retry(${JSON.stringify(name)}): the row has no retry button. Only a file whose ` +
          `status is 'error' has one; this one is ${JSON.stringify(await this.getFileStatus(name))}.`
      );
    }

    await button.click();
  }

  /**
   * Whether this file's row shows a thumbnail: `[previews]` is on and the file
   * is an image. jsdom has no `URL.createObjectURL`, so a spec that expects
   * `true` has to stub it.
   */
  async hasPreview(name: string): Promise<boolean> {
    const index = await this.indexNamed('hasPreview', name);
    const image = await this.locatorForOptional(
      `.wr-file-upload__item:nth-child(${index + 1}) img.wr-file-upload__preview`
    )();
    return image !== null;
  }

  /** Index of the row with this name, or a throw that says what the list holds. */
  private async indexNamed(method: string, name: string): Promise<number> {
    const names = await this.getFileNames();
    const index = names.indexOf(name);

    if (index === -1) {
      const holding = names.length > 0 ? names.map(n => JSON.stringify(n)).join(', ') : 'no files';
      throw new Error(`WrFileUploadHarness.${method}(${JSON.stringify(name)}): the rendered list holds ${holding}.`);
    }

    return index;
  }

  private async rowNamed(method: string, name: string): Promise<TestElement> {
    return (await this.items())[await this.indexNamed(method, name)];
  }

  /** Move keyboard focus to the zone — the control's only tab stop. */
  async focus(): Promise<void> {
    return (await this.zone()).focus();
  }

  /** Whether the zone has focus. */
  async isFocused(): Promise<boolean> {
    return (await this.zone()).isFocused();
  }
}
