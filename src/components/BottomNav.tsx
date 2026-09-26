import React from 'react';
import { 
  LayoutDashboard, 
  Table, 
  Wallet, 
  Users, 
  MessageSquareWarning, 
  LogIn, 
  UserCheck 
} from 'lucide-react';
import { UserSession } from '../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserSession | null;
  onOpenLogin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin
}) => {
  const kasLabel = currentUser?.isAdmin ? 'Buku Kas' : 'Kas Saya';
  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'rekap-2026', label: 'Rekap 2026', icon: Table },
    { id: 'rekap-kas', label: kasLabel, icon: Wallet },
    { id: 'pengaduan', label: 'Pengaduan', icon: MessageSquareWarning },
  ];

  return (
    <nav 
      aria-label="Navigasi Bawah Mobile"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1 lg:hidden safe-area-pb shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}

        {/* Profile / Account or Login */}
        {currentUser ? (
          <button
            onClick={() => setActiveTab('keluarga-saya')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'keluarga-saya'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg relative ${activeTab === 'keluarga-saya' ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
              <UserCheck className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900"></span>
            </div>
            <span className="text-[10px] tracking-tight leading-tight mt-0.5">Saya</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-amber-600 dark:text-amber-400 font-bold transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/60">
              <LogIn className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight leading-tight mt-0.5">Masuk</span>
          </button>
        )}
      </div>
    </nav>
  );
};
