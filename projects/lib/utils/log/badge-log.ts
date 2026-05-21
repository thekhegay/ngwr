export function badgeLog(badgeText: string, color: string, message: unknown): void {
  const o = `
    display: inline-block;
    border: 1px solid ${color};
    color: ${color};
    padding: 1px 3px;
    border-radius: 4px;
    margin-right: 0
  `;
  // eslint-disable-next-line no-console -- this helper exists to log
  console.log(`%c${badgeText}`, o, message);
}
