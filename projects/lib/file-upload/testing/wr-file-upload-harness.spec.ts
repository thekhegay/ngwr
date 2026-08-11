import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { WrFileUpload, type WrFileUploadRejection } from 'ngwr/file-upload';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WrFileUploadHarness } from './wr-file-upload-harness';

@Component({
  imports: [WrFileUpload],
  template: `
    <wr-file-upload
      dropZoneLabel="Avatar"
      pickLabel="Choose a photo"
      dropLabel="or drop one here"
      helperText="PNG or JPG, up to 2 KB"
      [(value)]="avatar"
      [accept]="accept()"
      [maxSize]="maxSize()"
      [disabled]="disabled()"
      (rejected)="rejections.set($event)"
    />
    <wr-file-upload
      dropZoneLabel="Attachments"
      [(value)]="attachments"
      [multiple]="true"
      [maxFiles]="2"
      [showList]="showList()"
      (rejected)="rejections.set($event)"
    />
  `,
})
class Host {
  readonly avatar = signal<File | readonly File[] | null>(null);
  readonly attachments = signal<File | readonly File[] | null>([]);
  readonly accept = signal('');
  readonly maxSize = signal(0);
  readonly disabled = signal(false);
  readonly showList = signal(true);
  readonly rejections = signal<readonly WrFileUploadRejection[]>([]);
}

/**
 * Used the way a CONSUMER would: through `TestbedHarnessEnvironment`, with no
 * reach into the component beyond the public selectors and classes the harness
 * documents. Every write is proved against the HOST'S model, never against the
 * rendered list alone — a file that shows up in the list but not in `[(value)]`
 * is the failure that reaches production.
 */
describe('WrFileUploadHarness', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Host>>;
  let loader: ReturnType<typeof TestbedHarnessEnvironment.loader>;

  const host = (): Host => fixture.componentInstance;
  const avatar = (): File | readonly File[] | null => host().avatar();
  const attachments = (): readonly File[] => host().attachments() as readonly File[];
  const rejections = (): readonly WrFileUploadRejection[] => host().rejections();

  const file = (name: string, type = 'image/png', size = 10): File => {
    const f = new File(['x'], name, { type });
    // jsdom derives `size` from the parts; override it so a size limit is
    // testable without allocating megabytes.
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  const single = (): Promise<WrFileUploadHarness> => loader.getHarness(WrFileUploadHarness.with({ label: 'Avatar' }));
  const multi = (): Promise<WrFileUploadHarness> =>
    loader.getHarness(WrFileUploadHarness.with({ label: 'Attachments' }));

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  afterEach(() => {
    // `stubGlobal` is not undone on its own, and a leaked `DataTransfer` would
    // change how the NEXT spec file's uploads behave.
    vi.unstubAllGlobals();
    fixture.destroy();
  });

  it('finds every upload on the page', async () => {
    const all = await loader.getAllHarnesses(WrFileUploadHarness);

    expect(await Promise.all(all.map(u => u.getLabel()))).toEqual(['Avatar', 'Attachments']);
  });

  it('narrows by the trigger name, exactly or by pattern', async () => {
    expect(await (await single()).getLabel()).toBe('Avatar');

    const matched = await loader.getAllHarnesses(WrFileUploadHarness.with({ label: /^A/ }));
    expect(matched.length).toBe(2);
  });

  it('reads the accessible name rather than the copy inside the zone', async () => {
    // `dropZoneLabel` becomes the zone's `aria-label`, which OVERRIDES the visible
    // text for a screen reader — so the two really are different answers.
    const upload = await single();

    expect(await upload.getLabel()).toBe('Avatar');
    expect(await upload.getPickText()).toBe('Choose a photo');
    expect(await upload.getDropText()).toBe('or drop one here');
  });

  it('reports the helper line, and nothing when there is none', async () => {
    expect(await (await single()).getHelperText()).toBe('PNG or JPG, up to 2 KB');
    expect(await (await multi()).getHelperText()).toBeNull();
  });

  it('reports the constraints the picker advertises, and narrows by multiple', async () => {
    host().accept.set('image/*');
    fixture.detectChanges();

    expect(await (await single()).getAccept()).toBe('image/*');
    expect(await (await multi()).getAccept()).toBeNull();

    // Read as the DOM property: the template writes `multiple=""`, and an
    // attribute read of `''` is falsy.
    expect(await (await single()).isMultiple()).toBe(false);
    expect(await (await multi()).isMultiple()).toBe(true);

    const many = await loader.getAllHarnesses(WrFileUploadHarness.with({ multiple: true }));
    expect(await Promise.all(many.map(u => u.getLabel()))).toEqual(['Attachments']);
  });

  it('chooses a file, and the host gets a bare File in single mode', async () => {
    const upload = await single();
    await upload.selectFiles(file('me.png'));

    // The value SHAPE follows `multiple` — single mode hands over the File itself,
    // not a one-element array.
    expect(avatar()).toBeInstanceOf(File);
    expect((avatar() as File).name).toBe('me.png');
    expect(await upload.getFileNames()).toEqual(['me.png']);
    expect(await upload.getFileCount()).toBe(1);
  });

  it('replaces the single-mode selection instead of appending', async () => {
    const upload = await single();
    await upload.selectFiles(file('first.png'));
    await upload.selectFiles(file('second.png'));

    expect((avatar() as File).name).toBe('second.png');
    expect(await upload.getFileNames()).toEqual(['second.png']);
  });

  it('accumulates an array in multiple mode', async () => {
    const upload = await multi();
    await upload.selectFiles(file('a.png'));

    expect(await upload.getFileNames()).toEqual(['a.png']);
    expect(attachments().map(f => f.name)).toEqual(['a.png']);
  });

  it('mints its FileList through a DataTransfer wherever the environment has one', async () => {
    // A `FileList` has no constructor, so a real browser only gets one out of a
    // `DataTransfer`. jsdom ships neither, which would leave the browser branch of
    // the harness untested here — so stand one up and watch the files go through it.
    const added: File[] = [];
    const listOf = (files: readonly File[]): unknown => ({
      ...files,
      length: files.length,
      item: (index: number): File | null => files[index] ?? null,
      [Symbol.iterator]: function* (): Generator<File> {
        yield* files;
      },
    });

    vi.stubGlobal(
      'DataTransfer',
      class {
        readonly items = { add: (file: File): number => added.push(file) };
        get files(): unknown {
          return listOf(added);
        }
      }
    );

    const upload = await single();
    await upload.selectFiles(file('via-transfer.png'));

    expect(added.map(f => f.name)).toEqual(['via-transfer.png']);
    expect((avatar() as File).name).toBe('via-transfer.png');
  });

  it('shows the size the way a user reads it, not in bytes', async () => {
    const upload = await single();
    await upload.selectFiles(file('big.png', 'image/png', 5000));

    // The byte count never reaches the DOM — the component formats it, so a spec
    // that expects `'5000'` here is asserting something no one can see.
    expect(await upload.getFileSizes()).toEqual(['4.9 KB']);
    expect((avatar() as File).size).toBe(5000);
  });

  it('takes a dropped file the same way as a chosen one', async () => {
    const upload = await single();
    await upload.dropFiles(file('dragged.png'));

    expect((avatar() as File).name).toBe('dragged.png');
    expect(await upload.getFileNames()).toEqual(['dragged.png']);
    // The zone disarms itself on drop.
    expect(await upload.isDragging()).toBe(false);
  });

  it('mirrors a real drag — one transfer through dragenter, dragover and drop', async () => {
    // Without this, `dropFiles()` could fire the bare `drop` and every other case
    // would still pass: the assertion above that the zone is disarmed afterwards is
    // vacuous unless something armed it first. Listening on the zone from outside
    // (the way a consumer never would, but a harness's own spec must) is the only
    // way to see the sequence the platform guarantees.
    const upload = await single();
    const zone = (fixture.nativeElement as HTMLElement).querySelector('.wr-file-upload__zone');
    const seen: { type: string; transfer: unknown }[] = [];

    for (const type of ['dragenter', 'dragover', 'drop']) {
      zone?.addEventListener(type, event =>
        seen.push({ type, transfer: (event as unknown as DragEvent).dataTransfer })
      );
    }

    await upload.dropFiles(file('dragged.png'));

    expect(seen.map(s => s.type)).toEqual(['dragenter', 'dragover', 'drop']);
    // ONE transfer for the whole drag, as a real one is — the component writes
    // `dropEffect` on it during `dragover` and reads `files` back off it on `drop`,
    // so a fresh object per event would break a component that trusted that.
    expect(new Set(seen.map(s => s.transfer)).size).toBe(1);
    expect((seen[0].transfer as DataTransfer).dropEffect).toBe('copy');
  });

  it('arms and disarms the zone as a drag crosses it', async () => {
    const upload = await single();

    await upload.dragOver();
    expect(await upload.isDragging()).toBe(true);

    await upload.dragLeave();
    expect(await upload.isDragging()).toBe(false);
  });

  it('removes a file by index, and the host loses it too', async () => {
    const upload = await single();
    await upload.selectFiles(file('me.png'));
    await upload.removeFile(0);

    expect(await upload.getFileNames()).toEqual([]);
    expect(avatar()).toBeNull();
  });

  it('removes a file by name out of the middle of the list', async () => {
    const upload = await multi();
    await upload.selectFiles(file('a.png'), file('b.png'));
    await upload.removeFileNamed('a.png');

    expect(await upload.getFileNames()).toEqual(['b.png']);
    expect(attachments().map(f => f.name)).toEqual(['b.png']);
  });

  it('matches the name exactly, not as a substring of a longer one', async () => {
    // 'a.png' is a suffix of 'backup-a.png', and the longer name comes FIRST — a
    // harness that searched for a substring would delete the wrong file and every
    // other case here would still pass, because no other list has one name inside
    // another.
    const upload = await multi();
    await upload.selectFiles(file('backup-a.png'), file('a.png'));
    await upload.removeFileNamed('a.png');

    expect(await upload.getFileNames()).toEqual(['backup-a.png']);
    expect(attachments().map(f => f.name)).toEqual(['backup-a.png']);
  });

  it('refuses a call that cannot mean anything, and says why', async () => {
    const upload = await single();
    await upload.selectFiles(file('me.png'));

    await expect(upload.removeFile(3)).rejects.toThrow(/holds 1 file/);
    await expect(upload.removeFileNamed('nope.png')).rejects.toThrow(/"me\.png"/);
    // Cancelling the browser dialog fires no `change` at all, so an empty pick is
    // not a state a user can reach.
    await expect(upload.selectFiles()).rejects.toThrow(/at least one file/);
  });

  describe('refusals', () => {
    it('leaves nothing in the DOM when a file is rejected — only (rejected) says so', async () => {
      // THE trap for this control. A file refused for its type or its size is
      // dropped in silence: no error text, no `aria-invalid`, and a list that
      // simply did not grow. A consumer who asserts only on the DOM sees a passing
      // spec and ships an upload that swallows the user's photo without a word.
      host().accept.set('image/*');
      fixture.detectChanges();

      const upload = await single();
      await upload.selectFiles(file('notes.pdf', 'application/pdf'));

      expect(await upload.getFileCount()).toBe(0);
      expect(avatar()).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('[aria-invalid]')).toBeNull();
      expect(rejections().map(r => [r.file.name, r.reason])).toEqual([['notes.pdf', 'type']]);
    });

    it('refuses a file over maxSize and leaves the previous pick standing', async () => {
      host().maxSize.set(100);
      fixture.detectChanges();

      const upload = await single();
      await upload.selectFiles(file('ok.png', 'image/png', 10));
      await upload.selectFiles(file('huge.png', 'image/png', 5000));

      // Single mode replaces on every accepted pick — but a REFUSED pick replaces
      // nothing, so the file the user already had survives.
      expect(await upload.getFileNames()).toEqual(['ok.png']);
      expect((avatar() as File).name).toBe('ok.png');
      expect(rejections().map(r => r.reason)).toEqual(['size']);
    });

    it('refuses the overflow past maxFiles with a count reason', async () => {
      const upload = await multi();
      await upload.selectFiles(file('a.png'), file('b.png'), file('c.png'));

      expect(await upload.getFileNames()).toEqual(['a.png', 'b.png']);
      expect(attachments().map(f => f.name)).toEqual(['a.png', 'b.png']);
      expect(rejections().map(r => [r.file.name, r.reason])).toEqual([['c.png', 'count']]);
    });
  });

  describe('disabled', () => {
    beforeEach(() => {
      host().disabled.set(true);
      fixture.detectChanges();
    });

    it('reports it from the state a screen reader gets, and narrows by it', async () => {
      expect(await (await single()).isDisabled()).toBe(true);
      expect(await (await multi()).isDisabled()).toBe(false);

      const off = await loader.getAllHarnesses(WrFileUploadHarness.with({ disabled: true }));
      expect(await Promise.all(off.map(u => u.getLabel()))).toEqual(['Avatar']);
    });

    it('refuses to smuggle a file through the picker', async () => {
      // The component guards its drop handler but not its `change` handler, which
      // in a browser is unreachable — a disabled <input type="file"> cannot be
      // opened. The harness refuses rather than forcing the event through and
      // letting a consumer's spec prove something no user can do.
      const upload = await single();

      await expect(upload.selectFiles(file('sneaky.png'))).rejects.toThrow(/disabled/);
      expect(avatar()).toBeNull();
    });

    it('lets the component itself refuse a drop, and never arms the zone', async () => {
      const upload = await single();

      await upload.dragOver();
      expect(await upload.isDragging()).toBe(false);

      await upload.dropFiles(file('sneaky.png'));
      expect(avatar()).toBeNull();
      expect(await upload.getFileCount()).toBe(0);
    });
  });

  it('leaves a picked file alone once the remove button goes disabled', async () => {
    const upload = await single();
    await upload.selectFiles(file('me.png'));

    host().disabled.set(true);
    fixture.detectChanges();

    // The button carries a real `disabled`, so the click never lands. Unlike
    // selectFiles(), this is left as a no-op rather than a throw: clicking a dead
    // button is something a user genuinely does, and worth asserting.
    await upload.removeFile(0);

    expect(await upload.getFileNames()).toEqual(['me.png']);
    expect((avatar() as File).name).toBe('me.png');
  });

  it('renders no list at all with [showList]="false", however many files are held', async () => {
    const upload = await multi();
    await upload.selectFiles(file('a.png'));

    host().showList.set(false);
    fixture.detectChanges();

    // The list is the only DOM evidence of a selection, so with it switched off
    // the harness has nothing to report — the value is still there.
    expect(await upload.getFileNames()).toEqual([]);
    expect(await upload.getFileCount()).toBe(0);
    expect(attachments().map(f => f.name)).toEqual(['a.png']);
    await expect(upload.removeFile(0)).rejects.toThrow(/showList/);
  });

  it('moves focus to the zone, which is the only tab stop', async () => {
    const upload = await single();
    await upload.focus();

    expect(await upload.isFocused()).toBe(true);
    // Named explicitly: `isFocused()` on its own agrees with a harness that focused
    // the aria-hidden, tabindex="-1" picker instead — self-consistent, and a tab
    // stop no user can reach.
    expect(document.activeElement?.className).toContain('wr-file-upload__zone');
  });
});
