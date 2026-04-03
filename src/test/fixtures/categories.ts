// Raw string[][] matching the Categories sheet schema.
// Used by parseCategoryMap() and parseItemMap() in Transactions.tsx.
export const CATEGORIES_FIXTURE: string[][] = [
  ['Code', 'Category', 'Item'],
  ['Expense:Groceries', 'Living', 'Groceries'],
  ['Expense:Utilities', 'Living', 'Utilities'],
  ['Expense:Dining', 'Leisure', 'Dining'],
  ['Inflow:Salary', 'Income', 'Salary'],
]
