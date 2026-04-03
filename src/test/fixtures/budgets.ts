// Raw string[][] matching the BudgetItemized sheet schema.
// Headers must match the column names parseRows() looks up (case-insensitive).
export const BUDGETS_FIXTURE: string[][] = [
  ['Code', 'Category', 'Budget', 'Type', 'Budget to Date', 'Used', 'Remaining', 'Usage %'],
  ['Expense:Groceries', 'Living', '500', 'Monthly', '250', '200', '300', '40'],
  ['Expense:Utilities', 'Living', '150', 'Monthly', '75', '60', '90', '40'],
  ['Expense:Dining', 'Leisure', '200', 'Monthly', '100', '120', '80', '60'],
  ['Inflow:Salary', 'Income', '3000', 'Monthly', '1500', '1500', '-1500', '100'],
]
