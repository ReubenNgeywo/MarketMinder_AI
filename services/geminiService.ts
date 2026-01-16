
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Transaction, TransactionType, Category, ParsingResult } from "../types";

export const parseTransactionMessage = async (message: string, history: Transaction[] = []): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract unique inventory item names for better context
  const existingItems = Array.from(new Set(
    history
      .filter(t => t.type === TransactionType.EXPENSE && t.category === Category.INVENTORY)
      .map(t => t.item.toUpperCase())
  ));

  const pricingContext = history
    .filter(t => t.type === TransactionType.EXPENSE && t.category === Category.INVENTORY)
    .slice(0, 10)
    .map(t => `${t.item}: Bought at ${t.unitPrice || t.amount} ${t.currency} on ${new Date(t.timestamp).toLocaleDateString()}`)
    .join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Parse this Nairobi trader message: "${message}". 
    
    Context:
    - Existing Stock Items (Canonical Names): ${existingItems.join(', ') || 'None.'}
    - Recent pricing details: ${pricingContext || 'First time setup.'}

    Instructions:
    1. Identify Item, Type (Income/Expense), Amount, Qty.
    2. CRITICAL: If the user refers to an item (e.g., "rice") and one of the Canonical Names contains that word (e.g., "BAGS OF 10KG RICE"), you MUST use the exact Canonical Name for the 'item' property.
    3. If user says "I have [X] of [Item]", treat it as Opening Stock (Expense/Inventory).
    4. Provide a savvy 'insight' in Sheng/Swahili.
    5. Set status to 'incomplete' if critical data like Item is missing.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['complete', 'incomplete', 'error'] },
          followUpQuestion: { type: Type.STRING },
          totalAmount: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          item: { type: Type.STRING },
          category: { 
            type: Type.STRING, 
            enum: ['Inventory', 'Rent', 'Transport', 'Food', 'Sales', 'Other', 'Credit'] 
          },
          type: { 
            type: Type.STRING, 
            enum: ['Income', 'Expense'] 
          },
          suggestedUnitPrice: { type: Type.NUMBER },
          insight: { type: Type.STRING }
        },
        required: ["status"]
      },
      systemInstruction: "You are a savvy Nairobi Market ERP parser. Help the user onboard by recognizing starting stock levels and matching names exactly to previous records."
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    if (data.status === 'complete' || (data.status === 'incomplete' && data.item && data.suggestedUnitPrice)) {
      return {
        status: data.status,
        transaction: {
          amount: data.totalAmount,
          unitPrice: data.unitPrice,
          quantity: data.quantity,
          currency: data.currency || 'KES',
          item: data.item,
          category: data.category as Category || Category.OTHER,
          type: data.type as TransactionType,
        },
        suggestedUnitPrice: data.suggestedUnitPrice,
        insight: data.insight,
        followUpQuestion: data.followUpQuestion
      };
    }
    return {
      status: data.status,
      followUpQuestion: data.followUpQuestion
    };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { status: 'error' };
  }
};

export const parseReceiptImage = async (base64Image: string): Promise<ParsingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image.split(',')[1] || base64Image,
    },
  };

  const textPart = {
    text: `Scan this document carefully. It may be a list of "Starting Inventory" or an invoice.
    1. Look for keywords like "Bought", "I have", "Stock", or "Sold".
    2. For EACH item, extract: Item Name, Quantity, Unit Price, Total, and Currency.
    3. IMPORTANT: If currency is not explicitly found (e.g. KES, $, UGX), default to "KES".
    4. If the user is just listing what they currently have (Onboarding), treat each as an 'Expense' of type 'Inventory' at a cost price.
    5. Categorize purchases/stock as 'Inventory'.
    6. Return an array of transactions with the 'currency' field correctly populated for every item.
    7. Include a brief 'insight' in Swahili/Sheng welcoming the user if it looks like shop setup.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['complete', 'incomplete', 'error'] },
          insight: { type: Type.STRING },
          transactions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Income', 'Expense'] },
                totalAmount: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                currency: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["item", "type", "totalAmount", "currency"]
            }
          }
        },
        required: ["status", "transactions"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{}');
    const mappedTransactions = (data.transactions || []).map((t: any) => ({
      amount: t.totalAmount,
      unitPrice: t.unitPrice,
      quantity: t.quantity,
      currency: t.currency || 'KES',
      item: t.item,
      category: t.category as Category || (t.type === 'Expense' ? Category.INVENTORY : Category.SALES),
      type: t.type as TransactionType,
    }));

    return {
      status: data.status,
      transactions: mappedTransactions,
      insight: data.insight
    };
  } catch (e) {
    console.error("Receipt parsing error", e);
    return { status: 'error' };
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS generation failed", error);
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
    contents: `Analyze these transactions and give me 3 specific business growth tips for a Nairobi trader. Include one forecast and one tip in Sheng/Swahili. Focus on gross margin and turnover. \n\n${summary}`,
    config: {
      thinkingConfig: { thinkingBudget: 8000 },
      systemInstruction: "You are the top business consultant in Nairobi. Use market jargon like 'Daily turnover', 'Markup', and 'Restock cycle'."
    }
  });

  return response.text || "Keep trading to get insights.";
};
