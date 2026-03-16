export function getMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function getNextMonthResetIso(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const next = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return next.toISOString();
}
