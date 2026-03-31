export const formatCurrency = (value: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export const parseNumber = (val: unknown): number =>
  parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0
