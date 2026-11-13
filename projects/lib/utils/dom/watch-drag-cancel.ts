/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

/**
 * CDK's `cdkDrag` has no cancel: a pointer drag ends on the release event of the
 * input that started it, and the drop always reorders. This listens for Escape
 * on the document and, when it comes, ends the drag the way the CDK ends it, so
 * the preview flies back and `cdkDragEnded` still fires.
 *
 * The release is `touchend` for a touch start and `mouseup` for a mouse start,
 * the two events the CDK's drag registry binds on the document. The caller marks
 * the drag cancelled in `onCancel`, which runs before the release, so the drop
 * handler that follows can ignore it. Escape is prevented and stopped (capture
 * phase) so a dialog around the drag does not close on the same key.
 *
 * Call it from `cdkDragStarted` and call the returned function from
 * `cdkDragEnded` and on destroy; the listener lives no longer than that.
 *
 * @internal Shared by the entry points; not a consumer API.
 * @param doc The document the drag runs in.
 * @param start The event the drag started with, `CdkDragStart.event`.
 * @param onCancel Runs once when Escape cancels the drag.
 * @returns Removes the listener. Safe to call twice.
 */
export function wrWatchDragCancel(doc: Document, start: Event, onCancel: () => void): () => void {
  const touch = start.type.startsWith('touch');
  const stop = (): void => doc.removeEventListener('keydown', onKeydown, true);

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    stop();
    onCancel();
    if (touch) {
      // The CDK reads `targetTouches` and `changedTouches` off a touch release.
      const end = new Event('touchend', { bubbles: true, cancelable: true });
      Object.assign(end, { targetTouches: [], changedTouches: [] });
      doc.dispatchEvent(end);
    } else {
      doc.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    }
  }

  doc.addEventListener('keydown', onKeydown, true);
  return stop;
}
