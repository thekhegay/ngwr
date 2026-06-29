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
    title: 'Backgrounds',
    children: [
      { title: 'Aurora', url: ['/animations', 'aurora'] },
      { title: 'Waves', url: ['/animations', 'waves'] },
    ],
  },
  {
    title: 'Blocks',
    children: [
      { title: 'Border Glow', url: ['/animations', 'border-glow'] },
      { title: 'Marquee', url: ['/animations', 'marquee'] },
      { title: 'Spotlight Card', url: ['/animations', 'spotlight-card'] },
      { title: 'Star Border', url: ['/animations', 'star-border'] },
      { title: 'Tilt Card', url: ['/animations', 'tilt-card'] },
    ],
  },
  {
    title: 'Effects',
    children: [
      { title: 'Click Spark', url: ['/animations', 'click-spark'] },
      { title: 'Confetti', url: ['/animations', 'confetti'] },
      { title: 'Reveal', url: ['/animations', 'reveal'] },
      { title: 'Splash Cursor', url: ['/animations', 'splash-cursor'] },
    ],
  },
  {
    title: 'Text',
    children: [
      { title: 'Blur Text', url: ['/animations', 'blur-text'] },
      { title: 'Circular Text', url: ['/animations', 'circular-text'] },
      { title: 'Decrypt Text', url: ['/animations', 'decrypt-text'] },
      { title: 'Falling Text', url: ['/animations', 'falling-text'] },
      { title: 'Fuzzy Text', url: ['/animations', 'fuzzy-text'] },
      { title: 'Glitch Text', url: ['/animations', 'glitch-text'] },
      { title: 'Gradient Text', url: ['/animations', 'gradient-text'] },
      { title: 'Rotating Text', url: ['/animations', 'rotating-text'] },
      { title: 'Scramble Text', url: ['/animations', 'scramble-text'] },
      { title: 'Shiny Text', url: ['/animations', 'shiny-text'] },
      { title: 'Split Text', url: ['/animations', 'split-text'] },
      { title: 'Typewriter', url: ['/animations', 'typewriter'] },
    ],
  },
];
