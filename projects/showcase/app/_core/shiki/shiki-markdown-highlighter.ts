/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrHighlightSpan, WrMarkdownHighlighter } from 'ngwr/markdown';
import type { ThemedToken } from 'shiki/core';

import { getHighlighter } from './shiki-highlighter';
import type { ShikiLang } from './shiki-lang';

/**
 * Fence info strings this app can colour, mapped to a grammar the shared
 * highlighter has loaded.
 *
 * A lookup rather than a pass-through: the info string comes out of the rendered
 * document, so `wr-markdown` hands over whatever the author typed — and shiki
 * THROWS on a grammar it does not have. An unknown language has to answer `null`
 * (plain text) instead, which is also the honest answer for the languages this
 * site never loads.
 */
const LANGUAGES: Readonly<Record<string, ShikiLang>> = {
  bash: 'bash',
  diff: 'diff',
  html: 'html',
  markdown: 'markdown',
  md: 'markdown',
  patch: 'diff',
  scss: 'scss',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  typescript: 'typescript',
  zsh: 'bash',
};

/**
 * Both palettes in ONE colour value.
 *
 * `WrMarkdownHighlighter` is `(code, language) => spans` — there is no theme
 * dimension in the signature, and the library caches an answer under
 * `(language, code)`, so a highlighter that resolved a hex per theme would keep
 * serving the palette that was current when the block first rendered. `shiki`'s
 * `defaultColor: 'light-dark()'` sidesteps the problem by making the colour
 * itself theme-aware: `light-dark(#A0111F, #FF9492)` is resolved by the browser
 * against the `color-scheme` the theme layer already sets on `:root`
 * (`light` in `_colors.scss`, `dark` in `_dark.scss`), so one cached span is
 * correct in both themes and a theme flip needs no re-highlight at all.
 *
 * Where `light-dark()` is unsupported the declaration is simply dropped and the
 * span inherits the code block's own colour — the same result as no highlighter.
 */
const THEMES = { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } as const;

/** Shiki's per-theme font styles, narrowed to the one field a span carries. */
function fontStyleOf(style: Readonly<Record<string, string>> | undefined): WrHighlightSpan['fontStyle'] {
  if (!style) return undefined;
  if (style['font-style'] === 'italic') return 'italic';
  if (style['font-weight'] === 'bold') return 'bold';
  if (style['text-decoration']?.includes('underline')) return 'underline';

  return undefined;
}

function spanOf(token: ThemedToken): WrHighlightSpan {
  return {
    text: token.content,
    // `htmlStyle` is where the dual-theme merge puts the colour; `color` is what
    // a single-theme run would fill in. Reading both keeps this honest if the
    // theme list above ever drops to one.
    color: token.htmlStyle?.['color'] ?? token.color,
    fontStyle: fontStyleOf(token.htmlStyle),
  };
}

/**
 * This app's `<wr-markdown>` highlighter — shiki tokens as coloured spans.
 *
 * Spans, not HTML, is the whole point of the contract: `wr-markdown` renders
 * each one as a real element with a bound `[style.color]`, so a highlighted code
 * block inside an untrusted document is still never parsed as HTML and the CSP
 * story survives. Wire it up once, in `app.config.ts`:
 *
 * ```ts
 * provideWrMarkdownHighlighter(shikiMarkdownHighlighter);
 * ```
 *
 * Lazy twice over. The shiki bundle is behind {@link getHighlighter}'s dynamic
 * imports, so a route with no code block never downloads a grammar; and the
 * prerender pass answers `null` without touching it, because the showcase
 * renders every route in Node, where nothing is waiting for colour — the promise
 * would resolve after the HTML was already written. The prerendered page ships
 * plain text and gains colour on hydration, which is exactly what
 * `provideWrMarkdownHighlighter` documents for the async case.
 */
export const shikiMarkdownHighlighter: WrMarkdownHighlighter = async (code, language) => {
  const lang = language ? LANGUAGES[language.toLowerCase()] : undefined;
  if (!lang || typeof window === 'undefined') return null;

  const highlighter = await getHighlighter();
  const { tokens } = highlighter.codeToTokens(code, {
    lang,
    themes: THEMES,
    defaultColor: 'light-dark()',
    // Nothing reads the `--shiki-*` variables here, and an unused custom
    // property per span is a lot of custom properties on a long document.
    colorsRendering: 'none',
  });

  return tokens.map(line => line.map(spanOf));
};
