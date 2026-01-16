
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Transaction, TransactionType, Category, ParsingResult } from "../types";

// Standard Nairobi Trade Conversion Factors
const UNIT_CONVERSIONS = `
Conversion Rules (Normalize to Base Units):
- EGGS: 1 Tray = 30 Pieces. (Base: PIECE)
- SUGAR/RICE/MAIZE: 1 Bag = 50 KG or 25 KG as specified. (Base: KG)
- MILK: 1 Crate = 12 Packets. (Base: PACKET)
- BREAD: 1 Bale = 20 Loaves. (Base: LOAF)
- SODA: 1 Case = 24 Bottles. (Base: BOTTLE)
`;

export const parseTransactionMessage = async (message: string, history: Transaction[] = []): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const inventorySummary: Record<string, { qty: number, lastCost: number }> = {};
  history.forEach(tx => {
    const key = tx.baseItem.toUpperCase().trim();
    if (!inventorySummary[key]) inventorySummary[key] = { qty: 0, lastCost: 0 };
    
    if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY) {
      const qty = tx.quantity || 1;
      inventorySummary[key].qty += qty;
      if (tx.unitPrice) inventorySummary[key].lastCost = tx.unitPrice;
    } else if (tx.type === TransactionType.INCOME) {
      const qty = tx.quantity || 1;
      inventorySummary[key].qty -= qty;
    }
  });

  const stockContext = Object.entries(inventorySummary)
    .map(([item, data]) => `${item}: ${data.qty} base units in stock (Last Cost per base unit: KES ${data.lastCost})`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse this potentially multi-item message: "${message}". 
    
    Current Inventory (in Base Units):
    ${stockContext || 'No items in stock.'}

    ${UNIT_CONVERSIONS}

    Instructions:
    1. Extract ALL line items mentioned in the message. 
    2. NORMALIZATION: Convert everything to smallest base units (KG, PIECE, etc).
    3. LOSS PREVENTION: Compare the base unit sale price for EACH item against its 'Last Cost'.
    4. If multiple items are present, return them in the 'transactions' array.`,
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
                unitPrice: { type: Type.NUMBER },
                purchasePrice: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                item: { type: Type.STRING },
                baseItem: { type: Type.STRING },
                unit: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                isLossAlert: { type: Type.BOOLEAN },
                insight: { type: Type.STRING }
              }
            }
          },
          insight: { type: Type.STRING }
        },
        required: ["status"]
      },
      systemInstruction: "You are a Nairobi ERP Expert. You handle multi-item messages from traders. Break them down into clean transaction objects."
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    if (data.status === 'complete' && data.transactions) {
      // Return normalized transaction objects
      return {
        status: data.status,
        transactions: data.transactions.map((t: any) => ({
          amount: t.totalAmount || (t.quantity * t.unitPrice),
          unitPrice: t.unitPrice,
          quantity: t.quantity,
          currency: 'KES',
          item: t.item,
          baseItem: t.baseItem || t.item.toUpperCase(),
          unit: t.unit || 'pcs',
          category: t.type === 'Income' ? Category.SALES : Category.INVENTORY,
          type: t.type as TransactionType,
          insight: t.insight,
          isLossAlert: t.isLossAlert
        })),
        insight: data.insight
      };
    }
    return { status: data.status, followUpQuestion: data.followUpQuestion };
  } catch (e) {
    return { status: 'error' };
  }
};

export const parseReceiptImage = async (base64Image: string): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
        { text: `Extract transactions. ${UNIT_CONVERSIONS} Always normalize to base units (KG, PIECE, PACKET).` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                baseItem: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                unitPrice: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING }
              },
              required: ["item", "type", "quantity", "unitPrice"]
            }
          }
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return {
      status: 'complete',
      transactions: data.transactions.map((t: any) => ({
        ...t,
        amount: t.unitPrice * t.quantity,
        currency: 'KES',
        category: t.type === 'Income' ? Category.SALES : Category.INVENTORY,
        type: t.type as TransactionType
      }))
    };
  } catch (e) {
    return { status: 'error' };
  }
};

export const generateInsights = async (transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = transactions.slice(0, 30).map(t => `${t.type}: ${t.amount} for ${t.item} (${t.quantity} ${t.unit})`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analyze profit margins on retail sales vs wholesale buys. Are they selling eggs/milk at enough markup?\n\nHistory:\n${summary}`,
    config: {
      thinkingConfig: { thinkingBudget: 15000 },
      systemInstruction: "You are the Market King. Focus on item-level profitability."
    }
  });
  return response.text || "Keep trading to unlock insights.";
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch { return null; }
};
