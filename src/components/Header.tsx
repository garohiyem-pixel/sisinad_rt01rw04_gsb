import React from 'react';
import { UserSession, AppSettings } from '../types';
import { LiveServerClock } from './LiveServerClock';
import { 
  Building2, 
  User, 
  ShieldCheck, 
  LogIn, 
  LogOut, 
  KeyRound, 
  CreditCard, 
  Settings, 
  Users, 
  UserCheck,
  Wallet, 
  CalendarDays,
  Table,
  MessageSquareWarning,
  Menu,
  X,
  Sun,
  Moon,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  settings: AppSettings;
  currentUser: UserSession | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenChangePassword: () => void;
  onOpenBayarKas?: () => void;
  onOpenLaporanKas?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLogin,
  onLogout,
  onOpenChangePassword,
  onOpenBayarKas,
  onOpenLaporanKas,
  darkMode,
  onToggleDarkMode,
  isSyncing = false,
  onManualSync
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [logoLoadError, setLogoLoadError] = React.useState(false);

  React.useEffect(() => {
    setLogoLoadError(false);
  }, [settings.logoUrl]);

  const navItems = React.useMemo(() => {
    // 1. Mode Login Admin: dashboard - pengaduan - agenda - buku kas - rekapan kas - kelola kas - keluarga saya - kelola warga - pengaturan logo
    if (currentUser?.isAdmin) {
      return [
        { id: 'dashboard', label: 'Dashboard Utama', icon: Building2 },
        { id: 'pengaduan', label: 'Pengaduan Warga', icon: MessageSquareWarning },
        { id: 'agenda-notulen', label: 'Agenda & Notulen', icon: CalendarDays },
        { id: 'rekap-kas', label: 'Buku Kas Warga', icon: Wallet },
        { id: 'rekap-2026', label: 'Rekapan Kas 2026', icon: Table },
        { id: 'kelola-kas', label: 'Kelola Kas', icon: CreditCard },
        { id: 'keluarga-saya', label: 'Keluarga Saya', icon: Users },
        { id: 'kelola-warga', label: 'Kelola Warga', icon: UserCheck },
        { id: 'pengaturan', label: 'Pengaturan & Logo', icon: Settings },
      ];
    }

    // 2. Mode Login Warga: dashboard - pengaduan - agenda - riwayat kas saya - rekapan kas - keluarga saya
    if (currentUser) {
      return [
        { id: 'dashboard', label: 'Dashboard Utama', icon: Building2 },
        { id: 'pengaduan', label: 'Pengaduan Warga', icon: MessageSquareWarning },
        { id: 'agenda-notulen', label: 'Agenda & Notulen', icon: CalendarDays },
        { id: 'rekap-kas', label: 'Riwayat Kas Saya', icon: Wallet },
        { id: 'rekap-2026', label: 'Rekapan Kas 2026', icon: Table },
        { id: 'keluarga-saya', label: 'Keluarga Saya', icon: Users },
      ];
    }

    // 3. Mode Tanpa Login: dashboard - pengaduan - agenda - kas saya - rekapan kas
    return [
      { id: 'dashboard', label: 'Dashboard Utama', icon: Building2 },
      { id: 'pengaduan', label: 'Pengaduan Warga', icon: MessageSquareWarning },
      { id: 'agenda-notulen', label: 'Agenda & Notulen', icon: CalendarDays },
      { id: 'rekap-kas', label: 'Riwayat Kas Saya', icon: Wallet },
      { id: 'rekap-2026', label: 'Rekapan Kas 2026', icon: Table },
    ];
  }, [currentUser]);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      {/* Top Banner Notice with Live Server Clock - Slim on mobile */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="font-bold text-slate-100 text-[11px] sm:text-xs truncate">{settings.namaRtRw}</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-300 text-[11px] sm:text-xs hidden sm:inline truncate">{settings.perumahan}, {settings.desa}</span>
        </div>

        {/* Live Server Realtime Clock */}
        <div className="flex items-center gap-2 shrink-0">
          <LiveServerClock variant="compact" />
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 overflow-hidden border border-blue-100 dark:border-blue-900 shrink-0">
              {settings.logoUrl && !logoLoadError ? (
                <img 
                  src={settings.logoUrl} 
                  alt="Logo RT" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <div className="text-center">
                  <div className="text-[10px] sm:text-xs tracking-tighter uppercase text-blue-200 font-semibold leading-none">RT 01</div>
                  <div className="text-xs sm:text-sm font-black tracking-tight leading-none mt-0.5">RW 04</div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  <span className="sm:hidden">RT 001 RW 004 GSB</span>
                  <span className="hidden sm:inline">Sistem Administrasi RT 001 RW 004</span>
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  GSB
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 truncate max-w-[200px] sm:max-w-none">
                {settings.perumahan}, {settings.desa}
              </p>
            </div>
          </div>

          {/* Action Buttons & Auth (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5">
            
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label="Toggle Theme"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Auth Profile */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* Khusus Admin RT: Tombol Sinkronisasi Cloud */}
                {currentUser.isAdmin && onManualSync && (
                  <button
                    onClick={onManualSync}
                    disabled={isSyncing}
                    title="Sinkronisasi Cloud Firestore (Khusus Admin RT)"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline font-bold">{isSyncing ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
                  </button>
                )}

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    {currentUser.isAdmin ? <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none flex items-center gap-1.5">
                      <span>{currentUser.nama}</span>
                      {currentUser.isSuperAdmin ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-700 uppercase">
                          Super Admin
                        </span>
                      ) : currentUser.jabatan && currentUser.jabatan !== 'Warga' ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                          {currentUser.jabatan}
                        </span>
                      ) : currentUser.isAdmin ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Rumah: <span className="font-semibold text-slate-700 dark:text-slate-200">{currentUser.alamatGsb}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('keluarga-saya')}
                  title="Kelola Data Anggota Keluarga Saya"
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'keluarga-saya'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenChangePassword}
                  title="Ganti Password"
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  title="Keluar / Logout"
                  className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-slate-900 bg-amber-400 hover:bg-amber-500 transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Login Akun</span>
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="hidden lg:flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-2 pb-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Live Server Clock in Mobile Menu */}
            <div className="p-3 bg-slate-900 dark:bg-slate-950 rounded-xl border border-slate-800">
              <LiveServerClock variant="compact" />
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              {currentUser ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-2.5 text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{currentUser.nama} ({currentUser.alamatGsb})</span>
                    {currentUser.isSuperAdmin ? (
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-300 dark:border-purple-700 uppercase">
                        Super Admin
                      </span>
                    ) : currentUser.jabatan && currentUser.jabatan !== 'Warga' ? (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                        {currentUser.jabatan}
                      </span>
                    ) : currentUser.isAdmin ? (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                        Admin
                      </span>
                    ) : null}
                  </div>

                  {/* Tombol Akses Cepat Anggota Keluarga */}
                  <button
                    onClick={() => {
                      setActiveTab('keluarga-saya');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full py-2 px-3 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeTab === 'keluarga-saya'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Kelola Anggota Keluarga Saya</span>
                  </button>

                  {/* Khusus Admin RT: Tombol Sinkronisasi Cloud */}
                  {currentUser.isAdmin && onManualSync && (
                    <button
                      onClick={() => {
                        onManualSync();
                        setMobileMenuOpen(false);
                      }}
                      disabled={isSyncing}
                      className="w-full py-2 px-3 flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Menyinkronkan ke Cloud...' : 'Sinkron Cloud (Admin RT)'}</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onOpenChangePassword();
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 py-1 text-center bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-[11px]"
                    >
                      Ubah Password
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 py-1 text-center bg-red-100 dark:bg-red-950/60 rounded text-red-700 dark:text-red-400 text-[11px]"
                    >
                      Keluar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenLogin();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center font-bold text-xs bg-amber-400 text-slate-900 rounded-xl"
                >
                  Login Akun (Warga / Admin)
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
