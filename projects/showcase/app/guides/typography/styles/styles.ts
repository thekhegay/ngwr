import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WrButton, type WrButtonSize } from 'ngwr/button';
import { WrTypography, type WrTypographyTone, type WrTypographyVariant } from 'ngwr/typography';

import { DocPageComponent, DocSectionComponent } from '#core/components';
import { CSS_VARS } from '#core/generated/css-vars';
import { ROUTES, wrPath } from '#routes';

interface StyleRow {
  readonly variant: WrTypographyVariant;
  readonly sample: string;
  /** What the variant resolves to: size, line height, weight, tracking, colour. */
  readonly tokens: readonly string[];
  readonly meaning: string;
}

interface ToneRow {
  readonly tone: WrTypographyTone;
  readonly sample: string;
  readonly token: string;
  readonly meaning: string;
}

interface TokenRow {
  readonly token: string;
  /** The `ngwr/typography-utilities` class that applies the token, if any. */
  readonly utility?: string;
  readonly meaning: string;
}

interface ProseRow {
  readonly token: string;
  readonly sample: string;
  /** Drawn as a rule rather than as text — the hook colours a border. */
  readonly line?: boolean;
  readonly meaning: string;
}

interface ControlRow {
  readonly size: WrButtonSize;
  readonly token: string;
  readonly leading: string;
  readonly meaning: string;
}

interface HookRow {
  readonly token: string;
  /** The default the library ships, from the generated hook map. */
  readonly value: string;
  readonly meaning: string;
}

interface ClassRow {
  readonly utility: string;
  readonly meaning: string;
}

/** The `ngwr/typography` hooks, as `pnpm gen:css-vars` reads them out of the stylesheet. */
const TYPOGRAPHY_HOOKS = CSS_VARS['reference/directives/typography'].vars;

/** When to reach for each `[wrTypography]` hook. Names and defaults come from the generated map. */
const HOOK_MEANINGS: Readonly<Record<string, string>> = {
  '--wr-typography-font-family': 'Typeface. The code variant and mono switch it to monospace.',
  '--wr-typography-font-size': 'Size. Every sizing variant sets its own.',
  '--wr-typography-font-weight': 'Weight.',
  '--wr-typography-line-height': 'Line height.',
  '--wr-typography-letter-spacing': 'Letter spacing. Display, h1, h2 and overline set their own.',
  '--wr-typography-padding-y': 'Vertical padding of the code chip.',
  '--wr-typography-padding-x': 'Horizontal padding of the code chip.',
  '--wr-typography-radius': 'Corner radius of the code chip.',
  '--wr-typography-list-margin-top': 'Gap between the items of a list.',
  '--wr-typography-list-padding-start': 'Indent of a nested list.',
  '--wr-typography-list-dt-margin-top': 'Space above each new term in a dl.',
  '--wr-typography-list-dt-margin-bottom': 'Space between a term and its description.',
  '--wr-typography-list-dt-padding-top': 'Space between a divider and the term under it.',
  '--wr-typography-list-dt-border': 'The divider above each new term in a dl.',
  '--wr-typography-list-dd-font-size': 'Size of a description in a dl.',
  '--wr-typography-list-dd-font-weight': 'Weight of a description in a dl.',
};

/** The shipped default of a hook, or an empty string for one the map does not carry. */
function hookDefault(token: string): string {
  return TYPOGRAPHY_HOOKS.find(v => v.name === token)?.default ?? '';
}

/**
 * Every text style the library ships, beside the token it reads and when to
 * reach for it.
 *
 * Values are read off the live page after render rather than typed here, so
 * the page cannot disagree with the stylesheet — and a theme that overrides a
 * token shows its own value.
 */
@Component({
  selector: 'ngwr-typography-styles-page',
  templateUrl: './styles.html',
  styleUrl: './styles.scss',
  imports: [NgTemplateOutlet, RouterLink, WrButton, WrTypography, DocPageComponent, DocSectionComponent],
})
export default class TypographyStylesPage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Resolved values keyed by variant or token, filled in after render. */
  protected readonly measured = signal<Readonly<Record<string, string>>>({});

  protected readonly overview = wrPath(ROUTES.guides, ROUTES.guides.typography, ROUTES.guides.typography.overview);

  protected readonly sample = 'Signals all the way down';
  protected readonly paragraph =
    'Invoices are emailed on the first of each month and stay available here for seven years after the account closes.';

  protected readonly styles: readonly StyleRow[] = [
    {
      variant: 'display',
      sample: 'Ship the form today',
      tokens: ['--wr-text-4xl', '--wr-leading-none', '--wr-font-weight-extrabold', '--wr-tracking-tight'],
      meaning: 'Landing hero headline. Grows with the viewport from 36px to 60px.',
    },
    {
      variant: 'h1',
      sample: 'Account settings',
      tokens: ['--wr-text-5xl', '--wr-leading-none', '--wr-font-weight-bold', '--wr-tracking-tight'],
      meaning: 'Page title — one per page.',
    },
    {
      variant: 'h2',
      sample: 'Billing',
      tokens: ['--wr-text-4xl', '--wr-text-4xl-leading', '--wr-font-weight-bold', '--wr-tracking-tight'],
      meaning: 'A major section of the page.',
    },
    {
      variant: 'h3',
      sample: 'Payment method',
      tokens: ['--wr-text-3xl', '--wr-text-3xl-leading', '--wr-font-weight-bold'],
      meaning: 'A subsection, or the title of a compact page.',
    },
    {
      variant: 'h4',
      sample: 'Card details',
      tokens: ['--wr-text-2xl', '--wr-text-2xl-leading', '--wr-font-weight-bold'],
      meaning: 'A section or card title inside a page.',
    },
    {
      variant: 'h5',
      sample: 'Billing address',
      tokens: ['--wr-text-xl', '--wr-text-xl-leading', '--wr-font-weight-bold'],
      meaning: 'A card or panel title in a dense layout.',
    },
    {
      variant: 'h6',
      sample: 'Tax ID',
      tokens: ['--wr-text-lg', '--wr-text-lg-leading', '--wr-font-weight-bold'],
      meaning: 'The smallest heading: a group, list or table title.',
    },
    {
      variant: 'lead',
      sample: 'Everything you need to start, nothing you have to remove later.',
      tokens: ['--wr-text-xl', '--wr-leading-relaxed', '--wr-font-weight-regular', '--wr-color-on-surface-muted'],
      meaning: 'The intro paragraph under a headline.',
    },
    {
      variant: 'body',
      sample: 'Invoices are emailed on the first of each month.',
      tokens: ['--wr-text-base', '--wr-leading-normal', '--wr-font-weight-regular'],
      meaning: 'Running text. The default when no variant is set.',
    },
    {
      variant: 'small',
      sample: 'Prices exclude VAT where it applies.',
      tokens: ['--wr-text-sm', '--wr-leading-normal'],
      meaning: 'Secondary notes, readouts and fine print.',
    },
    {
      variant: 'caption',
      sample: 'Updated 2 minutes ago',
      tokens: ['--wr-text-xs', '--wr-leading-normal', '--wr-color-on-surface-muted'],
      meaning: 'Helper text under a title, an image or a list item.',
    },
    {
      variant: 'overline',
      sample: 'Pricing',
      tokens: ['--wr-text-xs', '--wr-font-weight-semibold', '--wr-tracking-widest', '--wr-color-on-surface-muted'],
      meaning: 'An uppercase eyebrow above a heading.',
    },
    {
      variant: 'code',
      sample: 'ng add ngwr',
      tokens: ['--wr-font-family-mono', '--wr-color-fill-strong', '--wr-space-xs', '--wr-space-sm'],
      meaning: 'Inline code in a sentence: a command, an input, a file name.',
    },
    {
      variant: 'list',
      sample: '',
      tokens: ['--wr-text-base', '--wr-leading-normal', '--wr-color-on-surface-muted'],
      meaning: 'A plain ul, ol or dl — put it on the list element itself.',
    },
    {
      variant: 'link',
      sample: 'Read the typography overview',
      tokens: ['--wr-font-weight-medium', '--wr-color-primary-ink'],
      meaning: 'A link inside text. Always underlined, with a focus ring.',
    },
  ];

  protected readonly tones: readonly ToneRow[] = [
    {
      tone: 'base',
      sample: 'Invoices are sent monthly',
      token: '--wr-color-on-surface',
      meaning: 'Body ink. Brings a muted variant back to full strength.',
    },
    {
      tone: 'muted',
      sample: 'Updated 2 minutes ago',
      token: '--wr-color-on-surface-muted',
      meaning: 'Secondary text: subtitles, notes, metadata.',
    },
    {
      tone: 'primary',
      sample: 'Free for open source',
      token: '--wr-color-primary-ink',
      meaning: 'Brand emphasis: an eyebrow, a highlighted line.',
    },
    {
      tone: 'success',
      sample: 'Payment received',
      token: '--wr-color-success-ink',
      meaning: 'Something went right. The words still have to say what.',
    },
    {
      tone: 'warning',
      sample: 'Card expires in 3 days',
      token: '--wr-color-warning-ink',
      meaning: 'Something needs attention. The words still have to say what.',
    },
    {
      tone: 'danger',
      sample: 'Payment failed',
      token: '--wr-color-danger-ink',
      meaning: 'Something went wrong. The words still have to name it.',
    },
  ];

  protected readonly proseDefault = hookDefault;

  protected readonly prose: readonly ProseRow[] = [
    { token: '--wr-prose-body', sample: 'Paragraph text', meaning: 'Paragraphs and list items.' },
    { token: '--wr-prose-headings', sample: 'Heading', meaning: 'Headings h1 to h4 and table header labels.' },
    { token: '--wr-prose-lead', sample: 'Intro paragraph', meaning: 'An opening paragraph marked .wr-prose-lead.' },
    { token: '--wr-prose-bold', sample: 'Bold text', meaning: 'Strong text. Set it to the body colour for plain bold.' },
    { token: '--wr-prose-links', sample: 'Link', meaning: 'Links. Set it to give links your brand colour.' },
    { token: '--wr-prose-code', sample: 'inline code', meaning: 'Inline code. The chip behind it stays the fill colour.' },
    { token: '--wr-prose-bullets', sample: '● ● ●', meaning: 'Bullets of an unordered list.' },
    { token: '--wr-prose-counters', sample: '1. 2. 3.', meaning: 'Numbers of an ordered list.' },
    { token: '--wr-prose-quotes', sample: 'Quoted text', meaning: 'Blockquote text.' },
    { token: '--wr-prose-quote-borders', sample: '', line: true, meaning: 'The bar beside a blockquote.' },
    { token: '--wr-prose-captions', sample: 'Figure caption', meaning: 'Figure captions.' },
    { token: '--wr-prose-hr', sample: '', line: true, meaning: 'Horizontal rules between sections.' },
    { token: '--wr-prose-th-borders', sample: '', line: true, meaning: 'The rule under a table header.' },
    { token: '--wr-prose-td-borders', sample: '', line: true, meaning: 'The rules between table rows.' },
  ];

  protected readonly sizes: readonly TokenRow[] = [
    { token: '--wr-text-xs', utility: '.wr-text-xs', meaning: 'Badges, tags, tooltips, hints and small controls.' },
    { token: '--wr-text-sm', utility: '.wr-text-sm', meaning: 'Most UI text: controls, menus, tables, alerts, labels.' },
    { token: '--wr-text-base', utility: '.wr-text-base', meaning: 'Body copy, dialog and drawer content, large controls.' },
    { token: '--wr-text-lg', utility: '.wr-text-lg', meaning: 'Small titles: dialogs, drawers, h6.' },
    { token: '--wr-text-xl', utility: '.wr-text-xl', meaning: 'Lead paragraphs, h5, and values on a gauge or knob.' },
    { token: '--wr-text-2xl', utility: '.wr-text-2xl', meaning: 'Section titles and big numbers, h4.' },
    { token: '--wr-text-3xl', utility: '.wr-text-3xl', meaning: 'Page header titles, statistic values, h3.' },
    { token: '--wr-text-4xl', utility: '.wr-text-4xl', meaning: 'Large headings: h2 and the smallest display.' },
    { token: '--wr-text-5xl', utility: '.wr-text-5xl', meaning: 'Hero headlines: h1.' },
  ];

  protected readonly controls: readonly ControlRow[] = [
    {
      size: 'sm',
      token: '--wr-control-font-size-sm',
      leading: '--wr-control-line-height-sm',
      meaning: 'Text in small buttons, inputs, selects and tabs.',
    },
    {
      size: 'md',
      token: '--wr-control-font-size-md',
      leading: '--wr-control-line-height-md',
      meaning: 'Text in default buttons, inputs, selects and tabs.',
    },
    {
      size: 'lg',
      token: '--wr-control-font-size-lg',
      leading: '--wr-control-line-height-lg',
      meaning: 'Text in large buttons, inputs, selects and tabs.',
    },
  ];

  protected readonly hooks: readonly HookRow[] = TYPOGRAPHY_HOOKS.filter(v =>
    v.name.startsWith('--wr-typography-'),
  ).map(v => ({ token: v.name, value: v.default, meaning: HOOK_MEANINGS[v.name] ?? '' }));

  protected readonly weights: readonly TokenRow[] = [
    { token: '--wr-font-weight-thin', utility: '.wr-font-thin', meaning: 'Very large, quiet display text. No component uses it.' },
    { token: '--wr-font-weight-light', utility: '.wr-font-light', meaning: 'Large, quiet text. No component uses it.' },
    { token: '--wr-font-weight-regular', utility: '.wr-font-regular', meaning: 'Body text — the default.' },
    { token: '--wr-font-weight-medium', utility: '.wr-font-medium', meaning: 'Buttons, tabs, tags, labels and links.' },
    { token: '--wr-font-weight-semibold', utility: '.wr-font-semibold', meaning: 'Titles: dialogs, alerts, toasts, table headers.' },
    { token: '--wr-font-weight-bold', utility: '.wr-font-bold', meaning: 'Headings h1 to h6 and page titles.' },
    { token: '--wr-font-weight-extrabold', utility: '.wr-font-extrabold', meaning: 'Display headlines.' },
  ];

  protected readonly leading: readonly TokenRow[] = [
    { token: '--wr-leading-none', utility: '.wr-leading-none', meaning: 'One line that must sit tight: display, h1, keycaps.' },
    { token: '--wr-leading-tight', utility: '.wr-leading-tight', meaning: 'Headings and short helper lines.' },
    { token: '--wr-leading-snug', utility: '.wr-leading-snug', meaning: 'Compact one-line items: chips, anchor links.' },
    { token: '--wr-leading-normal', utility: '.wr-leading-normal', meaning: 'Body text — the default.' },
    { token: '--wr-leading-relaxed', utility: '.wr-leading-relaxed', meaning: 'Long reading: articles, markdown, lead paragraphs.' },
    { token: '--wr-leading-loose', utility: '.wr-leading-loose', meaning: 'Double spacing. No component uses it.' },
  ];

  protected readonly tracking: readonly TokenRow[] = [
    { token: '--wr-tracking-tighter', utility: '.wr-tracking-tighter', meaning: 'Very large display text. No component uses it.' },
    { token: '--wr-tracking-tight', utility: '.wr-tracking-tight', meaning: 'Big headings and large numbers.' },
    { token: '--wr-tracking-normal', utility: '.wr-tracking-normal', meaning: 'The default. Undoes a wider setting.' },
    { token: '--wr-tracking-wide', utility: '.wr-tracking-wide', meaning: 'Small labels and badges.' },
    { token: '--wr-tracking-wider', utility: '.wr-tracking-wider', meaning: 'Tiny labels, like calendar weekdays.' },
    { token: '--wr-tracking-widest', utility: '.wr-tracking-widest', meaning: 'Uppercase eyebrows — the overline variant.' },
  ];

  protected readonly families: readonly TokenRow[] = [
    { token: '--wr-font-family-base', utility: '.wr-font-base', meaning: "Every component's text. Set your typeface here." },
    { token: '--wr-font-family-mono', utility: '.wr-font-mono', meaning: 'Code, OTP digits, hex values — characters that line up.' },
  ];

  protected readonly breaking: readonly ClassRow[] = [
    { utility: '.wr-text-balance', meaning: 'Even line lengths for a heading that wraps.' },
    { utility: '.wr-text-pretty', meaning: 'No lone word on the last line of a paragraph.' },
    { utility: '.wr-truncate', meaning: 'One line, cut with an ellipsis.' },
  ];

  constructor() {
    afterNextRender(() => {
      const out: Record<string, string> = {};

      for (const el of this.host.nativeElement.querySelectorAll<HTMLElement>('[data-variant]')) {
        const target = el.firstElementChild ?? el;
        const cs = getComputedStyle(target);
        out[el.dataset['variant']!] = `${cs.fontSize} / ${cs.lineHeight} · ${cs.fontWeight}`;
      }

      for (const el of this.host.nativeElement.querySelectorAll<HTMLElement>('[data-token]')) {
        const token = el.dataset['token']!;
        const cs = getComputedStyle(el);
        const value = cs.getPropertyValue(token).trim();
        out[token] = token.startsWith('--wr-text-') ? `${value} · ${cs.fontSize} / ${cs.lineHeight}` : value;
      }

      this.measured.set(out);
    });
  }
}
