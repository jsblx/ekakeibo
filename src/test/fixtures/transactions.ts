// Raw string[][] matching the Itemization sheet schema.
// Headers must match the column names parseTransactions() looks up (case-insensitive).
export const ITEMIZATION_FIXTURE: string[][] = [
  ['Date', 'Description', 'Amount', 'Account', 'Code'],
  ['2026-03-15', 'WHOLE FOODS MARKET', '-45.67', 'Checking', 'Expense:Groceries'],
  ['2026-03-10', 'ELECTRIC COMPANY', '-89.50', 'Checking', 'Expense:Utilities'],
  ['2026-03-08', 'NOBU RESTAURANT', '-120.00', 'Checking', 'Expense:Dining'],
  ['2026-03-01', 'PAYROLL DEPOSIT', '3000.00', 'Checking', 'Inflow:Salary'],
]
