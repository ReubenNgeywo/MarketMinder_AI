
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, Receipt, PieChart, PlusCircle, 
  Menu, X, Lock, WifiOff, Wifi, CloudOff, Keyboard, RefreshCw,
  Settings
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import LedgerTable from './components/LedgerTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import SettingsPage from './components/SettingsPage';
import TransactionModal from './components/TransactionModal';
import { Transaction, TransactionType, Category, UserSettings } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>((() => {
    const saved = localStorage.getItem('erp_transactions');
    return saved ? JSON.parse(saved) : [];
  })());

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

  useEffect(() => {
    localStorage.setItem('erp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    if (!settings.pinEnabled) setIsLocked(false);
  }, [settings]);

  const inventoryLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    [...transactions].reverse().forEach(tx => {
      const key = (tx.baseItem || tx.item).toLowerCase().trim();
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

  const costBasisMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...transactions].reverse().forEach(tx => {
      if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY && tx.unitPrice) {
        map[tx.baseItem.toUpperCase().trim()] = tx.unitPrice;
      }
    });
    return map;
  }, [transactions]);

  const addTransaction = useCallback((newTx: Transaction): { success: boolean, error?: string, suggestion?: string } => {
    const key = (newTx.baseItem || newTx.item).toUpperCase().trim();
    
    if (newTx.type === TransactionType.INCOME) {
      const available = inventoryLevels[key.toLowerCase()] || 0;
      if (available < (newTx.quantity || 1)) {
        return { 
          success: false, 
          error: `Huna stock ya kutosha kwa ${newTx.baseItem || newTx.item}! Available: ${available}`,
          suggestion: `Did you buy more and forget to log the purchase?`
        };
      }

      const lastCost = costBasisMap[key];
      if (lastCost && newTx.unitPrice && newTx.unitPrice < lastCost) {
        return {
          success: false,
          error: `LOSS DETECTED! Unauza kwa KES ${newTx.unitPrice}, lakini ulinunua kwa KES ${lastCost}.`,
          suggestion: `To protect your business, I have blocked this sale. Increase price or check your records.`
        };
      }
    }
    
    setTransactions(prev => [newTx, ...prev]);
    return { success: true };
  }, [inventoryLevels, costBasisMap]);

  const updateTransaction = useCallback((updatedTx: Transaction): { success: boolean, error?: string } => {
    // Basic loss check for updates
    if (updatedTx.type === TransactionType.INCOME) {
      const key = (updatedTx.baseItem || updatedTx.item).toUpperCase().trim();
      const lastCost = costBasisMap[key];
      if (lastCost && updatedTx.unitPrice && updatedTx.unitPrice < lastCost) {
        return {
          success: false,
          error: `Cannot update: Sale price (KES ${updatedTx.unitPrice}) is below cost basis (KES ${lastCost}).`
        };
      }
    }

    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    return { success: true };
  }, [costBasisMap]);

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

          {!isOnline && (
            <div className="bg-rose-600 text-white text-[11px] font-bold py-2 px-6 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
              <CloudOff size={14} /> Local-only mode. AI features limited until reconnected.
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} inventoryLevels={inventoryLevels} settings={settings} onAddTransaction={addTransaction} />} />
              <Route path="/chat" element={<ChatInterface onAddTransaction={addTransaction} inventoryLevels={inventoryLevels} transactions={transactions} />} />
              <Route path="/ledger" element={<LedgerTable transactions={transactions} onDelete={(id) => setTransactions(prev => prev.filter(t => t.id !== id))} onUpdate={updateTransaction} />} />
              <Route path="/analytics" element={<AnalyticsPanel transactions={transactions} />} />
              <Route path="/settings" element={<SettingsPage settings={settings} transactions={transactions} onUpdateSettings={setSettings} onClearData={() => setTransactions([])} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
      <TransactionModal isOpen={isManualModalOpen} onClose={() => setManualModalOpen(false)} onSave={addTransaction} costBasisMap={costBasisMap} />
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
