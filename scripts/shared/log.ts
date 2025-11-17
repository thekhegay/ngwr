import chalk from 'chalk';

interface LogOptions {
  message: string;
  bg?: boolean;
  break?: boolean;
}

const prefix = chalk.dim('ngwr:');

function br(is?: boolean): void {
  if (is) {
    console.log('');
  }
}

export function logInfo(options: LogOptions): void {
  const _message = options.bg ? chalk.bgCyan(options.message) : chalk.white(options.message);
  console.log(prefix, chalk.cyan('→'), _message);
  br(options.break);
}

export function logSuccess(options: LogOptions): void {
  const _message = options.bg ? chalk.bgGreen(options.message) : chalk.white(options.message);
  console.log(prefix, chalk.green('✔'), _message);
  br(options.break);
}

export function logWarning(options: LogOptions): void {
  const _message = options.bg ? chalk.bgYellow(options.message) : chalk.yellow(options.message);
  console.log(prefix, chalk.yellow(_message));
  br(options.break);
}

export function logError(options: LogOptions): void {
  const _message = options.bg ? chalk.bgRed(options.message) : chalk.red(options.message);
  console.log(prefix, chalk.bgRed(_message));
  br(options.break);
}
