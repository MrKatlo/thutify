export function formatMoney(amount: number, currency = 'BWP', locale?: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(locale)}`;
  }
}
