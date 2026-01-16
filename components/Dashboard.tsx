
import React from 'react';
import { TrendingUp, TrendingDown, Wallet, Box, ArrowRight, AlertCircle, Zap, ShieldCheck, ShoppingCart, Package } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  inventoryLevels: Record<string, number>;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, inventoryLevels }) => {
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;
  const recent = transactions.slice(0, 5);

  // Fix: Explicitly cast Object.entries result to [string, number][] to avoid 'unknown' type errors in filter and sort
  const lowStockItems = (Object.entries(inventoryLevels) as [string, number][])
    .filter(([_, level]) => level <= 5)
    .sort((a, b) => a[1] - b[1]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')"}}></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1">Mambo, Gikomba Trader!</h2>
          <p className="text-indigo-200 text-sm">You have logged {transactions.length} sales this week. Business is growing!</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex gap-6 relative z-10">
           <div className="text-center">
             <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">Daily Avg</p>
             <p className="text-xl font-black">{(totalIncome / (Math.max(1, transactions.length / 2))).toFixed(0)} KES</p>
           </div>
           <div className="w-px bg-white/10 h-10"></div>
           <div className="text-center">
             <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">M-Pesa Sync</p>
             <div className="flex items-center gap-1 text-emerald-300 font-bold">
               <Zap size={14} />
               Live
             </div>
           </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Revenue" value={totalIncome} color="emerald" icon={<TrendingUp size={20} />} />
        <MetricCard label="Expenses" value={totalExpense} color="rose" icon={<TrendingDown size={20} />} />
        <MetricCard label="Balance" value={balance} color="indigo" icon={<Wallet size={20} />} />
        <MetricCard label="Inventory Items" value={Object.keys(inventoryLevels).length} color="amber" icon={<Box size={20} />} raw />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Recent Soko Logs</h3>
              <Link to="/ledger" className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                Ledger <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length > 0 ? recent.map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {tx.type === TransactionType.INCOME ? <ShoppingCart size={20} /> : <Zap size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase">{tx.item}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {tx.category} • {tx.source || 'SMS'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === TransactionType.INCOME ? '+' : '-'}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold">KES</p>
                  </div>
                </div>
              )) : (
                <div className="p-16 text-center">
                  <AlertCircle className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-medium">Log your first sale to see reports!</p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Status Table */}
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Stock Health</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Fix: Cast Object.entries to [string, number][] to resolve 'unknown' comparison issues with qty */}
                {(Object.entries(inventoryLevels) as [string, number][]).slice(0, 8).map(([item, qty]) => (
                  <div key={item} className={`p-4 rounded-2xl border ${qty <= 0 ? 'bg-rose-50 border-rose-100' : qty <= 5 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">{item}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-black ${qty <= 0 ? 'text-rose-600' : qty <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {qty}
                      </span>
                      <Package size={16} className={qty <= 0 ? 'text-rose-400' : 'text-slate-300'} />
                    </div>
                  </div>
                ))}
                {Object.keys(inventoryLevels).length === 0 && (
                  <p className="col-span-full text-center text-slate-400 text-sm py-4 italic">No inventory recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Market Alerts */}
        <div className="space-y-4">
           {lowStockItems.length > 0 && (
             <div className="bg-rose-600 rounded-3xl p-6 text-white shadow-lg animate-pulse">
               <div className="flex items-center gap-2 mb-4">
                 <AlertCircle size={20} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Out of Stock Alert</span>
               </div>
               <p className="text-sm font-bold leading-tight mb-4">
                 Huna {lowStockItems[0][0].toUpperCase()} kuanzia sasa. Nunua stock mpya uendelee kuuza!
               </p>
               <Link to="/chat" className="block w-full bg-white text-rose-600 text-center font-black py-3 rounded-2xl text-xs uppercase hover:bg-rose-50 transition-colors">
                 Restock Now
               </Link>
             </div>
           )}

           <div className="bg-white p-6 rounded-3xl border shadow-sm">
             <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Market Hotspots</h4>
             <div className="space-y-4">
                <MarketAlert 
                  title="Price Spike: Maize" 
                  desc="Prices up 15% in Gikomba. Stock up now!" 
                  color="rose"
                />
                <MarketAlert 
                  title="M-Pesa Offer" 
                  desc="0% interest on credit today." 
                  color="emerald"
                />
                <MarketAlert 
                  title="Rain Alert" 
                  desc="Heavy rains tonight. Move stock inside." 
                  color="indigo"
                />
             </div>
           </div>

           <div className="bg-emerald-900 rounded-3xl p-6 text-white shadow-xl">
             <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="text-emerald-400" size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Bank Readiness</span>
             </div>
             <p className="text-lg font-bold leading-tight mb-4">Your ledger is ready for a bank audit.</p>
             <button className="w-full bg-white text-emerald-900 font-black py-3 rounded-2xl text-xs uppercase hover:bg-emerald-50 transition-colors">
               Generate PDF Certificate
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const MarketAlert = ({ title, desc, color }: { title: string, desc: string, color: string }) => {
  const styles: any = {
    rose: "bg-rose-50 border-rose-100 text-rose-800",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-800",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-800",
  };
  return (
    <div className={`p-4 rounded-2xl border ${styles[color]}`}>
      <p className="text-[10px] font-black uppercase mb-1">{title}</p>
      <p className="text-xs font-medium opacity-80 leading-tight">{desc}</p>
    </div>
  );
};

const MetricCard = ({ label, value, color, icon, raw }: { label: string, value: number, color: string, icon: any, raw?: boolean }) => {
  const styles: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm hover:scale-[1.02] transition-transform">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl ${styles[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <h4 className="text-2xl font-black text-slate-800">
          {raw ? value : value.toLocaleString()}
          {!raw && <span className="text-xs ml-1 text-slate-400">KES</span>}
        </h4>
      </div>
    </div>
  );
};

export default Dashboard;
