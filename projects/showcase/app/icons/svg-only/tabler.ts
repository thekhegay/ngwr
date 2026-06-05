import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Tabler',
  description: 'A 24px stroke set with ~5000 icons + filled variants. MIT.',
  install: 'pnpm add @tabler/icons',
  homepage: 'https://tabler.io/icons',
  imports: {
    bash: 'pnpm add @tabler/icons',
    ts: `import plusSvg from '@tabler/icons/icons/outline/plus.svg?raw';
import trashSvg from '@tabler/icons/icons/outline/trash.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg), svgIcon('trash', trashSvg)]);`,
  },
});
