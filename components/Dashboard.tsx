
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Box, ArrowRight, AlertCircle, Zap, ShieldCheck, ShoppingCart, Package, BarChart3, Truck, Factory, Percent, Sparkles, Plus, Download, Coins, Store, FilePlus, CheckCircle, Scale } from 'lucide-react';
import { Transaction, TransactionType, Category, UserSettings, PaymentMethod, TradeUnit } from '../types';
import { Link } from 'react-router-dom';

interface DashboardProps {
  transactions: Transaction[];
  inventoryLevels: Record<string, number>;
  unitMap: Record<string, string>;
  settings: UserSettings;
  onAddTransaction: (tx: Transaction) => { success: boolean, error?: string };
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, inventoryLevels, unitMap, settings, onAddTransaction }) => {
  const [logStatus, setLogStatus] = useState<Record<string, 'idle' | 'success'>>({});

  const totalRevenue = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  const cogs = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.category === Category.INVENTORY)
    .reduce((acc, t) => acc + t.amount, 0);

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

  const getSupplierSuggestion = (item: string) => {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('rice') || lowerItem.includes('sugar') || lowerItem.includes('maize') || lowerItem.includes('unga')) {
      return { market: "Wakulima Market", tip: "Bulk prices are lowest on Tuesday mornings." };
    }
    if (lowerItem.includes('egg') || lowerItem.includes('kuku') || lowerItem.includes('meat')) {
      return { market: "City Market / Njiru", tip: "Verify cold chain for large batches." };
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
    const unit = unitMap[item.toUpperCase()] || TradeUnit.PIECE;
    
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
      paymentMethod: PaymentMethod.CASH,
      unit: unit,
      source: "Manual",
      originalMessage: `Dashboard suggested restock: ${qty} ${unit} of ${item}`,
    };

    const res = onAddTransaction(newTx);
    if (res.success) {
      setLogStatus(prev => ({ ...prev, [item]: 'success' }));
      setTimeout(() => setLogStatus(prev => ({ ...prev, [item]: 'idle' })), 3000);
    }
  };

  const exportAuditReport = () => {
    const sortedTransactions = [...transactions].sort((a, b) => b.timestamp - a.timestamp);
    const reportData = [
      ["MARKETMINDER BUSINESS COMPLIANCE REPORT"],
      ["Shop Name:", `"${settings.shopName}"`],
      ["Export Date:", `"${new Date().toLocaleString()}"`],
      [""],
      ["FINANCIAL SUMMARY"],
      ["Total Revenue:", totalRevenue],
      ["Cost of Goods Sold:", cogs],
      ["NET PROFIT:", netProfit],
      [""],
      ["LEDGER (SMALLEST UNIT BREAKDOWN)"],
      ["Date", "Item", "Type", "Qty", "Unit", "Unit Price", "Total"]
    ];

    sortedTransactions.forEach(tx => {
      reportData.push([
        new Date(tx.timestamp).toLocaleString(),
        tx.item,
        tx.type,
        tx.quantity || 1,
        tx.unit || 'PCS',
        tx.unitPrice || 0,
        tx.amount
      ]);
    });

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Audit_Report_${settings.shopName}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      {isNewUser ? (
        <div className="bg-white rounded-[2rem] border-2 border-dashed border-indigo-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Karibu MarketMinder AI!</h2>
          <p className="text-slate-500 max-w-lg mx-auto">Hujarekodi biashara yoyote bado. Hebu tuanze kwa kuongeza stock uliyo nayo kwa sasa ndio tuanze kupiga hesabu!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/chat" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2"><Plus size={18} /> Add My Initial Stock</Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
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
               <p className="text-[10px] uppercase font-bold text-indigo-200 mb-1">Stock Value</p>
               <p className="text-xl font-black">{cogs.toLocaleString()}</p>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Sales" description="Revenue collected" value={totalRevenue} color="emerald" icon={<TrendingUp size={20} />} />
        <MetricCard label="Gross Profit" description="After stock costs" value={grossProfit} color="indigo" icon={<Coins size={20} />} />
        <MetricCard label="Net Profit" description="Take-home cash" value={netProfit} color="amber" icon={<Wallet size={20} />} />
        <MetricCard label="Gross Margin" description="Markup Health" value={grossMargin} color="emerald" icon={<Percent size={20} />} isPercentage />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Recent Activity</h3>
              <Link to="/ledger" className="text-xs font-bold text-indigo-600 flex items-center gap-1">Full Ledger <ArrowRight size={14} /></Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length > 0 ? recent.map(tx => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {tx.type === TransactionType.INCOME ? <ShoppingCart size={20} /> : <Box size={20} />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase truncate max-w-[120px] sm:max-w-none">{tx.item}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{tx.category}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                        <span className="text-[10px] font-black text-indigo-500 uppercase">{tx.quantity} {tx.unit || 'PCS'}</span>
                      </div>
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
                  <p className="text-slate-400 font-medium">No activity recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Smallest Unit Stock Health</h3>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Healthy</span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[9px] font-bold text-slate-400 uppercase">Low</span></div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.entries(inventoryLevels) as [string, number][]).slice(0, 8).map(([item, qty]) => {
                  const healthPercent = Math.min(100, (qty / targetStockLevel) * 100);
                  const unit = unitMap[item.toUpperCase()] || 'PCS';
                  const isKg = unit === 'KG';
                  
                  return (
                    <div key={item} className={`p-4 rounded-2xl border flex flex-col justify-between h-32 ${qty <= lowStockThreshold ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 truncate">{item}</p>
                        <div className="flex items-end gap-1">
                          <span className={`text-xl font-black leading-none ${qty <= lowStockThreshold ? 'text-rose-600' : 'text-slate-700'}`}>{qty}</span>
                          <span className={`text-[10px] font-black uppercase pb-0.5 ${isKg ? 'text-emerald-600' : 'text-indigo-600'}`}>{unit}</span>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-black text-slate-300 uppercase">Health</span>
                          <span className="text-[8px] font-black text-slate-400">{Math.round(healthPercent)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${qty <= lowStockThreshold ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${healthPercent}%`}} />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    <span className="text-[10px] font-black uppercase tracking-widest">Restock Warning</span>
                 </div>
               </div>
               <div className="p-4 space-y-4">
                 {lowStockItems.slice(0, 3).map(([item, qty]) => {
                   const suggestion = getSupplierSuggestion(item);
                   const unit = unitMap[item.toUpperCase()] || 'PCS';
                   const isLogged = logStatus[item] === 'success';

                   return (
                     <div key={item} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0 group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-black text-slate-800 text-xs uppercase">{item}</p>
                          <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{qty} {unit} LEFT</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-transparent group-hover:border-indigo-100 transition-colors">
                           <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2 text-[11px] text-slate-700 font-bold">
                                <Truck size={14} className="text-indigo-500" />
                                <span>Go to {suggestion.market}</span>
                              </div>
                              <button onClick={() => handleLogRestock(item, targetStockLevel - qty)} disabled={isLogged} className={`p-1.5 rounded-lg transition-all ${isLogged ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}>
                                {isLogged ? <CheckCircle size={14} /> : <FilePlus size={14} />}
                              </button>
                           </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
             <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="text-emerald-400" size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Compliance</span>
             </div>
             <p className="text-lg font-bold leading-tight mb-4">Your audit log is ready for bank review.</p>
             <button onClick={exportAuditReport} className="w-full bg-white text-indigo-900 font-black py-3 rounded-2xl text-xs uppercase hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
                <Download size={14} /> Export Report
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
