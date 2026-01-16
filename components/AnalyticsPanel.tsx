
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RPieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { Sparkles, BrainCircuit, RefreshCcw, TrendingUp, ShieldCheck, Zap, ArrowRight, Wallet } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';
import { generateInsights } from '../services/geminiService';

interface AnalyticsPanelProps {
  transactions: Transaction[];
}

// Simple helper to render basic markdown-like syntax (bolding and line breaks)
const MarkdownLite: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n\n');
  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => {
        // Handle basic bolding **text**
        const parts = para.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={i} className="text-slate-600 text-base leading-relaxed">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} className="text-indigo-900 font-bold">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ transactions }) => {
  const [insights, setInsights] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Group by Date for Area Chart (Cash Flow History)
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toLocaleDateString();
    
    const balance = transactions
      .filter(t => new Date(t.timestamp).toLocaleDateString() === dateStr)
      .reduce((acc, t) => acc + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);

    return { 
      name: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), 
      balance: Math.max(0, balance + 5000), // Adding mock baseline for visual
      raw: balance
    };
  });

  const handleGenerateInsights = async () => {
    if (!transactions || transactions.length === 0) {
      setInsights("Record some transactions first to unlock AI insights!");
      return;
    }
    
    setIsGenerating(true);
    try {
      // Explicitly passing the current transactions array to the service
      const text = await generateInsights(transactions);
      setInsights(text);
    } catch (e) {
      setInsights("Pole! We hit a snag while talking to Gemini. Check your connection or API key.");
      console.error("Insight generation error:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0 && !insights) {
      handleGenerateInsights();
    }
  }, [transactions]);

  const score = Math.min(850, 450 + (transactions.length * 10));

  return (
    <div className="space-y-6 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Forecast Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Growth Forecast</h3>
              <p className="text-xs text-slate-400">Projected income based on your last 14 days</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp size={12} />
                +18% MOM
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey="balance" stroke="#4f46e5" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Loan Readiness Gauge */}
        <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-300">Credit Score</h4>
            </div>
            <div className="text-5xl font-black mb-1">{score}</div>
            <p className="text-xs text-indigo-300">"Excellent" for KCB-M-Pesa Loans</p>
          </div>
          
          <div className="mt-8 space-y-4">
            <div className="bg-indigo-800/50 p-3 rounded-2xl border border-indigo-700/50">
              <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1">Max Borrowing Power</p>
              <p className="text-lg font-bold">KES 75,000</p>
            </div>
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2">
              Apply via M-Pesa
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* AI Advisory Section */}
      <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 rounded-lg">
                <BrainCircuit size={20} className="text-white" />
             </div>
             <div>
               <h3 className="font-bold text-slate-800">Gemini Business Coach</h3>
               <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Powered by Gemini 3 Pro</p>
             </div>
          </div>
          <button 
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"
          >
            <RefreshCcw size={14} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Analyzing...' : 'Refresh Insights'}
          </button>
        </div>
        <div className="p-8">
          {isGenerating ? (
            <div className="space-y-4 max-w-2xl">
              <div className="h-4 bg-slate-100 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse"></div>
              <div className="pt-4 flex gap-4">
                <div className="h-20 bg-slate-50 rounded-xl w-full animate-pulse"></div>
                <div className="h-20 bg-slate-50 rounded-xl w-full animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h4 className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Zap size={16} />
                   Market Strategy & Insights
                </h4>
                <div className="bg-white border-l-4 border-indigo-500 pl-6 py-2">
                  {insights ? (
                    <MarkdownLite text={insights} />
                  ) : (
                    <p className="text-slate-400 italic">Tap "Refresh Insights" to let Gemini analyze your trade data.</p>
                  )}
                </div>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 h-fit">
                <h4 className="text-emerald-700 font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Compliance & Sync
                </h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-600 font-medium">M-Pesa Statements</span>
                      <span className="text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-full text-[10px]">VERIFIED</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-600 font-medium">VAT / KRA Status</span>
                      <span className="text-slate-500 font-bold text-[10px]">PENDING</span>
                   </div>
                   <div className="h-px bg-emerald-200 my-4"></div>
                   <button className="w-full bg-white border border-emerald-200 text-emerald-700 py-3 rounded-2xl text-xs font-black hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm">
                      <RefreshCcw size={14} />
                      Sync Tax Portal
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
