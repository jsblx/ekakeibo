interface SheetConfig {
  sheetId: string
  tabs: {
    budgets: string
    itemization: string
    categories: string
    notes: string
  }
  budgetColumns: {
    item: number
    category: number
    budget: number
    type: number
    budgetToDate: number
    used: number
    remaining: number
    usagePct: number
  }
}

export const SHEET_CONFIG: SheetConfig = {
  sheetId: import.meta.env.VITE_SHEET_ID,
  tabs: {
    budgets: 'BudgetItemized',
    itemization: 'Itemization',
    categories: 'Categories',
    notes: 'Notes',
  },
  budgetColumns: {
    item: 0,
    category: 1,
    budget: 2,
    type: 3,
    budgetToDate: 4,
    used: 5,
    remaining: 6,
    usagePct: 7,
  },
}
