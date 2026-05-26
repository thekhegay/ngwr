import type { SidebarGroup } from '../sidebar.types';

/**
 * Sidebar for `/animations/*` — animated UI effects. Mix of in-house ngwr
 * components and reactbits.dev ports. Per-page attribution lives on each
 * port page via `<ngwr-reactbits-credit>` so the nav stays uncluttered.
 */
export const ANIMATIONS_SIDEBAR: readonly SidebarGroup[] = [
  {
    title: 'Animations',
    children: [
      { title: 'Motion (Web Animations)', url: ['/animations', 'motion'] },
      { title: 'Border Glow', url: ['/animations', 'border-glow'] },
      { title: 'Aurora', url: ['/animations', 'aurora'] },
      { title: 'Marquee', url: ['/animations', 'marquee'] },
      { title: 'Animated Text', url: ['/animations', 'animated-text'] },
      { title: 'Confetti', url: ['/animations', 'confetti'] },
      { title: 'Reveal', url: ['/animations', 'reveal'] },
      { title: 'Shimmer', url: ['/animations', 'shimmer'] },
      { title: 'Spotlight', url: ['/animations', 'spotlight'] },
      { title: 'Tilt', url: ['/animations', 'tilt'] },
      { title: 'Spotlight Card', url: ['/animations', 'spotlight-card'] },
      { title: 'Logo Loop', url: ['/animations', 'logo-loop'] },
      { title: 'Click Spark', url: ['/animations', 'click-spark'] },
      { title: 'Split Text', url: ['/animations', 'split-text'] },
      { title: 'Blur Text', url: ['/animations', 'blur-text'] },
      { title: 'Shiny Text', url: ['/animations', 'shiny-text'] },
      { title: 'Gradient Text', url: ['/animations', 'gradient-text'] },
      { title: 'Rotating Text', url: ['/animations', 'rotating-text'] },
      { title: 'Typewriter', url: ['/animations', 'typewriter'], disabled: true },
      { title: 'Scramble Text', url: ['/animations', 'scramble-text'], disabled: true },
      { title: 'Decrypt Text', url: ['/animations', 'decrypt-text'], disabled: true },
      { title: 'Glitch Text', url: ['/animations', 'glitch-text'], disabled: true },
      { title: 'Fuzzy Text', url: ['/animations', 'fuzzy-text'], disabled: true },
      { title: 'Falling Text', url: ['/animations', 'falling-text'], disabled: true },
      { title: 'Circular Text', url: ['/animations', 'circular-text'], disabled: true },
      { title: 'Count Up Text', url: ['/animations', 'count-up-text'], disabled: true },
    ],
  },
];
