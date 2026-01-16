
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Category } from "../types";

export const parseTransactionMessage = async (message: string): Promise<Partial<Transaction> | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract transaction details from this message: "${message}". The trader is in a Nairobi market. Focus on bulk pricing if mentioned (e.g. "at 500 each").`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalAmount: { type: Type.NUMBER, description: "The total numeric value of the transaction" },
          unitPrice: { type: Type.NUMBER, description: "The price per single item if mentioned" },
          quantity: { type: Type.NUMBER, description: "The number of items" },
          currency: { type: Type.STRING, description: "Currency code (default KES)" },
          item: { type: Type.STRING, description: "Item name" },
          category: { 
            type: Type.STRING, 
            enum: ['Inventory', 'Rent', 'Transport', 'Food', 'Sales', 'Other', 'Credit'] 
          },
          type: { 
            type: Type.STRING, 
            enum: ['Income', 'Expense'] 
          },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["totalAmount", "item", "type", "currency"]
      },
      systemInstruction: "You are a savvy Nairobi Market ERP parser. You understand Sheng and Swahili. \n" +
      "- Handle bulk pricing: If a user says '5 bags at 400 each', quantity is 5, unitPrice is 400, totalAmount is 2000.\n" +
      "- If total amount isn't explicitly given but unit price and quantity are, calculate the totalAmount yourself.\n" +
      "- 'Nimeuza'/'Nime-sell' means Income. 'Nimenunua'/'Nimelipa' means Expense.\n" +
      "- Always use KES as default currency."
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      amount: data.totalAmount,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      currency: data.currency || 'KES',
      item: data.item,
      category: data.category as Category || Category.OTHER,
      type: data.type as TransactionType,
      tags: data.tags || []
    };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
};

export const generateInsights = async (transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = transactions.slice(0, 20).map(t => {
    const detail = t.quantity && t.unitPrice ? `(${t.quantity} x ${t.unitPrice})` : '';
    return `${t.type}: ${t.amount} ${t.currency} for ${t.item} ${detail}`;
  }).join('\n');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze these transactions and give me 3 specific business growth tips for a Nairobi trader. Include one forecast and one tip in Sheng/Swahili. \n\n${summary}`,
    config: {
      thinkingConfig: { thinkingBudget: 8000 },
      systemInstruction: "You are the top business consultant in Nairobi. You know market prices daily. Focus on bulk purchase efficiency if you see relevant data."
    }
  });

  return response.text || "Keep trading to get insights.";
};
