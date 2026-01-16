
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Box, ArrowRight, AlertCircle, Zap, ShieldCheck, ShoppingCart, Package, BarChart3, Truck, Factory, Percent, Sparkles, Plus, Download, Coins, Store, FilePlus, CheckCircle } from 'lucide-react';
import { Transaction, TransactionType, Category, UserSettings } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  inventoryLevels: Record<string, number>;
  settings: UserSettings;
  onAddTransaction: (tx: Transaction) => { success: boolean, error?: string };
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, inventoryLevels, settings, onAddTransaction }) => {
  const [logStatus, setLogStatus] = useState<Record<string, 'idle' | 'success'>>({});

  const totalRevenue = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  // Cost of Goods Sold (Inventory Purchases)
  const cogs = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.category === Category.INVENTORY)
    .reduce((acc, t) => acc + t.amount, 0);

  // Other Operating Expenses (Rent, Transport, etc)
  const opEx = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.category !== Category.INVENTORY)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = cogs + opEx;
  const grossProfit = totalRevenue - cogs;
  const netProfit = totalRevenue - totalExpenses;
  
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  
  const recent = transactions.slice(0, 5);
  const isNewUser = transactions.length === 0;

  const lowStockThreshold = 5;
  const targetStockLevel = 30;

  const lowStockItems = (Object.entries(inventoryLevels) as [string, number][])
    .filter(([_, level]) => level <= lowStockThreshold)
    .sort((a, b) => a[1] - b[1]);

  // Helper to suggest suppliers based on Nairobi market geography
  const getSupplierSuggestion = (item: string) => {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('rice') || lowerItem.includes('sugar') || lowerItem.includes('maize') || lowerItem.includes('unga')) {
      return { market: "Wakulima Market", tip: "Bulk prices are lowest on Tuesday mornings." };
    }
    if (lowerItem.includes('egg') || lowerItem.includes('kuku') || lowerItem.includes('meat')) {
      return { market: "City Market / Njiru", tip: "Verify cold chain for large batches." };
    }
    if (lowerItem.includes('clothe') || lowerItem.includes('shoe') || lowerItem.includes('bag')) {
      return { market: "Gikomba Section 3", tip: "New stock arrives every Friday." };
    }
    if (lowerItem.includes('phone') || lowerItem.includes('cable') || lowerItem.includes('bulb')) {
      return { market: "Luthuli Ave / Eastleigh", tip: "Ask for wholesale warranty labels." };
    }
    return { market: "Kamukunji Wholesale", tip: "Buy in dozens for maximum discount." };
  };

  const getLastUnitPrice = (itemName: string) => {
    const purchase = transactions.find(t => 
      t.item.toLowerCase() === itemName.toLowerCase() && 
      t.type === TransactionType.EXPENSE && 
      t.unitPrice
    );
    return purchase?.unitPrice || 0;
  };

  const handleLogRestock = (item: string, qty: number) => {
    const unitPrice = getLastUnitPrice(item);
    // Fix: Add required 'baseItem' property to ensure compliance with Transaction type.
    const newTx: Transaction = {
      id: `restock-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      item: item.toUpperCase(),
      baseItem: item.toUpperCase(),
      type: TransactionType.EXPENSE,
      category: Category.INVENTORY,
      quantity: qty,
      unitPrice: unitPrice,
      amount: qty * unitPrice,
      currency: "KES",
      source: "Manual",
      originalMessage: `Dashboard suggested restock: ${qty} units of ${item}`,
    };

    const res = onAddTransaction(newTx);
    if (res.success) {
      setLogStatus(prev => ({ ...prev, [item]: 'success' }));
      setTimeout(() => {
        setLogStatus(prev => ({ ...prev, [item]: 'idle' }));
      }, 3000);
    }
  };

  const logAllRestocks = () => {
    lowStockItems.forEach(([item, qty]) => {
      const restockQty = targetStockLevel - qty;
      handleLogRestock(item, restockQty);
    });
  };

  const exportAuditReport = () => {
    if (transactions.length === 0) {
      alert("Hujarekodi chochote bado! Record transactions first to export a report.");
      return;
    }

    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    const reportData = [
      ["MARKETMINDER BUSINESS COMPLIANCE REPORT"],
      ["Shop Name:", settings.shopName],
      ["Location:", settings.location],
      ["Export Date:", new Date().toLocaleString()],
      [""],
      ["FINANCIAL SUMMARY"],
      ["Total Revenue (Sales):", `${totalRevenue.toLocaleString()} KES`],
      ["Cost of Goods Sold (Inventory):", `${cogs.toLocaleString()} KES`],
      ["GROSS PROFIT:", `${grossProfit.toLocaleString()} KES`],
      ["Operating Expenses (Rent/Trans):", `${opEx.toLocaleString()} KES`],
      ["NET PROFIT/LOSS:", `${netProfit.toLocaleString()} KES`],
      ["Gross Margin:", `${grossMargin.toFixed(2)}%`],
      ["Total Logs:", transactions.length],
      [""],
      ["DETAILED TRANSACTION LEDGER"],
      ["ID", "Date (Timestamp)", "Item Description", "Type", "Category", "Quantity", "Unit Price", "Total Amount", "Currency", "Channel", "Audit Status"]
    ];

    sortedTransactions.forEach(tx => {
      const qty = tx.quantity || 1;
      const up = tx.unitPrice || 0;
      const displayAmount = (tx.amount === 0 && up > 0) ? (qty * up) : tx.amount;
      const dateStr = new Date(tx.timestamp).toISOString().replace('T', ' ').substring(0, 19);

      reportData.push([
        tx.id,
        `"${dateStr}"`,
        `"${tx.item.replace(/"/g, '""')}"`,
        tx.type,
        tx.category,
        qty,
        up > 0 ? up : (tx.amount / qty),
        displayAmount,
        tx.currency,
        `"${tx.source}"`,
        '"VERIFIED_LOCAL"'
      ]);
    });

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestampStr = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Bank_Audit_${settings.shopName.replace(/\s+/g, '_')}_${timestampStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {isNewUser ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-indigo-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Karibu MarketMinder AI!</h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Hujarekodi biashara yoyote bado. Hebu tuanze kwa kuongeza stock uliyo nayo kwa sasa ndio tuanze kupiga hesabu za faida!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/chat" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <Plus size={18} />
              Add My Initial Stock
            </Link>
            <Link to="/chat" className="bg-white border-2 border-indigo-600 text-indigo-600 px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
              <Box size={18} />
              Setup via Receipt Scan
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')"}}></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Mambo, {settings.shopName}!</h2>
            <p className="text-indigo-200 text-sm">Your business is operating at a **{grossMargin.toFixed(1)}%** gross margin.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex gap-6 relative z-10">
             <div className="text-center">
               <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">Net Profit</p>
               <p className="text-xl font-black">{netProfit.toLocaleString()}</p>
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
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Sales" description="Revenue collected" value={totalRevenue} color="emerald" icon={<TrendingUp size={20} />} />
        <MetricCard label="Gross Profit" description="Profit after stock costs" value={grossProfit} color="indigo" icon={<Coins size={20} />} />
        <MetricCard label="Net Profit" description="Take-home cash" value={netProfit} color="amber" icon={<Wallet size={20} />} />
        <MetricCard label="Gross Margin" description="Markup Health" value={grossMargin} color="emerald" icon={<Percent size={20} />} isPercentage />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Recent Logs</h3>
              <Link to="/ledger" className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                Full Ledger <ArrowRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length > 0 ? recent.map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {tx.type === TransactionType.INCOME ? <ShoppingCart size={20} /> : <Box size={20} />}
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
                  </div>
                </div>
              )) : (
                <div className="p-16 text-center">
                  <AlertCircle className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-medium">Log your first sale or stock to see reports!</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Stock Health</h3>
              <span className="text-[10px] text-slate-400 font-bold">Target Level: {targetStockLevel} units</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.entries(inventoryLevels) as [string, number][]).slice(0, 8).map(([item, qty]) => {
                  const healthPercent = Math.min(100, (qty / targetStockLevel) * 100);
                  return (
                    <div key={item} className={`p-4 rounded-2xl border flex flex-col justify-between h-32 ${qty <= 0 ? 'bg-rose-50 border-rose-100' : qty <= lowStockThreshold ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">{item}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xl font-black ${qty <= 0 ? 'text-rose-600' : qty <= lowStockThreshold ? 'text-amber-600' : 'text-slate-700'}`}>
                            {qty}
                          </span>
                          <Package size={16} className={qty <= 0 ? 'text-rose-400' : 'text-slate-300'} />
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${qty <= 0 ? 'bg-rose-500' : qty <= lowStockThreshold ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${healthPercent}%`}} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(inventoryLevels).length === 0 && (
                  <p className="col-span-full text-center text-slate-400 text-sm py-4 italic">No inventory recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
           {lowStockItems.length > 0 && (
             <div className="bg-white rounded-3xl border border-rose-100 shadow-xl overflow-hidden">
               <div className="bg-rose-600 p-4 text-white flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Urgent Restock Needed</span>
                 </div>
                 {lowStockItems.length > 1 && (
                    <button 
                      onClick={logAllRestocks}
                      className="bg-white/20 hover:bg-white/30 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all flex items-center gap-1"
                    >
                      <FilePlus size={10} /> Log All
                    </button>
                 )}
               </div>
               <div className="p-4 space-y-4">
                 {lowStockItems.slice(0, 3).map(([item, qty]) => {
                   const suggestion = getSupplierSuggestion(item);
                   const restockQty = targetStockLevel - qty;
                   const isLogged = logStatus[item] === 'success';

                   return (
                     <div key={item} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0 group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black text-slate-800 text-xs uppercase">{item}</p>
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">Critical: {qty} left</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-transparent group-hover:border-indigo-100 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                               <Truck size={14} className="text-indigo-500" />
                               <span>Order <strong>{restockQty}</strong> from <strong>{suggestion.market}</strong></span>
                            </div>
                            <button 
                              onClick={() => handleLogRestock(item, restockQty)}
                              disabled={isLogged}
                              className={`p-1.5 rounded-lg transition-all ${isLogged ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}
                              title="Log as Expense"
                            >
                              {isLogged ? <CheckCircle size={14} /> : <FilePlus size={14} />}
                            </button>
                          </div>
                          <div className="flex items-start gap-2 text-[10px] text-slate-500 italic bg-white/50 p-2 rounded-lg">
                            <Store size={12} className="shrink-0 mt-0.5 text-amber-500" />
                            <span>{suggestion.tip}</span>
                          </div>
                        </div>
                     </div>
                   );
                 })}
                 <Link to="/chat" className="block w-full bg-indigo-600 text-white text-center font-black py-3 rounded-2xl text-xs uppercase hover:bg-indigo-700 transition-colors shadow-md flex items-center justify-center gap-2">
                    <Plus size={14} />
                    Log Custom Order
                 </Link>
               </div>
             </div>
           )}

           <div className="bg-white p-6 rounded-3xl border shadow-sm">
             <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Market Hotspots</h4>
             <div className="space-y-4">
                <div className={`p-4 rounded-2xl border bg-rose-50 border-rose-100 text-rose-800`}>
                  <p className="text-[10px] font-black uppercase mb-1">Price Spike: Maize</p>
                  <p className="text-xs font-medium opacity-80 leading-tight">Prices up 15% in Gikomba. Stock up now!</p>
                </div>
                <div className={`p-4 rounded-2xl border bg-emerald-50 border-emerald-100 text-emerald-800`}>
                  <p className="text-[10px] font-black uppercase mb-1">M-Pesa Business Offer</p>
                  <p className="text-xs font-medium opacity-80 leading-tight">0% interest on first KES 10k today.</p>
                </div>
             </div>
           </div>

           <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-indigo-800 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 opacity-20"></div>
             <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="text-emerald-400" size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Bank Readiness</span>
             </div>
             <p className="text-lg font-bold leading-tight mb-4">Your ledger is compliant for bank audit.</p>
             <button 
                onClick={exportAuditReport}
                className="w-full bg-white text-indigo-900 font-black py-3 rounded-2xl text-xs uppercase hover:bg-emerald-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
             >
                <Download size={14} />
                Export Report
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  description: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  isPercentage?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, description, value, color, icon, isPercentage }) => {
  const styles: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm hover:scale-[1.02] transition-transform group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</span>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{description}</span>
        </div>
        <div className={`p-2 rounded-xl transition-colors ${styles[color]}`}>{icon}</div>
      </div>
      <div className="mt-2">
        <h4 className="text-2xl font-black text-slate-800">
          {isPercentage ? value.toFixed(1) : value.toLocaleString()}
          <span className="text-xs ml-1 text-slate-400">{isPercentage ? '%' : 'KES'}</span>
        </h4>
      </div>
    </div>
  );
};

export default Dashboard;
