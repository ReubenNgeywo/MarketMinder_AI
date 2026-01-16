
import React, { useState, useMemo } from 'react';
import { 
  Trash2, Search, Filter, Download, Receipt, Smartphone, 
  Mic, Zap, Package, Edit2, Check, X, Calculator, 
  Info, TrendingUp, ArrowUpRight, ArrowDownRight,
  ClipboardList, ShoppingBag, Layers, AlertTriangle, FileText
} from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';

interface LedgerTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (tx: Transaction) => { success: boolean, error?: string };
}

const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const costBasisMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...transactions].reverse().forEach(tx => {
      if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY && tx.unitPrice) {
        map[tx.baseItem.toUpperCase()] = tx.unitPrice;
      }
    });
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.originalMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.baseItem.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("No records found to export.");
      return;
    }

    // Headers count: 8
    const headers = ["Date", "Flow", "Item", "Quantity", "Unit Price", "Total Amount", "Source", "Notes"];
    
    const rows = filtered.map(tx => {
      const dateStr = `"${new Date(tx.timestamp).toLocaleString().replace(/"/g, '""')}"`;
      const flowStr = tx.type === TransactionType.INCOME ? "SALE" : "STOCK";
      const itemStr = `"${tx.item.replace(/"/g, '""')}"`;
      const qty = tx.quantity || 1;
      const unitPrice = tx.unitPrice || 0;
      const totalAmount = tx.amount;
      const sourceStr = `"${tx.source.replace(/"/g, '""')}"`;
      const notesStr = `"${tx.originalMessage.replace(/"/g, '""')}"`;

      return [dateStr, flowStr, itemStr, qty, unitPrice, totalAmount, sourceStr, notesStr];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Soko_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Voice': return <Mic size={14} className="text-indigo-500" />;
      case 'M-Pesa': return <Zap size={14} className="text-emerald-500" />;
      case 'SMS': return <Smartphone size={14} className="text-slate-500" />;
      case 'Receipt Scan': return <Receipt size={14} className="text-amber-500" />;
      default: return <Smartphone size={14} />;
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
    setEditError(null);
  };

  const handleEditFieldChange = (field: keyof Transaction, value: any) => {
    setEditForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : (next.quantity || 1));
        const up = Number(field === 'unitPrice' ? value : (next.unitPrice || 0));
        next.amount = qty * up;
      }
      return next;
    });
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      const result = onUpdate(editForm as Transaction);
      if (result.success) {
        setEditingId(null);
        setEditForm({});
        setEditError(null);
      } else {
        setEditError(result.error || "Update failed");
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Soko Ledger</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Audit-Ready Trade Records</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48 text-sm font-medium shadow-inner"
              />
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-black uppercase tracking-widest text-slate-600 cursor-pointer"
            >
              <option value="ALL">All Flows</option>
              <option value={TransactionType.INCOME}>Sales (+)</option>
              <option value={TransactionType.EXPENSE}>Costs (-)</option>
            </select>
            
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl transition-all text-xs font-black uppercase shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b">
            <tr>
              <th className="px-6 py-4">Flow</th>
              <th className="px-6 py-4">Transaction Details</th>
              <th className="px-6 py-4">Quantity (Base)</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(tx => {
              const isEditing = editingId === tx.id;
              const isIncome = tx.type === TransactionType.INCOME;
              
              const currentUnitPrice = isEditing ? (editForm.unitPrice || 0) : (tx.unitPrice || 0);
              const currentQty = isEditing ? (editForm.quantity || 1) : (tx.quantity || 1);
              const currentItemName = isEditing ? (editForm.item || '') : tx.item;
              const currentBaseItem = isEditing ? (editForm.baseItem || '') : tx.baseItem;
              
              const costPrice = costBasisMap[currentBaseItem.toUpperCase()];
              const profitPerUnit = (isIncome && currentUnitPrice && costPrice) ? currentUnitPrice - costPrice : null;
              const totalProfit = profitPerUnit ? profitPerUnit * currentQty : null;
              const isEditLoss = isIncome && costPrice && currentUnitPrice < costPrice;

              return (
                <tr key={tx.id} className={`hover:bg-slate-50/80 transition-all group border-l-4 ${isIncome ? 'border-l-emerald-400' : 'border-l-rose-400'} ${isEditing ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-6 py-6">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg w-fit ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {isIncome ? <ArrowUpRight size={14} /> : <Layers size={14} />}
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {isIncome ? 'Sale' : 'Stock'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input 
                          className="w-full p-2 border border-indigo-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                          value={currentItemName}
                          onChange={e => handleEditFieldChange('item', e.target.value)}
                        />
                        {editError && <p className="text-[9px] text-rose-500 font-bold uppercase">{editError}</p>}
                      </div>
                    ) : (
                      <div className="max-w-xs">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{tx.item}</p>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                           {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                           <span className="italic opacity-70 truncate max-w-[150px]">"{tx.originalMessage}"</span>
                        </p>
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            className="w-16 p-2 border border-indigo-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                            value={currentQty}
                            onChange={e => handleEditFieldChange('quantity', Number(e.target.value))}
                          />
                          <span className="text-slate-300 font-bold">@</span>
                          <input 
                            type="number"
                            className={`w-24 p-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold ${isEditLoss ? 'border-rose-400 text-rose-600' : 'border-indigo-200'}`}
                            value={currentUnitPrice}
                            onChange={e => handleEditFieldChange('unitPrice', Number(e.target.value))}
                          />
                        </div>
                        {isEditLoss && (
                          <div className="flex items-center gap-1 text-rose-500">
                             <AlertTriangle size={10} />
                             <span className="text-[8px] font-black uppercase">Loss detected (Cost: {costPrice})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Package size={14} className="text-slate-300" />
                          <span className="text-xs font-bold">
                            {tx.quantity} <span className="text-[9px] uppercase text-slate-400 ml-1">{tx.unit || 'PCS'}</span>
                          </span>
                        </div>
                        {isIncome && totalProfit !== null && totalProfit > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                             <TrendingUp size={10} className="text-emerald-500" />
                             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">
                               Faida: +{totalProfit.toLocaleString()}
                             </span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 w-fit shadow-sm">
                      {getSourceIcon(tx.source)}
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tx.source}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                     <div className="flex flex-col items-end">
                       <span className={`text-sm font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}{(isEditing ? (editForm.amount || 0) : tx.amount).toLocaleString()}
                       </span>
                       <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">{tx.currency}</span>
                     </div>
                  </td>

                  <td className="px-6 py-4">
                     <div className="flex items-center justify-center gap-2">
                       {isEditing ? (
                         <>
                           <button onClick={handleSaveEdit} className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95">
                             <Check size={16} />
                           </button>
                           <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all">
                             <X size={16} />
                           </button>
                         </>
                       ) : (
                         <>
                           <button onClick={() => handleStartEdit(tx)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                             <Edit2 size={16} />
                           </button>
                           <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                             <Trash2 size={16} />
                           </button>
                         </>
                       )}
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
               <ClipboardList size={48} />
            </div>
            <p className="text-slate-800 font-black uppercase text-xs tracking-widest">Hujarekodi chochote</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerTable;
