import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Heroicons',
  description:
    "The Tailwind team's set. ~300 icons in 24px outline, 24px solid, 20px solid, and 16px solid variants. MIT.",
  install: 'pnpm add heroicons',
  homepage: 'https://heroicons.com',
  imports: {
    bash: 'pnpm add heroicons',
    ts: `// Variants: 24/outline, 24/solid, 20/solid, 16/solid.
import plusSvg from 'heroicons/24/outline/plus.svg?raw';
import trashSvg from 'heroicons/24/solid/trash.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg), svgIcon('trash', trashSvg)]);`,
  },
});
