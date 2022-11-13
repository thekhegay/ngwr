export function processLog(message: string): void {
  console.info('\x1b[36m%s\x1b[0m', message);
}

export function errorLog(message: string): void {
  console.info('\x1B[31m%s\x1B[0m', message);
}

export function successLog(message: string): void {
  console.info('\x1B[32m%s\x1B[0m', message);
}

export function infoLog(message: string): void {
  console.info('\x1B[34m%s\x1B[0m', message);
}

export function titleLog(message: string): void {
  console.info('\x1b[35m', message);
}
