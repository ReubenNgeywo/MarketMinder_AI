
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Mic, Receipt, CheckCircle2, AlertCircle, MicOff, AlertTriangle, PackageSearch } from 'lucide-react';
import { Message, Transaction, TransactionType, Category } from '../types';
import { parseTransactionMessage } from '../services/geminiService';

interface ChatInterfaceProps {
  onAddTransaction: (tx: Transaction) => { success: boolean, error?: string };
  inventoryLevels: Record<string, number>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAddTransaction, inventoryLevels }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Sasa! Use voice or text to log sales. E.g. "Sold 5 trays of eggs for 300 each." Kumbuka: Huwezi kuuza kile hauna kwa stock!',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US, sw-KE';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };
    recognition.start();
  };

  const handleSend = async (forcedText?: string) => {
    const text = forcedText || inputValue;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const parsed = await parseTransactionMessage(text);
      
      if (parsed && parsed.amount && parsed.item) {
        const itemKey = parsed.item.toLowerCase().trim();
        const available = inventoryLevels[itemKey] || 0;
        const requested = parsed.quantity || 1;

        const newTx: Transaction = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          amount: parsed.amount,
          unitPrice: parsed.unitPrice,
          quantity: parsed.quantity,
          currency: parsed.currency || 'KES',
          item: parsed.item,
          category: parsed.category || Category.OTHER,
          type: parsed.type || TransactionType.INCOME,
          originalMessage: text,
          source: isListening ? 'Voice' : 'SMS',
          tags: (parsed as any).tags || []
        };

        // Pre-check for inventory shortage to give a more personalized AI response
        if (newTx.type === TransactionType.INCOME && available < requested) {
          const shortage = requested - available;
          let shortageMsg = "";
          
          if (available <= 0) {
            shortageMsg = `Ayayaya! Huna **${newTx.item}** hata kidogo kwa stock yako. Huwezi kuuza kitu ambacho huna! 🛑\n\n**Tip:** Nunua angalau units ${requested} uweze kuuza hii order.`;
          } else {
            shortageMsg = `Wait kidogo! Stock yako ya **${newTx.item}** haitoshi. Uko na units **${available}** pekee, lakini unataka kuuza **${requested}**. 📉\n\n**Suggestion:** Restock units zingine **${shortage}** ndio uweze kukamilisha hii sale ya soko.`;
          }

          const aiResponse: Message = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: shortageMsg,
            timestamp: Date.now(),
            status: 'error'
          };
          setMessages(prev => [...prev, aiResponse]);
          setIsLoading(false);
          return;
        }

        const result = onAddTransaction(newTx);

        if (result.success) {
          let confirmationText = `Vitu safi! ${newTx.item} recorded for ${newTx.amount} ${newTx.currency}.`;
          if (newTx.quantity && newTx.unitPrice) {
            confirmationText += ` (${newTx.quantity} units @ ${newTx.unitPrice} each).`;
          }

          const aiResponse: Message = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: confirmationText,
            timestamp: Date.now(),
            status: 'completed',
            transactionId: newTx.id
          };
          setMessages(prev => [...prev, aiResponse]);
        } else {
          const aiResponse: Message = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: result.error || "Huwezi kuuza hiyo. Angalia stock yako.",
            timestamp: Date.now(),
            status: 'error'
          };
          setMessages(prev => [...prev, aiResponse]);
        }
      } else {
        const aiResponse: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: "Sijaelewa hiyo message. Try: 'Purchased 10kg sugar at 150 each'",
          timestamp: Date.now(),
          status: 'error'
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "Error in network. Pole sana.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col bg-slate-50 border-x shadow-2xl overflow-hidden relative">
      <div className="p-4 bg-[#075e54] text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#075e54] rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-bold text-sm">MarketMinder Bot</h3>
            <p className="text-[10px] text-emerald-200 uppercase tracking-tighter">Gemini 3 Powered • Online</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] pb-24"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')" }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[80%] px-4 py-2.5 shadow-sm relative
              ${m.role === 'user' 
                ? 'bg-[#dcf8c6] text-slate-800 rounded-lg rounded-tr-none' 
                : m.status === 'error'
                  ? 'bg-rose-100 text-rose-800 rounded-lg border border-rose-200 shadow-rose-100'
                  : 'bg-white text-slate-800 rounded-lg rounded-tl-none'}
            `}>
              <div className="flex items-start gap-2">
                {m.status === 'error' && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />}
                <div className="text-[14px] leading-tight">
                   {m.content.split('\n').map((line, i) => (
                     <p key={i} className={i > 0 ? "mt-2" : ""}>
                       {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="font-black">{part}</strong> : part)}
                     </p>
                   ))}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 opacity-40">
                <span className="text-[9px]">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {m.role === 'assistant' && m.status === 'completed' && <CheckCircle2 size={10} />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-lg p-3 shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-3 bg-white/80 backdrop-blur-md border-t flex items-center gap-2">
        <button 
          onClick={toggleVoice}
          className={`p-3 rounded-full transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {isListening ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Nimeuza trays 3 za mayai..."}
            className="w-full py-3 px-5 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-inner text-sm"
          />
        </div>
        <button 
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          className="p-3 bg-[#128c7e] text-white rounded-full disabled:bg-slate-300 shadow-md hover:bg-[#075e54] transition-colors"
        >
          <Send size={22} />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
