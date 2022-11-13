import { execSync } from 'child_process';

(async function main(): Promise<void> {
  execSync(`svg-to-ts-constants`, { stdio: `inherit` });
  execSync(`ng build ngwr`, { stdio: `inherit` });
})();
