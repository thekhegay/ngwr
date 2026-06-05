import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Radix',
  description: 'Vercel / Linear-style 15px optical-size icons. ~300 icons. MIT.',
  install: 'pnpm add @radix-ui/react-icons',
  homepage: 'https://www.radix-ui.com/icons',
  imports: {
    bash: '# Use the SVG-only fork for non-React apps:\npnpm add @radix-ui/icons',
    ts: `import plusSvg from '@radix-ui/icons/dist/icons/plus.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg)]);`,
  },
});
