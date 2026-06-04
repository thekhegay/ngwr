/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import {
  Component,
  type ElementRef,
  ViewEncapsulation,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { useI18nText } from 'ngwr/i18n';
import { noop } from 'ngwr/utils';

import type { WrFileUploadRejection, WrFileUploadRejectionReason } from './types';

/** Human-readable byte size (e.g. `1.2 MB`). */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / 1024 ** i;
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
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
 * Implements `ControlValueAccessor` — value is `File | File[] | null`
 * (single or array, governed by `multiple`).
 *
 * @example
 * ```html
 * <wr-file-upload [(ngModel)]="files" [multiple]="true" accept="image/*" />
 * <wr-file-upload [(ngModel)]="avatar" accept=".png,.jpg" [maxSize]="2 * 1024 * 1024" />
 * ```
 *
 * @see https://ngwr.dev/docs/components/file-upload
 */
@Component({
  selector: 'wr-file-upload',
  templateUrl: './file-upload.html',
  encapsulation: ViewEncapsulation.None,
  host: { '[class]': 'classes()' },
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // eslint-disable-next-line @angular-eslint/no-forward-ref
      useExisting: forwardRef(() => WrFileUpload),
      multi: true,
    },
  ],
})
export class WrFileUpload implements ControlValueAccessor {
  /** Allow multiple files. Single mode replaces on each add. @default false */
  readonly multiple = input(false, { transform: coerceBooleanProperty });

  /** `accept` attribute — comma-separated MIME types or extensions. @default '' */
  readonly accept = input<string>('');

  /** Max bytes per file. `0` disables the check. @default 0 */
  readonly maxSize = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Max files (multi mode only). `0` disables the check. @default 0 */
  readonly maxFiles = input(0, { transform: (v: unknown): number => Math.max(0, coerceNumberProperty(v, 0)) });

  /** Render the picked-files list below the zone. @default true */
  readonly showList = input(true, { transform: coerceBooleanProperty });

  /** Disable interaction. @default false */
  readonly disabled = input(false, { transform: coerceBooleanProperty });

  /** Primary call-to-action label. Falls back to `fileUpload.browse`. */
  readonly pickLabel = input<string | null>(null);

  /** Secondary instruction below the CTA. Falls back to `fileUpload.dropZone`. */
  readonly dropLabel = input<string | null>(null);

  /** Drop-zone host aria-label. Falls back to `fileUpload.dropZoneLabel`. */
  readonly dropZoneLabel = input<string | null>(null);

  /** Remove-file button aria-label. Falls back to `fileUpload.removeFile`. */
  readonly removeFileLabel = input<string | null>(null);

  protected readonly resolvedPick = useI18nText(this.pickLabel, 'fileUpload.browse', 'Click to browse');
  protected readonly resolvedDrop = useI18nText(this.dropLabel, 'fileUpload.dropZone', 'or drop files here');
  protected readonly resolvedDropZone = useI18nText(
    this.dropZoneLabel,
    'fileUpload.dropZoneLabel',
    'File upload drop zone — click or drop files'
  );
  protected readonly resolvedRemove = useI18nText(this.removeFileLabel, 'fileUpload.removeFile', 'Remove file');

  /** Optional helper text shown below the labels (e.g. accepted formats). */
  readonly helperText = input<string>('');

  /** Emitted when files are rejected for type / size / count reasons. */
  readonly rejected = output<readonly WrFileUploadRejection[]>();

  protected readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');

  protected readonly files = signal<readonly File[]>([]);
  protected readonly dragging = signal(false);

  private readonly disabledFromCva = signal(false);

  protected readonly effectiveDisabled = computed(() => this.disabled() || this.disabledFromCva());

  protected readonly classes = computed(() => {
    const parts = ['wr-file-upload'];
    if (this.dragging()) parts.push('wr-file-upload--dragging');
    if (this.effectiveDisabled()) parts.push('wr-file-upload--disabled');
    return parts.join(' ');
  });

  protected readonly formatBytes = formatBytes;

  // ──────── ControlValueAccessor ────────

  private onChange: (value: File | readonly File[] | null) => void = noop;
  private onTouched: () => void = noop;

  writeValue(value: File | readonly File[] | null): void {
    if (value === null || value === undefined) {
      this.files.set([]);
      return;
    }
    this.files.set(Array.isArray(value) ? value : [value as File]);
  }

  registerOnChange(fn: (value: File | readonly File[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledFromCva.set(coerceBooleanProperty(isDisabled));
  }

  // ──────── Template handlers ────────

  protected openPicker(): void {
    if (this.effectiveDisabled()) return;
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
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.effectiveDisabled()) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  protected onDragLeave(event: DragEvent): void {
    // Only clear when leaving the zone itself, not internal children.
    if (event.currentTarget === event.target) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.effectiveDisabled()) return;
    const dropped = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    if (dropped.length > 0) this.acceptFiles(dropped);
  }

  protected removeAt(index: number): void {
    if (this.effectiveDisabled()) return;
    const next = this.files().filter((_, i) => i !== index);
    this.files.set(next);
    this.emit();
  }

  // ──────── Internals ────────

  private acceptFiles(incoming: readonly File[]): void {
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
      next = [...this.files(), ...accepted];
      const maxFiles = this.maxFiles();
      if (maxFiles > 0 && next.length > maxFiles) {
        const overflow = next.splice(maxFiles);
        for (const file of overflow) rejections.push({ file, reason: 'count' });
      }
    } else {
      // Single mode — last accepted wins, prior selection cleared.
      next = accepted.length > 0 ? [accepted[accepted.length - 1]] : [...this.files()];
    }

    this.files.set(next);
    this.onTouched();
    this.emit();
    if (rejections.length > 0) this.rejected.emit(rejections);
  }

  private reject(file: File, accept: string, maxSize: number): WrFileUploadRejectionReason | null {
    if (accept && !matchesAccept(file, accept)) return 'type';
    if (maxSize > 0 && file.size > maxSize) return 'size';
    return null;
  }

  private emit(): void {
    const list = this.files();
    if (this.multiple()) {
      this.onChange(list);
    } else {
      this.onChange(list.length > 0 ? list[0] : null);
    }
  }
}
