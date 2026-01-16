
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
  amount: number;
  currency: string;
  item: string; // Display name (e.g., "25kg Sugar")
  baseItem: string; // Canonical name (e.g., "Sugar") for inventory matching
  category: Category;
  type: TransactionType;
  quantity?: number;
  unitPrice?: number;
  unit?: string; // e.g., "kg", "bag", "tray"
  originalMessage: string;
  source: 'SMS' | 'Voice' | 'M-Pesa' | 'Manual' | 'Receipt Scan';
  tags?: string[];
}

export interface UserSettings {
  shopName: string;
  location: string;
  preferredLanguage: 'English' | 'Swahili' | 'Sheng';
  aiDataConsent: boolean;
  pinEnabled: boolean;
  pinCode?: string;
}

export interface ParsingResult {
  status: 'complete' | 'incomplete' | 'error';
  transaction?: Partial<Transaction>;
  transactions?: Partial<Transaction>[];
  followUpQuestion?: string;
  suggestedUnitPrice?: number;
  purchasePrice?: number; // Added to track cost basis for inventory items
  insight?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'pending' | 'completed' | 'error' | 'clarification';
  transactionId?: string;
  audioData?: string;
  imageContent?: string;
}
