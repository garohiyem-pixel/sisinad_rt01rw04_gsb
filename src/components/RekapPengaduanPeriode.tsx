import React, { useState, useMemo } from 'react';
import { PengaduanWarga, KategoriPengaduan, StatusPengaduan, AppSettings } from '../types';
import { 
  Calendar, 
  CalendarRange, 
  Filter, 
  Download, 
  Search, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  XCircle, 
  MessageSquareWarning, 
  MapPin, 
  BarChart3, 
  Image as ImageIcon, 
  Eye, 
  X,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  UserX
} from 'lucide-react';

interface RekapPengaduanPeriodeProps {
  pengaduanList: PengaduanWarga[];
  settings: AppSettings;
  availableGangs: string[];
  onOpenResponseModal?: (aduan: PengaduanWarga) => void;
  isAdmin?: boolean;
}

const KATEGORI_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  'Keamanan & Ketertiban': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  'Fasilitas & Infrastruktur': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Kebersihan & Lingkungan': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Air & Sanitasi': { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  'Penerangan Jalan': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Sosial & Keresahan': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'Lainnya': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' }
};

export const RekapPengaduanPeriode: React.FC<RekapPengaduanPeriodeProps> = ({
  pengaduanList,
  settings,
  availableGangs,
  onOpenResponseModal,
  isAdmin = false
}) => {
  // Period filter states
  const [periodType, setPeriodType] = useState<'BULAN' | 'TAHUN' | 'CUSTOM' | 'ALL'>('BULAN');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Secondary filters
  const [filterGang, setFilterGang] = useState<string>('ALL');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Detail Modal / Lightbox
  const [selectedAduanDetail, setSelectedAduanDetail] = useState<PengaduanWarga | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Available unique months & years from dataset
  const { uniqueMonths, uniqueYears } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<string>();
    
    // Always include current year and month
    const now = new Date();
    monthsSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    monthsSet.add('2026-09');
    monthsSet.add('2026-08');
    monthsSet.add('2026-07');
    yearsSet.add('2026');
    yearsSet.add(String(now.getFullYear()));

    pengaduanList.forEach(p => {
      if (!p.createdAt) return;
      const date = new Date(p.createdAt);
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${y}-${m}`);
        yearsSet.add(String(y));
      }
    });

    return {
      uniqueMonths: Array.from(monthsSet).sort().reverse(),
      uniqueYears: Array.from(yearsSet).sort().reverse()
    };
  }, [pengaduanList]);

  // Filter list by selected period
  const periodFilteredList = useMemo(() => {
    return pengaduanList.filter(aduan => {
      if (!aduan.createdAt) return true;
      const date = new Date(aduan.createdAt);
      if (isNaN(date.getTime())) return true;

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const ym = `${y}-${m}`;
      const dateStr = date.toISOString().split('T')[0];

      if (periodType === 'BULAN') {
        if (ym !== selectedMonth) return false;
      } else if (periodType === 'TAHUN') {
        if (String(y) !== selectedYear) return false;
      } else if (periodType === 'CUSTOM') {
        if (startDate && dateStr < startDate) return false;
        if (endDate && dateStr > endDate) return false;
      }

      return true;
    });
  }, [pengaduanList, periodType, selectedMonth, selectedYear, startDate, endDate]);

  // Apply secondary filters (gang, kategori, status, search)
  const displayedList = useMemo(() => {
    return periodFilteredList.filter(aduan => {
      if (filterGang !== 'ALL' && aduan.lokasiGang !== filterGang) return false;
      if (filterKategori !== 'ALL' && aduan.kategori !== filterKategori) return false;
      if (filterStatus !== 'ALL' && aduan.status !== filterStatus) return false;

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
  }, [periodFilteredList, filterGang, filterKategori, filterStatus, searchQuery]);

  // Statistics for the selected period
  const stats = useMemo(() => {
    const total = periodFilteredList.length;
    const menunggu = periodFilteredList.filter(p => p.status === 'Menunggu').length;
    const diproses = periodFilteredList.filter(p => p.status === 'Diproses').length;
    const selesai = periodFilteredList.filter(p => p.status === 'Selesai').length;
    const ditolak = periodFilteredList.filter(p => p.status === 'Ditolak').length;
    const resolutionRate = total > 0 ? Math.round((selesai / total) * 100) : 0;

    // Calculate average resolution time (days) for finished complaints
    let totalDurasiHari = 0;
    let countWithDuration = 0;
    periodFilteredList.forEach(p => {
      if (p.status === 'Selesai' && p.createdAt && p.tanggalTanggapan) {
        const start = new Date(p.createdAt).getTime();
        const end = new Date(p.tanggalTanggapan).getTime();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
          totalDurasiHari += diffDays;
          countWithDuration++;
        }
      }
    });

    const avgDurasi = countWithDuration > 0 ? (totalDurasiHari / countWithDuration).toFixed(1) : null;

    return {
      total,
      menunggu,
      diproses,
      selesai,
      ditolak,
      resolutionRate,
      avgDurasi
    };
  }, [periodFilteredList]);

  // Breakdown per category
  const breakdownKategori = useMemo(() => {
    const map = new Map<string, { total: number; selesai: number; diproses: number; menunggu: number }>();
    periodFilteredList.forEach(p => {
      const kat = p.kategori || 'Lainnya';
      const curr = map.get(kat) || { total: 0, selesai: 0, diproses: 0, menunggu: 0 };
      curr.total++;
      if (p.status === 'Selesai') curr.selesai++;
      else if (p.status === 'Diproses') curr.diproses++;
      else if (p.status === 'Menunggu') curr.menunggu++;
      map.set(kat, curr);
    });

    return Array.from(map.entries())
      .map(([kategori, data]) => ({
        kategori,
        ...data,
        persen: stats.total > 0 ? Math.round((data.total / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [periodFilteredList, stats.total]);

  // Breakdown per gang
  const breakdownGang = useMemo(() => {
    const map = new Map<string, { total: number; selesai: number; aktif: number }>();
    periodFilteredList.forEach(p => {
      const g = p.lokasiGang || 'Fasum / Wilayah Lain';
      const curr = map.get(g) || { total: 0, selesai: 0, aktif: 0 };
      curr.total++;
      if (p.status === 'Selesai') curr.selesai++;
      else if (p.status === 'Menunggu' || p.status === 'Diproses') curr.aktif++;
      map.set(g, curr);
    });

    return Array.from(map.entries())
      .map(([gang, data]) => ({
        gang,
        ...data,
        persen: stats.total > 0 ? Math.round((data.total / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [periodFilteredList, stats.total]);

  // Helper label for period
  const periodLabel = useMemo(() => {
    if (periodType === 'ALL') return 'Semua Periode (Kumulatif)';
    if (periodType === 'BULAN') {
      const [y, m] = selectedMonth.split('-');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const mIdx = parseInt(m, 10) - 1;
      return `Bulan ${monthNames[mIdx] || m} ${y}`;
    }
    if (periodType === 'TAHUN') return `Tahun ${selectedYear}`;
    if (periodType === 'CUSTOM') {
      if (startDate && endDate) return `Rentang ${startDate} s.d. ${endDate}`;
      if (startDate) return `Sejak ${startDate}`;
      if (endDate) return `Hingga ${endDate}`;
      return 'Rentang Tanggal Khusus';
    }
    return 'Periode Terpilih';
  }, [periodType, selectedMonth, selectedYear, startDate, endDate]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'No',
      'ID Laporan',
      'Tanggal Lapor',
      'Judul Pengaduan',
      'Kategori',
      'Lokasi Gang',
      'Alamat GSB',
      'Nama Pelapor',
      'Anonim',
      'Kontak HP',
      'Deskripsi Pengaduan',
      'Status',
      'Petugas Penindak RT',
      'Tanggal Tanggapan',
      'Tanggapan RT'
    ];

    const rows = displayedList.map((item, idx) => {
      const tgl = item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : '-';
      const clean = (val?: string) => `"${(val || '').replace(/"/g, '""')}"`;

      return [
        idx + 1,
        clean(item.id),
        clean(tgl),
        clean(item.judul),
        clean(item.kategori),
        clean(item.lokasiGang),
        clean(item.isAnonim ? 'Disamarkan (Anonim)' : item.alamatGsb),
        clean(item.isAnonim ? 'Warga RT 001 (Anonim)' : item.namaPelapor),
        item.isAnonim ? 'Ya' : 'Tidak',
        clean(item.isAnonim ? '-' : (item.noHp || '-')),
        clean(item.deskripsi),
        clean(item.status),
        clean(item.petugasPenindak || '-'),
        clean(item.tanggalTanggapan || '-'),
        clean(item.tanggapanRt || '-')
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanLabel = periodLabel.replace(/[\s/]/g, '_');
    link.setAttribute('download', `Rekap_Pengaduan_RT001_${cleanLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Toolbar Rekap & Periode Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Rekapitulasi Pengaduan Warga</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {periodLabel}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Laporan analisis berkala tindak lanjut aspirasi, keluhan lingkungan, dan performa penanganan Pengurus RT.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportCSV}
              disabled={displayedList.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Unduh data tabel rekap ke format CSV/Excel"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap CSV</span>
            </button>
          </div>
        </div>

        {/* Periode Mode Selector Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-bold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Tipe Periode:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700/60">
              <button
                onClick={() => setPeriodType('BULAN')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodType === 'BULAN'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setPeriodType('TAHUN')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodType === 'TAHUN'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tahunan
              </button>
              <button
                onClick={() => setPeriodType('CUSTOM')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodType === 'CUSTOM'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Rentang Kustom
              </button>
              <button
                onClick={() => setPeriodType('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  periodType === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Semua Waktu
              </button>
            </div>
          </div>

          {/* Dynamic Period Dropdowns / Date Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            {periodType === 'BULAN' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-medium">Pilih Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueMonths.map(ym => {
                    const [y, m] = ym.split('-');
                    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    const label = `${monthNames[parseInt(m, 10) - 1] || m} ${y}`;
                    return <option key={ym} value={ym}>{label}</option>;
                  })}
                </select>
              </div>
            )}

            {periodType === 'TAHUN' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px] font-medium">Pilih Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
                >
                  {uniqueYears.map(yr => (
                    <option key={yr} value={yr}>Tahun {yr}</option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs"
                />
                <span className="text-slate-400 text-xs">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Kartu Metrik KPI Periode Terpilih */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Total Masuk */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-slate-500 dark:text-slate-400 font-medium">Total Aduan Masuk</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total} <span className="text-xs font-normal text-slate-400">Laporan</span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold truncate">
            {periodLabel}
          </div>
        </div>

        {/* Menunggu */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 shadow-xs">
          <div className="text-amber-800 dark:text-amber-300 font-medium flex items-center justify-between">
            <span>Menunggu</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
            {stats.menunggu} <span className="text-xs font-normal text-amber-700">Laporan</span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 font-semibold">
            Belum ditinjau
          </div>
        </div>

        {/* Diproses */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs">
          <div className="text-indigo-800 dark:text-indigo-300 font-medium flex items-center justify-between">
            <span>Diproses</span>
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
            {stats.diproses} <span className="text-xs font-normal text-indigo-700">Laporan</span>
          </div>
          <div className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5 font-semibold">
            Dalam penanganan
          </div>
        </div>

        {/* Selesai */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
          <div className="text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
            <span>Selesai Tuntas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
            {stats.selesai} <span className="text-xs font-normal text-emerald-700">Laporan</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
            Solusi terealisasi
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 shadow-xs">
          <div className="text-blue-800 dark:text-blue-300 font-medium">Tingkat Tuntas</div>
          <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
            {stats.resolutionRate}%
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${stats.resolutionRate}%` }}
            />
          </div>
        </div>

        {/* Rata-rata Durasi Penanganan */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-slate-600 dark:text-slate-400 font-medium">Rata-rata Respon</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.avgDurasi ? `${stats.avgDurasi} Hari` : '1 - 2 Hari'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Durasi tuntas penanganan
          </div>
        </div>
      </div>

      {/* 3. Dua Kolom Analisis Distribusi: Berdasarkan Kategori & Berdasarkan Gang */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        {/* Distribusi Kategori */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Distribusi Kategori Masalah ({breakdownKategori.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Porsi Aduan</span>
          </div>

          {breakdownKategori.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              Tidak ada aduan pada periode ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {breakdownKategori.map(item => {
                const style = KATEGORI_BADGE_STYLE[item.kategori] || KATEGORI_BADGE_STYLE['Lainnya'];
                return (
                  <div key={item.kategori} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${style.bg} ${style.text} ${style.border}`}>
                        {item.kategori}
                      </span>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-slate-900 dark:text-white">{item.total} Laporan</span>
                        <span className="text-slate-400 text-[10px]">({item.persen}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${item.total > 0 ? (item.selesai / item.total) * 100 : 0}%` }} 
                        title={`Selesai: ${item.selesai}`} 
                      />
                      <div 
                        className="bg-indigo-500 h-full" 
                        style={{ width: `${item.total > 0 ? (item.diproses / item.total) * 100 : 0}%` }} 
                        title={`Diproses: ${item.diproses}`} 
                      />
                      <div 
                        className="bg-amber-400 h-full" 
                        style={{ width: `${item.total > 0 ? (item.menunggu / item.total) * 100 : 0}%` }} 
                        title={`Menunggu: ${item.menunggu}`} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribusi Wilayah Gang */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Sebaran Lokasi / Gang ({breakdownGang.length})
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Wilayah RT</span>
          </div>

          {breakdownGang.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              Tidak ada aduan pada periode ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {breakdownGang.map(item => (
                <div key={item.gang} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {item.gang}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {item.selesai} Selesai
                      </span>
                      {item.aktif > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {item.aktif} Aktif
                        </span>
                      )}
                      <span className="font-bold text-slate-900 dark:text-white">{item.total} Lap</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all" 
                      style={{ width: `${item.persen}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Filter & Search Rincian Tabel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5" /> Saring Tabel:
          </span>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="Menunggu">Menunggu</option>
            <option value="Diproses">Diproses</option>
            <option value="Selesai">Selesai</option>
            <option value="Ditolak">Ditolak</option>
          </select>

          <select
            value={filterGang}
            onChange={e => setFilterGang(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Gang</option>
            {availableGangs.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Kategori</option>
            {Object.keys(KATEGORI_BADGE_STYLE).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari dalam rekap periode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 5. Tabel Rincian Rekap Pengaduan Periode */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>Daftar Pengaduan Periode: {periodLabel}</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
              {displayedList.length} Baris
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Diurutkan berdasarkan tanggal terbaru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3">Tanggal Lapor</th>
                <th className="py-3 px-4">Judul & Kategori</th>
                <th className="py-3 px-3">Lokasi / Gang</th>
                <th className="py-3 px-3">Pelapor</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Tanggapan Resmi RT</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ditemukan pengaduan pada filter periode ini.
                  </td>
                </tr>
              ) : (
                displayedList.map((item, idx) => {
                  const katStyle = KATEGORI_BADGE_STYLE[item.kategori] || KATEGORI_BADGE_STYLE['Lainnya'];
                  const tglStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {tglStr}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {item.judul}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${katStyle.bg} ${katStyle.text} ${katStyle.border}`}>
                            {item.kategori}
                          </span>
                          {item.fotoBukti && (
                            <button
                              onClick={() => setLightboxImage(item.fotoBukti!)}
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" /> Foto
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.lokasiGang}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.isAnonim ? (
                            <span className="italic text-slate-400 font-medium">(Blok Disamarkan)</span>
                          ) : (
                            `Blok ${item.alamatGsb}`
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.isAnonim ? (
                          <span className="text-slate-500 italic text-[11px] flex items-center gap-1">
                            <UserX className="w-3 h-3 text-slate-400" />
                            Warga (Anonim)
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.namaPelapor}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.status === 'Selesai' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selesai
                          </span>
                        )}
                        {item.status === 'Diproses' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Diproses
                          </span>
                        )}
                        {item.status === 'Menunggu' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Menunggu
                          </span>
                        )}
                        {item.status === 'Ditolak' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.tanggapanRt ? (
                          <div>
                            <div className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2">
                              {item.tanggapanRt}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <span>Petugas: {item.petugasPenindak || 'Pengurus RT'}</span>
                              {item.tanggalTanggapan && <span>• {item.tanggalTanggapan}</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum ada tanggapan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedAduanDetail(item)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Lihat Detail Lengkap Laporan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && onOpenResponseModal && (
                            <button
                              onClick={() => onOpenResponseModal(item)}
                              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Update Status / Respon"
                            >
                              Tanggapi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Dialog */}
      {selectedAduanDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <MessageSquareWarning className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Rincian Pengaduan Warga
                </h4>
              </div>
              <button
                onClick={() => setSelectedAduanDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Judul Masalah:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  {selectedAduanDetail.judul}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400">Kategori:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedAduanDetail.kategori}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Lokasi / Gang:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{selectedAduanDetail.lokasiGang}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Pelapor & Blok:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedAduanDetail.isAnonim 
                      ? 'Warga RT 001 (Anonim) • Blok Disamarkan' 
                      : `${selectedAduanDetail.namaPelapor} (${selectedAduanDetail.alamatGsb})`}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Status Saat Ini:</span>
                  <div className="font-bold text-blue-600 dark:text-blue-400">{selectedAduanDetail.status}</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400">Uraian / Deskripsi Laporan:</span>
                <div className="mt-1 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedAduanDetail.deskripsi}
                </div>
              </div>

              {selectedAduanDetail.fotoBukti && (
                <div>
                  <span className="text-[11px] text-slate-400">Foto Bukti Lapangan:</span>
                  <div className="mt-1">
                    <img
                      src={selectedAduanDetail.fotoBukti}
                      alt="Foto Bukti"
                      onClick={() => setLightboxImage(selectedAduanDetail.fotoBukti!)}
                      className="max-h-48 rounded-xl object-cover cursor-pointer hover:opacity-90 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              )}

              {selectedAduanDetail.tanggapanRt && (
                <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                  <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                    <span>Tanggapan Resmi Pengurus RT</span>
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-400">
                      {selectedAduanDetail.tanggalTanggapan || ''}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedAduanDetail.tanggapanRt}
                  </p>
                  {selectedAduanDetail.petugasPenindak && (
                    <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold pt-1">
                      Petugas Penindak: {selectedAduanDetail.petugasPenindak}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              {isAdmin && onOpenResponseModal && (
                <button
                  onClick={() => {
                    const item = selectedAduanDetail;
                    setSelectedAduanDetail(null);
                    onOpenResponseModal(item);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Update Respon RT
                </button>
              )}
              <button
                onClick={() => setSelectedAduanDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Foto Bukti */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Foto Bukti Kondisi Lapangan
              </h4>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img
                src={lightboxImage}
                alt="Foto Bukti"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setLightboxImage(null)}
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
