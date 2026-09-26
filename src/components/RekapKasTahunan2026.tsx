import React, { useState, useMemo } from 'react';
import { Warga, TransaksiKas, AppSettings } from '../types';
import { 
  Table, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Building,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  LayoutGrid
} from 'lucide-react';

interface RekapKasTahunan2026Props {
  wargaList: Warga[];
  kasList: TransaksiKas[];
  settings: AppSettings;
  daftarGang?: string[];
  currentUserAlamatGsb?: string;
}

const BULAN_2026 = [
  { key: '2026-01', short: 'Jan', label: 'Januari' },
  { key: '2026-02', short: 'Feb', label: 'Februari' },
  { key: '2026-03', short: 'Mar', label: 'Maret' },
  { key: '2026-04', short: 'Apr', label: 'April' },
  { key: '2026-05', short: 'Mei', label: 'Mei' },
  { key: '2026-06', short: 'Jun', label: 'Juni' },
  { key: '2026-07', short: 'Jul', label: 'Juli' },
  { key: '2026-08', short: 'Agu', label: 'Agustus' },
  { key: '2026-09', short: 'Sep', label: 'September' },
  { key: '2026-10', short: 'Okt', label: 'Oktober' },
  { key: '2026-11', short: 'Nov', label: 'November' },
  { key: '2026-12', short: 'Des', label: 'Desember' },
];

export const RekapKasTahunan2026: React.FC<RekapKasTahunan2026Props> = ({
  wargaList,
  kasList,
  settings,
  daftarGang = [],
  currentUserAlamatGsb
}) => {
  const [selectedGang, setSelectedGang] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LUNAS' | 'MENUNGGAK'>('ALL');
  const [expandedWargaId, setExpandedWargaId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const availableGangs = useMemo(() => {
    if (daftarGang && daftarGang.length > 0) return daftarGang;
    // Fallback: extract distinct from wargaList or default 5 gang
    const set = new Set<string>();
    wargaList.forEach(w => {
      if (w.gang) set.add(w.gang);
    });
    if (set.size > 0) return Array.from(set).sort();
    return ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];
  }, [daftarGang, wargaList]);

  // Standard target iuran per month per house
  const targetKas = Number(settings.iuranKasNominal) || 20000;
  const targetDansos = Number(settings.iuranDansosNominal) || 10000;
  const targetPerBulan = targetKas + targetDansos;
  const targetTahun2026 = targetPerBulan * 12;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatShortRupiah = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}Jt`;
    if (val >= 1000) return `${Math.round(val / 1000)}rb`;
    return val.toString();
  };

  // Pre-calculate per-warga matrix data
  const matrixData = useMemo(() => {
    // Only verified transactions count
    const verifiedKas = kasList.filter(k => k.status === 'verified');

    return wargaList.map(w => {
      const cleanWargaAddr = (w.alamatGsb || '').trim().toLowerCase().replace(/[\s\/-]/g, '');

      // All verified payments for this house
      const housePayments = verifiedKas.filter(k => {
        if (!k.alamatGsb) return false;
        const cleanKasAddr = k.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
        return cleanKasAddr === cleanWargaAddr;
      });

      // Monthly breakdown
      const monthlyStatus: Record<string, {
        kasPaid: number;
        dansosPaid: number;
        totalPaid: number;
        isLunas: boolean;
        isPartial: boolean;
        payments: TransaksiKas[];
      }> = {};

      let totalBayar2026 = 0;
      let bulanLunasCount = 0;

      BULAN_2026.forEach(b => {
        const matchingPayments = housePayments.filter(k => {
          const matchPeriode = k.periodeBulan === b.key;
          const matchTanggal = k.tanggal && k.tanggal.startsWith(b.key);
          return matchPeriode || matchTanggal;
        });

        const kasPaid = matchingPayments
          .filter(k => k.akun === 'KAS')
          .reduce((sum, p) => sum + p.nominal, 0);

        const dansosPaid = matchingPayments
          .filter(k => k.akun === 'DANSOS')
          .reduce((sum, p) => sum + p.nominal, 0);

        const totalPaid = kasPaid + dansosPaid;
        const isLunas = totalPaid >= targetPerBulan;
        const isPartial = totalPaid > 0 && totalPaid < targetPerBulan;

        if (isLunas) bulanLunasCount++;
        totalBayar2026 += totalPaid;

        monthlyStatus[b.key] = {
          kasPaid,
          dansosPaid,
          totalPaid,
          isLunas,
          isPartial,
          payments: matchingPayments
        };
      });

      // Belum bayar (sisa kewajiban tahun 2026)
      const belumBayar2026 = Math.max(0, targetTahun2026 - totalBayar2026);
      const isLunasPenuh2026 = totalBayar2026 >= targetTahun2026;

      return {
        id: w.id,
        blok: w.alamatGsb, // STRICT PRIVACY: ONLY BLOK AND NAME (NO KK, NO KTP)
        nama: w.nama,
        gang: w.gang || 'Belum diatur',
        monthlyStatus,
        totalBayar2026,
        belumBayar2026,
        bulanLunasCount,
        isLunasPenuh2026
      };
    });
  }, [wargaList, kasList, targetPerBulan, targetTahun2026]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return matrixData.filter(item => {
      // Gang filter
      if (selectedGang !== 'ALL' && item.gang !== selectedGang) return false;

      // Status filter
      if (filterStatus === 'LUNAS' && !item.isLunasPenuh2026) return false;
      if (filterStatus === 'MENUNGGAK' && item.isLunasPenuh2026) return false;

      // Search query (by blok or name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBlok = item.blok.toLowerCase().includes(q);
        const matchNama = item.nama.toLowerCase().includes(q);
        if (!matchBlok && !matchNama) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by gang, then by blok
      if (a.gang !== b.gang) return a.gang.localeCompare(b.gang);
      return a.blok.localeCompare(b.blok, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [matrixData, selectedGang, filterStatus, searchQuery]);

  // Summary statistics for current filtered or total data
  const stats = useMemo(() => {
    const list = selectedGang === 'ALL' ? matrixData : matrixData.filter(m => m.gang === selectedGang);
    const totalKK = list.length;
    const sudahLunasPenuh = list.filter(m => m.isLunasPenuh2026).length;
    const adaTunggakan = totalKK - sudahLunasPenuh;
    const totalUangTerkumpul = list.reduce((acc, m) => acc + m.totalBayar2026, 0);
    const totalTunggakanBelumBayar = list.reduce((acc, m) => acc + m.belumBayar2026, 0);

    return {
      totalKK,
      sudahLunasPenuh,
      adaTunggakan,
      totalUangTerkumpul,
      totalTunggakanBelumBayar
    };
  }, [matrixData, selectedGang]);

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = ['No', 'Blok Rumah', 'Nama Warga', 'Gang', ...BULAN_2026.map(b => b.label), 'Sudah Bayar', 'Belum Bayar (Tunggakan)'];
    const rows = filteredData.map((d, idx) => {
      const monthCols = BULAN_2026.map(b => {
        const ms = d.monthlyStatus[b.key];
        if (ms.isLunas) return 'LUNAS';
        if (ms.isPartial) return `Sebagian (${ms.totalPaid})`;
        return 'BELUM';
      });
      return [
        idx + 1,
        `"${d.blok}"`,
        `"${d.nama}"`,
        `"${d.gang}"`,
        ...monthCols,
        d.totalBayar2026,
        d.belumBayar2026
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Kas_Warga_2026_${selectedGang === 'ALL' ? 'SemuaGang' : selectedGang.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Banner & Context */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 rounded-xl bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shrink-0">
                <Table className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white">
                  Rekap Iuran Kas & Dansos Warga 2026
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Januari – Desember 2026
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-2.5 h-2.5" /> Tanpa NIK/KK
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Unduh format tabel Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-3 sm:pt-4 text-xs">
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] sm:text-xs">Warga Terdata</div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1">
              {stats.totalKK} <span className="text-xs font-normal text-slate-500">KK</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              {selectedGang === 'ALL' ? '5 Gang' : selectedGang}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div className="text-emerald-800 dark:text-emerald-300 font-medium text-[11px] sm:text-xs flex items-center justify-between">
              <span>Lunas Penuh</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-100 mt-0.5 sm:mt-1">
              {stats.sudahLunasPenuh} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">KK</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
              {stats.totalKK > 0 ? ((stats.sudahLunasPenuh / stats.totalKK) * 100).toFixed(0) : 0}% lunas
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <div className="text-blue-800 dark:text-blue-300 font-medium text-[11px] sm:text-xs">Total Terbayar</div>
            <div className="text-lg sm:text-xl font-black text-blue-950 dark:text-blue-100 mt-0.5 sm:mt-1">
              {formatRupiah(stats.totalUangTerkumpul)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-blue-700 dark:text-blue-400 mt-0.5 font-medium truncate">
              {formatRupiah(targetPerBulan)}/bln
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <div className="text-amber-800 dark:text-amber-300 font-medium text-[11px] sm:text-xs flex items-center justify-between">
              <span>Sisa Tagihan</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-950 dark:text-amber-100 mt-0.5 sm:mt-1">
              {formatRupiah(stats.totalTunggakanBelumBayar)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium truncate">
              {stats.adaTunggakan} KK belum lunas
            </div>
          </div>
        </div>
      </div>

      {/* Filter Gang & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {/* Baris 1: Filter Pilihan Gang - Horizontal Scrollable on Mobile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Filter Gang:</span>
          </div>

          {/* Tombol Tab Gang */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedGang('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                selectedGang === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Semua</span>
              <span className={`px-1 py-0.2 rounded-full text-[10px] font-bold ${
                selectedGang === 'ALL'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {matrixData.length}
              </span>
            </button>
            {availableGangs.map(gang => {
              const countInGang = matrixData.filter(m => m.gang === gang).length;
              const isSelected = selectedGang === gang;
              return (
                <button
                  key={gang}
                  onClick={() => setSelectedGang(gang)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{gang.replace('Gang ', 'G')}</span>
                  <span className={`px-1 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {countInGang}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Baris 2: Filter Status Pelunasan & Pencarian Nama/Blok & Tampilan Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700 self-start">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('LUNAS')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'LUNAS'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Lunas
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('MENUNGGAK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  filterStatus === 'MENUNGGAK'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Tunggakan
              </button>
            </div>

            {/* View Mode Toggle: Table vs Kartu Ringkas (Mobile & Tablet optimized) */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Tabel Matriks Penuh"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel Matriks</span>
                <span className="sm:hidden">Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Kartu Ringkas Responsif Mobile & Tablet"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu Rumah</span>
                <span className="sm:hidden">Kartu</span>
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-60 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari blok atau nama warga..."
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
        </div>
      </div>

      {/* Tampilan 1: Mode Kartu Ringkas (Ramah Mobile & Tablet) */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Menampilkan <strong>{filteredData.length}</strong> Rumah Warga</span>
            <span className="text-[11px]">Sentuh kartu untuk melihat bulan 2026</span>
          </div>

          {filteredData.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              Tidak ditemukan data warga yang sesuai dengan filter atau pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredData.map((row) => {
                const isCurrentUsersHouse = currentUserAlamatGsb && 
                  row.blok.trim().toLowerCase().replace(/[\s\/-]/g, '') === currentUserAlamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
                const isExpanded = expandedWargaId === row.id;
                const lunasCount = BULAN_2026.filter(b => row.monthlyStatus[b.key]?.isLunas).length;
                const partialCount = BULAN_2026.filter(b => row.monthlyStatus[b.key]?.isPartial).length;
                const belumCount = 12 - lunasCount - partialCount;

                return (
                  <div
                    key={row.id}
                    className={`bg-white dark:bg-slate-900 rounded-xl p-3.5 border transition-all ${
                      isCurrentUsersHouse
                        ? 'border-blue-500 ring-1 ring-blue-400/50 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                            {row.blok}
                          </span>
                          {isCurrentUsersHouse && (
                            <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-blue-600 text-white">
                              Rumah Anda
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {row.gang}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate max-w-[200px]">
                          {row.nama}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {row.belumBayar2026 === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Lunas 2026
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <AlertCircle className="w-3 h-3" /> Sisa {formatRupiah(row.belumBayar2026)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar 12 Bulan */}
                    <div className="py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Progres 2026: <strong className="text-emerald-600 dark:text-emerald-400">{lunasCount}/12 Bln</strong>
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {formatRupiah(row.totalBayar2026)}
                        </span>
                      </div>

                      {/* 12 Bulan Mini Dots Indicator */}
                      <div className="grid grid-cols-12 gap-1 pt-0.5">
                        {BULAN_2026.map(b => {
                          const ms = row.monthlyStatus[b.key];
                          const bg = ms.isLunas
                            ? 'bg-emerald-500'
                            : ms.isPartial
                            ? 'bg-amber-400'
                            : 'bg-slate-200 dark:bg-slate-700';
                          return (
                            <div
                              key={b.key}
                              title={`${b.label}: ${ms.isLunas ? 'Lunas' : ms.isPartial ? 'Sebagian' : 'Belum Bayar'}`}
                              className={`h-2 rounded-xs ${bg}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Accordion Trigger for Monthly Breakdown */}
                    <button
                      type="button"
                      onClick={() => setExpandedWargaId(isExpanded ? null : row.id)}
                      className="w-full mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between cursor-pointer hover:underline"
                    >
                      <span>{isExpanded ? 'Sembunyikan Rincian 12 Bulan' : 'Buka Rincian Per Bulan'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Monthly Detail on Card */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-[10px]">
                        {BULAN_2026.map(b => {
                          const ms = row.monthlyStatus[b.key];
                          return (
                            <div
                              key={b.key}
                              className={`p-1.5 rounded-lg border text-center ${
                                ms.isLunas
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                  : ms.isPartial
                                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <div className="font-bold">{b.short}</div>
                              <div className="font-semibold text-[9px] mt-0.5">
                                {ms.isLunas ? 'Lunas' : ms.totalPaid > 0 ? formatShortRupiah(ms.totalPaid) : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tampilan 2: Mode Main Matrix Table (Desktop & Scrollable Mobile/Tablet) */}
      {viewMode === 'table' && (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Table Notice */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>Keterangan Bulanan Jan - Des 2026:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 ml-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Bayar Lunas
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 ml-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Sebagian
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400 ml-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Belum Bayar
            </span>
          </div>
          <div>
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> KK
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">No</th>
                <th className="py-3 px-3 min-w-[90px] sticky left-10 bg-slate-100 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700">
                  Blok Rumah
                </th>
                <th className="py-3 px-3 min-w-[130px] border-r border-slate-200 dark:border-slate-700">
                  Nama Warga
                </th>
                <th className="py-3 px-3 min-w-[100px] border-r border-slate-200 dark:border-slate-700">
                  Gang
                </th>

                {/* 12 Bulan 2026 */}
                {BULAN_2026.map(b => (
                  <th key={b.key} className="py-3 px-2 text-center min-w-[46px] border-r border-slate-200 dark:border-slate-700" title={b.label}>
                    {b.short}
                  </th>
                ))}

                {/* Summary Columns */}
                <th className="py-3 px-3 text-right min-w-[110px] text-emerald-800 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-700">
                  Sudah Bayar
                </th>
                <th className="py-3 px-3 text-right min-w-[110px] text-rose-800 dark:text-rose-400">
                  Belum Bayar
                </th>
                <th className="py-3 px-2 text-center w-12">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data warga yang sesuai dengan pencarian atau filter gang ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const isCurrentUsersHouse = currentUserAlamatGsb && 
                    row.blok.trim().toLowerCase().replace(/[\s\/-]/g, '') === currentUserAlamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
                  const isExpanded = expandedWargaId === row.id;

                  return (
                    <React.Fragment key={row.id}>
                      <tr 
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          isCurrentUsersHouse ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono sticky left-0 bg-white dark:bg-slate-900">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1">
                            {row.blok}
                            {isCurrentUsersHouse && (
                              <span className="px-1.5 py-0.2 rounded-sm text-[9px] font-bold bg-blue-600 text-white">
                                Anda
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                          {row.nama}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                          <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 font-medium">
                            {row.gang}
                          </span>
                        </td>

                        {/* 12 Bulan status cells */}
                        {BULAN_2026.map(b => {
                          const mState = row.monthlyStatus[b.key];
                          if (mState.isLunas) {
                            return (
                              <td 
                                key={b.key} 
                                className="py-2 px-1 text-center border-r border-slate-100 dark:border-slate-800"
                                title={`${row.nama} (${row.blok}) - ${b.label}: Lunas (${formatRupiah(mState.totalPaid)})`}
                              >
                                <span className="inline-flex items-center justify-center w-7 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                                  ✓
                                </span>
                              </td>
                            );
                          }
                          if (mState.isPartial) {
                            return (
                              <td 
                                key={b.key} 
                                className="py-2 px-1 text-center border-r border-slate-100 dark:border-slate-800"
                                title={`${row.nama} (${row.blok}) - ${b.label}: Terbayar Sebagian (${formatRupiah(mState.totalPaid)} dari ${formatRupiah(targetPerBulan)})`}
                              >
                                <span className="inline-flex items-center justify-center px-1 h-6 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-[9px] border border-amber-300 dark:border-amber-800">
                                  {formatShortRupiah(mState.totalPaid)}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td 
                              key={b.key} 
                              className="py-2 px-1 text-center border-r border-slate-100 dark:border-slate-800"
                              title={`${row.nama} (${row.blok}) - ${b.label}: Belum Bayar`}
                            >
                              <span className="inline-flex items-center justify-center w-7 h-6 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-400 dark:text-rose-500 font-semibold text-[10px]">
                                -
                              </span>
                            </td>
                          );
                        })}

                        {/* Sudah Bayar Berapa */}
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400 border-l border-slate-100 dark:border-slate-800">
                          {formatRupiah(row.totalBayar2026)}
                        </td>

                        {/* Belum Bayar Berapa (Tunggakan) */}
                        <td className="py-2.5 px-3 text-right font-bold">
                          {row.belumBayar2026 === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas 2026
                            </span>
                          ) : (
                            <span className="text-rose-700 dark:text-rose-400">
                              {formatRupiah(row.belumBayar2026)}
                            </span>
                          )}
                        </td>

                        {/* Expander detail button */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedWargaId(isExpanded ? null : row.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Lihat rincian transaksi"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-800/40">
                          <td colSpan={19} className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  Rincian Pembayaran Rumah {row.blok} — {row.nama} ({row.gang})
                                </div>
                                <div className="text-xs text-slate-500">
                                  Kewajiban 2026: <strong>{formatRupiah(targetTahun2026)}</strong> | Terbayar: <strong className="text-emerald-600">{formatRupiah(row.totalBayar2026)}</strong> | Tunggakan: <strong className="text-rose-600">{formatRupiah(row.belumBayar2026)}</strong>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                                {BULAN_2026.map(b => {
                                  const ms = row.monthlyStatus[b.key];
                                  return (
                                    <div 
                                      key={b.key} 
                                      className={`p-2.5 rounded-lg border text-center ${
                                        ms.isLunas 
                                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
                                          : ms.isPartial
                                            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                            : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                                      }`}
                                    >
                                      <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                        {b.label}
                                      </div>
                                      <div className="mt-1 font-bold text-xs">
                                        {ms.totalPaid > 0 ? (
                                          <span className="text-emerald-700 dark:text-emerald-400">
                                            {formatRupiah(ms.totalPaid)}
                                          </span>
                                        ) : (
                                          <span className="text-rose-600 dark:text-rose-400 text-[11px]">
                                            Belum Bayar
                                          </span>
                                        )}
                                      </div>
                                      {ms.totalPaid > 0 && (
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                          Kas: {formatShortRupiah(ms.kasPaid)} | Dansos: {formatShortRupiah(ms.dansosPaid)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Data rekapan ini terintegrasi langsung dengan database kas riil dan buku catatan pembayaran iuran warga RT 001 RW 004.
          </div>
          <div className="font-medium text-slate-700 dark:text-slate-300">
            Nominal Wajib: Kas Rp {targetKas.toLocaleString('id-ID')} + Dansos Rp {targetDansos.toLocaleString('id-ID')} = Rp {targetPerBulan.toLocaleString('id-ID')}/bln
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
