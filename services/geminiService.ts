import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Category, ParsingResult, PaymentMethod, TradeUnit } from "../types";

const UNIT_CONVERSIONS = `
Standard Nairobi Trade Conversion Rules (MANDATORY SMALLEST UNIT BREAKDOWN):
1. EGGS: 1 Tray = 30 PCS. If someone says "1 Tray @ 600", record as 30 PCS @ 20.
2. MILK: 1 Crate = 12 PCS.
3. BREAD: 1 Bale = 20 PCS.
4. SUGAR/RICE: Always convert Bags to KG (1 Bag = 50KG, Small Bag = 25KG). If "1 Bag 50kg @ 5000", record as 50 KG @ 100.
`;

const DUPLICATE_CHECK_INSTRUCTION = `
DUPLICATE DETECTION RULES:
- Compare the current items against the provided "Recent History".
- If an item has the SAME name, quantity, and approximate price as a record from the LAST 24 HOURS, flag it as a duplicate.
`;

export const parseTransactionMessage = async (message: string, history: Transaction[] = []): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentHistory = history.filter(t => (Date.now() - t.timestamp) < 86400000);
  const historyContext = recentHistory.map(t => 
    `${t.type}: ${t.quantity} ${t.unit} of ${t.item} at ${t.unitPrice} KES`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse: "${message}". 
    Recent History: ${historyContext || 'None.'}
    ${UNIT_CONVERSIONS}
    ${DUPLICATE_CHECK_INSTRUCTION}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['complete', 'incomplete', 'error'] },
          followUpQuestion: { type: Type.STRING },
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                totalAmount: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER, description: "Calculated unit price (Total / Quantity)" },
                costPrice: { type: Type.NUMBER, description: "Buying price per smallest unit" },
                sellingPrice: { type: Type.NUMBER, description: "Intended selling price per smallest unit" },
                quantity: { type: Type.NUMBER, description: "Total quantity in smallest units" },
                item: { type: Type.STRING },
                isAlreadyLogged: { type: Type.BOOLEAN },
                originalSnippet: { type: Type.STRING },
                baseItem: { type: Type.STRING },
                unit: { type: Type.STRING, enum: ['PCS', 'KG', 'LITRE'] },
                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                paymentMethod: { type: Type.STRING, enum: ['Cash', 'M-Pesa', 'Bank', 'Credit'] }
              }
            }
          }
        },
        required: ["status"]
      },
      systemInstruction: "Expert Trade Auditor. Break down all bulk items into smallest units. If a total is given, calculate the unit price automatically (unitPrice = totalAmount / quantity)."
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    if (data.status === 'complete' && data.transactions) {
      return {
        status: data.status,
        transactions: data.transactions.map((t: any) => ({
          amount: t.totalAmount || (t.quantity * t.unitPrice),
          unitPrice: t.unitPrice || (t.totalAmount / (t.quantity || 1)),
          costPrice: t.costPrice || (t.type === 'Expense' ? (t.unitPrice || t.totalAmount / (t.quantity || 1)) : undefined),
          sellingPrice: t.sellingPrice || (t.type === 'Income' ? (t.unitPrice || t.totalAmount / (t.quantity || 1)) : undefined),
          quantity: t.quantity,
          currency: 'KES',
          item: t.item,
          baseItem: t.baseItem || t.item.toUpperCase(),
          unit: t.unit || TradeUnit.PIECE,
          isDuplicate: t.isAlreadyLogged,
          paymentMethod: (t.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          category: t.type === 'Income' ? Category.SALES : Category.INVENTORY,
          type: t.type as TransactionType,
          originalMessage: t.originalSnippet || message,
          source: 'SMS'
        }))
      };
    }
    return { status: data.status, followUpQuestion: data.followUpQuestion };
  } catch (e) {
    return { status: 'error' };
  }
};

export const parseReceiptFile = async (base64Data: string, mimeType: string, history: Transaction[] = []): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Clean = base64Data.split(',')[1] || base64Data;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Clean } },
        { text: `Scan receipt. Break down bulk items (crates/bags) into smallest units (PCS, KG). If the receipt shows a total and quantity but not a unit price, calculate it: unitPrice = line_total / quantity.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                isAlreadyLogged: { type: Type.BOOLEAN },
                originalSnippet: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                unitPrice: { type: Type.NUMBER },
                costPrice: { type: Type.NUMBER },
                sellingPrice: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING, enum: ['PCS', 'KG', 'LITRE'] }
              }
            }
          }
        }
      },
      systemInstruction: "Retail Specialist. Extract products from receipt. Always breakdown crates/bags into PCS/KG. Calculate the buying unit price (costPrice) for inventory and selling price for sales. If unit price isn't explicitly listed but a total is, divide total by quantity."
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      status: 'complete',
      transactions: (data.transactions || []).map((t: any) => ({
        ...t,
        amount: t.unitPrice * (t.quantity || 1),
        isDuplicate: t.isAlreadyLogged,
        currency: 'KES',
        paymentMethod: PaymentMethod.CASH,
        category: t.type === 'Income' ? Category.SALES : Category.INVENTORY,
        type: t.type as TransactionType,
        baseItem: (t.item || "Unknown").toUpperCase(),
        originalMessage: t.originalSnippet || "Receipt Scan",
        unit: t.unit || TradeUnit.PIECE
      }))
    };
  } catch (e) {
    return { status: 'error' };
  }
};

export const generateInsights = async (transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = transactions.slice(0, 30).map(t => `${t.type}: ${t.amount} for ${t.item}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze: \n${summary}`,
    config: {
      systemInstruction: "Market Coach. Focus on margins, stock levels, and unit pricing tips for a Nairobi trader."
    }
  });
  return response.text || "Keep trading.";
};