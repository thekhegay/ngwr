import { argv } from 'process';

import { processLog } from './colored-log';

export function getValueByFlag<T extends string>(flag: string, fallback: T): T {
  const index = findIndexFlag(flag);

  if (index === -1) {
    return fallback;
  }

  const [parsedFlag, parsedValue] = argv[index].split(`=`) ?? [];
  const value =
    stringifier(parsedValue) ?? (argv[index + 1].startsWith(`-`) ? fallback : stringifier(argv[index + 1]) ?? fallback);

  processLog(`parsed flags: \n${[parsedFlag, value].join(`=`)}`);

  return value as T;
}

export function hasFlag(flag: string): boolean {
  return findIndexFlag(flag) !== -1;
}

export function findIndexFlag(flag: string): number {
  return argv.findIndex(arg => arg === flag || arg.split(`=`)[0] === flag);
}

export function stringifier(value?: string): string | undefined {
  return value === `undefined` || value === `null` ? undefined : value;
}
