
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum Category {
  INVENTORY = 'Inventory',
  RENT = 'Rent',
  TRANSPORT = 'Transport',
  FOOD = 'Food',
  SALES = 'Sales',
  OTHER = 'Other',
  CREDIT = 'Credit'
}

export interface Transaction {
  id: string;
  timestamp: number;
  amount: number; // Total amount
  currency: string;
  item: string;
  category: Category;
  type: TransactionType;
  quantity?: number;
  unitPrice?: number; // Price per item
  originalMessage: string;
  source: 'SMS' | 'Voice' | 'M-Pesa' | 'Manual';
  tags?: string[];
}

export interface BusinessSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  inventoryValue: number;
  topItem: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'pending' | 'completed' | 'error';
  transactionId?: string;
}
