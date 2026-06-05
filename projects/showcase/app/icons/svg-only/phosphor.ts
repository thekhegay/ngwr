import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Phosphor',
  description:
    'A flexible 6-weight icon family. ~1500 icons × 6 weights (thin / light / regular / bold / fill / duotone). MIT.',
  install: 'pnpm add @phosphor-icons/core',
  homepage: 'https://phosphoricons.com',
  imports: {
    bash: 'pnpm add @phosphor-icons/core',
    ts: `// Pick a weight: regular / thin / light / bold / fill / duotone.
import plusSvg from '@phosphor-icons/core/assets/regular/plus.svg?raw';
import trashSvg from '@phosphor-icons/core/assets/bold/trash.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg), svgIcon('trash', trashSvg)]);`,
  },
});
