
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, Receipt, PieChart, PlusCircle, 
  Menu, X, Lock, WifiOff, Wifi, CloudOff, Keyboard, RefreshCw,
  Settings, Undo2
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import LedgerTable from './components/LedgerTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import SettingsPage from './components/SettingsPage';
import TransactionModal from './components/TransactionModal';
import { Transaction, TransactionType, Category, UserSettings, PaymentMethod, TradeUnit } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('erp_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('erp_settings');
    return saved ? JSON.parse(saved) : {
      shopName: "Nairobi Traders Ltd",
      location: "Gikomba",
      preferredLanguage: 'Sheng',
      aiDataConsent: false,
      pinEnabled: false,
      pinCode: "1234"
    };
  });

  const [isLocked, setIsLocked] = useState(settings.pinEnabled);
  const [pinInput, setPinInput] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  
  // Undo State
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ tx: Transaction; index: number } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // System Calculation: Maintain a map of the last buying price for every item
  const costBasisMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...transactions].sort((a, b) => a.timestamp - b.timestamp).forEach(tx => {
      if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY && tx.unitPrice) {
        map[(tx.baseItem || tx.item).toUpperCase().trim()] = tx.unitPrice;
      }
    });
    return map;
  }, [transactions]);

  const transactionsWithBalance = useMemo(() => {
    let balance = 0;
    return [...transactions].sort((a, b) => a.timestamp - b.timestamp).map(tx => {
      const delta = tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;
      balance += delta;
      return { ...tx, runningBalance: balance };
    }).reverse();
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('erp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    if (!settings.pinEnabled) setIsLocked(false);
  }, [settings]);

  const inventoryLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    transactions.forEach(tx => {
      const key = (tx.baseItem || tx.item).toUpperCase().trim();
      const qty = tx.quantity || 1;
      if (!levels[key]) levels[key] = 0;
      if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY) {
        levels[key] += qty;
      } else if (tx.type === TransactionType.INCOME) {
        levels[key] -= qty;
      }
    });
    return levels;
  }, [transactions]);

  const unitMap = useMemo(() => {
    const map: Record<string, string> = {};
    [...transactions].sort((a, b) => a.timestamp - b.timestamp).forEach(tx => {
      const key = (tx.baseItem || tx.item).toUpperCase().trim();
      if (tx.unit) map[key] = tx.unit;
    });
    return map;
  }, [transactions]);

  const addTransaction = useCallback((newTx: Transaction): { success: boolean, error?: string, suggestion?: string } => {
    const key = (newTx.baseItem || newTx.item).toUpperCase().trim();
    
    // Strict Duplicate Prevention: Improved accuracy check
    const isDuplicate = transactions.some(t => {
      const sameItem = (t.baseItem || t.item).toUpperCase().trim() === key;
      const sameAmount = Math.abs(t.amount - newTx.amount) < 0.1; // Float safety
      const sameQty = t.quantity === newTx.quantity;
      const sameType = t.type === newTx.type;
      const timeWindow = Math.abs(t.timestamp - newTx.timestamp) < 3600000; // 1 Hour window
      // Only treat as duplicate if all core parameters match within the time window
      return sameItem && sameAmount && sameQty && sameType && timeWindow;
    });

    if (isDuplicate) {
      return { 
        success: false, 
        error: `Iko tayari kwa rekodi zako!`,
        suggestion: `The same entry for "${newTx.item}" was logged less than an hour ago. If this is a separate trade, please wait a bit or adjust the note.`
      };
    }

    // System Calculation of Buying Price (costPrice)
    const systemBuyingPrice = costBasisMap[key] || 0;

    if (newTx.type === TransactionType.INCOME) {
      // Logic for Sales: Ensure we have stock and check for losses
      const available = inventoryLevels[key] || 0;
      if (available < (newTx.quantity || 1)) {
        return { 
          success: false, 
          error: `Huna stock ya kutosha kwa "${newTx.item}"!`,
          suggestion: `Current stock: ${available} ${newTx.unit || 'PCS'}. Please log a purchase or restock first.`
        };
      }

      // Profit Safety: Only block if user is definitely losing money compared to cost basis
      if (systemBuyingPrice > 0 && newTx.unitPrice && newTx.unitPrice < systemBuyingPrice) {
        return {
          success: false,
          error: `UNAPATA HASARA! (Loss Detected)`,
          suggestion: `Buying price for "${newTx.item}" is KES ${systemBuyingPrice.toLocaleString()}, but you're selling at KES ${newTx.unitPrice.toLocaleString()}. This sale is blocked to save your business.`
        };
      }
      
      // Inject system-calculated cost price (COGS tracking)
      newTx.costPrice = systemBuyingPrice;
    } else {
      // Logic for Purchases: The current unit price becomes the buying price basis
      newTx.costPrice = newTx.unitPrice;
    }
    
    setTransactions(prev => [newTx, ...prev]);
    return { success: true };
  }, [transactions, inventoryLevels, costBasisMap]);

  const updateTransaction = useCallback((updatedTx: Transaction): { success: boolean, error?: string } => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    return { success: true };
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      const itemToDelete = transactions[index];
      setRecentlyDeleted({ tx: itemToDelete, index });
      setShowUndoToast(true);
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShowUndoToast(false);
      }, 5000);
    }
  }, [transactions]);

  const undoDelete = useCallback(() => {
    if (recentlyDeleted) {
      setTransactions(prev => {
        const updated = [...prev];
        updated.splice(recentlyDeleted.index, 0, recentlyDeleted.tx);
        return updated;
      });
      setRecentlyDeleted(null);
      setShowUndoToast(false);
    }
  }, [recentlyDeleted]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.pinCode) {
      setIsLocked(false);
      setPinInput("");
    } else {
      alert("Invalid PIN.");
      setPinInput("");
    }
  };

  if (isLocked) {
    return (
      <div className="h-screen bg-indigo-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-10 w-full max-sm text-center shadow-2xl animate-in zoom-in duration-300">
           <Lock size={48} className="text-indigo-600 mx-auto mb-6" />
           <h1 className="text-2xl font-black text-slate-800 mb-2">{settings.shopName}</h1>
           <p className="text-sm text-slate-400 mb-8 uppercase tracking-widest font-bold">Secure Vault</p>
           <form onSubmit={handlePinSubmit} className="space-y-4">
             <input 
               type="password" 
               maxLength={4}
               value={pinInput}
               onChange={(e) => setPinInput(e.target.value)}
               placeholder="PIN"
               className="w-full text-center text-3xl tracking-widest p-4 bg-slate-50 border-2 rounded-2xl focus:border-indigo-600 focus:outline-none font-black"
               autoFocus
             />
             <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-sm">Unlock</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={`fixed md:relative z-50 h-full w-64 bg-indigo-900 text-white transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-400 p-2 rounded-lg"><Receipt size={24} className="text-indigo-900" /></div>
              <h1 className="text-xl font-bold">MarketMinder</h1>
            </div>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X size={24} /></button>
          </div>
          <nav className="mt-6 px-4 space-y-2">
            <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/chat" icon={<MessageSquare size={20} />} label="AI Chat" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/ledger" icon={<Receipt size={20} />} label="Ledger" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/analytics" icon={<PieChart size={20} />} label="Business Health" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/settings" icon={<Settings size={20} />} label="Settings" onClick={() => setSidebarOpen(false)} />
          </nav>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20">
            <button className="md:hidden text-slate-600" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <div className="flex-1 px-4 flex items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-700 hidden md:block">{settings.shopName}</h2>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : (isOnline ? <Wifi size={12} /> : <WifiOff size={12} />)}
                {isSyncing ? 'Syncing...' : (isOnline ? 'Cloud Active' : 'Offline Mode')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setManualModalOpen(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full transition-all text-sm font-medium shadow-md shadow-emerald-200">
                <Keyboard size={18} />
                <span className="hidden sm:inline">Quick Log</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactionsWithBalance} inventoryLevels={inventoryLevels} unitMap={unitMap} settings={settings} onAddTransaction={addTransaction} />} />
              <Route path="/chat" element={<ChatInterface onAddTransaction={addTransaction} inventoryLevels={inventoryLevels} transactions={transactionsWithBalance} settings={settings} isOnline={isOnline} />} />
              <Route path="/ledger" element={<LedgerTable transactions={transactionsWithBalance} onDelete={deleteTransaction} onUpdate={updateTransaction} />} />
              <Route path="/analytics" element={<AnalyticsPanel transactions={transactionsWithBalance} />} />
              <Route path="/settings" element={<SettingsPage settings={settings} transactions={transactionsWithBalance} onUpdateSettings={setSettings} onClearData={() => setTransactions([])} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>

          {/* Undo Notification Toast */}
          {showUndoToast && recentlyDeleted && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
               <div className="bg-indigo-950 text-white p-4 rounded-[1.5rem] shadow-2xl flex items-center justify-between border border-indigo-800 animate-in slide-in-from-bottom-10 duration-300">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-rose-500 rounded-lg"><Undo2 size={18} /></div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-widest">Deleted Record</p>
                        <p className="text-[10px] text-indigo-300 font-bold truncate max-w-[150px]">{recentlyDeleted.tx.item} - KES {recentlyDeleted.tx.amount}</p>
                     </div>
                  </div>
                  <button 
                    onClick={undoDelete}
                    className="bg-emerald-500 hover:bg-emerald-400 text-indigo-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Undo
                  </button>
               </div>
               {/* Progress Timer Bar */}
               <div className="mt-1 h-1 bg-indigo-900 rounded-full overflow-hidden mx-4">
                  <div className="h-full bg-emerald-500 animate-[undo-progress_5s_linear_forwards]" />
               </div>
            </div>
          )}
        </main>
      </div>
      <TransactionModal isOpen={isManualModalOpen} onClose={() => setManualModalOpen(false)} onSave={addTransaction} costBasisMap={costBasisMap} />
      
      <style>{`
        @keyframes undo-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </HashRouter>
  );
};

const SidebarLink = ({ to, icon, label, onClick }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-indigo-700 text-white shadow-lg' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
      {icon}<span className="font-medium">{label}</span>
    </Link>
  );
};

export default App;
