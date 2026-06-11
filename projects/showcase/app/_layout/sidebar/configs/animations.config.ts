import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/animations/*` — animated UI effects. Mix of in-house ngwr
 * components and reactbits.dev ports. Per-page attribution lives on each
 * port page via `<ngwr-reactbits-credit>` so the nav stays uncluttered.
 *
 * Grouped by what the animation attaches to: text, block-level containers,
 * pointer/scroll effects, and full-bleed backgrounds.
 */
export const ANIMATIONS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Text',
    children: [
      { title: 'Split Text', url: ['/animations', 'split-text'] },
      { title: 'Blur Text', url: ['/animations', 'blur-text'] },
      { title: 'Shiny Text', url: ['/animations', 'shiny-text'] },
      { title: 'Gradient Text', url: ['/animations', 'gradient-text'] },
      { title: 'Rotating Text', url: ['/animations', 'rotating-text'] },
      { title: 'Typewriter', url: ['/animations', 'typewriter'] },
      { title: 'Scramble Text', url: ['/animations', 'scramble-text'] },
      { title: 'Decrypt Text', url: ['/animations', 'decrypt-text'] },
      { title: 'Glitch Text', url: ['/animations', 'glitch-text'] },
      { title: 'Fuzzy Text', url: ['/animations', 'fuzzy-text'] },
      { title: 'Falling Text', url: ['/animations', 'falling-text'] },
      { title: 'Circular Text', url: ['/animations', 'circular-text'] },
    ],
  },
  {
    title: 'Blocks',
    children: [
      { title: 'Border Glow', url: ['/animations', 'border-glow'] },
      { title: 'Spotlight Card', url: ['/animations', 'spotlight-card'] },
      { title: 'Tilt Card', url: ['/animations', 'tilt-card'] },
      { title: 'Star Border', url: ['/animations', 'star-border'] },
      { title: 'Marquee', url: ['/animations', 'marquee'] },
    ],
  },
  {
    title: 'Effects',
    children: [
      { title: 'Click Spark', url: ['/animations', 'click-spark'] },
      { title: 'Splash Cursor', url: ['/animations', 'splash-cursor'] },
      { title: 'Confetti', url: ['/animations', 'confetti'] },
      { title: 'Reveal', url: ['/animations', 'reveal'] },
    ],
  },
  {
    title: 'Backgrounds',
    children: [
      { title: 'Aurora', url: ['/animations', 'aurora'] },
      { title: 'Waves', url: ['/animations', 'waves'] },
    ],
  },
];
