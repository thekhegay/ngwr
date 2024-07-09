import { argv as nodeArgv } from 'node:process';

export function getArgv<T extends string>(flag: string, fallback: T): T {
  const args: string[] = nodeArgv.filter(a => a.startsWith('--'));
  const argv = args.find(a => a === flag || a.split('=')[0] === flag);

  if (!argv) {
    return fallback;
  }

  const value = argv.split('=');

  if (value.length === 1) {
    return 'true' as T;
  }

  return value[1] as T;
}
