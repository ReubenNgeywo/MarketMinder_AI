
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Receipt, 
  PieChart, 
  PlusCircle,
  Menu,
  X,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import LedgerTable from './components/LedgerTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import { Transaction, TransactionType, Category } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('erp_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('erp_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Calculate inventory levels
  const inventoryLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    // Transactions are stored newest first, process oldest first for accurate running total
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

  const addTransaction = useCallback((newTx: Transaction): { success: boolean, error?: string } => {
    // Validate inventory for sales
    if (newTx.type === TransactionType.INCOME) {
      const itemKey = newTx.item.toLowerCase().trim();
      const available = inventoryLevels[itemKey] || 0;
      const requested = newTx.quantity || 1;

      if (available < requested) {
        return { 
          success: false, 
          error: `Huna stock ya kutosha! Uko na ${available} ${newTx.item} pekee. Unajaribu kuuza ${requested}. Nunua stock kwanza.` 
        };
      }
    }

    setTransactions(prev => [newTx, ...prev]);
    return { success: true };
  }, [inventoryLevels]);

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
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
          </nav>

          <div className="absolute bottom-0 w-full p-6 bg-indigo-950/50">
            <div className="flex items-center gap-3 mb-4">
              <img src="https://picsum.photos/seed/user/40" className="w-10 h-10 rounded-full border-2 border-emerald-400" alt="Avatar" />
              <div>
                <p className="text-sm font-semibold">Gikomba Trader</p>
                <p className="text-xs text-indigo-300">Nairobi, Kenya</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
            <button className="md:hidden text-slate-600" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="flex-1 px-4">
              <h2 className="text-lg font-semibold text-slate-700 hidden md:block">Business Overview</h2>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/chat" className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full transition-all text-sm font-medium">
                <PlusCircle size={18} />
                <span>Log Transaction</span>
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} inventoryLevels={inventoryLevels} />} />
              <Route path="/chat" element={<ChatInterface onAddTransaction={addTransaction} inventoryLevels={inventoryLevels} />} />
              <Route path="/ledger" element={<LedgerTable transactions={transactions} onDelete={deleteTransaction} />} />
              <Route path="/analytics" element={<AnalyticsPanel transactions={transactions} />} />
            </Routes>
          </div>
        </main>
      </div>
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
    <Link 
      to={to} 
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        ${isActive ? 'bg-indigo-700 text-white' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export default App;
