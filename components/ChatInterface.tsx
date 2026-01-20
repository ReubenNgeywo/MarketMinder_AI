
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, CheckCircle2, Mic, Receipt, Camera, Image as ImageIcon, X, FileText, Plus } from 'lucide-react';
import { Message, Transaction, TransactionType, Category, PaymentMethod, UserSettings } from '../types';
import { parseTransactionMessage, parseReceiptFile } from '../services/geminiService';

interface ChatInterfaceProps {
  onAddTransaction: (tx: Transaction) => { success: boolean, error?: string, suggestion?: string };
  inventoryLevels: Record<string, number>;
  transactions: Transaction[];
  settings: UserSettings;
  isOnline: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onAddTransaction, transactions, settings, isOnline }) => {
  const isFirstTime = transactions.length === 0;
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: isFirstTime 
        ? 'Karibu! Scan your receipt or just tell me what you sold. I will check for duplicates automatically.'
        : 'Sasa! Ready to log your trade?',
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const startCamera = async () => {
    try {
      setIsAttachmentMenuOpen(false);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (e) {
      alert("Could not access camera.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      stopCamera();
      handleSend(undefined, dataUrl, 'image/jpeg');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleSend(undefined, base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setIsAttachmentMenuOpen(false);
  };

  const toggleVoice = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    if (isListening) { setIsListening(false); return; }
    const rec = new Recognition();
    rec.lang = 'en-US, sw-KE';
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onresult = (e: any) => setInputValue(e.results[0][0].transcript);
    rec.start();
  };

  const handleSend = async (forcedText?: string, fileBase64?: string, mimeType?: string, fileName?: string) => {
    const text = forcedText || inputValue;
    if (!text.trim() && !fileBase64 && !isLoading) return;

    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: fileBase64 ? `Processing ${mimeType?.includes('pdf') ? 'PDF Document' : 'Attachment'}...` : text, 
      timestamp: Date.now(), 
      fileContent: fileBase64,
      fileMimeType: mimeType,
      fileName: fileName
    }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const result = fileBase64 
        ? await parseReceiptFile(fileBase64, mimeType!, transactions) 
        : await parseTransactionMessage(text, transactions);
      
      let aiContent = "";
      if (result.status === 'complete' && result.transactions && result.transactions.length > 0) {
        const successes: string[] = [];
        const duplicates: string[] = [];
        const failures: string[] = [];

        result.transactions.forEach((p, i) => {
          if (p.isDuplicate) {
            duplicates.push(p.item!);
            return;
          }

          const res = onAddTransaction({
            id: `tx-${Date.now()}-${i}`,
            timestamp: Date.now(),
            amount: p.amount!,
            unitPrice: p.unitPrice,
            quantity: p.quantity,
            paymentMethod: (p.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
            item: p.item!,
            baseItem: p.baseItem || p.item!.toUpperCase(),
            category: p.category as Category,
            type: p.type as TransactionType,
            originalMessage: p.originalMessage || text || fileName || "Attachment Scan",
            source: fileBase64 ? 'Receipt Scan' : 'SMS',
            currency: 'KES'
          });

          if (res.success) successes.push(p.item!);
          else failures.push(`${p.item}: ${res.error}`);
        });

        if (successes.length > 0) aiContent += `✅ Recorded: ${successes.join(', ')}. `;
        if (duplicates.length > 0) aiContent += `🚫 Skipped duplicates: ${duplicates.join(', ')}. `;
        if (failures.length > 0) aiContent += `⚠️ Errors: ${failures.join('. ')}`;
        
        if (!aiContent) aiContent = "Everything seems to be already logged. No new items found.";
      } else {
        aiContent = result.followUpQuestion || "Could not parse clearly. Try again?";
      }

      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: aiContent, timestamp: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: "API Error. Check connection.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col bg-slate-50 border-x shadow-2xl overflow-hidden relative">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      
      {isCameraActive && (
        <div className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center p-4">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-[70vh] rounded-3xl object-cover bg-slate-800" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-8 flex gap-4">
            <button onClick={stopCamera} className="bg-white/10 text-white p-4 rounded-full"><X /></button>
            <button onClick={capturePhoto} className="bg-white text-indigo-900 p-8 rounded-full shadow-2xl active:scale-90 transition-transform"><Camera size={32} /></button>
          </div>
        </div>
      )}

      <div className="p-4 bg-[#075e54] text-white flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-full"><Bot size={22} /></div>
          <div>
            <h3 className="font-bold text-sm">MarketMinder Bot</h3>
            <p className="text-[10px] opacity-70">Anti-Duplicate System Active</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')" }}>
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 shadow-sm rounded-2xl relative ${m.role === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
              {m.fileContent && (
                <div className="mb-2">
                  {m.fileMimeType?.includes('pdf') ? (
                    <div className="bg-white/50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><FileText size={20} /></div>
                      <div className="truncate">
                        <p className="text-[10px] font-black uppercase text-slate-400">PDF Document</p>
                        <p className="text-xs font-bold truncate">{m.fileName || 'document.pdf'}</p>
                      </div>
                    </div>
                  ) : (
                    <img src={m.fileContent} className="w-full rounded-lg" alt="Attachment" />
                  )}
                </div>
              )}
              <p className="text-sm leading-relaxed text-slate-800">{m.content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[8px] opacity-50 block uppercase font-bold">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {m.role === 'user' && <CheckCircle2 size={10} className="text-emerald-500" />}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAttachmentMenuOpen && (
        <div ref={menuRef} className="absolute bottom-24 left-4 z-40 bg-white rounded-[2rem] shadow-2xl p-6 grid grid-cols-3 gap-6 border animate-in slide-in-from-bottom-5 duration-200">
          <AttachmentButton onClick={startCamera} icon={<Camera className="text-white" size={24} />} label="Camera" color="bg-emerald-500" />
          <AttachmentButton onClick={() => { setIsAttachmentMenuOpen(false); fileInputRef.current!.accept = 'image/*'; fileInputRef.current!.click(); }} icon={<ImageIcon className="text-white" size={24} />} label="Gallery" color="bg-indigo-600" />
          <AttachmentButton onClick={() => { setIsAttachmentMenuOpen(false); fileInputRef.current!.accept = 'application/pdf'; fileInputRef.current!.click(); }} icon={<FileText className="text-white" size={24} />} label="Document" color="bg-rose-500" />
        </div>
      )}

      <div className="p-2 bg-white flex items-center gap-2 shrink-0 h-16">
        <button onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} className={`h-11 w-11 flex items-center justify-center rounded-full transition-all border shrink-0 ${isAttachmentMenuOpen ? 'bg-slate-100 text-slate-700 border-slate-200' : 'text-slate-500 hover:bg-slate-50 border-transparent'}`}>
          {isAttachmentMenuOpen ? <X size={24} /> : <Plus size={24} />}
        </button>
        <div className="flex-1 bg-slate-100 rounded-full flex items-center px-4 h-11">
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Log a sale or upload receipt..." className="flex-1 bg-transparent border-none text-[15px] outline-none px-3 py-1 text-slate-800 placeholder:text-slate-400" />
        </div>
        <button onClick={inputValue.trim() || isLoading ? () => handleSend() : toggleVoice} className={`h-11 w-11 flex items-center justify-center rounded-full shadow-md active:scale-90 transition-all shrink-0 ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#128c7e] text-white'}`}>
          {inputValue.trim() || isLoading ? <Send size={20} /> : <Mic size={20} />}
        </button>
      </div>
    </div>
  );
};

const AttachmentButton = ({ onClick, icon, label, color }: { onClick: () => void, icon: React.ReactNode, label: string, color: string }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`p-4 rounded-full ${color} shadow-lg transition-transform group-hover:scale-110 group-active:scale-95`}>{icon}</div>
    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{label}</span>
  </button>
);

export default ChatInterface;
