
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Receipt, 
  PieChart, 
  PlusCircle,
  Menu,
  X,
  TrendingUp,
  AlertCircle,
  Settings,
  ShieldAlert,
  Lock,
  WifiOff,
  Wifi,
  CloudOff,
  Keyboard
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import LedgerTable from './components/LedgerTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import SettingsPage from './components/SettingsPage';
import TransactionModal from './components/TransactionModal';
import { Transaction, TransactionType, Category, UserSettings } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('erp_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('erp_settings');
    return saved ? JSON.parse(saved) : {
      shopName: "My Shop",
      location: "Nairobi",
      preferredLanguage: 'English',
      aiDataConsent: false,
      pinEnabled: false,
      pinCode: "1234"
    };
  });

  const [isLocked, setIsLocked] = useState(settings.pinEnabled);
  const [pinInput, setPinInput] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isManualModalOpen, setManualModalOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
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

  // Compute inventory levels with normalized keys
  const inventoryLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    // Process transactions in chronological order (reverse of the state array)
    [...transactions].reverse().forEach(tx => {
      const itemKey = tx.item.toLowerCase().trim();
      const qty = tx.quantity || 1;
      if (!levels[itemKey]) levels[itemKey] = 0;
      if (tx.type === TransactionType.EXPENSE && tx.category === Category.INVENTORY) {
        levels[itemKey] += qty;
      } else if (tx.type === TransactionType.INCOME) {
        levels[itemKey] -= qty;
      }
    });
    return levels;
  }, [transactions]);

  const addTransaction = useCallback((newTx: Transaction): { success: boolean, error?: string, suggestion?: string } => {
    if (newTx.type === TransactionType.INCOME) {
      const inputKey = newTx.item.toLowerCase().trim();
      
      let matchedKey = Object.keys(inventoryLevels).find(k => k === inputKey);
      
      if (!matchedKey) {
        matchedKey = Object.keys(inventoryLevels).find(k => k.includes(inputKey) || inputKey.includes(k));
      }

      const available = matchedKey ? inventoryLevels[matchedKey] : 0;
      const requested = newTx.quantity || 1;

      if (available < requested) {
        const itemName = matchedKey ? matchedKey.toUpperCase() : newTx.item.toUpperCase();
        const suggestion = Object.keys(inventoryLevels)
          .filter(k => inventoryLevels[k] > 0)
          .slice(0, 3)
          .map(k => `${k.toUpperCase()} (${inventoryLevels[k]})`)
          .join(', ');

        return { 
          success: false, 
          error: `Huna stock ya kutosha! Uko na ${available} ${itemName} pekee. Unajaribu kuuza ${requested}.`,
          suggestion: suggestion ? `Uko na stock ya: ${suggestion}` : "Huna stock yoyote kwa sasa."
        };
      }

      if (matchedKey && matchedKey !== inputKey) {
        newTx.item = matchedKey.toUpperCase();
      }
    }
    
    setTransactions(prev => [newTx, ...prev]);
    return { success: true };
  }, [inventoryLevels]);

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.pinCode) {
      setIsLocked(false);
      setPinInput("");
    } else {
      alert("Invalid PIN. Try again.");
      setPinInput("");
    }
  };

  if (isLocked) {
    return (
      <div className="h-screen bg-indigo-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-10 w-full max-sm text-center shadow-2xl animate-in fade-in zoom-in duration-300">
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <Lock size={32} />
           </div>
           <h1 className="text-2xl font-black text-slate-800 mb-2">{settings.shopName}</h1>
           <p className="text-sm text-slate-400 mb-8 uppercase tracking-widest font-bold">Secure PIN Required</p>
           <form onSubmit={handlePinSubmit} className="space-y-4">
             <input 
               type="password" 
               maxLength={4}
               value={pinInput}
               onChange={(e) => setPinInput(e.target.value)}
               placeholder="Enter 4-digit PIN"
               className="w-full text-center text-2xl tracking-[1em] p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:outline-none font-black"
               autoFocus
             />
             <button type="submit" className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-sm shadow-lg hover:bg-indigo-700 transition-all">
               Unlock Shop
             </button>
           </form>
           <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-tighter">Encrypted Local Vault • Data Protection Act Compliant</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`
          fixed md:relative z-50 h-full w-64 bg-indigo-900 text-white transition-transform duration-300
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-400 p-2 rounded-lg">
                <Receipt size={24} className="text-indigo-900" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">MarketMinder</h1>
            </div>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="mt-6 px-4 space-y-2">
            <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/chat" icon={<MessageSquare size={20} />} label="Chat Assistant" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/ledger" icon={<Receipt size={20} />} label="Full Ledger" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/analytics" icon={<PieChart size={20} />} label="Business Health" onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/settings" icon={<Settings size={20} />} label="Settings" onClick={() => setSidebarOpen(false)} />
          </nav>

          <div className="absolute bottom-0 w-full p-6 bg-indigo-950/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-indigo-100 flex items-center justify-center text-indigo-900 font-black">
                {settings.shopName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold truncate w-32">{settings.shopName}</p>
                <p className="text-[10px] text-indigo-300 uppercase font-black tracking-widest">{settings.location}</p>
              </div>
            </div>
            {settings.pinEnabled && (
              <button 
                onClick={() => setIsLocked(true)}
                className="w-full flex items-center justify-center gap-2 py-2 mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-800 rounded-lg hover:bg-indigo-800 transition-all"
              >
                <Lock size={12} /> Lock Dashboard
              </button>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 relative z-20">
            <button className="md:hidden text-slate-600" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="flex-1 px-4 flex items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-700 hidden md:block">
                {settings.shopName} <span className="text-xs text-slate-400 ml-2 font-normal">| {settings.location}</span>
              </h2>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 animate-pulse'}`}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isOnline ? 'Live Sync' : 'Offline Mode'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/chat" className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full transition-all text-sm font-medium">
                <MessageSquare size={16} />
                <span className="hidden lg:inline">Ask AI</span>
              </Link>
              <button 
                onClick={() => setManualModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full transition-all text-sm font-medium shadow-md shadow-emerald-200"
              >
                <Keyboard size={18} />
                <span className="hidden sm:inline">Quick Entry</span>
              </button>
            </div>
          </header>

          {!isOnline && (
            <div className="bg-rose-600 text-white text-[11px] font-bold py-2 px-6 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 shrink-0">
              <CloudOff size={14} />
              Maandishi na Picha hazita-process hadi uwe online. Records zako zimehifadhiwa salama kwa simu.
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} inventoryLevels={inventoryLevels} settings={settings} onAddTransaction={addTransaction} />} />
              <Route path="/chat" element={<ChatInterface onAddTransaction={addTransaction} inventoryLevels={inventoryLevels} transactions={transactions} />} />
              <Route path="/ledger" element={<LedgerTable transactions={transactions} onDelete={deleteTransaction} onUpdate={updateTransaction} />} />
              <Route path="/analytics" element={<AnalyticsPanel transactions={transactions} />} />
              <Route path="/settings" element={<SettingsPage settings={settings} transactions={transactions} onUpdateSettings={setSettings} onClearData={() => { setTransactions([]); }} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>

      <TransactionModal 
        isOpen={isManualModalOpen} 
        onClose={() => setManualModalOpen(false)} 
        onSave={addTransaction} 
      />
    </HashRouter>
  );
};

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-indigo-700 text-white shadow-lg' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default App;
