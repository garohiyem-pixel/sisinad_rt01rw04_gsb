import React from 'react';
import { Warga, TransaksiKas, PengaduanWarga } from '../types';
import { Users, Landmark, HeartHandshake, MessageSquareWarning, ChevronRight, CheckCircle2 } from 'lucide-react';

interface StatCardsProps {
  wargaList: Warga[];
  kasList: TransaksiKas[];
  pengaduanList?: PengaduanWarga[];
  onOpenPengaduan?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  wargaList, 
  kasList,
  pengaduanList = [],
  onOpenPengaduan
}) => {
  // Calculations
  const totalKK = wargaList.length;
  const totalAnggota = wargaList.reduce((acc, curr) => acc + (curr.anggotaKeluarga?.length || 0), 0);
  const totalJiwa = totalKK + totalAnggota;

  const wargaPermanen = wargaList.filter(w => w.statusTinggal === 'Permanen').length;
  const wargaKontrak = wargaList.filter(w => w.statusTinggal === 'Kontrak').length;
  const wargaKtpTalagasariKK = wargaList.filter(w => w.isKtpTalagasari).length;
  const totalKtpTalagasariJiwa = wargaList.reduce((acc, w) => {
    let count = w.isKtpTalagasari ? 1 : 0;
    (w.anggotaKeluarga || []).forEach(ak => {
      const isKtp = ak.statusKk === 'Menginduk'
        ? !!w.isKtpTalagasari
        : (ak.isKtpTalagasari !== undefined ? !!ak.isKtpTalagasari : !!w.isKtpTalagasari);
      if (isKtp) count++;
    });
    return acc + count;
  }, 0);

  // Kas calculations (only verified transactions count towards balance)
  const validKas = kasList.filter(k => k.status === 'verified');

  // Akun KAS (Alokasi 1 - Mandiri)
  const kasMasuk = validKas
    .filter(k => k.akun === 'KAS' && k.jenis === 'masuk')
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const kasKeluar = validKas
    .filter(k => k.akun === 'KAS' && k.jenis === 'keluar')
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const saldoKas = kasMasuk - kasKeluar;

  // Akun DANSOS (Alokasi 2 - Mandiri)
  const dansosMasuk = validKas
    .filter(k => k.akun === 'DANSOS' && k.jenis === 'masuk')
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const dansosKeluar = validKas
    .filter(k => k.akun === 'DANSOS' && k.jenis === 'keluar')
    .reduce((acc, curr) => acc + curr.nominal, 0);

  const saldoDansos = dansosMasuk - dansosKeluar;

  // Complaints calculations
  const totalPengaduan = pengaduanList.length;
  const pengaduanMenunggu = pengaduanList.filter(p => p.status === 'Menunggu').length;
  const pengaduanDiproses = pengaduanList.filter(p => p.status === 'Diproses').length;
  const pengaduanSelesai = pengaduanList.filter(p => p.status === 'Selesai').length;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      
      {/* 1. Total Penduduk RT (Vibrant Royal Indigo & Blue) */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-600 text-white shadow-md sm:shadow-lg shadow-blue-500/20 transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-blue-100 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-300"></span>
            Total Penduduk RT
          </span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-inner">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              {totalKK} <span className="text-xs sm:text-sm font-medium text-blue-100">KK</span>
            </div>
            {totalAnggota > 0 && (
              <span className="text-[11px] sm:text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full text-cyan-200">
                {totalJiwa} Jiwa
              </span>
            )}
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-white/20 flex flex-wrap items-center justify-between text-[11px] sm:text-xs gap-1 sm:gap-1.5">
            <span className="bg-white/15 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold text-blue-50">
              Permanen: {wargaPermanen}
            </span>
            <span className="bg-white/15 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold text-blue-50">
              Kontrak: {wargaKontrak}
            </span>
            <span className="bg-emerald-400 text-slate-950 font-bold px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] shadow-xs" title={`${wargaKtpTalagasariKK} KK & ${totalKtpTalagasariJiwa - wargaKtpTalagasariKK} Anggota Keluarga`}>
              KTP Talagasari: {totalKtpTalagasariJiwa}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Akun KAS RT (Alokasi Mandiri - Operasional Lingkungan) */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 text-white shadow-md sm:shadow-lg shadow-teal-500/20 transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-200 animate-pulse"></span>
            <span className="text-[11px] sm:text-xs font-bold text-teal-100 uppercase tracking-wider">
              Saldo Kas RT
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-inner">
            <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {formatRupiah(saldoKas)}
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] sm:text-xs text-teal-100">
            <span className="bg-white/15 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold text-teal-50">
              +{formatRupiah(kasMasuk)}
            </span>
            <span className="bg-rose-500/80 text-white font-semibold px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px]">
              -{formatRupiah(kasKeluar)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Akun DANSOS RT (Alokasi Mandiri - Santunan Warga) */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 text-white shadow-md sm:shadow-lg shadow-rose-500/20 transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-200 animate-pulse"></span>
            <span className="text-[11px] sm:text-xs font-bold text-rose-100 uppercase tracking-wider">
              Saldo Dansos
            </span>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-inner">
            <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {formatRupiah(saldoDansos)}
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] sm:text-xs text-rose-100">
            <span className="bg-white/15 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold text-rose-50">
              +{formatRupiah(dansosMasuk)}
            </span>
            <span className="bg-amber-400 text-slate-950 font-bold px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px]">
              -{formatRupiah(dansosKeluar)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Layanan Pengaduan & Aspirasi Warga RT */}
      <div 
        onClick={onOpenPengaduan}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-md sm:shadow-lg shadow-slate-950/30 border border-amber-400/30 transition-all duration-200 hover:-translate-y-1 cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquareWarning className="w-3.5 h-3.5 text-amber-400" />
            Pengaduan Warga
          </span>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="mt-2.5 sm:mt-3">
          <div className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-300 tracking-tight drop-shadow-xs">
            {totalPengaduan} <span className="text-xs font-normal text-amber-100">Laporan</span>
          </div>
          <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-800 grid grid-cols-3 gap-1 sm:gap-1.5 text-center text-xs">
            <span className="bg-amber-400/20 text-amber-300 px-1 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-semibold truncate" title={`Menunggu Tinjauan: ${pengaduanMenunggu}`}>
              Tunggu: {pengaduanMenunggu}
            </span>
            <span className="bg-indigo-500/30 text-indigo-200 px-1 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-semibold truncate border border-indigo-400/30" title={`Sedang Diproses: ${pengaduanDiproses}`}>
              Proses: {pengaduanDiproses}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 px-1 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-semibold flex items-center justify-center gap-0.5 sm:gap-1 truncate" title={`Selesai: ${pengaduanSelesai}`}>
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> Selesai: {pengaduanSelesai}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
