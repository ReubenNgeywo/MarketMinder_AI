
import React, { useState, useEffect } from 'react';
import { Trash2, Search, Filter, Download, Receipt, Smartphone, Mic, Zap, Package, Edit2, Check, X, Calculator } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

interface LedgerTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (tx: Transaction) => void;
}

const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | string>('ALL');
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const filtered = transactions.filter(t => {
    const matchesSearch = t.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.originalMessage.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesCurrency = filterCurrency === 'ALL' || t.currency === filterCurrency;
    return matchesSearch && matchesType && matchesCurrency;
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Voice': return <Mic size={14} className="text-indigo-500" />;
      case 'M-Pesa': return <Zap size={14} className="text-emerald-500" />;
      case 'SMS': return <Smartphone size={14} className="text-slate-500" />;
      case 'Receipt Scan': return <Receipt size={14} className="text-indigo-400" />;
      default: return <Smartphone size={14} />;
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const handleEditFieldChange = (field: keyof Transaction, value: any) => {
    setEditForm(prev => {
      const next = { ...prev, [field]: value };
      
      // Real-time recalculation of amount if qty or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : (next.quantity || 0));
        const price = Number(field === 'unitPrice' ? value : (next.unitPrice || 0));
        next.amount = qty * price;
      }
      
      return next;
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      onUpdate(editForm as Transaction);
      setEditingId(null);
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = [
      'ID', 'Date', 'Item', 'Type', 'Category', 'Quantity', 'Unit Price', 'Total Amount', 'Currency', 'Source', 'Original Message'
    ];

    const rows = filtered.map(tx => {
      const dateStr = new Date(tx.timestamp).toISOString().replace('T', ' ').substring(0, 19);
      return [
        tx.id,
        `"${dateStr}"`,
        `"${tx.item.replace(/"/g, '""')}"`,
        tx.type,
        tx.category,
        tx.quantity || '',
        tx.unitPrice || '',
        tx.amount,
        tx.currency,
        `"${tx.source}"`,
        `"${tx.originalMessage.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `MarketMinder_Ledger_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Soko Ledger</h3>
          <p className="text-sm text-slate-500">Transaction history with inline editing</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48 text-sm"
            />
          </div>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-600"
          >
            <option value="ALL">All Types</option>
            <option value={TransactionType.INCOME}>Income</option>
            <option value={TransactionType.EXPENSE}>Expense</option>
          </select>

          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all ml-auto md:ml-0"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Transaction Details</th>
              <th className="px-6 py-4">Pricing Breakdown</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(tx => (
              <tr key={tx.id} className={`hover:bg-slate-50/80 transition-colors group ${editingId === tx.id ? 'bg-indigo-50/70' : ''}`}>
                <td className="px-6 py-4">
                  <div className={`w-2 h-2 rounded-full ${tx.type === TransactionType.INCOME ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`}></div>
                </td>
                <td className="px-6 py-4">
                  {editingId === tx.id ? (
                    <div className="space-y-1">
                      <input 
                        className="w-full p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        value={editForm.item}
                        onChange={e => handleEditFieldChange('item', e.target.value)}
                        autoFocus
                      />
                      <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Editing Item Name</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800 uppercase">{tx.item}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === tx.id ? (
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <input 
                          type="number"
                          placeholder="Qty"
                          className="w-16 p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={editForm.quantity}
                          onChange={e => handleEditFieldChange('quantity', Number(e.target.value))}
                        />
                      </div>
                      <span className="text-slate-400">×</span>
                      <div className="space-y-1">
                        <input 
                          type="number"
                          placeholder="Price"
                          className="w-24 p-2 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={editForm.unitPrice}
                          onChange={e => handleEditFieldChange('unitPrice', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  ) : (
                    tx.quantity && tx.unitPrice ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-xs font-medium">
                          {tx.quantity} <span className="text-[10px] text-slate-400">×</span> {tx.unitPrice.toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">No bulk data</span>
                    )
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1 w-fit border border-slate-200">
                    {getSourceIcon(tx.source || 'SMS')}
                    <span className="text-[10px] font-bold text-slate-600 uppercase">{tx.source || 'SMS'}</span>
                  </div>
                </td>
                <td className={`px-6 py-4 text-right font-black ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                   <div className="flex flex-col items-end">
                     <span className="flex items-center gap-1">
                        {editingId === tx.id && <Calculator size={10} className="text-indigo-400" />}
                        {editingId === tx.id 
                          ? (editForm.amount || 0).toLocaleString()
                          : (tx.amount || 0).toLocaleString()
                        }
                     </span>
                     <span className="text-[9px] uppercase opacity-60">{tx.currency || 'KES'}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                     {editingId === tx.id ? (
                       <>
                         <button 
                           onClick={handleSaveEdit} 
                           className="p-2 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-all active:scale-95"
                           title="Save Changes"
                         >
                           <Check size={16} />
                         </button>
                         <button 
                           onClick={() => setEditingId(null)} 
                           className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-all active:scale-95"
                           title="Cancel"
                         >
                           <X size={16} />
                         </button>
                       </>
                     ) : (
                       <>
                         <button 
                            onClick={() => handleStartEdit(tx)} 
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            title="Edit Record"
                         >
                           <Edit2 size={16} />
                         </button>
                         <button 
                            onClick={() => onDelete(tx.id)} 
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-1"
                            title="Delete Record"
                         >
                           <Trash2 size={16} />
                         </button>
                       </>
                     )}
                   </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  No transactions found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LedgerTable;
