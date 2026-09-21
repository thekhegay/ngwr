/**
 * @license
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/thekhegay/ngwr/blob/main/LICENSE
 */

import type { WrEditorCommandTool } from './commands';

/**
 * Toolbar glyphs as path data, drawn inline so the editor needs no
 * `provideWrIcons()` — the same reason `<wr-textarea>` inlines its grip.
 *
 * Lucide's (ISC), on its 24-unit grid with a 2-unit stroke; `line` elements are
 * rewritten as the equivalent paths so one `<path>` loop draws every icon.
 */
export const TOOL_ICONS: Readonly<Record<WrEditorCommandTool, readonly string[]>> = {
  bold: ['M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'],
  italic: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'],
  underline: ['M6 4v6a6 6 0 0 0 12 0V4', 'M4 20h16'],
  strike: ['M16 4H9a3 3 0 0 0-2.83 4', 'M14 12a4 4 0 0 1 0 8H6', 'M4 12h16'],
  code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
  paragraph: ['M13 4v16', 'M17 4v16', 'M19 4H9.5a4.5 4.5 0 0 0 0 9H13'],
  heading1: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'm17 12 3-2v8'],
  heading2: ['M4 12h8', 'M4 18V6', 'M12 18V6', 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1'],
  heading3: [
    'M4 12h8',
    'M4 18V6',
    'M12 18V6',
    'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2',
    'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2',
  ],
  bulletList: ['M3 5h.01', 'M3 12h.01', 'M3 19h.01', 'M8 5h13', 'M8 12h13', 'M8 19h13'],
  orderedList: [
    'M11 5h10',
    'M11 12h10',
    'M11 19h10',
    'M4 4h1v5',
    'M4 9h2',
    'M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02',
  ],
  blockquote: ['M17 5H3', 'M21 12H8', 'M21 19H8', 'M3 12v7'],
  codeBlock: [
    'm10 9-3 3 3 3',
    'm14 15 3-3-3-3',
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  ],
  link: [
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  ],
  horizontalRule: ['M5 12h14'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11'],
  redo: ['m15 14 5-5-5-5', 'M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13'],
};
