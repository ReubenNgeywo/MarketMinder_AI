
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Mic, Receipt, CheckCircle2, AlertCircle, MicOff, AlertTriangle, Volume2, PlayCircle, Lightbulb, Camera, Image as ImageIcon, X, Sparkles, ShieldCheck } from 'lucide-react';
import { Message, Transaction, TransactionType, Category, ParsingResult } from '../types';
import { parseTransactionMessage, parseReceiptImage, generateSpeech } from '../services/geminiService';

interface ChatInterfaceProps {
  onAddTransaction: (tx: Transaction) => { success: boolean, error?: string, suggestion?: string };
  inventoryLevels: Record<string, number>;
  transactions: Transaction[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAddTransaction, inventoryLevels, transactions }) => {
  const isFirstTime = transactions.length === 0;
  
  const [showConsentModal, setShowConsentModal] = useState(() => {
    return localStorage.getItem('erp_privacy_consented') !== 'true';
  });

  const handleConsent = () => {
    localStorage.setItem('erp_privacy_consented', 'true');
    setShowConsentModal(false);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: isFirstTime 
        ? 'Karibu! Nisaidie ku-setup duka lako. Unaweza kusema "Niko na trays 20 za mayai" au upige picha ya list yako ya stock.'
        : 'Sasa! Use voice, text, or snap a photo of a receipt to log transactions.',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const playAudio = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
      const dataInt16 = new Int16Array(bytes.buffer);
      const frameCount = dataInt16.length;
      const buffer = ctx.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i] / 32768.0; }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) { console.error("Audio playback error", e); }
  };

  const toggleVoice = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { alert("Voice recognition not supported."); return; }
    if (isListening) { setIsListening(false); return; }
    const recognition = new Recognition();
    recognition.lang = 'en-US, sw-KE';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };
    recognition.start();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleSend(undefined, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (forcedText?: string, imageBase64?: string) => {
    if (showConsentModal) {
      alert("Please accept the privacy terms first.");
      return;
    }

    const text = forcedText || inputValue;
    if (!text.trim() && !imageBase64 && !isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: imageBase64 ? "Scanning document..." : text,
      timestamp: Date.now(),
      imageContent: imageBase64
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let result: ParsingResult;
      if (imageBase64) {
        result = await parseReceiptImage(imageBase64);
      } else {
        result = await parseTransactionMessage(text, transactions);
      }
      
      let aiContent = "";
      let status: Message['status'] = 'completed';

      // Unified handling for multiple transactions (text or image)
      if (result.status === 'complete' && result.transactions && result.transactions.length > 0) {
        let salesCount = 0;
        let purchasesCount = 0;
        let totalVal = 0;
        let errors: string[] = [];
        
        result.transactions.forEach((parsed, index) => {
          const type = parsed.type as TransactionType;
          const newTx: Transaction = {
            id: `tx-${Date.now()}-${index}`,
            timestamp: Date.now(),
            amount: parsed.amount || ( (parsed.quantity || 1) * (parsed.unitPrice || 0)),
            unitPrice: parsed.unitPrice,
            quantity: parsed.quantity,
            unit: parsed.unit || 'pcs',
            currency: parsed.currency || 'KES',
            item: parsed.item!,
            baseItem: parsed.baseItem || parsed.item!.toUpperCase(),
            category: parsed.category as Category,
            type: type,
            originalMessage: text || "Batch Input",
            source: imageBase64 ? 'Receipt Scan' : 'Manual',
          };
          
          const addResult = onAddTransaction(newTx);
          if (addResult.success) {
            if (type === TransactionType.INCOME) {
              salesCount++;
              totalVal += newTx.amount;
            } else {
              purchasesCount++;
            }
          } else {
            errors.push(`${newTx.item}: ${addResult.error}`);
          }
        });
        
        const summaryParts = [];
        if (salesCount > 0) summaryParts.push(`✅ Added **${salesCount} sales** (Total: KES ${totalVal.toLocaleString()})`);
        if (purchasesCount > 0) summaryParts.push(`📦 Added **${purchasesCount} stock restocks**`);
        
        aiContent = summaryParts.length > 0 ? summaryParts.join('\n') : "Sijafanikiwa kuongeza chochote.";
        if (errors.length > 0) aiContent += `\n\n⚠️ **Errors:**\n- ${errors.join('\n- ')}`;
        if (result.insight) aiContent += `\n\n💡 **Tip:** ${result.insight}`;
      } 
      else if (result.status === 'incomplete') {
        status = 'clarification';
        aiContent = result.followUpQuestion || "Nipe details zaidi.";
      } else {
        status = 'error';
        aiContent = "Sijaelewa hiyo vizuri. Jaribu tena ukitaja item, quantity na bei.";
      }

      const audioBase64 = await generateSpeech(aiContent.replace(/\*\*/g, ''));
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
        status: status,
        audioData: audioBase64 || undefined
      };
      setMessages(prev => [...prev, aiResponse]);
      if (audioBase64) playAudio(audioBase64);
    } catch (error) {
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: "Pole! Kuna API Error. Check your connection.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col bg-slate-50 border-x shadow-2xl overflow-hidden relative">
      {showConsentModal && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm text-center shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
               <ShieldCheck size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-800">Privacy First</h3>
             <p className="text-sm text-slate-500 leading-relaxed">
               By using MarketMinder, you consent to sharing your ledger data with <strong>Gemini 3 AI</strong> for parsing and insights. Data is protected under Kenya's Data Protection Act.
             </p>
             <button 
               onClick={handleConsent}
               className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-lg"
             >
               Agree & Start Chatting
             </button>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">You can revoke this in Settings</p>
          </div>
        </div>
      )}

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
            <p className="text-[10px] text-emerald-200 uppercase tracking-tighter">Secure AI Assistant • Online</p>
          </div>
        </div>
        {isListening && <div className="bg-rose-500 px-3 py-1 rounded-full text-[10px] font-bold animate-pulse">LISTENING...</div>}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] pb-24"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')" }}
      >
        {isFirstTime && messages.length < 3 && (
           <div className="flex flex-col gap-2 p-4 bg-white/80 rounded-2xl border-2 border-indigo-200 shadow-inner mb-4">
              <p className="text-xs font-black text-indigo-600 uppercase flex items-center gap-1">
                <Sparkles size={14} /> Shop Setup
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleSend("Niko na trays 50 za mayai")} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">"Niko na mayai trays 50"</button>
                <button onClick={() => handleSend("Niko na mifuko 10 ya sukari")} className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">"Niko na sukari mifuko 10"</button>
              </div>
           </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] px-4 py-3 shadow-sm relative group
              ${m.role === 'user' 
                ? 'bg-[#dcf8c6] text-slate-800 rounded-2xl rounded-tr-none' 
                : m.status === 'clarification'
                  ? 'bg-indigo-50 text-indigo-900 rounded-2xl rounded-tl-none border-l-4 border-indigo-400'
                  : m.status === 'error'
                    ? 'bg-rose-100 text-rose-800 rounded-2xl rounded-tl-none border-l-4 border-rose-400 shadow-[0_4px_0_0_#fda4af]'
                    : 'bg-white text-slate-800 rounded-2xl rounded-tl-none'}
            `}>
              <div className="flex flex-col gap-2">
                {m.imageContent && (
                  <div className="relative rounded-lg overflow-hidden border border-black/10">
                    <img src={m.imageContent} alt="Scan preview" className="w-full max-h-64 object-cover" />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="flex-1 text-[14px] leading-relaxed">
                     {m.content.split('\n').map((line, i) => (
                       <p key={i} className={i > 0 ? "mt-2" : ""}>
                         {line.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} className="font-black text-slate-900">{part}</strong> : part)}
                       </p>
                     ))}
                  </div>
                  {m.audioData && (
                    <button onClick={() => playAudio(m.audioData!)} className="text-indigo-500 hover:text-indigo-700 p-1 bg-slate-100 rounded-full shrink-0">
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 opacity-40">
                <span className="text-[9px]">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {m.role === 'assistant' && m.status === 'completed' && <CheckCircle2 size={10} className="text-emerald-600" />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Syncing...</span>
             </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-white/90 backdrop-blur-md border-t flex items-center gap-2">
        <div className="flex gap-1">
          <button onClick={toggleVoice} className={`p-3 rounded-full transition-all shadow-md ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 shadow-md transition-all">
            <Camera size={20} />
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isFirstTime ? "Niko na sukari bags 10..." : "Log sale or scan stock..."}
            className="w-full py-3 px-5 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#128c7e] bg-white shadow-inner text-sm font-medium"
          />
        </div>
        <button onClick={() => handleSend()} disabled={!inputValue.trim() || isLoading} className="p-3 bg-[#128c7e] text-white rounded-full disabled:bg-slate-300 shadow-xl hover:bg-[#075e54] transition-all active:scale-95">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;
