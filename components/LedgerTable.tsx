
import React, { useState } from 'react';
import { Trash2, Search, Filter, Download, ArrowUpRight, ArrowDownLeft, Receipt, Smartphone, Mic, Zap, Package, Banknote } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

interface LedgerTableProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | string>('ALL');

  // Extract unique currencies from transactions for the filter
  const availableCurrencies = Array.from(new Set(transactions.map(t => t.currency)));

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
      default: return <Smartphone size={14} />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Soko Ledger</h3>
          <p className="text-sm text-slate-500">Sub-ledger with bulk item breakdowns</p>
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

          <select 
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-600"
          >
            <option value="ALL">All Currencies</option>
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            {availableCurrencies.filter(c => c !== 'KES' && c !== 'USD').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all ml-auto md:ml-0">
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
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className={`w-2 h-2 rounded-full ${tx.type === TransactionType.INCOME ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`}></div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800 uppercase">{tx.item}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {tx.quantity && tx.unitPrice ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Package size={14} className="text-slate-400" />
                      <span className="text-xs font-medium">
                        {tx.quantity} <span className="text-[10px] text-slate-400">×</span> {tx.unitPrice.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">No bulk data</span>
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
                     <span>{tx.amount.toLocaleString()}</span>
                     <span className="text-[9px] uppercase opacity-60">{tx.currency || 'KES'}</span>
                   </div>
                </td>
                <td className="px-6 py-4 text-right">
                   <button onClick={() => onDelete(tx.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                   </button>
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
