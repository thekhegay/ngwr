import * as fs from 'fs';
import * as sass from 'sass';
import postcss from 'postcss';
const autoprefixer = require('autoprefixer');
import * as cssnano from 'cssnano';

async function compileGlobStyles(): Promise<void> {
  const css = sass.compile('lib/styles/index.scss');
  const result = await postcss([autoprefixer, cssnano]).process(css.css, { from: undefined });
  fs.writeFile('dist/styles.css', result.css, () => true);
}

compileGlobStyles()
  .then(() => console.log('Done.'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
