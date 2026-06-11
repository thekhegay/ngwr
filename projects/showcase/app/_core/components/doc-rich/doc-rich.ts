import { Pipe, type PipeTransform, inject } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

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
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      (_m, text: string, url: string) =>
        `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`
    );
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export { DocRichPipe };
