import React, { useState, useMemo } from 'react';
import { PengaduanWarga, UserSession, sortPengaduanNewestFirst } from '../types';
import { 
  MessageSquareWarning, 
  CheckCircle2, 
  ChevronRight, 
  MapPin, 
  Plus, 
  ShieldCheck,
  Clock,
  Filter,
  Lock
} from 'lucide-react';

interface PengaduanDashboardWidgetProps {
  pengaduanList: PengaduanWarga[];
  currentUser?: UserSession | null;
  onOpenPengaduanTab: () => void;
  onOpenFormPengaduan: () => void;
  onOpenLogin?: () => void;
}

export const PengaduanDashboardWidget: React.FC<PengaduanDashboardWidgetProps> = ({
  pengaduanList,
  currentUser,
  onOpenPengaduanTab,
  onOpenFormPengaduan,
  onOpenLogin
}) => {
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'Menunggu' | 'Diproses' | 'Selesai'>('SEMUA');

  const total = pengaduanList.length;
  const menunggu = pengaduanList.filter(p => p.status === 'Menunggu').length;
  const diproses = pengaduanList.filter(p => p.status === 'Diproses').length;
  const selesai = pengaduanList.filter(p => p.status === 'Selesai').length;

  const handleLaporClick = () => {
    if (!currentUser) {
      if (onOpenLogin) {
        onOpenLogin();
      } else {
        onOpenFormPengaduan();
      }
    } else {
      onOpenFormPengaduan();
    }
  };

  // Sorted newest first
  const sortedList = useMemo(() => {
    return [...pengaduanList].sort(sortPengaduanNewestFirst);
  }, [pengaduanList]);

  // Filtered complaints
  const displayedAduan = useMemo(() => {
    if (filterStatus === 'SEMUA') {
      return sortedList.slice(0, 6);
    }
    return sortedList.filter(p => p.status === filterStatus).slice(0, 6);
  }, [sortedList, filterStatus]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <MessageSquareWarning className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white">
                Pengaduan & Aspirasi Warga
              </h3>
              {selesai > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5 sm:gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {selesai} Selesai
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transparansi penanganan fasilitas lingkungan RT 001/004
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLaporClick}
            title={currentUser ? "Buat Laporan Baru (Maks 2 per hari)" : "Login akun warga untuk membuat laporan"}
            className="flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            {currentUser ? (
              <Plus className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-900" />
            )}
            <span>+ Lapor Masalah</span>
          </button>
          <button
            onClick={onOpenPengaduanTab}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Semua ({total})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Quick Status Stats (Interactive Click to Filter) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 text-xs text-center">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Menunggu' ? 'SEMUA' : 'Menunggu')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filterStatus === 'Menunggu'
              ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-500 ring-2 ring-amber-400/40'
              : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/40 hover:bg-amber-100/60'
          }`}
        >
          <div className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-300 font-medium">Menunggu</div>
          <div className="text-base sm:text-xl font-black text-amber-950 dark:text-amber-200 mt-0.5">{menunggu}</div>
          <div className="text-[9px] sm:text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            {filterStatus === 'Menunggu' ? '● Aktif' : 'Filter'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Diproses' ? 'SEMUA' : 'Diproses')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filterStatus === 'Diproses'
              ? 'bg-indigo-100 dark:bg-indigo-900/60 border-indigo-500 ring-2 ring-indigo-400/40'
              : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-900/40 hover:bg-indigo-100/60'
          }`}
        >
          <div className="text-[10px] sm:text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">Diproses</div>
          <div className="text-base sm:text-xl font-black text-indigo-950 dark:text-indigo-200 mt-0.5">{diproses}</div>
          <div className="text-[9px] sm:text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
            {filterStatus === 'Diproses' ? '● Aktif' : 'Filter'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'Selesai' ? 'SEMUA' : 'Selesai')}
          className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
            filterStatus === 'Selesai'
              ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 ring-2 ring-emerald-400/40'
              : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/40 hover:bg-emerald-100/60'
          }`}
        >
          <div className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Selesai</div>
          <div className="text-base sm:text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">{selesai}</div>
          <div className="text-[9px] sm:text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            {filterStatus === 'Selesai' ? '● Aktif' : 'Filter'}
          </div>
        </button>
      </div>

      {/* Filter indicator bar if active */}
      {filterStatus !== 'SEMUA' && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Menampilkan laporan dengan status: <strong className="text-blue-600 dark:text-blue-400 font-bold">{filterStatus}</strong></span>
          </div>
          <button
            onClick={() => setFilterStatus('SEMUA')}
            className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold underline cursor-pointer"
          >
            Tampilkan Semua ({total})
          </button>
        </div>
      )}

      {/* List Recent Complaints */}
      <div className="space-y-2.5 pt-1">
        {displayedAduan.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-xl">
            {filterStatus === 'SEMUA' 
              ? 'Belum ada aduan warga yang masuk. Lingkungan aman & kondusif.'
              : `Tidak ada aduan dengan status "${filterStatus}".`}
          </div>
        ) : (
          displayedAduan.map(aduan => (
            <div
              key={aduan.id}
              onClick={onOpenPengaduanTab}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs group ${
                aduan.status === 'Selesai'
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-400'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 bg-white dark:bg-slate-900/50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {aduan.judul}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {aduan.lokasiGang}
                  </span>
                  {aduan.status === 'Selesai' && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-100/80 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Terselesaikan
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                  {aduan.deskripsi}
                </div>
                {aduan.tanggapanRt && (
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5 pt-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="line-clamp-1">
                      <strong>Tanggapan RT:</strong> &quot;{aduan.tanggapanRt}&quot;
                      {aduan.petugasPenindak ? ` (Petugas: ${aduan.petugasPenindak})` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                {aduan.status === 'Menunggu' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Menunggu
                  </span>
                )}
                {aduan.status === 'Diproses' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Diproses
                  </span>
                )}
                {aduan.status === 'Selesai' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Selesai
                  </span>
                )}
                {aduan.status === 'Ditolak' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Ditutup
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
