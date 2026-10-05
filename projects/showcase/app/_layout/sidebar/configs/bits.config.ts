import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/bits/*` — animated UI effects. Mix of in-house ngwr
 * components and reactbits.dev ports. Per-page attribution lives on each
 * port page via `<ngwr-reactbits-credit>` so the nav stays uncluttered.
 *
 * Grouped by what the animation attaches to: text, block-level containers,
 * pointer/scroll effects, and full-bleed backgrounds.
 */
export const BITS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Backgrounds',
    children: [
      { title: 'Aurora', url: ['/bits', 'aurora'] },
      { title: 'Waves', url: ['/bits', 'waves'] },
    ],
  },
  {
    title: 'Blocks',
    children: [
      { title: 'Border Glow', url: ['/bits', 'border-glow'] },
      { title: 'Marquee', url: ['/bits', 'marquee'] },
      { title: 'Spotlight Card', url: ['/bits', 'spotlight-card'] },
      { title: 'Star Border', url: ['/bits', 'star-border'] },
      { title: 'Tilt Card', url: ['/bits', 'tilt-card'] },
    ],
  },
  {
    title: 'Effects',
    children: [
      { title: 'Click Spark', url: ['/bits', 'click-spark'] },
      { title: 'Confetti', url: ['/bits', 'confetti'] },
      { title: 'Splash Cursor', url: ['/bits', 'splash-cursor'] },
    ],
  },
  {
    title: 'Text',
    children: [
      { title: 'Blur Text', url: ['/bits', 'blur-text'] },
      { title: 'Circular Text', url: ['/bits', 'circular-text'] },
      { title: 'Decrypt Text', url: ['/bits', 'decrypt-text'] },
      { title: 'Falling Text', url: ['/bits', 'falling-text'] },
      { title: 'Fuzzy Text', url: ['/bits', 'fuzzy-text'] },
      { title: 'Glitch Text', url: ['/bits', 'glitch-text'] },
      { title: 'Gradient Text', url: ['/bits', 'gradient-text'] },
      { title: 'Rotating Text', url: ['/bits', 'rotating-text'] },
      { title: 'Shiny Text', url: ['/bits', 'shiny-text'] },
      { title: 'Split Text', url: ['/bits', 'split-text'] },
      { title: 'Typewriter', url: ['/bits', 'typewriter'] },
    ],
  },
];
