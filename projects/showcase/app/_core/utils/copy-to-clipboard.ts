/**
 * Copies a string to the system clipboard.
 *
 * Falls back gracefully if the Clipboard API is unavailable or denied.
 *
 * @returns `true` when the copy succeeded.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
