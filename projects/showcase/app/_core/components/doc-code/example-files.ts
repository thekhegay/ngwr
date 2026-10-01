import { computed, inject, type Signal } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { DOC_SECTION_TITLE } from '../doc-section/doc-section';

import type { DocCodeFile } from './types';

import { buildComponentTs, isTemplateLanguage } from '#core/sandbox';
import type { ShikiLang } from '#core/shiki';

interface ExampleInputs {
  /** The markup the demo renders, as the page passed it. */
  readonly code: Signal<string>;
  /** Its Shiki language — anything but template markup gets no TS half. */
  readonly language: Signal<ShikiLang>;
  /** Files the page listed itself, which always win. */
  readonly files: Signal<readonly DocCodeFile[] | null>;
}

/** `Basic usage` + `Button` -> `ButtonBasicUsageExample`. */
function toClassName(slug: string): string {
  return slug.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());
}

/**
 * The HTML / TS pair a demo shows, the way Material pairs each of its own.
 *
 * Derived rather than authored, which is the whole point: a TS tab written by
 * hand on each of the hundred-odd pages would be a hundred chances to drift
 * from the demo beside it. The builder is the one the StackBlitz sandbox uses,
 * so the tab shows code known to boot rather than a plausible transcription.
 *
 * Returns the page's own `files` untouched when it passed any — a page that
 * lists its files has said what it wants shown — and `null` for a snippet that
 * is not template markup, where there is no component to wrap. A `null` leaves
 * `<ngwr-doc-code>` on its single-file path, with no tab strip at all.
 *
 * Call it from a field initializer; it injects.
 */
function useExampleFiles(inputs: ExampleInputs): Signal<readonly DocCodeFile[] | null> {
  const pageTitle = inject(Title);
  const sectionTitle = inject(DOC_SECTION_TITLE, { optional: true });

  /** `example-name`, the slug the class, selector and `templateUrl` derive from. */
  const exampleName = computed(() => {
    const page = (pageTitle.getTitle() || 'ngwr').split('·')[0];
    const slug = `${page} ${sectionTitle?.() ?? ''} example`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'ngwr-example';
  });

  return computed(() => {
    const own = inputs.files();
    if (own) return own;

    const code = inputs.code().trim();
    if (code.length === 0 || !isTemplateLanguage(inputs.language())) return null;

    const name = exampleName();
    // An EMPTY section title is as absent as a missing one, and the page title
    // is empty until the route's resolver has run — so neither `??` nor a
    // falsy chain says it; the first non-blank of the two does.
    const heading = [sectionTitle?.(), pageTitle.getTitle()].find(t => t?.trim()) ?? 'Example';

    return [
      { label: 'HTML', language: 'angular-html', code },
      {
        label: 'TS',
        language: 'angular-ts',
        code: buildComponentTs({
          template: code,
          selector: name,
          className: toClassName(name),
          templateUrl: `./${name}.html`,
          doc: [heading],
        }),
      },
    ];
  });
}

export { useExampleFiles, type ExampleInputs };
