
import React, { useState, useEffect } from 'react';
import { X, Save, ShoppingCart, Box, Tag, Calculator, Package, Info, AlertTriangle, TrendingDown } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => { success: boolean, error?: string };
  costBasisMap: Record<string, number>;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, costBasisMap }) => {
  const [formData, setFormData] = useState({
    item: '',
    baseItem: '',
    type: TransactionType.INCOME,
    category: Category.SALES,
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    source: 'Manual' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (formData.type === TransactionType.INCOME) {
      setFormData(prev => ({ ...prev, category: Category.SALES }));
    } else {
      setFormData(prev => ({ ...prev, category: Category.INVENTORY }));
    }
  }, [formData.type]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, amount: prev.quantity * prev.unitPrice }));
  }, [formData.quantity, formData.unitPrice]);

  if (!isOpen) return null;

  const currentItemKey = (formData.baseItem || formData.item).toUpperCase().trim();
  const costBasis = costBasisMap[currentItemKey];
  const isLoss = formData.type === TransactionType.INCOME && costBasis && formData.unitPrice > 0 && formData.unitPrice < costBasis;

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
      baseItem: formData.baseItem.trim().toUpperCase() || formData.item.trim().toUpperCase(),
      type: formData.type,
      category: formData.category,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      amount: formData.amount,
      currency: 'KES',
      source: 'Manual',
      originalMessage: 'Manual entry from dashboard'
    };

    const res = onSave(tx);
    if (res.success) {
      onClose();
      setFormData({
        item: '', baseItem: '', type: TransactionType.INCOME, category: Category.SALES,
        quantity: 1, unitPrice: 0, amount: 0, source: 'Manual'
      });
      setErrors({});
    } else {
      setErrors({ form: res.error || "Failed to add transaction" });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className={`p-6 text-white flex items-center justify-between ${isLoss ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              {isLoss ? <TrendingDown size={20} /> : <Calculator size={20} />}
            </div>
            <div>
              <h3 className="font-black text-lg leading-tight">{isLoss ? 'Loss Warning!' : 'Manual Log'}</h3>
              <p className="text-[10px] uppercase font-bold text-indigo-200 tracking-widest">
                {isLoss ? 'Bei iko chini ya gharama' : 'Weka Records za Duka'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {errors.form && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
              <AlertTriangle size={14} /> {errors.form}
            </div>
          )}

          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.INCOME })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShoppingCart size={14} /> Sale
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE })}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Box size={14} /> Purchase
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                <span>Item Name</span>
                {costBasis && <span className="text-indigo-600 font-bold">Cost: KES {costBasis}</span>}
              </label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  placeholder="e.g. 25KG Sugar Bag"
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-2 rounded-2xl focus:outline-none font-bold transition-all ${errors.item ? 'border-rose-400' : 'border-slate-100 focus:border-indigo-600'}`}
                  value={formData.item}
                  onChange={e => setFormData({ ...formData, item: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="number"
                    min="1"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:outline-none font-bold text-slate-700"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isLoss ? 'text-rose-600' : 'text-slate-400'}`}>
                  {isLoss ? 'Loss Selling Price!' : 'Unit Price'}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl focus:outline-none font-bold text-right ${isLoss ? 'border-rose-400 text-rose-600' : 'border-slate-100 focus:border-indigo-600 text-slate-700'}`}
                  value={formData.unitPrice || ''}
                  onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total:</span>
              <span className={`text-2xl font-black ${isLoss ? 'text-rose-600' : (formData.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600')}`}>
                {formData.amount.toLocaleString()} <span className="text-xs font-bold opacity-60">KES</span>
              </span>
            </div>
            
            <button
              type="submit"
              disabled={isLoss}
              className={`w-full py-5 rounded-[1.5rem] font-black uppercase text-sm transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl ${isLoss ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-200'}`}
            >
              {isLoss ? 'Price Too Low' : <><Save size={18} /> Save Record</>}
            </button>
            {isLoss && <p className="text-center text-rose-500 text-[10px] font-bold mt-3 uppercase tracking-widest">Profit guardrail active: You cannot sell at a loss.</p>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
