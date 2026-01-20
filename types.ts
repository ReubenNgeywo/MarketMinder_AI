
export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum PaymentMethod {
  CASH = 'Cash',
  MPESA = 'M-Pesa',
  BANK = 'Bank',
  CREDIT = 'Credit'
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

export enum TradeUnit {
  PIECE = 'PCS',
  KG = 'KG',
  TRAY = 'TRAY',
  BALE = 'BALE',
  BAG = 'BAG',
  LITRE = 'LITRE'
}

export interface Transaction {
  id: string;
  timestamp: number;
  amount: number;
  currency: string;
  item: string; 
  baseItem: string; 
  category: Category;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  supplier?: string;
  runningBalance?: number; 
  quantity?: number;
  unitPrice?: number; // The actual price used in this specific transaction
  costPrice?: number; // The buying price per unit (COGS)
  sellingPrice?: number; // The target selling price per unit
  unit?: string | TradeUnit; 
  originalMessage: string;
  source: 'SMS' | 'Voice' | 'M-Pesa' | 'Manual' | 'Receipt Scan';
  tags?: string[];
  isDuplicate?: boolean;
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
  purchasePrice?: number; 
  insight?: string;
  potentialDuplicatesFound?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'pending' | 'completed' | 'error' | 'clarification';
  transactionId?: string;
  audioData?: string;
  fileContent?: string; // Base64 data
  fileMimeType?: string; 
  fileName?: string;
}
