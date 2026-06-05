import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Iconoir',
  description: 'A free 24px stroke set with ~1500 hand-crafted icons. MIT.',
  install: 'pnpm add iconoir',
  homepage: 'https://iconoir.com',
  imports: {
    bash: 'pnpm add iconoir',
    ts: `import plusSvg from 'iconoir/icons/regular/plus.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg)]);`,
  },
});
