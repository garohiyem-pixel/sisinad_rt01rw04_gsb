import React, { useState, useMemo } from 'react';
import { PengaduanWarga, KategoriPengaduan, StatusPengaduan, UserSession, AppSettings } from '../types';
import { 
  MessageSquareWarning, 
  Plus, 
  Send, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  UserX, 
  Image as ImageIcon, 
  X, 
  ChevronRight, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Calendar, 
  Trash2, 
  Edit3, 
  ArrowRight,
  Info,
  Lightbulb,
  Check,
  Lock,
  BarChart3
} from 'lucide-react';
import { RekapPengaduanPeriode } from './RekapPengaduanPeriode';
import { FormPengaduanModal } from './FormPengaduanModal';

interface PengaduanSectionProps {
  pengaduanList: PengaduanWarga[];
  currentUser: UserSession | null;
  settings: AppSettings;
  subTab?: 'DAFTAR' | 'FORM' | 'PANDUAN' | 'REKAP';
  onSubTabChange?: (tab: 'DAFTAR' | 'FORM' | 'PANDUAN' | 'REKAP') => void;
  onAddPengaduan: (aduan: PengaduanWarga) => Promise<void>;
  onUpdatePengaduan: (id: string, updates: Partial<PengaduanWarga>) => Promise<void>;
  onDeletePengaduan: (id: string) => Promise<void>;
  onOpenLogin?: () => void;
}

const KATEGORI_OPTIONS: KategoriPengaduan[] = [
  'Keamanan & Ketertiban',
  'Fasilitas & Infrastruktur',
  'Kebersihan & Lingkungan',
  'Sosial & Kemasyarakatan',
  'Lainnya'
];

const KATEGORI_COLORS: Record<KategoriPengaduan, { bg: string; text: string; border: string }> = {
  'Keamanan & Ketertiban': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  'Fasilitas & Infrastruktur': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Kebersihan & Lingkungan': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Sosial & Kemasyarakatan': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Lainnya': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' }
};

export const PengaduanSection: React.FC<PengaduanSectionProps> = ({
  pengaduanList,
  currentUser,
  settings,
  subTab,
  onSubTabChange,
  onAddPengaduan,
  onUpdatePengaduan,
  onDeletePengaduan,
  onOpenLogin
}) => {
  const [internalSubTab, setInternalSubTab] = useState<'DAFTAR' | 'FORM' | 'PANDUAN' | 'REKAP'>('DAFTAR');
  const activeSubTab = subTab !== undefined ? subTab : internalSubTab;
  const setActiveSubTab = (tab: 'DAFTAR' | 'FORM' | 'PANDUAN' | 'REKAP') => {
    if (onSubTabChange) onSubTabChange(tab);
    setInternalSubTab(tab);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | StatusPengaduan>('ALL');
  const [selectedKategori, setSelectedKategori] = useState<'ALL' | KategoriPengaduan>('ALL');
  const [selectedGang, setSelectedGang] = useState<string>('ALL');
  const [selectedPeriodeBulan, setSelectedPeriodeBulan] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Admin Response Modal State
  const [respondingAduan, setRespondingAduan] = useState<PengaduanWarga | null>(null);
  const [adminStatus, setAdminStatus] = useState<StatusPengaduan>('Diproses');
  const [adminTanggapan, setAdminTanggapan] = useState('');
  const [adminPetugas, setAdminPetugas] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Available unique months from dataset for quick feed filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    pengaduanList.forEach(p => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);
      if (!isNaN(d.getTime())) {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(ym);
      }
    });
    return Array.from(set).sort().reverse();
  }, [pengaduanList]);

  // Complaint Form Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // If subTab is set to 'FORM' (e.g. from Dashboard widget), open the popup modal and keep background on DAFTAR
  React.useEffect(() => {
    if (subTab === 'FORM') {
      setIsFormModalOpen(true);
      if (onSubTabChange) onSubTabChange('DAFTAR');
      setInternalSubTab('DAFTAR');
    }
  }, [subTab, onSubTabChange]);


  // Daily quota calculation: max 2 reports per resident per day
  const MAX_REPORTS_PER_DAY = 2;
  const getTodayDateStr = (date: Date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => getTodayDateStr(new Date()), []);

  const todayUserReports = useMemo(() => {
    if (!currentUser) return [];
    return pengaduanList.filter(p => {
      if (!p.createdAt) return false;
      const pDate = new Date(p.createdAt);
      if (isNaN(pDate.getTime())) return false;
      if (getTodayDateStr(pDate) !== todayStr) return false;

      // 1. By pelaporUserId
      if (p.pelaporUserId && p.pelaporUserId === currentUser.id) return true;
      // 2. By Alamat GSB (Block Rumah Warga yang unik)
      if (currentUser.alamatGsb && p.alamatGsb && 
          currentUser.alamatGsb.trim().toLowerCase() === p.alamatGsb.trim().toLowerCase()) {
        return true;
      }
      // 3. By namaPelapor (if non-anonymous)
      if (!p.isAnonim && currentUser.nama && p.namaPelapor && 
          currentUser.nama.trim().toLowerCase() === p.namaPelapor.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [pengaduanList, currentUser, todayStr]);

  const userReportsTodayCount = todayUserReports.length;
  const isDailyLimitReached = userReportsTodayCount >= MAX_REPORTS_PER_DAY;
  const remainingQuota = Math.max(0, MAX_REPORTS_PER_DAY - userReportsTodayCount);

  const availableGangs = useMemo(() => {
    if (settings.daftarGang && settings.daftarGang.length > 0) return settings.daftarGang;
    return ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];
  }, [settings.daftarGang]);

  // Statistics
  const stats = useMemo(() => {
    const total = pengaduanList.length;
    const menunggu = pengaduanList.filter(p => p.status === 'Menunggu').length;
    const diproses = pengaduanList.filter(p => p.status === 'Diproses').length;
    const selesai = pengaduanList.filter(p => p.status === 'Selesai').length;
    const ditolak = pengaduanList.filter(p => p.status === 'Ditolak').length;
    return { total, menunggu, diproses, selesai, ditolak };
  }, [pengaduanList]);

  // Filtered complaints
  const filteredList = useMemo(() => {
    return pengaduanList.filter(aduan => {
      if (selectedStatus !== 'ALL' && aduan.status !== selectedStatus) return false;
      if (selectedKategori !== 'ALL' && aduan.kategori !== selectedKategori) return false;
      if (selectedGang !== 'ALL' && aduan.lokasiGang !== selectedGang) return false;

      if (selectedPeriodeBulan !== 'ALL') {
        if (!aduan.createdAt) return false;
        const d = new Date(aduan.createdAt);
        if (isNaN(d.getTime())) return false;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== selectedPeriodeBulan) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mJudul = aduan.judul.toLowerCase().includes(q);
        const mDeskripsi = aduan.deskripsi.toLowerCase().includes(q);
        const mPelapor = !aduan.isAnonim && aduan.namaPelapor.toLowerCase().includes(q);
        const mAlamat = !aduan.isAnonim && aduan.alamatGsb.toLowerCase().includes(q);
        const mPetugas = (aduan.petugasPenindak || '').toLowerCase().includes(q);
        const mAnonim = aduan.isAnonim && ('anonim'.includes(q) || 'disamarkan'.includes(q));
        if (!mJudul && !mDeskripsi && !mPelapor && !mAlamat && !mPetugas && !mAnonim) return false;
      }
      return true;
    });
  }, [pengaduanList, selectedStatus, selectedKategori, selectedGang, selectedPeriodeBulan, searchQuery]);


  // Open Admin Response Modal
  const handleOpenResponse = (aduan: PengaduanWarga) => {
    setRespondingAduan(aduan);
    setAdminStatus(aduan.status === 'Menunggu' ? 'Diproses' : aduan.status);
    setAdminTanggapan(aduan.tanggapanRt || '');
    setAdminPetugas(aduan.petugasPenindak || (currentUser?.nama ? `${currentUser.nama} (Pengurus RT)` : 'Pengurus RT 001'));
  };

  // Save Admin Response
  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingAduan) return;

    try {
      setIsSubmittingResponse(true);
      const todayStr = new Date().toISOString().split('T')[0];
      await onUpdatePengaduan(respondingAduan.id, {
        status: adminStatus,
        tanggapanRt: adminTanggapan.trim() || undefined,
        tanggalTanggapan: todayStr,
        petugasPenindak: adminPetugas.trim() || undefined
      });
      setRespondingAduan(null);
    } catch (err: any) {
      alert('Gagal memperbarui respon aduan: ' + (err?.message || err));
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Delete Complaint
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Hapus pengaduan "${title}"?`)) return;
    try {
      await onDeletePengaduan(id);
    } catch (err: any) {
      alert('Gagal menghapus pengaduan: ' + (err?.message || err));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs mb-2">
            <MessageSquareWarning className="w-3.5 h-3.5 text-amber-400" />
            Layanan Aspirasi & Pengaduan Warga RT 001 RW 004
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Pusat Pengaduan & Tindak Lanjut Masalah Warga
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl mt-1 leading-relaxed">
            Saluran resmi pelaporan fasilitas rusak, kebersihan lingkungan, keamanan, ketertiban, maupun usulan warga secara terbuka & transparan dengan respon terukur dari Pengurus RT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (!currentUser) {
                if (onOpenLogin) onOpenLogin();
                else setIsFormModalOpen(true);
              } else {
                setIsFormModalOpen(true);
              }
            }}
            title={
              !currentUser 
                ? 'Login akun warga untuk membuat laporan pengaduan'
                : isDailyLimitReached 
                  ? 'Batas maksimal harian tercapai (2/2 laporan)' 
                  : `Buat Laporan Baru (Sisa kuota: ${remainingQuota}/2 hari ini)`
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer bg-amber-400 hover:bg-amber-500 text-slate-950 active:scale-95"
          >
            {currentUser ? (
              <Plus className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4 text-slate-950" />
            )}
            <span>+ Buat Pengaduan Baru</span>
            {currentUser ? (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                isDailyLimitReached 
                  ? 'bg-rose-100 text-rose-800' 
                  : 'bg-slate-900 text-amber-300'
              }`}>
                {remainingQuota}/2 Kuota
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white">
                Wajib Login
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab(activeSubTab === 'REKAP' ? 'DAFTAR' : 'REKAP')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs border border-white/20 transition-all cursor-pointer ${
              activeSubTab === 'REKAP'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-300" />
            <span>Rekap per Periode</span>
          </button>

          <button
            onClick={() => setActiveSubTab('PANDUAN')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-white/20 transition-all cursor-pointer ${
              activeSubTab === 'PANDUAN'
                ? 'bg-white/25 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-300" />
            <span>Saran & Workflow RT</span>
          </button>
        </div>
      </div>

      {/* 4 Status KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div 
          onClick={() => { setSelectedStatus('ALL'); setActiveSubTab('DAFTAR'); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === 'ALL' && activeSubTab === 'DAFTAR'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="text-slate-500 dark:text-slate-400 font-medium">Total Aduan Masuk</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total} <span className="text-xs font-normal text-slate-500">Laporan</span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold flex items-center gap-1">
            Semua kategori lingkungan
          </div>
        </div>

        <div 
          onClick={() => { setSelectedStatus('Menunggu'); setActiveSubTab('DAFTAR'); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === 'Menunggu' && activeSubTab === 'DAFTAR'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="text-amber-800 dark:text-amber-300 font-medium flex items-center justify-between">
            <span>Menunggu Tinjauan</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
            {stats.menunggu} <span className="text-xs font-normal text-amber-700">Laporan</span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
            Perlu verifikasi pengurus
          </div>
        </div>

        <div 
          onClick={() => { setSelectedStatus('Diproses'); setActiveSubTab('DAFTAR'); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === 'Diproses' && activeSubTab === 'DAFTAR'
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="text-indigo-800 dark:text-indigo-300 font-medium flex items-center justify-between">
            <span>Sedang Ditindaklanjuti</span>
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
            {stats.diproses} <span className="text-xs font-normal text-indigo-700">Laporan</span>
          </div>
          <div className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1 font-semibold">
            Dalam penanganan seksi RT
          </div>
        </div>

        <div 
          onClick={() => { setSelectedStatus('Selesai'); setActiveSubTab('DAFTAR'); }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === 'Selesai' && activeSubTab === 'DAFTAR'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
            <span>Selesai / Tuntas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
            {stats.selesai} <span className="text-xs font-normal text-emerald-700">Laporan</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
            Solusi & perbaikan berhasil
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveSubTab('DAFTAR')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'DAFTAR'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Feed / Daftar Aduan ({stats.total})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('REKAP')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'REKAP'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Rekapitulasi per Periode</span>
          </button>

          <button
            onClick={() => setActiveSubTab('PANDUAN')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'PANDUAN'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Workflow & SOP RT</span>
          </button>
        </div>

        {activeSubTab === 'DAFTAR' ? (
          <button
            onClick={() => setActiveSubTab('REKAP')}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Buka Rekapitulasi per Periode →</span>
          </button>
        ) : activeSubTab === 'REKAP' ? (
          <button
            onClick={() => setActiveSubTab('DAFTAR')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Kembali ke Feed Aduan</span>
          </button>
        ) : null}
      </div>

      {/* SUB-TAB: REKAPITULASI PENGADUAN PER PERIODE */}
      {activeSubTab === 'REKAP' && (
        <RekapPengaduanPeriode
          pengaduanList={pengaduanList}
          settings={settings}
          availableGangs={availableGangs}
          onOpenResponseModal={handleOpenResponse}
          isAdmin={!!currentUser?.isAdmin}
        />
      )}

      {/* SUB-TAB 1: WORKFLOW & SARAN WORKFLOW FITUR PENGADUAN */}
      {activeSubTab === 'PANDUAN' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <Lightbulb className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Rekomendasi Standar Operasional Prosedur (SOP) & Workflow Pengaduan Warga RT 001 RW 004
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Panduan tata kelola penanganan aduan masyarakat yang responsif, terukur, transparan, dan adil.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('DAFTAR')}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Lihat Daftar Pengaduan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                1
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Pelaporan & Upload Foto
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Warga mengisi form aduan: memilih kategori masalah, lokasi gang, uraian detail, dan bukti foto kondisi lapangan. Warga dapat memilih opsi <strong>Anonim</strong> jika isu bersifat sensitif demi kenyamanan bertetangga.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-sm">
                2
              </div>
              <div className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                Triase & Verifikasi (1x24 Jam)
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Pengurus RT (Ketua RT / Sekretaris) memeriksa validitas aduan. Status awal <strong>Menunggu</strong> dicek, apakah merupakan wewenang RT atau instansi luar (PLN/PDAM/Desa).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                3
              </div>
              <div className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">
                Disposisi & Penanganan
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Status diubah menjadi <strong>Diproses</strong>. Pengurus menunjuk seksi terkait (Seksi Keamanan, Sarana Prasarana, atau Kebersihan) untuk turun ke lokasi menangani permasalahan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                4
              </div>
              <div className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Penyelesaian & Publikasi Respon
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Setelah selesai diperbaiki, pengurus mengunggah tanggapan resmi dan mengubah status menjadi <strong>Selesai</strong>. Seluruh warga dapat melihat hasil penanganan langsung di dashboard secara transparan.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Kiat Pengurus RT:</strong> Tanggapi setiap aduan dengan ramah dan solutif. Warga yang melihat aduan mereka cepat direspon akan memiliki tingkat kepercayaan dan kepatuhan membayar uang kas yang jauh lebih tinggi.
            </div>
          </div>
        </div>
      )}



      {/* SUB-TAB 3: DAFTAR & FEED PENGADUAN WARGA */}
      {activeSubTab === 'DAFTAR' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              {(['ALL', 'Menunggu', 'Diproses', 'Selesai', 'Ditolak'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                    selectedStatus === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'Semua Status' : st}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPeriodeBulan}
                onChange={e => setSelectedPeriodeBulan(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                title="Filter berdasarkan periode bulan"
              >
                <option value="ALL">Semua Periode</option>
                {availableMonths.map(m => {
                  const [y, mm] = m.split('-');
                  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  const label = `${monthNames[parseInt(mm, 10) - 1] || mm} ${y}`;
                  return (
                    <option key={m} value={m}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedGang}
                onChange={e => setSelectedGang(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Gang</option>
                {availableGangs.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={selectedKategori}
                onChange={e => setSelectedKategori(e.target.value as any)}
                className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kategori</option>
                {KATEGORI_OPTIONS.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>

              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari pengaduan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Complaints Feed List */}
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                Belum Ada Pengaduan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Tidak ada laporan yang sesuai dengan filter pencarian atau status yang dipilih.
              </p>
              <button
                onClick={() => setIsFormModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Pengaduan Baru</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map(aduan => {
                const katColor = KATEGORI_COLORS[aduan.kategori] || KATEGORI_COLORS['Lainnya'];
                const isSelesai = aduan.status === 'Selesai';
                const isDiproses = aduan.status === 'Diproses';
                const isMenunggu = aduan.status === 'Menunggu';

                return (
                  <div
                    key={aduan.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-900/60 transition-all space-y-3.5"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Kategori Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${katColor.bg} ${katColor.text} ${katColor.border}`}>
                            {aduan.kategori}
                          </span>

                          {/* Gang Badge */}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {aduan.lokasiGang}
                          </span>

                          {/* Date */}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {aduan.createdAt ? new Date(aduan.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru saja'}
                          </span>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-white pt-0.5">
                          {aduan.judul}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isMenunggu && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Menunggu Tinjauan
                          </span>
                        )}
                        {isDiproses && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5" /> Sedang Ditindaklanjuti
                          </span>
                        )}
                        {isSelesai && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Ditangani
                          </span>
                        )}
                        {aduan.status === 'Ditolak' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                            <X className="w-3.5 h-3.5" /> Ditutup / Ditolak
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description Body */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {aduan.deskripsi}
                    </p>

                    {/* Foto Bukti Thumbnail if exists */}
                    {aduan.fotoBukti && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(aduan.fotoBukti || null)}
                          className="inline-flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 cursor-pointer transition-colors"
                        >
                          <img
                            src={aduan.fotoBukti}
                            alt="Bukti foto"
                            className="w-14 h-14 object-cover rounded-lg"
                          />
                          <div className="text-left text-xs pr-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5" /> Lihat Foto Bukti
                            </span>
                            <span className="text-[10px] text-slate-400">Klik untuk perbesar</span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Pelapor Info Strip */}
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 gap-2">
                      <div className="flex items-center gap-2">
                        {aduan.isAnonim ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            <span>Pelapor: <strong>Warga RT 001 (Anonim)</strong></span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-500 font-medium">Blok Rumah Disamarkan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            Pelapor: {aduan.namaPelapor} (Rumah {aduan.alamatGsb})
                          </span>
                        )}

                        {!aduan.isAnonim && currentUser?.isAdmin && aduan.noHp && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono ml-2">
                            <Phone className="w-3 h-3" /> WA: {aduan.noHp}
                          </span>
                        )}
                      </div>

                      {/* Admin Controls */}
                      {currentUser?.isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenResponse(aduan)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-lg border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Tanggapi / Update Status</span>
                          </button>

                          <button
                            onClick={() => handleDelete(aduan.id, aduan.judul)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                            title="Hapus laporan aduan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Official Response from RT Management */}
                    {aduan.tanggapanRt ? (
                      <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 font-bold">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Tanggapan Resmi Pengurus RT 001 RW 004</span>
                          </div>
                          {aduan.tanggalTanggapan && (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                              Ditanggapi: {aduan.tanggalTanggapan}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-5 whitespace-pre-line">
                          {aduan.tanggapanRt}
                        </p>
                        {aduan.petugasPenindak && (
                          <div className="pl-5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            Petugas / Seksi Penindak: {aduan.petugasPenindak}
                          </div>
                        )}
                      </div>
                    ) : (
                      isMenunggu && (
                        <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Laporan ini telah terdaftar di sistem dan sedang dalam antrean review Pengurus RT.</span>
                        </div>
                      )
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Modal Popup Buat Pengaduan */}
      <FormPengaduanModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        currentUser={currentUser}
        pengaduanList={pengaduanList}
        availableGangs={availableGangs}
        onAddPengaduan={onAddPengaduan}
        onOpenLogin={onOpenLogin}
      />

      {/* Modal Respon Admin */}
      {respondingAduan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Tindak Lanjut & Tanggapan Pengurus RT
              </h3>
              <button
                onClick={() => setRespondingAduan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Judul Aduan Warga:</div>
                <div className="font-bold text-slate-900 dark:text-white">{respondingAduan.judul}</div>
                <div className="text-[11px] text-slate-500">
                  {respondingAduan.lokasiGang} | Pelapor: {respondingAduan.isAnonim ? 'Warga RT 001 (Anonim)' : respondingAduan.namaPelapor} ({respondingAduan.isAnonim ? 'Blok Disamarkan' : respondingAduan.alamatGsb})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ubah Status Pengaduan:
                </label>
                <select
                  value={adminStatus}
                  onChange={e => setAdminStatus(e.target.value as StatusPengaduan)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                >
                  <option value="Menunggu">Menunggu Tinjauan</option>
                  <option value="Diproses">Sedang Ditindaklanjuti (Diproses)</option>
                  <option value="Selesai">Selesai Ditangani</option>
                  <option value="Ditolak">Ditutup / Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Petugas / Seksi Penindak:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Seksi Keamanan & Ketertiban / Ketua RT"
                  value={adminPetugas}
                  onChange={e => setAdminPetugas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tanggapan Resmi Pengurus RT (Terbuka untuk Warga):
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan respon resmi, langkah yang diambil, atau hasil perbaikan lapangan..."
                  value={adminTanggapan}
                  onChange={e => setAdminTanggapan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRespondingAduan(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResponse}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingResponse ? 'Menyimpan...' : 'Simpan Tanggapan RT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Foto Bukti */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Foto Bukti Kondisi Lapangan
              </h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={previewImage}
                alt="Foto Bukti"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-lg text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
