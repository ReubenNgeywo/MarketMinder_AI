
import React, { useState } from 'react';
import { Shield, Globe, Database, Download, Trash2, Save, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserSettings, Transaction } from '../types';

interface SettingsPageProps {
  settings: UserSettings;
  transactions: Transaction[];
  onUpdateSettings: (newSettings: UserSettings) => void;
  onClearData: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, transactions, onUpdateSettings, onClearData }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const exportData = (format: 'csv' | 'json') => {
    if (transactions.length === 0) {
      alert("No data available to export.");
      return;
    }

    let content = "";
    let mimeType = "";
    let extension = "";

    if (format === 'json') {
      content = JSON.stringify({ settings, transactions }, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      const headers = ['ID', 'Date', 'Time', 'Item', 'Type', 'Category', 'Quantity', 'Unit Price', 'Total Amount', 'Currency', 'Source', 'Original Message'];
      const rows = transactions.map(tx => {
        const d = new Date(tx.timestamp);
        const datePart = d.toLocaleDateString();
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        return [
          `"${tx.id}"`,
          `"${datePart}"`,
          `"${timePart}"`,
          `"${tx.item.replace(/"/g, '""')}"`,
          `"${tx.type}"`,
          `"${tx.category}"`,
          `"${tx.quantity || ''}"`,
          `"${tx.unitPrice || ''}"`,
          `"${tx.amount}"`,
          `"${tx.currency}"`,
          `"${tx.source}"`,
          `"${(tx.originalMessage || "").replace(/"/g, '""')}"`
        ];
      });
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = "text/csv";
      extension = "csv";
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `MarketMinder_Backup_${timestamp}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Shop Settings</h2>
          <p className="text-sm text-slate-500">Manage your privacy and business profile.</p>
        </div>
        {showSaveSuccess && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100 animate-bounce">
            <ShieldCheck size={14} />
            Settings Saved!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-800">Shop Profile</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shop Name</label>
                <input 
                  type="text" 
                  value={localSettings.shopName}
                  onChange={(e) => setLocalSettings({...localSettings, shopName: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                <input 
                  type="text" 
                  value={localSettings.location}
                  onChange={(e) => setLocalSettings({...localSettings, location: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium" 
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-800">Interface</h3>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Language</label>
              <div className="flex flex-wrap gap-2">
                {['English', 'Swahili', 'Sheng'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLocalSettings({...localSettings, preferredLanguage: lang as any})}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all border ${
                      localSettings.preferredLanguage === lang 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-indigo-600" size={20} />
              <h3 className="font-bold text-slate-800">Security & Compliance</h3>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-slate-800">Enable PIN Lock</p>
                <p className="text-xs text-slate-500">Require a 4-digit code to view ledgers.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localSettings.pinEnabled}
                  onChange={(e) => setLocalSettings({...localSettings, pinEnabled: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div>
                <p className="text-sm font-bold text-slate-800">AI Data Sharing</p>
                <p className="text-xs text-slate-500">Share anonymized data to improve local Sheng insights.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={localSettings.aiDataConsent}
                  onChange={(e) => setLocalSettings({...localSettings, aiDataConsent: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleSave}
            className="w-full bg-indigo-600 text-white p-4 rounded-3xl font-black uppercase text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save All Changes
          </button>

          <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
             <div className="flex items-center gap-2 mb-4 text-amber-700">
                <AlertCircle size={18} />
                <h4 className="font-bold text-sm uppercase">Compliance Note</h4>
             </div>
             <p className="text-xs text-amber-800 leading-relaxed mb-4">
                MarketMinder is built to comply with the <strong>Kenya Data Protection Act (2019)</strong>. Your financial records are encrypted locally and only shared with Gemini 3 for authorized analytics.
             </p>
          </div>

          <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-4">
             <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Database size={16} /> Data Export
             </h4>
             <div className="space-y-2">
                <button 
                  onClick={() => exportData('csv')}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-between group"
                >
                   <span className="text-xs font-bold text-slate-600 uppercase">Export Ledger (CSV)</span>
                   <Download size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </button>
                <button 
                  onClick={() => exportData('json')}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all flex items-center justify-between group"
                >
                   <span className="text-xs font-bold text-slate-600 uppercase">Audit Log (JSON)</span>
                   <Download size={14} className="text-slate-400 group-hover:text-indigo-600" />
                </button>
             </div>
             <div className="pt-4 border-t">
                <button 
                  onClick={() => { if(confirm("Are you sure? This deletes ALL transactions.")) onClearData(); }}
                  className="w-full text-rose-600 p-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-50 transition-all"
                >
                   <Trash2 size={16} />
                   Delete Account Data
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
