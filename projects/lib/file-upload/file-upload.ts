/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  LOCALE_ID,
  PLATFORM_ID,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { WrButton } from 'ngwr/button';
import { useFormFieldAria } from 'ngwr/form';
import { wrReadI18nText, useI18nFormatter, useI18nText } from 'ngwr/i18n';
import { WrProgress } from 'ngwr/progress';
import { wrRandomId, wrCheckStyles } from 'ngwr/utils';

import type {
  WrFileUploadRejection,
  WrFileUploadRejectionReason,
  WrFileUploadSize,
  WrFileUploadState,
  WrFileUploadStatusMap,
} from './types';

/** One list row: the file, what `[status]` says about it and its thumbnail. */
interface FileRow {
  readonly file: File;
  readonly classes: string;
  readonly state: WrFileUploadState | null;
  readonly percent: number | null;
  readonly message: string | null;
  readonly preview: string | null;
}

/** Does `file` match the `accept` attribute (extensions or MIME globs)? */
function matchesAccept(file: File, accept: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return tokens.some(token => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
}

/**
 * Drag-and-drop file upload zone. Click to browse, drag-and-drop to add,
 * with an optional file list + remove buttons.
 *
 * A signal-forms native control: it implements
 * `FormValueControl<File | readonly File[] | null>`, so `[formField]` binds
 * straight to its `value` model — no `ControlValueAccessor` in between.
 * `[(value)]` works standalone. The value shape follows `multiple`: a single
 * `File` (or `null`), or a `File[]` array.
 *
 * @example
 * ```html
 * <!-- signal forms -->
 * <wr-file-upload [formField]="form.files" [multiple]="true" accept="image/*" />
 *
 * <!-- standalone two-way binding -->
 * <wr-file-upload [(value)]="avatar" accept=".png,.jpg" [maxSize]="2 * 1024 * 1024" />
 * ```
 *
 * The component does no HTTP. The app uploads, and tells the list where each
 * file stands through `[status]`, a `Map` keyed by the `File` objects in `value`:
 *
 * ```html
 * <wr-file-upload [(value)]="files" multiple [status]="statuses()" (retry)="upload($event)" />
 * ```
 *
 * @see https://ngwr.dev/reference/components/file-upload
 */
@Component({
  selector: 'wr-file-upload',
  templateUrl: './file-upload.html',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'wr-file-upload', '[class]': 'classes()' },
  imports: [WrButton, WrProgress],
})
export class WrFileUpload implements FormValueControl<File | readonly File[] | null> {
  /** Allow multiple files. Single mode replaces on each add. @default false */
  readonly multiple = input(false, { transform: coerceBooleanProperty });

  /** `accept` attribute — comma-separated MIME types or extensions. @default '' */
  readonly accept = input<string>('');

  /**
   * Control size: the drop zone's padding, icon and text, and the list rows.
   *
   * @default 'md'
   */
  readonly size = input<WrFileUploadSize>('md');

  /** Max bytes per file. `0` disables the check. @default 0 */
  readonly maxSize = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Max files (multi mode only). `0` disables the check. @default 0 */
  readonly maxFiles = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Render the picked-files list below the zone. @default true */
  readonly showList = input(true, { transform: coerceBooleanProperty });

  /**
   * Disable interaction. Bound automatically from the field's disabled state
   * when used with `[formField]`.
   *
   * @default false
   */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /**
   * Refuse changes to the selection while the zone stays focusable and the files
   * still submit. Bound automatically from the field's readonly state when used
   * with `[formField]`.
   *
   * The zone stops opening the picker, a drop is refused and the per-file remove
   * buttons go inert — but the list stays readable, which is the point. No
   * `aria-readonly`: the zone is a `role="button"`, and ARIA does not define the
   * state for that role, so `aria-disabled` would be the only mirror available
   * and it would say the wrong thing.
   *
   * @default false
   */
  readonly readonly = input(false, { transform: coerceBooleanProperty });

  /**
   * Where the app's upload of each file stands, keyed by the `File` objects in
   * `value`. A row with an entry draws its state: a progress bar while
   * `uploading` (indeterminate without a `percent`), a mark when `done`, the
   * `message` and a retry button on `error`. A file with no entry is a plain row.
   *
   * Pass a new `Map` on each change: an input sees a new reference, not a `set()`
   * on the one it already holds. `null` (the default) renders nothing extra.
   *
   * @default null
   */
  readonly status = input<WrFileUploadStatusMap | null>(null);

  /**
   * Show a thumbnail beside each image file. The thumbnail is an object URL,
   * revoked when its file leaves the list or the component is destroyed. Browser
   * only: nothing is created on the server.
   *
   * @default false
   */
  readonly previews = input(false, { transform: coerceBooleanProperty });

  /**
   * Take files pasted with Ctrl/Cmd+V while the drop zone has focus. They go
   * through the same `accept`, `maxSize` and `maxFiles` rules as a drop. A paste
   * that carries no file is left alone.
   *
   * @default false
   */
  readonly acceptPaste = input(false, { transform: coerceBooleanProperty });

  /** The surrounding `<wr-form-field>`'s error state. @internal */
  protected readonly fieldAria = useFormFieldAria();

  /** id of the zone's visible copy, which names it. @internal */
  protected readonly hintId = wrRandomId('wr-file-upload-hint');

  /**
   * The zone's name, as `aria-labelledby`: the field's label when a
   * `<wr-form-field>` wraps it, then the zone's own visible copy.
   *
   * The zone is a `div[role="button"]`, so `<wr-form-field>`'s `<label for>`
   * cannot reach it, and `aria-labelledby` is the direction that works for a
   * role. The visible copy is always part of the name (WCAG 2.5.3, Label in
   * Name): a speech-input user says what they see, and a name without it leaves
   * "Click to browse" matching nothing. `null` while `dropZoneLabel` overrides.
   */
  protected readonly labelledBy = computed(() =>
    this.dropZoneLabel() ? null : [this.fieldAria.labelledBy(), this.hintId].filter(Boolean).join(' ')
  );

  /** The `dropZoneLabel` override, or `null` so the visible copy names the zone. */
  protected readonly zoneName = computed(() => {
    const label = this.dropZoneLabel();
    return label === '' ? null : label;
  });

  /** Primary call-to-action label. Falls back to `fileUpload.browse`. */
  readonly pickLabel = input<string | null>(null);

  /** Secondary instruction below the CTA. Falls back to `fileUpload.dropZone`. */
  readonly dropLabel = input<string | null>(null);

  /**
   * Overrides the drop zone's accessible name. Unset, the zone is named by its
   * visible copy, after the field's label inside a `<wr-form-field>`. An
   * override must contain that copy, or speech input cannot reach the control
   * (WCAG 2.5.3).
   */
  readonly dropZoneLabel = input<string | null>(null);

  /**
   * Name of each row's remove button. `{{name}}` is the row's file name, so the
   * buttons of a list are told apart. Falls back to `fileUpload.removeFile`,
   * "Remove {{name}}" in English.
   */
  readonly removeFileLabel = input<string | null>(null);

  /** Retry button text on a failed row. Falls back to `fileUpload.retry`. */
  readonly retryLabel = input<string | null>(null);

  /** Name of the `uploading` state: the progress bar's name and the announcement. Falls back to `fileUpload.uploading`. */
  readonly uploadingLabel = input<string | null>(null);

  /** Name of the `done` state: the mark's name and the announcement. Falls back to `fileUpload.uploaded`. */
  readonly uploadedLabel = input<string | null>(null);

  /** Text of a failed row whose status carries no `message`. Falls back to `fileUpload.failed`. */
  readonly failedLabel = input<string | null>(null);

  protected readonly resolvedPick = useI18nText(this.pickLabel, 'fileUpload.browse', 'Click to browse');
  protected readonly resolvedDrop = useI18nText(this.dropLabel, 'fileUpload.dropZone', 'or drop files here');
  private readonly removeText = useI18nFormatter('fileUpload.removeFile', 'Remove {{name}}');

  /** The remove button of one row, named after its file. */
  protected removeName(name: string): string {
    const given = this.removeFileLabel();
    return given ? given.replace(/\{\{\s*name\s*\}\}/g, () => name) : this.removeText({ name });
  }

  protected readonly resolvedRetry = useI18nText(this.retryLabel, 'fileUpload.retry', 'Try again');
  protected readonly resolvedUploading = useI18nText(this.uploadingLabel, 'fileUpload.uploading', 'Uploading');
  protected readonly resolvedUploaded = useI18nText(this.uploadedLabel, 'fileUpload.uploaded', 'Uploaded');
  protected readonly resolvedFailed = useI18nText(this.failedLabel, 'fileUpload.failed', 'Upload failed');

  /** `{{name}}: {{status}}`: a state said about one file. */
  protected readonly statusText = useI18nFormatter('fileUpload.status', '{{name}}: {{status}}');

  /** Optional helper text shown below the labels (e.g. accepted formats). */
  readonly helperText = input<string>('');

  /**
   * Selected file(s). Bound by `[formField]`, or two-way via `[(value)]`. Shape
   * follows `multiple`: a single `File` (or `null`), or a `File[]` array.
   */
  readonly value = model<File | readonly File[] | null>(null);

  /** Emitted when files are rejected for type / size / count reasons. */
  readonly rejected = output<readonly WrFileUploadRejection[]>();

  /** Emitted with the file when the retry button of a failed row is pressed. */
  readonly retry = output<File>();

  /** Emitted on commit so a bound field can mark itself touched. */
  readonly touch = output<void>();

  protected readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  private readonly zone = viewChild.required<ElementRef<HTMLElement>>('zone');

  protected readonly files = signal<readonly File[]>([]);
  protected readonly dragging = signal(false);

  /**
   * How many elements of the zone the drag is inside. The browser fires `dragleave`
   * on the zone when the pointer moves onto its own label or icon, with `dragenter`
   * on the child just before it, so "left the zone" read off a single event switched
   * the highlight off over the zone's text and back on over its padding. Every enter
   * counts up and every leave down; the drag has left when the count is back to 0.
   */
  private dragDepth = 0;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** id prefix of the file names, which describe each row's retry button. @internal */
  protected readonly nameId = wrRandomId('wr-file-upload-name');

  /** The object URL of each previewed image file. */
  private readonly previewUrls = signal<ReadonlyMap<File, string>>(new Map());

  protected readonly rows = computed<readonly FileRow[]>(() => {
    const status = this.status();
    const urls = this.previewUrls();
    return this.files().map(file => {
      const entry = status?.get(file);
      const percent = entry?.state === 'uploading' ? entry.percent : null;
      const state = entry?.state ?? null;
      return {
        file,
        classes: state ? `wr-file-upload__item wr-file-upload__item--${state}` : 'wr-file-upload__item',
        state,
        percent: typeof percent === 'number' && Number.isFinite(percent) ? percent : null,
        message: entry?.state === 'error' && entry.message ? entry.message : null,
        preview: urls.get(file) ?? null,
      };
    });
  });

  /** `aria-busy` on the list: at least one file is uploading. */
  protected readonly busy = computed(() => this.rows().some(row => row.state === 'uploading'));

  /** What the one live region says: the states that changed in the last `[status]` write. */
  protected readonly announcement = signal('');

  /** The state each file had at the last `[status]` write, to tell a change from a percent tick. */
  private lastStates: ReadonlyMap<File, WrFileUploadState> | null = null;

  protected readonly classes = computed(() => {
    const parts: string[] = [];
    const size = this.size();
    if (size !== 'md') parts.push(`wr-file-upload--${size}`);
    if (this.dragging()) parts.push('wr-file-upload--dragging');
    if (this.disabled()) parts.push('wr-file-upload--disabled');
    else if (this.readonly()) parts.push('wr-file-upload--readonly');
    return parts.join(' ');
  });

  /**
   * Human-readable file size (e.g. `1.2 MB`).
   *
   * Every piece of this used to be English and unreachable: a module-level unit
   * table with no catalog key, and `toFixed()`, which writes an ASCII decimal
   * point whatever `LOCALE_ID` says. A Russian page showed translated drop-zone
   * copy above `3.4 KB`. The number now goes through `Intl.NumberFormat` and the
   * unit through the catalog, joined by a template the catalog also owns — so a
   * locale controls the separator, the digits and whether a space sits before
   * the unit.
   *
   * Not a `computed`: it is called per file, with the file's size as its
   * argument. It still re-runs on a locale switch, because the formatters it
   * calls are signals read during the same change detection that renders the row.
   */
  protected formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return this.sizeText({ value: this.number(0, 0), unit: this.unitTexts[0]() });
    }
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), this.unitTexts.length - 1);
    const v = bytes / 1024 ** i;
    const digits = v >= 100 || i === 0 ? 0 : 1;
    return this.sizeText({ value: this.number(v, digits), unit: this.unitTexts[i]() });
  }

  /** `{{value}} {{unit}}` — the join, so a locale owns the space too. */
  private readonly sizeText = useI18nFormatter('fileUpload.size', '{{value}} {{unit}}');

  /**
   * One resolved signal per binary unit, indexed by the power of 1024 the
   * arithmetic lands on.
   *
   * Spelled out rather than built from a key list: `i18n.spec.ts` reads every
   * catalog key the library asks for out of the SOURCE, by matching a quoted
   * dotted string inside the call, so a key built by interpolation is invisible
   * to it. That spec fails rather than passing quietly, but either way the key
   * would stop being checked.
   */
  private readonly unitTexts = [
    wrReadI18nText('fileUpload.unitByte', 'B'),
    wrReadI18nText('fileUpload.unitKb', 'KB'),
    wrReadI18nText('fileUpload.unitMb', 'MB'),
    wrReadI18nText('fileUpload.unitGb', 'GB'),
    wrReadI18nText('fileUpload.unitTb', 'TB'),
  ] as const;

  private readonly locale = inject(LOCALE_ID);

  private number(value: number, digits: number): string {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  }

  constructor() {
    if (typeof ngDevMode === 'undefined' || ngDevMode) wrCheckStyles('file-upload');
    // Rebuild the internal file list from an external `value` write (mirrors the
    // old `writeValue`). Skipped when the value is merely the echo of an
    // in-component edit, so re-syncing can never clobber a live selection.
    effect(() => {
      const v = this.value();
      untracked(() => {
        // Coerce null/undefined to `[]` — a classic-forms binding can write
        // null, which the old `writeValue(v: … | null)` accepted too.
        const next: readonly File[] = v === null || v === undefined ? [] : Array.isArray(v) ? v : [v as File];
        const current = this.files();
        if (current.length === next.length && current.every((file, i) => file === next[i])) return;
        this.files.set(next);
      });
    });

    effect(() => {
      const rows = this.status() === null ? null : this.rows();
      untracked(() => this.announce(rows));
    });

    effect(() => {
      const images = this.previews() && this.browser ? this.files().filter(file => file.type.startsWith('image/')) : [];
      untracked(() => this.syncPreviews(images));
    });
    inject(DestroyRef).onDestroy(() => this.syncPreviews([]));
  }

  /**
   * Focus the drop zone — what Signal Forms calls to focus this control, from
   * `focusBoundControl()`. The zone is the control: the real file input beside
   * it is hidden and out of the tab order, and the host has no tab stop. A
   * read-only zone still takes it; a disabled one is left alone, as a disabled
   * native control refuses the same call.
   */
  focus(options?: FocusOptions): void {
    if (!this.disabled()) this.zone().nativeElement.focus(options);
  }

  // Template handlers

  protected openPicker(): void {
    if (this.disabled() || this.readonly()) return;
    this.picker().nativeElement.click();
  }

  protected onZoneKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker();
    }
  }

  protected onPickerChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files) this.acceptFiles(Array.from(target.files));
    // Reset so picking the same file twice re-fires `change`.
    target.value = '';
  }

  protected onDragEnter(event: DragEvent): void {
    if (this.disabled() || this.readonly()) return;
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.disabled() || this.readonly()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(): void {
    // See `dragDepth`: a leave onto one of the zone's own children is not leaving.
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    if (this.disabled() || this.readonly()) return;
    const dropped = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    if (dropped.length > 0) this.acceptFiles(dropped);
  }

  protected onPaste(event: ClipboardEvent): void {
    if (!this.acceptPaste() || this.disabled() || this.readonly()) return;
    const pasted = event.clipboardData?.files ? Array.from(event.clipboardData.files) : [];
    if (pasted.length === 0) return;
    event.preventDefault();
    this.acceptFiles(pasted);
  }

  protected onRetry(file: File, index: number): void {
    if (this.disabled()) return;
    const button = this.host.nativeElement.ownerDocument.activeElement;
    const hadFocus = !!button?.matches('.wr-file-upload__retry') && this.host.nativeElement.contains(button);
    this.retry.emit(file);
    if (!hadFocus) return;
    // A handler that moves the file out of `error` takes the button away, and
    // focus with it. The row's remove button is what is left to hold it.
    afterNextRender(
      () => {
        if (button?.isConnected) return;
        this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-file-upload__remove')[index]?.focus();
      },
      { injector: this.injector }
    );
  }

  protected removeAt(index: number): void {
    if (this.disabled() || this.readonly()) return;
    // Read before the row goes: the button that holds focus is about to leave the
    // document, and focus with it — to `<body>`, so the next Tab restarted at the top
    // of the page. A middle row only kept it by accident, through `track $index`
    // reusing the button for the file that moved up.
    const focused = this.host.nativeElement.ownerDocument.activeElement;
    const hadFocus = !!focused?.matches('.wr-file-upload__remove') && this.host.nativeElement.contains(focused);
    const next = this.files().filter((_, i) => i !== index);
    this.files.set(next);
    this.emit();
    if (!hadFocus) return;
    afterNextRender(
      () => {
        // The row that took this one's place, else the one before it, else the zone.
        const buttons = this.host.nativeElement.querySelectorAll<HTMLElement>('.wr-file-upload__remove');
        const target = buttons[Math.min(index, buttons.length - 1)] ?? this.zone().nativeElement;
        target.focus();
      },
      { injector: this.injector }
    );
  }

  // Internals

  private acceptFiles(incoming: readonly File[]): void {
    if (this.disabled() || this.readonly()) return;
    const accept = this.accept();
    const maxSize = this.maxSize();
    const rejections: WrFileUploadRejection[] = [];
    const accepted: File[] = [];

    for (const file of incoming) {
      const reason = this.reject(file, accept, maxSize);
      if (reason) rejections.push({ file, reason });
      else accepted.push(file);
    }

    let next: File[];
    if (this.multiple()) {
      const listed = this.files();
      const maxFiles = this.maxFiles();
      // The cap rejects incoming files only: a list already over it keeps what it holds.
      const room = maxFiles > 0 ? Math.max(0, maxFiles - listed.length) : accepted.length;
      for (const file of accepted.slice(room)) rejections.push({ file, reason: 'count' });
      next = [...listed, ...accepted.slice(0, room)];
    } else {
      // Single mode — last accepted wins, prior selection cleared.
      next = accepted.length > 0 ? [accepted[accepted.length - 1]] : [...this.files()];
    }

    this.files.set(next);
    this.touch.emit();
    this.emit();
    if (rejections.length > 0) this.rejected.emit(rejections);
  }

  /**
   * Say each state a file has just entered, in one string. `pending` is the
   * resting state and a percent tick is not a change, so neither is said, and
   * the states present when `[status]` is first bound are a starting point
   * rather than news.
   */
  private announce(rows: readonly FileRow[] | null): void {
    if (rows === null) {
      this.lastStates = null;
      return;
    }
    const next = new Map<File, WrFileUploadState>();
    const changed: string[] = [];
    for (const row of rows) {
      if (row.state === null) continue;
      next.set(row.file, row.state);
      if (this.lastStates === null || row.state === 'pending' || this.lastStates.get(row.file) === row.state) continue;
      const status =
        row.state === 'uploading'
          ? this.resolvedUploading()
          : row.state === 'done'
            ? this.resolvedUploaded()
            : (row.message ?? this.resolvedFailed());
      changed.push(this.statusText({ name: row.file.name, status }));
    }
    this.lastStates = next;
    if (changed.length > 0) {
      this.announcement.set(new Intl.ListFormat(this.locale, { style: 'short', type: 'unit' }).format(changed));
    }
  }

  /** Hold one object URL per file in `images`, and revoke the ones that left. */
  private syncPreviews(images: readonly File[]): void {
    const current = this.previewUrls();
    if (current.size === images.length && images.every(file => current.has(file))) return;
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
    const next = new Map<File, string>();
    for (const file of images) next.set(file, current.get(file) ?? URL.createObjectURL(file));
    for (const [file, url] of current) if (!next.has(file)) URL.revokeObjectURL(url);
    this.previewUrls.set(next);
  }

  private reject(file: File, accept: string, maxSize: number): WrFileUploadRejectionReason | null {
    if (accept && !matchesAccept(file, accept)) return 'type';
    if (maxSize > 0 && file.size > maxSize) return 'size';
    return null;
  }

  private emit(): void {
    const list = this.files();
    if (this.multiple()) {
      this.value.set(list);
    } else {
      this.value.set(list.length > 0 ? list[0] : null);
    }
  }
}
