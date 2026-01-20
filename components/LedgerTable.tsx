
import React, { useState, useMemo } from 'react';
import { 
  Trash2, Search, Download, Receipt, Package, 
  Edit2, Check, X, Scale, ChevronDown, 
  AlertTriangle, Hash, Tag, FilterX, Info, Coins, TrendingUp, FileText
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod, TradeUnit } from '../types';

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

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const search = searchTerm.toLowerCase();
      const productName = (t.item || "").toLowerCase();
      const baseName = (t.baseItem || "").toLowerCase();
      const matchesSearch = productName.includes(search) || baseName.includes(search);
      const matchesType = filterType === 'ALL' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  const totals = useMemo(() => {
    const sales = filtered.filter(t => t.type === TransactionType.INCOME).reduce((a, b) => a + b.amount, 0);
    const costs = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((a, b) => a + b.amount, 0);
    return { sales, costs, net: sales - costs };
  }, [filtered]);

  const exportToCSV = () => {
    const headers = ["Date", "Item", "Transaction Type", "Notes", "Qty", "Unit", "Buying Price (Unit)", "Selling Price (Unit)", "Total KES"];
    const rows = filtered.map(tx => {
      const isExpense = tx.type === TransactionType.EXPENSE;
      const bPrice = isExpense ? tx.unitPrice : tx.costPrice;
      const sPrice = isExpense ? tx.sellingPrice : tx.unitPrice;
      
      return [
        `"${new Date(tx.timestamp).toLocaleDateString()}"`,
        `"${tx.item.toUpperCase()}"`,
        `"${tx.type}"`,
        `"${(tx.originalMessage || "").replace(/"/g, '""')}"`,
        tx.quantity || 1,
        `"${tx.unit || 'PCS'}"`,
        bPrice || 0,
        sPrice || 0,
        tx.amount
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Soko_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditing = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const handleBuyingPriceChange = (val: number) => {
    if (!editForm) return;
    if (editForm.type === TransactionType.EXPENSE) {
      // For Expenses, unitPrice is the cost. Update total amount.
      const newAmount = (editForm.quantity || 1) * val;
      setEditForm({ ...editForm, unitPrice: val, amount: newAmount });
    } else {
      // For Income, costPrice is the COGS basis. Just update basis.
      setEditForm({ ...editForm, costPrice: val });
    }
  };

  const handleSellingPriceChange = (val: number) => {
    if (!editForm) return;
    
    if (editForm.type === TransactionType.INCOME) {
      // Income: unitPrice is the realized selling price. Update total amount.
      const newAmount = (editForm.quantity || 1) * val;
      setEditForm({ ...editForm, unitPrice: val, amount: newAmount });
    } else {
      // Expense: sellingPrice is the target for inventory tracking.
      setEditForm({ ...editForm, sellingPrice: val });
    }
  };

  const handleQuantityChange = (val: number) => {
    if (!editForm) return;
    const price = editForm.unitPrice || 0;
    const newAmount = val * price;
    setEditForm({ ...editForm, quantity: val, amount: newAmount });
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      onUpdate(editForm as Transaction);
      setEditingId(null);
    }
  };

  return (
    <div className="bg-white flex flex-col h-full overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
      <div className="px-5 py-4 border-b bg-white shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase leading-none">SOKO LEDGER</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit Trail & Performance</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={exportToCSV}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Download size={14} /> Download Ledger
            </button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input type="text" placeholder="Search product..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer">
              <option value="ALL">ALL ENTRIES</option>
              <option value={TransactionType.INCOME}>SALES ONLY</option>
              <option value={TransactionType.EXPENSE}>COSTS ONLY</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap gap-8 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
          <span className="text-sm font-black text-emerald-600">KES {totals.sales.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expenses</span>
          <span className="text-sm font-black text-rose-600">KES {totals.costs.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Cash</span>
          <span className={`text-sm font-black ${totals.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>KES {totals.net.toLocaleString()}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase bg-white border border-indigo-50 px-3 py-1 rounded-lg">
           <Scale size={12} className="text-indigo-500" /> MARGIN ACCURACY ACTIVE
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {filtered.length > 0 ? (
          <table className="w-full text-left border-collapse table-fixed min-w-[1250px]">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-200">
                <th className="pl-6 pr-2 py-3 w-28">DATE</th>
                <th className="px-2 py-3 w-44">PRODUCT</th>
                <th className="px-2 py-3 w-64">ORIGINAL NOTE</th>
                <th className="px-2 py-3 w-32 text-center">QTY / UNIT</th>
                <th className="px-2 py-3 w-28 text-right">BUYING PRICE</th>
                <th className="px-2 py-3 w-28 text-right">SELLING PRICE</th>
                <th className="px-2 py-3 w-32 text-right">TOTAL (KES)</th>
                <th className="pr-6 pl-2 py-3 w-24 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((tx) => {
                const isEditing = editingId === tx.id;
                const isExpense = tx.type === TransactionType.EXPENSE;
                const unit = tx.unit || 'PCS';
                
                // For Display
                const currentBuyingPrice = isExpense ? tx.unitPrice : tx.costPrice;
                const currentSellingPrice = isExpense ? tx.sellingPrice : tx.unitPrice;
                
                return (
                  <tr key={tx.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="pl-6 pr-2 py-3">
                      <p className="text-[10px] font-black text-slate-600">{new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                    </td>

                    <td className="px-2 py-3">
                      {isEditing ? (
                        <input type="text" value={editForm.item} onChange={e => setEditForm({...editForm, item: e.target.value})} className="w-full px-2 py-1 border border-indigo-200 rounded text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <div className="space-y-1">
                          <p className="font-black uppercase text-slate-700 text-xs truncate leading-tight">{tx.item}</p>
                          <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isExpense ? 'INVENTORY' : 'SALE'}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-3">
                      <div className="bg-slate-50 border-l-2 border-slate-200 px-3 py-1.5 rounded-r flex items-center min-h-[2.5rem]">
                        <p className="text-[11px] text-slate-500 font-medium italic line-clamp-2">"{tx.originalMessage || "Logged manually"}"</p>
                      </div>
                    </td>

                    <td className="px-2 py-3 text-center">
                       <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <input type="number" value={editForm.quantity} onChange={e => handleQuantityChange(Number(e.target.value))} className="w-16 px-1 py-1 border border-indigo-200 rounded text-center text-xs font-bold outline-none" />
                          ) : (
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-slate-700">{tx.quantity || 1}</span>
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 uppercase">{unit}</span>
                            </div>
                          )}
                       </div>
                    </td>

                    <td className="px-2 py-3 text-right">
                      <div className="flex flex-col items-end">
                         {isEditing ? (
                           <input 
                              type="number" 
                              value={isExpense ? (editForm.unitPrice || 0) : (editForm.costPrice || 0)} 
                              onChange={e => handleBuyingPriceChange(Number(e.target.value))} 
                              className="w-20 px-1 py-1 border border-indigo-200 rounded text-right text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                           />
                         ) : (
                           <>
                             <span className={`text-xs font-black ${isExpense ? 'text-rose-600' : 'text-slate-400'}`}>
                               {currentBuyingPrice ? currentBuyingPrice.toLocaleString() : '-'}
                             </span>
                             {!isExpense && currentBuyingPrice && <span className="text-[7px] font-black text-indigo-300 uppercase tracking-tighter">HISTORICAL BASIS</span>}
                           </>
                         )}
                      </div>
                    </td>

                    <td className="px-2 py-3 text-right">
                      <div className="flex flex-col items-end">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={isExpense ? (editForm.sellingPrice || 0) : (editForm.unitPrice || 0)} 
                            onChange={e => handleSellingPriceChange(Number(e.target.value))} 
                            className="w-20 px-1 py-1 border border-indigo-200 rounded text-right text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                          />
                        ) : (
                          <>
                            <span className={`text-xs font-black ${!isExpense ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {currentSellingPrice ? currentSellingPrice.toLocaleString() : '-'}
                            </span>
                            {!isExpense && <span className="text-[7px] font-black text-emerald-300 uppercase tracking-tighter">REALIZED</span>}
                            {isExpense && <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">TARGET</span>}
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-3 text-right">
                      <p className={`text-sm font-black tracking-tighter ${isExpense ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : ''}{(isEditing ? editForm.amount : tx.amount)?.toLocaleString()}
                      </p>
                    </td>

                    <td className="pr-6 pl-2 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <button onClick={saveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg shadow-sm"><Check size={14}/></button>
                        ) : (
                          <button onClick={() => startEditing(tx)} className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg"><Edit2 size={13}/></button>
                        )}
                        <button onClick={() => onDelete(tx.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 px-4 h-full">
            <FilterX size={64} className="text-slate-100 mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Ledger is empty</p>
            <p className="text-slate-300 text-[10px] mt-2 font-medium">Log trades using the AI Chat or Quick Log button.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerTable;
