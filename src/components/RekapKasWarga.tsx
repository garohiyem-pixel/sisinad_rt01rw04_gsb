import React, { useState, useMemo } from 'react';
import { Warga, TransaksiKas, UserSession, AppSettings, sortKasNewestFirst } from '../types';
import { 
  Wallet, 
  Search, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Home, 
  User, 
  CreditCard,
  Lock,
  ArrowUpDown,
  ShieldCheck,
  Eye,
  X,
  LogIn,
  Users,
  Table,
  LayoutGrid
} from 'lucide-react';

interface RekapKasWargaProps {
  wargaList: Warga[];
  kasList: TransaksiKas[];
  currentUser: UserSession | null;
  settings: AppSettings;
  onOpenBayar?: () => void;
  onOpenLogin?: () => void;
  onOpenKeluarga?: () => void;
}

export const RekapKasWarga: React.FC<RekapKasWargaProps> = ({
  wargaList,
  kasList,
  currentUser,
  settings,
  onOpenBayar,
  onOpenLogin,
  onOpenKeluarga
}) => {
  const [selectedGang, setSelectedGang] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026-09');
  const [previewBuktiUrl, setPreviewBuktiUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // If citizen (non-admin), ONLY filter transactions for their house address
  const isCitizenOnly = !currentUser?.isAdmin;

  const citizenTransactions = useMemo(() => {
    if (!currentUser) return [];
    const cleanUserAddr = currentUser.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
    return kasList.filter(k => {
      if (!k.alamatGsb) return false;
      const cleanKasAddr = k.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
      return cleanKasAddr === cleanUserAddr;
    }).sort(sortKasNewestFirst);
  }, [kasList, currentUser]);

  // Admin view: Calculate payment status for every resident in selectedPeriode
  const rekapWargaPerGang = useMemo(() => {
    return wargaList.map(w => {
      const cleanWargaAddr = w.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
      
      const payments = kasList.filter(k => {
        if (!k.alamatGsb) return false;
        const cleanKasAddr = k.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
        const matchAddr = cleanKasAddr === cleanWargaAddr;
        const matchPeriode = k.periodeBulan === selectedPeriode || k.tanggal.startsWith(selectedPeriode);
        return matchAddr && matchPeriode && k.status === 'verified';
      });

      const kasPaid = payments
        .filter(k => k.akun === 'KAS')
        .reduce((sum, p) => sum + p.nominal, 0);

      const dansosPaid = payments
        .filter(k => k.akun === 'DANSOS')
        .reduce((sum, p) => sum + p.nominal, 0);

      const totalPaid = kasPaid + dansosPaid;
      const targetKas = settings.iuranKasNominal !== undefined ? Number(settings.iuranKasNominal) : 20000;
      const targetDansos = settings.iuranDansosNominal !== undefined ? Number(settings.iuranDansosNominal) : 10000;
      const targetTotal = targetKas + targetDansos;
      const isLunas = totalPaid >= targetTotal;

      return {
        warga: w,
        kasPaid,
        dansosPaid,
        totalPaid,
        isLunas,
        payments
      };
    });
  }, [wargaList, kasList, selectedPeriode, settings]);

  const filteredRekapWarga = useMemo(() => {
    return rekapWargaPerGang.filter(item => {
      const matchGang = selectedGang === 'ALL' || item.warga.gang === selectedGang;
      const q = searchQuery.toLowerCase();
      const matchSearch = item.warga.nama.toLowerCase().includes(q) || item.warga.alamatGsb.toLowerCase().includes(q);
      return matchGang && matchSearch;
    });
  }, [rekapWargaPerGang, selectedGang, searchQuery]);

  const totalSudahLunas = rekapWargaPerGang.filter(r => r.isLunas).length;
  const totalBelumLunas = rekapWargaPerGang.length - totalSudahLunas;
  const totalTerkumpulPeriode = rekapWargaPerGang.reduce((acc, r) => acc + r.totalPaid, 0);

  // CITIZEN VIEW (Restricted to their own house)
  if (isCitizenOnly) {
    if (!currentUser) {
      return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 mx-auto flex items-center justify-center mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">Akses Rekap Kas Terproteksi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
            Untuk menjaga privasi data warga, silakan masuk dengan akun alamat rumah GSB Anda untuk melihat riwayat pembayaran kas rumah Anda.
          </p>
          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Login Akun Warga</span>
            </button>
          )}
        </div>
      );
    }

    const totalKasSaya = citizenTransactions
      .filter(k => k.akun === 'KAS' && k.status === 'verified')
      .reduce((sum, k) => sum + k.nominal, 0);

    const totalDansosSaya = citizenTransactions
      .filter(k => k.akun === 'DANSOS' && k.status === 'verified')
      .reduce((sum, k) => sum + k.nominal, 0);

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Citizen Banner */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider text-blue-200 font-semibold">
              Rekap Kas Pribadi
            </span>
            <h2 className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">
              {currentUser.alamatGsb} — {currentUser.nama}
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100 mt-0.5">
              RT 001 RW 004 ({currentUser.gang})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
            {onOpenKeluarga && (
              <button
                onClick={onOpenKeluarga}
                className="flex-1 sm:flex-initial justify-center px-3 py-1.5 sm:px-3.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Keluarga</span>
              </button>
            )}
            <button
              onClick={onOpenBayar}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              + Bayar Iuran
            </button>
          </div>
        </div>

        {/* Citizen Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] sm:text-xs">Total Iuran Saya Terbayar</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1">
              {formatRupiah(totalKasSaya + totalDansosSaya)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Tercatat di pembukuan RT
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] sm:text-xs">Iuran Kas RT</div>
            <div className="text-lg sm:text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5 sm:mt-1">
              {formatRupiah(totalKasSaya)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              Akun Kas Operasional
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] sm:text-xs">Iuran Dana Sosial (Dansos)</div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 sm:mt-1">
              {formatRupiah(totalDansosSaya)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              Akun Santunan Warga
            </div>
          </div>
        </div>

        {/* Citizen Transaction Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Riwayat Transaksi Pembayaran Rumah {currentUser.alamatGsb}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Akun</th>
                  <th className="py-3 px-4">Periode Bulan</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {citizenTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada catatan transaksi iuran untuk rumah {currentUser.alamatGsb}.
                    </td>
                  </tr>
                ) : (
                  citizenTransactions.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">{k.tanggal}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          k.akun === 'KAS' ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {k.akun}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{k.periodeBulan || '-'}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{k.metode}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatRupiah(k.nominal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {k.status === 'rejected' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                              Ditolak
                            </span>
                            {k.catatan && <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 max-w-xs mx-auto">{k.catatan}</div>}
                          </div>
                        ) : k.status === 'pending' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> Cek Mutasi Bank
                            </span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Menunggu verifikasi Bendahara</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                          </span>
                        )}
                        {k.buktiBayar && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewBuktiUrl(k.buktiBayar || null)}
                              className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-2.5 h-2.5" /> Lihat Struk
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 italic">
            🔒 Anda hanya dapat melihat rekap pembayaran rumah Anda sendiri ({currentUser.alamatGsb}). Rekapitulasi warga lain hanya dapat diakses oleh Admin RT.
          </div>
        </div>

        {/* Modal Lightbox Bukti Transfer untuk Warga */}
        {previewBuktiUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Bukti Foto Struk Pembayaran
                </h3>
                <button
                  onClick={() => setPreviewBuktiUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
                <img 
                  src={previewBuktiUrl} 
                  alt="Bukti Transfer" 
                  className="max-h-[55vh] w-auto object-contain rounded-lg"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setPreviewBuktiUrl(null)}
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
  }

  // ADMIN VIEW (Full multi-address management)
  return (
    <div className="space-y-5">
      {/* Header Admin */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Rekap Pembayaran Kas Seluruh Warga (Berdasarkan Alamat GSB)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring kepatuhan iuran kas bulanan per rumah, terbagi dalam 5 Gang di RT 001 RW 004
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPeriode}
              onChange={e => setSelectedPeriode(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="2026-09">Bulan September 2026</option>
              <option value="2026-08">Bulan Agustus 2026</option>
              <option value="2026-10">Bulan Oktober 2026</option>
            </select>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-emerald-800 dark:text-emerald-300 font-medium">Sudah Lunas ({selectedPeriode})</div>
            <div className="text-xl font-bold text-emerald-950 dark:text-emerald-100 mt-1">
              {totalSudahLunas} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">dari {wargaList.length} KK</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <div className="text-rose-800 dark:text-rose-300 font-medium">Belum Bayar / Menunggak</div>
            <div className="text-xl font-bold text-rose-950 dark:text-rose-100 mt-1">
              {totalBelumLunas} <span className="text-xs font-normal text-rose-700 dark:text-rose-400">KK</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
            <div className="text-blue-800 dark:text-blue-300 font-medium">Total Iuran Terkumpul Periode Ini</div>
            <div className="text-xl font-bold text-blue-950 dark:text-blue-100 mt-1">
              {formatRupiah(totalTerkumpulPeriode)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-slate-500 dark:text-slate-400 font-bold px-2 flex items-center gap-1.5 text-xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-500" /> Filter Gang:
          </span>
          {(['ALL', ...(settings.daftarGang && settings.daftarGang.length > 0 ? settings.daftarGang : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'])]).map(gang => (
            <button
              key={gang}
              onClick={() => setSelectedGang(gang)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedGang === gang
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {gang === 'ALL' ? 'Semua Gang' : gang}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama / alamat GSB..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle View Mode: Table vs Cards */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilan Tabel Lengkap"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tampilan Kartu Minimalis (Mobile & Tablet)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAMPILAN KARTU (Mobile & Tablet Friendly) */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Menampilkan <strong>{filteredRekapWarga.length}</strong> Rumah</span>
            <span className="text-[11px]">Periode: {selectedPeriode}</span>
          </div>

          {filteredRekapWarga.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              Tidak ditemukan data warga yang sesuai dengan filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRekapWarga.map(({ warga, kasPaid, dansosPaid, totalPaid, isLunas, payments }) => (
                <div
                  key={warga.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                            {warga.alamatGsb}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {warga.gang}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                          {warga.nama}
                        </div>
                      </div>

                      {isLunas ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      ) : totalPaid > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                          Sebagian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                          Belum Bayar
                        </span>
                      )}
                    </div>

                    <div className="py-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Kas RT:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(kasPaid)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Dansos:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatRupiah(dansosPaid)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 font-bold">Total Disetor:</span>
                        <span className="font-black text-blue-700 dark:text-blue-400">
                          {formatRupiah(totalPaid)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {warga.noHp && (
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
                      WA / HP: {warga.noHp}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN TABEL (Desktop & Scrollable) */}
      {viewMode === 'table' && (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Alamat GSB</th>
                <th className="py-3 px-4">Gang</th>
                <th className="py-3 px-4">Nama Kepala Keluarga</th>
                <th className="py-3 px-4">Status Tinggal</th>
                <th className="py-3 px-4 text-right">Kas RT</th>
                <th className="py-3 px-4 text-right">Dansos</th>
                <th className="py-3 px-4 text-right">Total Setor</th>
                <th className="py-3 px-4 text-center">Status ({selectedPeriode})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRekapWarga.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data warga yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRekapWarga.map(({ warga, kasPaid, dansosPaid, totalPaid, isLunas, payments }) => (
                  <tr key={warga.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white font-mono text-xs">{warga.alamatGsb}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">{warga.gang}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{warga.nama}</div>
                      <div className="text-[11px] text-slate-400">{warga.noHp}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        warga.statusTinggal === 'Permanen' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {warga.statusTinggal}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                      {formatRupiah(kasPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                      {formatRupiah(dansosPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-950 dark:text-white">
                      {formatRupiah(totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLunas ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      ) : totalPaid > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          Sebagian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                          Belum Bayar
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal Lightbox Bukti Transfer */}
      {previewBuktiUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Bukti Foto Struk Pembayaran
              </h3>
              <button
                onClick={() => setPreviewBuktiUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img 
                src={previewBuktiUrl} 
                alt="Bukti Transfer" 
                className="max-h-[55vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setPreviewBuktiUrl(null)}
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
