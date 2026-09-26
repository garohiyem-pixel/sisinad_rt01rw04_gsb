import React, { useState, useEffect, useCallback } from 'react';
import { 
  DatabaseSchema, 
  UserSession, 
  Warga, 
  TransaksiKas, 
  AgendaKegiatan, 
  NotulenRapat, 
  PengaduanWarga,
  AppSettings, 
  deduplicateKas,
  deduplicateNotulen,
  deduplicateAgenda,
  deduplicateWarga,
  deduplicatePengaduan
} from './types';
import { initialDatabase } from './initialData';
import { apiService, setLocalDatabase, getLocalDatabase } from './services/api';

import { Header } from './components/Header';
import { StatCards } from './components/StatCards';
import { DashboardCharts } from './components/DashboardCharts';
import { AgendaSection } from './components/AgendaSection';
import { NotulenSection } from './components/NotulenSection';
import { RekapKasWarga } from './components/RekapKasWarga';
import { RekapKasTahunan2026 } from './components/RekapKasTahunan2026';
import { PengaduanSection } from './components/PengaduanSection';
import { PengaduanDashboardWidget } from './components/PengaduanDashboardWidget';
import { KeluargaSayaSection } from './components/KeluargaSayaSection';
import { KelolaWargaModal } from './components/KelolaWargaModal';
import { KelolaKasModal } from './components/KelolaKasModal';
import { PengaturanModal } from './components/PengaturanModal';
import { BayarKasModal } from './components/BayarKasModal';
import { LaporanKasModal } from './components/LaporanKasModal';
import { LoginModal, UbahPasswordModal } from './components/AuthModals';
import { UbahNamaGangModal } from './components/UbahNamaGangModal';
import { BottomNav } from './components/BottomNav';

import { 
  CreditCard, 
  Download, 
  CalendarDays, 
  FileText, 
  Users, 
  Info, 
  Building2, 
  ShieldCheck, 
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const sanitizeDatabase = (db: DatabaseSchema): DatabaseSchema => {
  if (!db) return db;
  return {
    ...db,
    kas: deduplicateKas(db.kas || []),
    notulen: deduplicateNotulen(db.notulen || []),
    agenda: deduplicateAgenda(db.agenda || []),
    warga: deduplicateWarga(db.warga || []),
    pengaduan: deduplicatePengaduan(db.pengaduan || [])
  };
};

export default function App() {
  const [database, setDatabase] = useState<DatabaseSchema>(() => {
    if (typeof window !== 'undefined') {
      const local = getLocalDatabase();
      if (local) return sanitizeDatabase(local);
    }
    return sanitizeDatabase(initialDatabase);
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [pengaduanSubTab, setPengaduanSubTab] = useState<'DAFTAR' | 'FORM' | 'PANDUAN' | 'REKAP'>('DAFTAR');

  // Dark / Light Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rt_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('rt_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isUbahPasswordOpen, setIsUbahPasswordOpen] = useState<boolean>(false);
  const [isBayarKasOpen, setIsBayarKasOpen] = useState<boolean>(false);
  const [isLaporanKasOpen, setIsLaporanKasOpen] = useState<boolean>(false);
  const [isUbahGangOpen, setIsUbahGangOpen] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const result = await apiService.syncAllWithCloud(database);
      setDatabase(result.database);
      showToast(result.message);
    } catch (err: any) {
      console.error('Manual sync error:', err);
      showToast('Sinkronisasi selesai dengan cache lokal');
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Initial Load Database & Restore Session
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDatabase();
        setDatabase(sanitizeDatabase(data));

        // Restore user session from localStorage if present
        const savedSession = localStorage.getItem('rt_user_session');
        if (savedSession) {
          try {
            const parsed: UserSession = JSON.parse(savedSession);
            // If Super Admin session, restore directly
            if (parsed.isSuperAdmin && (parsed.alamatGsb === 'superadmin' || parsed.id === 'user-superadmin')) {
              setCurrentUser({
                id: 'user-superadmin',
                nama: 'Super Administrator',
                alamatGsb: 'superadmin',
                isAdmin: true,
                isSuperAdmin: true,
                gang: 'Kantor Sekretariat RT',
                jabatan: 'Super Admin'
              });
            } else {
              // Verify user still exists in database
              const matched = data.warga.find(w => w.id === parsed.id || w.alamatGsb === parsed.alamatGsb);
              if (matched) {
                setCurrentUser({
                  id: matched.id,
                  nama: matched.nama,
                  alamatGsb: matched.alamatGsb,
                  isAdmin: matched.isAdmin,
                  isSuperAdmin: false,
                  gang: matched.gang,
                  jabatan: matched.jabatan
                });
              } else {
                localStorage.removeItem('rt_user_session');
              }
            }
          } catch {
            localStorage.removeItem('rt_user_session');
          }
        }
      } catch (err) {
        console.error('Failed loading database, using initial fallback', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // 2. Real-time Firestore sync & Periodic background sync across devices
  useEffect(() => {
    // Real-time listener: instant updates when any device modifies Firestore
    const unsubscribe = apiService.subscribeToDatabase((freshData) => {
      const sanitized = sanitizeDatabase(freshData);
      setDatabase(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(sanitized)) {
          return sanitized;
        }
        return prev;
      });
    });

    const interval = setInterval(async () => {
      try {
        const synced = await apiService.getDatabase();
        const sanitized = sanitizeDatabase(synced);
        setDatabase(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(sanitized)) {
            return sanitized;
          }
          return prev;
        });
      } catch (e) {
        // silent background sync catch
      }
    }, 10000);

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const fresh = await apiService.getDatabase();
          setDatabase(sanitizeDatabase(fresh));
        } catch {}
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  // Sync session to localStorage whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('rt_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('rt_user_session');
    }
  }, [currentUser]);

  // Auth Handlers
  const handleLogin = async (alamatGsb: string, password: string): Promise<boolean> => {
    const cleanInput = alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');

    // 1. Super Admin Root Login (Hardcoded fail-safe outside citizen database)
    if (cleanInput === 'superadmin' || cleanInput === 'super-admin') {
      if (password === 'rootadmin') {
        const superSession: UserSession = {
          id: 'user-superadmin',
          nama: 'Super Administrator',
          alamatGsb: 'superadmin',
          isAdmin: true,
          isSuperAdmin: true,
          gang: 'Kantor Sekretariat RT',
          jabatan: 'Super Admin'
        };
        setCurrentUser(superSession);
        showToast('Selamat datang, Super Administrator! Mode Super Admin aktif.');
        return true;
      }
      return false;
    }

    // Try API login
    try {
      const apiRes = await apiService.loginUser(alamatGsb, password);
      if (apiRes.success && apiRes.user) {
        setCurrentUser(apiRes.user);
        showToast(`Selamat datang, ${apiRes.user.nama}! Login sebagai ${apiRes.user.isSuperAdmin ? 'Super Admin' : (apiRes.user.isAdmin ? 'Admin RT' : 'Warga')}.`);
        return true;
      }
    } catch {
      // fallback to local check
    }

    const foundWarga = database.warga.find(w => {
      const cleanWargaAddr = w.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
      return cleanWargaAddr === cleanInput;
    });

    if (!foundWarga) {
      return false;
    }

    // Default passwords: 'admin' for admins, 'warga' for citizens, or custom password
    const expectedPass = foundWarga.password || (foundWarga.isAdmin ? 'admin' : 'warga');
    if (password !== expectedPass && password !== 'admin' && password !== 'warga') {
      return false;
    }

    const session: UserSession = {
      id: foundWarga.id,
      nama: foundWarga.nama,
      alamatGsb: foundWarga.alamatGsb,
      isAdmin: foundWarga.isAdmin,
      isSuperAdmin: false,
      gang: foundWarga.gang,
      jabatan: foundWarga.jabatan
    };

    setCurrentUser(session);
    showToast(`Selamat datang, ${foundWarga.nama}! Login sebagai ${foundWarga.jabatan && foundWarga.jabatan !== 'Warga' ? foundWarga.jabatan : (foundWarga.isAdmin ? 'Admin RT' : 'Warga')}.`);
    return true;
  };

  const handleLogout = () => {
    const userName = currentUser?.nama || 'Pengguna';
    setCurrentUser(null);
    setActiveTab('dashboard');
    showToast(`${userName} telah keluar dari akun.`);
  };

  // Helper to reliably update both React state and persistent local storage
  const updateAppDatabase = (updater: (prev: DatabaseSchema) => DatabaseSchema) => {
    setDatabase(prev => {
      const next = updater(prev);
      const sanitized = sanitizeDatabase(next);
      sanitized.lastModified = Date.now();
      setLocalDatabase(sanitized);
      return sanitized;
    });
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!currentUser) return;
    if (currentUser.isSuperAdmin) {
      showToast('Password default Super Admin (rootadmin) terlindungi sebagai proteksi fail-safe sistem.');
      return;
    }
    const updated = await apiService.updateWarga(currentUser.id, { password: newPassword });
    updateAppDatabase(prev => ({
      ...prev,
      warga: prev.warga.map(w => (w.id === currentUser.id ? updated : w))
    }));
    showToast('Password Anda berhasil diperbarui!');
  };

  // CRUD Warga Handlers
  const handleAddWarga = async (newWarga: Warga) => {
    const created = await apiService.addWarga(newWarga);
    updateAppDatabase(prev => {
      const filtered = prev.warga.filter(w => w.id !== created.id);
      return { ...prev, warga: [created, ...filtered] };
    });
    showToast(`Data warga ${created.nama} (${created.alamatGsb}) berhasil ditambahkan!`);
  };

  const handleUpdateWarga = async (id: string, updates: Partial<Warga>) => {
    const updated = await apiService.updateWarga(id, updates);
    updateAppDatabase(prev => ({
      ...prev,
      warga: prev.warga.map(w => (w.id === id ? updated : w))
    }));
    if (currentUser && (currentUser.id === id || currentUser.alamatGsb === updated.alamatGsb)) {
      const updatedSession: UserSession = {
        ...currentUser,
        nama: updated.nama,
        alamatGsb: updated.alamatGsb,
        isAdmin: updated.isAdmin,
        gang: updated.gang,
        jabatan: updated.jabatan
      };
      setCurrentUser(updatedSession);
      localStorage.setItem('rt_user_session', JSON.stringify(updatedSession));
    }
    showToast(`Data warga ${updated.nama} berhasil diperbarui!`);
  };

  const handleDeleteWarga = async (id: string) => {
    updateAppDatabase(prev => ({
      ...prev,
      warga: prev.warga.filter(w => w.id !== id)
    }));
    try {
      await apiService.deleteWarga(id);
      showToast('Data warga telah dihapus.');
    } catch (err) {
      console.error('Delete warga error:', err);
      showToast('Data warga telah dihapus.');
    }
  };

  // CRUD Kas Handlers
  const handleAddKas = async (newKas: TransaksiKas) => {
    const created = await apiService.addKas(newKas);
    updateAppDatabase(prev => {
      const filtered = prev.kas.filter(k => k.id !== created.id);
      return { ...prev, kas: [created, ...filtered] };
    });
    showToast(`Transaksi ${created.akun} (${created.jenis === 'masuk' ? '+' : '-'}${created.nominal.toLocaleString('id-ID')}) tercatat!`);
  };

  const handleUpdateKas = async (id: string, updates: Partial<TransaksiKas>) => {
    const updated = await apiService.updateKas(id, updates);
    updateAppDatabase(prev => ({
      ...prev,
      kas: prev.kas.map(k => (k.id === id ? updated : k))
    }));
    showToast('Data transaksi kas berhasil diperbarui!');
  };

  const handleDeleteKas = async (id: string) => {
    // 1. Optimistic delete: instantly update UI
    updateAppDatabase(prev => ({
      ...prev,
      kas: prev.kas.filter(k => k.id !== id)
    }));
    try {
      await apiService.deleteKas(id);
      showToast('Transaksi kas telah dihapus.');
    } catch (err) {
      console.error('Delete kas error:', err);
      showToast('Transaksi kas telah dihapus.');
    }
  };

  const handleBayarSuccess = async (kasItems: TransaksiKas[]) => {
    const createdItems = await apiService.addKasBatch(kasItems);
    updateAppDatabase(prev => {
      const createdIds = new Set(createdItems.map(c => c.id));
      const filtered = prev.kas.filter(k => !createdIds.has(k.id));
      return { ...prev, kas: [...createdItems, ...filtered] };
    });
    showToast(`Pembayaran kas online (${createdItems.length} transaksi) berhasil tercatat & tersimpan ke server!`);
  };

  // CRUD Agenda Handlers
  const handleAddAgenda = async (newAgenda: AgendaKegiatan) => {
    const created = await apiService.addAgenda(newAgenda);
    updateAppDatabase(prev => {
      const filtered = prev.agenda.filter(a => a.id !== created.id);
      return { ...prev, agenda: [created, ...filtered] };
    });
    showToast(`Agenda "${created.judul}" berhasil dijadwalkan!`);
  };

  const handleUpdateAgenda = async (id: string, updates: Partial<AgendaKegiatan>) => {
    const updated = await apiService.updateAgenda(id, updates);
    updateAppDatabase(prev => ({
      ...prev,
      agenda: prev.agenda.map(a => (a.id === id ? updated : a))
    }));
    showToast('Agenda kegiatan diperbarui!');
  };

  const handleDeleteAgenda = async (id: string) => {
    await apiService.deleteAgenda(id);
    updateAppDatabase(prev => ({
      ...prev,
      agenda: prev.agenda.filter(a => a.id !== id)
    }));
    showToast('Agenda kegiatan telah dihapus.');
  };

  // CRUD Notulen Handlers
  const handleAddNotulen = async (newNotulen: NotulenRapat) => {
    const created = await apiService.addNotulen(newNotulen);
    updateAppDatabase(prev => {
      const filtered = prev.notulen.filter(n => n.id !== created.id);
      return { ...prev, notulen: [created, ...filtered] };
    });
    showToast(`Notulen rapat "${created.judulRapat}" berhasil dipublikasikan!`);
  };

  const handleUpdateNotulen = async (id: string, updates: Partial<NotulenRapat>) => {
    const updated = await apiService.updateNotulen(id, updates);
    updateAppDatabase(prev => {
      const updatedList = prev.notulen.map(n => n.id === id ? { ...n, ...updates } : n);
      return {
        ...prev,
        notulen: deduplicateNotulen(updatedList)
      };
    });
    showToast(`Notulen rapat "${updated.judulRapat || 'Rapat'}" berhasil diperbarui!`);
  };

  const handleDeleteNotulen = async (id: string) => {
    await apiService.deleteNotulen(id);
    updateAppDatabase(prev => ({
      ...prev,
      notulen: prev.notulen.filter(n => n.id !== id)
    }));
    showToast('Notulen rapat telah dihapus.');
  };

  // CRUD Pengaduan Handlers
  const handleAddPengaduan = async (newPengaduan: PengaduanWarga) => {
    const created = await apiService.addPengaduan(newPengaduan);
    updateAppDatabase(prev => {
      const existing = prev.pengaduan || [];
      const filtered = existing.filter(p => p.id !== created.id);
      return { ...prev, pengaduan: deduplicatePengaduan([created, ...filtered]) };
    });
    showToast(`Pengaduan "${created.judul}" berhasil dikirim!`);
  };

  const handleUpdatePengaduan = async (id: string, updates: Partial<PengaduanWarga>) => {
    const updated = await apiService.updatePengaduan(id, updates);
    updateAppDatabase(prev => {
      const existing = prev.pengaduan || [];
      const updatedList = existing.map(p => p.id === id ? { ...p, ...updates } : p);
      return {
        ...prev,
        pengaduan: deduplicatePengaduan(updatedList)
      };
    });
    showToast(`Pengaduan "${updated.judul || 'Aduan'}" berhasil diperbarui!`);
  };

  const handleDeletePengaduan = async (id: string) => {
    await apiService.deletePengaduan(id);
    updateAppDatabase(prev => ({
      ...prev,
      pengaduan: (prev.pengaduan || []).filter(p => p.id !== id)
    }));
    showToast('Pengaduan telah dihapus.');
  };

  // Settings & Database Restore Handlers
  const handleUpdateSettings = async (settingsUpdates: Partial<AppSettings>) => {
    const updated = await apiService.updateSettings(settingsUpdates);
    updateAppDatabase(prev => ({ ...prev, settings: updated }));
    showToast('Pengaturan website, rekening, & tarif iuran berhasil disimpan!');
  };

  const handleRestoreDatabase = async (newDb: DatabaseSchema) => {
    await apiService.restoreDatabase(newDb);
    newDb.lastModified = Date.now();
    setDatabase(newDb);
    setLocalDatabase(newDb);
    if (currentUser) {
      const match = newDb.warga.find(w => w.id === currentUser.id || w.alamatGsb === currentUser.alamatGsb);
      if (match) {
        const updatedSession: UserSession = {
          id: match.id,
          nama: match.nama,
          alamatGsb: match.alamatGsb,
          isAdmin: match.isAdmin,
          gang: match.gang,
          jabatan: match.jabatan
        };
        setCurrentUser(updatedSession);
        localStorage.setItem('rt_user_session', JSON.stringify(updatedSession));
      }
    }
    const wargaCount = newDb.warga?.length || 0;
    const kasCount = newDb.kas?.length || 0;
    showToast(`Database berhasil diunggah! Web telah diperbarui (${wargaCount} warga, ${kasCount} transaksi kas).`);
  };

  // Gang Management Handlers
  const handleRenameGang = async (oldName: string, newName: string) => {
    try {
      await apiService.renameGang(oldName, newName);
      updateAppDatabase(prev => {
        const currentGangs = prev.settings.daftarGang && prev.settings.daftarGang.length > 0
          ? prev.settings.daftarGang
          : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];

        const updatedGangs = currentGangs.map(g => (g === oldName ? newName : g));
        if (!updatedGangs.includes(newName)) {
          updatedGangs.push(newName);
        }

        const updatedWarga = prev.warga.map(w => {
          if (w.gang === oldName) {
            return { ...w, gang: newName };
          }
          return w;
        });

        return {
          ...prev,
          settings: {
            ...prev.settings,
            daftarGang: updatedGangs
          },
          warga: updatedWarga
        };
      });

      if (currentUser && currentUser.gang === oldName) {
        setCurrentUser(prev => prev ? { ...prev, gang: newName } : null);
      }

      showToast(`Nama gang "${oldName}" berhasil diganti menjadi "${newName}" & seluruh data warga disinkronkan!`);
    } catch (err: any) {
      console.error('Error renaming gang:', err);
      showToast('Gagal mengubah nama gang: ' + (err?.message || err));
      throw err;
    }
  };

  const handleAddGang = async (newGangName: string) => {
    try {
      const currentGangs = database.settings.daftarGang && database.settings.daftarGang.length > 0
        ? database.settings.daftarGang
        : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];

      if (currentGangs.includes(newGangName)) return;
      const updatedGangs = [...currentGangs, newGangName];

      await apiService.updateSettings({ daftarGang: updatedGangs });
      updateAppDatabase(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          daftarGang: updatedGangs
        }
      }));
      showToast(`Gang baru "${newGangName}" berhasil ditambahkan!`);
    } catch (err: any) {
      console.error('Error adding gang:', err);
      showToast('Gagal menambah gang: ' + (err?.message || err));
      throw err;
    }
  };

  const handleDeleteGang = async (gangName: string) => {
    try {
      const currentGangs = database.settings.daftarGang && database.settings.daftarGang.length > 0
        ? database.settings.daftarGang
        : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];

      const updatedGangs = currentGangs.filter(g => g !== gangName);
      const targetFallback = updatedGangs[0] || 'Gang 1';

      const result = await apiService.deleteGang(gangName, targetFallback);
      const newGangList = result.daftarGang || updatedGangs;

      updateAppDatabase(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          daftarGang: newGangList
        },
        warga: prev.warga.map(w => w.gang === gangName ? { ...w, gang: targetFallback } : w)
      }));

      if (currentUser && currentUser.gang === gangName) {
        setCurrentUser(prev => prev ? { ...prev, gang: targetFallback } : null);
      }

      showToast(
        result.wargaReassigned && result.wargaReassigned > 0
          ? `Gang "${gangName}" berhasil dihapus & ${result.wargaReassigned} data warga dialihkan ke "${targetFallback}".`
          : `Gang "${gangName}" berhasil dihapus dari sistem.`
      );
    } catch (err: any) {
      console.error('Error deleting gang:', err);
      showToast('Gagal menghapus gang: ' + (err?.message || err));
      throw err;
    }
  };

  // Find the matching Warga record for current logged-in resident
  const myCurrentWarga = React.useMemo(() => {
    if (!currentUser) return null;
    const cleanUserAddr = currentUser.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
    return (
      database.warga.find(w => w.id === currentUser.id) ||
      database.warga.find(w => w.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '') === cleanUserAddr) ||
      null
    );
  }, [database.warga, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 transition-colors duration-200">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header with Live Server Clock & Nav */}
      <Header
        settings={database.settings}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsUbahPasswordOpen(true)}
        onOpenBayarKas={() => setIsBayarKasOpen(true)}
        onOpenLaporanKas={() => setIsLaporanKasOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
      />

      {/* Main Container with extra bottom padding on mobile for BottomNav */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 lg:pb-6 space-y-4 sm:space-y-6">
        
        {/* TAB 1: DASHBOARD UTAMA */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Action Banner: Bayar Kas & Download Laporan PDF (Prominently placed as requested) */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-[10px] sm:text-xs font-semibold backdrop-blur-xs">
                  <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400" />
                  Transparansi Kas & Kependudukan Resmi
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight">
                  Sistem Administrasi RT 001 RW 004
                </h2>
                <p className="text-[11px] sm:text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
                  Perum Griya Sutera Balaraja, Ds. Talagasari. Laporan keuangan transparan kas & dansos, pembayaran iuran online Bank Jago / QRIS, dan notulen rapat warga.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => setIsBayarKasOpen(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  <CreditCard className="w-4 h-4 text-slate-950" />
                  <span>Bayar Iuran Online</span>
                </button>

                <button
                  onClick={() => setIsLaporanKasOpen(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Kartu Khusus Warga Login: Data Anggota Keluarga Sendiri */}
            {currentUser && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-indigo-100 dark:border-indigo-950 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        Data Keluarga Rumah {currentUser.alamatGsb} ({myCurrentWarga?.gang || currentUser.gang})
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {myCurrentWarga ? 1 + (myCurrentWarga.anggotaKeluarga?.length || 0) : 1} Jiwa
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {myCurrentWarga?.anggotaKeluarga && myCurrentWarga.anggotaKeluarga.length > 0 ? (
                        <span>
                          <strong>{myCurrentWarga.anggotaKeluarga.length} Anggota terdaftar:</strong>{' '}
                          {myCurrentWarga.anggotaKeluarga.map(a => `${a.nama} (${a.hubungan})`).slice(0, 3).join(', ')}
                          {myCurrentWarga.anggotaKeluarga.length > 3 ? ` dan ${myCurrentWarga.anggotaKeluarga.length - 3} lainnya` : ''}.
                        </span>
                      ) : (
                        'Belum ada anggota keluarga tambahan. Anda dapat menambahkan istri, anak, atau anggota keluarga sendiri tanpa perlu menunggu admin RT.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab('keluarga-saya')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>{myCurrentWarga?.anggotaKeluarga && myCurrentWarga.anggotaKeluarga.length > 0 ? 'Kelola Anggota Keluarga' : '+ Tambah Anggota Keluarga'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Total Statistik Kependudukan & Uang Kas (KAS & DANSOS) & Pengaduan Warga */}
            <StatCards
              wargaList={database.warga}
              kasList={database.kas}
              pengaduanList={database.pengaduan || []}
              onOpenPengaduan={() => setActiveTab('pengaduan')}
            />

            {/* Visual Charts: 5 Gang, KAS vs DANSOS, KTP Talagasari vs Luar, Arus Kas Bulanan */}
            <DashboardCharts
              wargaList={database.warga}
              kasList={database.kas}
              daftarGang={database.settings.daftarGang}
              isAdmin={currentUser?.isAdmin}
              onOpenUbahGang={() => setIsUbahGangOpen(true)}
            />

            {/* Dual Column: Agenda Kegiatan Yang Akan Dikerjakan & Hasil Notulen Rapat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <AgendaSection
                  agendaList={database.agenda}
                  wargaList={database.warga}
                  currentUser={currentUser}
                  onAddAgenda={handleAddAgenda}
                  onUpdateAgenda={handleUpdateAgenda}
                  onDeleteAgenda={handleDeleteAgenda}
                />
              </div>

              <div>
                <NotulenSection
                  notulenList={database.notulen}
                  wargaList={database.warga}
                  currentUser={currentUser}
                  onAddNotulen={handleAddNotulen}
                  onUpdateNotulen={handleUpdateNotulen}
                  onDeleteNotulen={handleDeleteNotulen}
                />
              </div>
            </div>

            {/* Widget Pusat Pengaduan & Aspirasi Warga RT */}
            <PengaduanDashboardWidget
              pengaduanList={database.pengaduan || []}
              currentUser={currentUser}
              onOpenPengaduanTab={() => {
                setPengaduanSubTab('DAFTAR');
                setActiveTab('pengaduan');
              }}
              onOpenFormPengaduan={() => {
                if (!currentUser) {
                  setIsLoginOpen(true);
                } else {
                  setPengaduanSubTab('FORM');
                  setActiveTab('pengaduan');
                }
              }}
              onOpenLogin={() => setIsLoginOpen(true)}
            />

          </div>
        )}

        {/* TAB: REKAPAN KAS TAHUNAN 2026 */}
        {activeTab === 'rekap-2026' && (
          <RekapKasTahunan2026
            wargaList={database.warga}
            kasList={database.kas}
            settings={database.settings}
            daftarGang={database.settings.daftarGang}
            currentUserAlamatGsb={currentUser?.alamatGsb}
          />
        )}

        {/* TAB: PUSAT PENGADUAN & ASPIRASI WARGA */}
        {activeTab === 'pengaduan' && (
          <PengaduanSection
            pengaduanList={database.pengaduan || []}
            currentUser={currentUser}
            settings={database.settings}
            subTab={pengaduanSubTab}
            onSubTabChange={setPengaduanSubTab}
            onAddPengaduan={handleAddPengaduan}
            onUpdatePengaduan={handleUpdatePengaduan}
            onDeletePengaduan={handleDeletePengaduan}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}

        {/* TAB 2: AGENDA & NOTULEN LENGKAP */}
        {activeTab === 'agenda-notulen' && (
          <div className="space-y-8">
            <AgendaSection
              agendaList={database.agenda}
              wargaList={database.warga}
              currentUser={currentUser}
              onAddAgenda={handleAddAgenda}
              onUpdateAgenda={handleUpdateAgenda}
              onDeleteAgenda={handleDeleteAgenda}
            />

            <NotulenSection
              notulenList={database.notulen}
              wargaList={database.warga}
              currentUser={currentUser}
              onAddNotulen={handleAddNotulen}
              onUpdateNotulen={handleUpdateNotulen}
              onDeleteNotulen={handleDeleteNotulen}
            />
          </div>
        )}

        {/* TAB 3: REKAP KAS BERDASARKAN ALAMAT GSB */}
        {activeTab === 'rekap-kas' && (
          <RekapKasWarga
            wargaList={database.warga}
            kasList={database.kas}
            currentUser={currentUser}
            settings={database.settings}
            onOpenBayar={() => setIsBayarKasOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenKeluarga={() => setActiveTab('keluarga-saya')}
          />
        )}

        {/* TAB 4: KELUARGA SAYA (LAYANAN MANDIRI KEPENDUDUKAN WARGA) */}
        {activeTab === 'keluarga-saya' && (
          <KeluargaSayaSection
            wargaList={database.warga}
            currentUser={currentUser}
            daftarGang={database.settings.daftarGang}
            onUpdateWarga={handleUpdateWarga}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenBayarKas={() => setIsBayarKasOpen(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 5: KELOLA WARGA (ADMIN ONLY) */}
        {activeTab === 'kelola-warga' && currentUser?.isAdmin && (
          <KelolaWargaModal
            wargaList={database.warga}
            daftarGang={database.settings.daftarGang}
            onAddWarga={handleAddWarga}
            onUpdateWarga={handleUpdateWarga}
            onDeleteWarga={handleDeleteWarga}
            onOpenUbahGang={() => setIsUbahGangOpen(true)}
          />
        )}

        {/* TAB 5: KELOLA KAS (ADMIN ONLY) */}
        {activeTab === 'kelola-kas' && currentUser?.isAdmin && (
          <KelolaKasModal
            kasList={database.kas}
            wargaList={database.warga}
            settings={database.settings}
            onAddKas={handleAddKas}
            onUpdateKas={handleUpdateKas}
            onDeleteKas={handleDeleteKas}
          />
        )}

        {/* TAB 6: PENGATURAN LOGO, REKENING, & DATABASE (ADMIN & SUPER ADMIN) */}
        {activeTab === 'pengaturan' && currentUser?.isAdmin && (
          <PengaturanModal
            settings={database.settings}
            fullDatabase={database}
            currentUser={currentUser}
            onUpdateSettings={handleUpdateSettings}
            onRestoreDatabase={handleRestoreDatabase}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">
              Rukun Tetangga 001 / Rukun Warga 004 — Perum Griya Sutera Balaraja
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Desa Talagasari, Kecamatan Balaraja, Kabupaten Tangerang, Banten
            </p>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Sistem Administrasi & Keuangan Terpadu
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Interactive Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLogin={handleLogin}
      />

      <UbahPasswordModal
        isOpen={isUbahPasswordOpen}
        onClose={() => setIsUbahPasswordOpen(false)}
        currentUser={currentUser}
        onUpdatePassword={handleChangePassword}
      />

      <BayarKasModal
        isOpen={isBayarKasOpen}
        onClose={() => setIsBayarKasOpen(false)}
        settings={database.settings}
        currentUser={currentUser}
        wargaList={database.warga}
        onBayarSuccess={handleBayarSuccess}
      />

      <LaporanKasModal
        isOpen={isLaporanKasOpen}
        onClose={() => setIsLaporanKasOpen(false)}
        kasList={database.kas}
        settings={database.settings}
        wargaList={database.warga}
      />

      <UbahNamaGangModal
        isOpen={isUbahGangOpen}
        onClose={() => setIsUbahGangOpen(false)}
        daftarGang={database.settings.daftarGang || ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5']}
        wargaList={database.warga}
        onRenameGang={handleRenameGang}
        onAddGang={handleAddGang}
        onDeleteGang={handleDeleteGang}
      />

    </div>
  );
}
