
import React, { useState, useEffect } from 'react';
import { X, Save, ShoppingCart, Box, Tag, Calculator, AlertTriangle, TrendingDown } from 'lucide-react';
import { Transaction, TransactionType, Category, PaymentMethod, TradeUnit } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => { success: boolean, error?: string };
  costBasisMap: Record<string, number>;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, costBasisMap }) => {
  const [formData, setFormData] = useState({
    item: '',
    type: TransactionType.INCOME,
    quantity: 1,
    unit: TradeUnit.PIECE,
    unitPrice: 0,
    paymentMethod: PaymentMethod.CASH,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setErrors({});
  }, [formData.type, isOpen]);

  if (!isOpen) return null;

  const currentItemKey = formData.item.toUpperCase().trim();
  const systemBuyingPrice = costBasisMap[currentItemKey] || 0;
  
  // Logic: For sales (INCOME), check if we're selling below the system-calculated buying price (cost basis)
  const isLoss = formData.type === TransactionType.INCOME && systemBuyingPrice > 0 && formData.unitPrice > 0 && formData.unitPrice < systemBuyingPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.item.trim()) newErrors.item = "Item name is required";
    if (formData.unitPrice <= 0) newErrors.unitPrice = "Price must be > 0";
    if (formData.quantity <= 0) newErrors.quantity = "Qty must be > 0";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const tx: Transaction = {
      id: `manual-${Date.now()}`,
      timestamp: Date.now(),
      item: formData.item.toUpperCase(),
      baseItem: formData.item.trim().toUpperCase(),
      type: formData.type,
      category: formData.type === TransactionType.INCOME ? Category.SALES : Category.INVENTORY,
      quantity: formData.quantity,
      unit: formData.unit,
      unitPrice: formData.unitPrice,
      // System Calculation Logic
      costPrice: formData.type === TransactionType.EXPENSE ? formData.unitPrice : systemBuyingPrice,
      amount: formData.quantity * formData.unitPrice,
      currency: 'KES',
      paymentMethod: formData.paymentMethod,
      source: 'Manual',
      originalMessage: `${formData.quantity} ${formData.unit} of ${formData.item} logged manually.`
    };

    const res = onSave(tx);
    if (res.success) {
      onClose();
      setFormData({
        item: '', type: TransactionType.INCOME, quantity: 1, unit: TradeUnit.PIECE, unitPrice: 0, paymentMethod: PaymentMethod.CASH
      });
    } else {
      setErrors({ form: res.error || "Failed to add record" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className={`p-6 text-white flex items-center justify-between ${isLoss ? 'bg-rose-600 animate-pulse' : (formData.type === TransactionType.INCOME ? 'bg-emerald-600' : 'bg-indigo-600')}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              {isLoss ? <TrendingDown size={20} /> : <Calculator size={20} />}
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight">{isLoss ? 'Loss Warning!' : (formData.type === TransactionType.INCOME ? 'Quick Sale' : 'Add New Stock')}</h3>
              <p className="text-[10px] uppercase font-bold text-white/70 tracking-widest">
                {isLoss ? 'Selling below buying price' : 'System Calculated Audit'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.form && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
              <AlertTriangle size={14} /> {errors.form}
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.INCOME })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShoppingCart size={14} /> Sale
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.EXPENSE ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Box size={14} /> Stock In
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  placeholder="e.g. MAIZE FLOUR"
                  className={`w-full pl-12 pr-4 py-3 bg-slate-50 border-2 rounded-2xl focus:outline-none font-bold transition-all text-sm uppercase ${errors.item ? 'border-rose-400' : 'border-slate-100 focus:border-indigo-600'}`}
                  value={formData.item}
                  onChange={e => setFormData({ ...formData, item: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty & Unit</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:outline-none font-bold text-slate-700 text-sm"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                  <select 
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value as TradeUnit })}
                    className="px-2 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[9px] uppercase outline-none"
                  >
                    {Object.values(TradeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLoss ? 'text-rose-600' : 'text-slate-400'}`}>
                   {formData.type === TransactionType.INCOME ? 'Selling Price' : 'Buying Price'}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-2xl focus:outline-none font-bold text-right text-sm ${isLoss ? 'border-rose-400 text-rose-600' : 'border-slate-100 focus:border-indigo-600 text-slate-700'}`}
                  value={formData.unitPrice || ''}
                  onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            
            {formData.type === TransactionType.INCOME && systemBuyingPrice > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Buying Price (System)</span>
                <span className="text-sm font-black text-indigo-700">KES {systemBuyingPrice}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Transaction:</span>
              <span className={`text-xl font-black ${formData.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {(formData.quantity * formData.unitPrice).toLocaleString()} <span className="text-[10px] font-bold opacity-60">KES</span>
              </span>
            </div>
            <button
              type="submit"
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg ${isLoss ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' : (formData.type === TransactionType.INCOME ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700')}`}
            >
              <Save size={16} /> {formData.type === TransactionType.INCOME ? 'Log Sale' : 'Log Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
