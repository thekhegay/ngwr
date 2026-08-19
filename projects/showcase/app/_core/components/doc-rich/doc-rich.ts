import { Pipe, type PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * The three inline forms a doc description may use, written once.
 *
 * Both readings of a description go through these: the pipe renders them as
 * markup, {@link docRichToText} strips them for `<meta>`. Two copies of the
 * link pattern would drift, and the half that drifted would be the one nobody
 * looks at — 109 of 199 prerendered pages shipped their raw backticks into
 * `<meta name="description">` while the lede beside them rendered fine. Sharing
 * the patterns IS the guarantee here: the showcase has no test target
 * (`angular.json` gives it build / serve / lint), so no spec can hold the two
 * readings to each other.
 */
const CODE = /`([^`]+)`/g;
const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
const BOLD = /\*\*([^*]+)\*\*/g;

/**
 * Markdown-lite for doc descriptions: inline `code`, [links](url) and
 * **bold**. Input is escaped first, so authored text can never inject
 * markup beyond these three forms.
 */
@Pipe({ name: 'wrDocRich' })
class DocRichPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    let html = escapeHtml(value);
    html = html.replace(CODE, '<code>$1</code>');
    html = html.replace(
      LINK,
      (_m, text: string, url: string) =>
        `<a class="ngwr-doc-link" href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
    );
    html = html.replace(BOLD, '<strong>$1</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

/**
 * The same three forms, reduced to the words inside them — for `<meta>`, where
 * markdown is not rendered by anything and reads as punctuation nobody typed.
 *
 * Deliberately NOT escaped, unlike the pipe. Escaping is a step the pipe owes to
 * `bypassSecurityTrustHtml`; `Meta.updateTag` escapes an attribute value itself,
 * so doing it here as well puts `&amp;lt;wr-option-group&amp;gt;` in a search
 * snippet — and several descriptions do name an element.
 */
function docRichToText(value: string): string {
  return value.replace(CODE, '$1').replace(LINK, '$1').replace(BOLD, '$1');
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export { DocRichPipe, docRichToText };
