import { svgOnlyPage } from './svg-only-page';

export default svgOnlyPage({
  title: 'Bootstrap Icons',
  description: "The Bootstrap team's set. ~2000 icons. Both outline and filled variants. MIT.",
  install: 'pnpm add bootstrap-icons',
  homepage: 'https://icons.getbootstrap.com',
  imports: {
    bash: 'pnpm add bootstrap-icons',
    ts: `import plusSvg from 'bootstrap-icons/icons/plus.svg?raw';
import { svgIcon, provideWrIcons } from 'ngwr/icon';

provideWrIcons([svgIcon('plus', plusSvg)]);`,
  },
});
