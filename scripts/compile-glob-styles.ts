/* eslint-disable */
import * as fs from 'fs';
import * as sass from 'sass';
import postcss from 'postcss';
const autoprefixer = require('autoprefixer');
import * as cssnano from 'cssnano';
/* eslint-enable */

async function compileGlobStyles(): Promise<void> {
  const css = sass.compile('lib/styles.scss');
  const result = await postcss([autoprefixer, cssnano]).process(css.css, { from: undefined });
  fs.writeFile('dist/ngwr.min.css', result.css, () => true);
}

compileGlobStyles()
  .then(() => console.log('Done.'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
