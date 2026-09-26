import React, { useState, useMemo } from 'react';
import { Warga, TransaksiKas } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Sector,
  Legend
} from 'recharts';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  Home, 
  CreditCard, 
  Award, 
  Landmark, 
  HeartHandshake,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Filter,
  CheckCircle2,
  Sparkles,
  Users,
  UserCheck,
  Baby,
  GraduationCap,
  Briefcase,
  Heart,
  Smile,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DashboardChartsProps {
  wargaList: Warga[];
  kasList: TransaksiKas[];
  daftarGang?: string[];
  isAdmin?: boolean;
  onOpenUbahGang?: () => void;
}

const GANG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];
const KAS_COLORS = ['#0284c7', '#10b981']; // Sky for Kas, Emerald for Dansos
const KTP_COLORS = ['#059669', '#d97706'];

export interface PersonItem {
  id: string;
  nama: string;
  isKepala: boolean;
  hubungan: string;
  gender: 'Laki-laki' | 'Perempuan';
  age: number;
  ageCategory: 'Batita' | 'Balita' | 'Anak-anak' | 'Remaja' | 'Dewasa' | 'Lansia';
  isKtpTalagasari: boolean;
  gang: string;
  alamatGsb: string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ 
  wargaList, 
  kasList, 
  daftarGang,
  isAdmin,
  onOpenUbahGang
}) => {
  const [timeHorizon, setTimeHorizon] = useState<'2_MONTHS_BEFORE' | '6_MONTHS' | 'ALL'>('2_MONTHS_BEFORE');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<'KAS' | 'DANSOS'>('KAS');
  const basisGroupBy = 'TANGGAL';
  const [hoveredDonut, setHoveredDonut] = useState<{ name: string; value: number } | null>(null);
  const [demoViewMode, setDemoViewMode] = useState<'BAR' | 'DONUT'>('BAR');
  const [selectedAgeCat, setSelectedAgeCat] = useState<string | null>(null);
  const [hoveredDemoPie, setHoveredDemoPie] = useState<{ name: string; value: number } | null>(null);

  // Helper function to reliably determine gender
  const determineGender = (person: {
    jenisKelamin?: string;
    nik?: string;
    hubungan?: string;
    isKepala?: boolean;
  }): 'Laki-laki' | 'Perempuan' => {
    if (person.jenisKelamin) {
      const g = person.jenisKelamin.toLowerCase();
      if (g.includes('perempuan') || g.includes('wanita') || g === 'p') return 'Perempuan';
      if (g.includes('laki') || g.includes('pria') || g === 'l') return 'Laki-laki';
    }
    // Check NIK (digits 7-8: if > 40 it's female in Indonesian NIK standard)
    if (person.nik && /^\d{16}$/.test(person.nik.trim())) {
      const day = parseInt(person.nik.trim().slice(6, 8), 10);
      if (!isNaN(day)) {
        if (day > 40) return 'Perempuan';
        if (day >= 1 && day <= 31) return 'Laki-laki';
      }
    }
    // Check relation/relationship label
    if (person.hubungan) {
      const h = person.hubungan.toLowerCase();
      if (h.includes('istri') || h.includes('ibu') || h.includes('perempuan') || h.includes('anak perempuan')) return 'Perempuan';
      if (h.includes('suami') || h.includes('ayah') || h.includes('anak laki')) return 'Laki-laki';
    }
    // Default fallback
    return 'Laki-laki';
  };

  // Helper function to reliably determine age based on tanggalLahir, NIK (DDMMYY), or category hints
  const determineAge = (person: {
    tanggalLahir?: string;
    nik?: string;
    keterangan?: string;
    hubungan?: string;
    isKepala?: boolean;
  }): number => {
    const refDate = new Date(); // Reference year (e.g. 2026)

    // 1. From tanggalLahir
    if (person.tanggalLahir && person.tanggalLahir.length >= 4) {
      const bDate = new Date(person.tanggalLahir);
      if (!isNaN(bDate.getTime())) {
        let age = refDate.getFullYear() - bDate.getFullYear();
        const m = refDate.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && refDate.getDate() < bDate.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 120) return age;
      }
    }

    // 2. From Indonesian 16-digit NIK (DDMMYY on digits 7-12)
    if (person.nik && /^\d{16}$/.test(person.nik.trim())) {
      const cleanNik = person.nik.trim();
      let day = parseInt(cleanNik.slice(6, 8), 10);
      const month = parseInt(cleanNik.slice(8, 10), 10);
      const yy = parseInt(cleanNik.slice(10, 12), 10);

      if (day > 40) day -= 40; // Women's date of birth is offset by +40 in Indonesian NIK
      if (!isNaN(day) && !isNaN(month) && !isNaN(yy) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const currentYear = refDate.getFullYear();
        const currentYY = currentYear % 100;
        const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
        let age = currentYear - fullYear;
        const m = refDate.getMonth() - (month - 1);
        if (m < 0 || (m === 0 && refDate.getDate() < day)) {
          age--;
        }
        if (age >= 0 && age <= 120) return age;
      }
    }

    // 3. Contextual fallback based on keterangan / hubungan
    const desc = `${person.keterangan || ''} ${person.hubungan || ''}`.toLowerCase();
    if (desc.includes('batita') || desc.includes('bayi')) return 1;
    if (desc.includes('balita') || desc.includes('paud')) return 3;
    if (desc.includes('tk')) return 5;
    if (desc.includes('sd')) return 7;
    if (desc.includes('smp')) return 13;
    if (desc.includes('sma') || desc.includes('smk') || desc.includes('remaja') || desc.includes('kuliah') || desc.includes('mahasiswa')) return 17;
    if (desc.includes('lansia') || desc.includes('pensiun') || desc.includes('kakek') || desc.includes('nenek') || desc.includes('orang tua') || desc.includes('mertua')) return 65;
    if (person.hubungan === 'Anak') return 8;
    if (person.hubungan === 'Istri' || person.isKepala) return 35;

    return 35; // default adult
  };

  // Age categorizer following user specs:
  // - Batita: usia dibawah 3 tahun (< 3 tahun) [0 - 2 tahun]
  // - Balita: usia 3 sampai dengan dibawah 5 tahun (3 - 4 tahun / < 5 tahun)
  // - Anak-anak: usia 5 sampai 9 tahun (5 - 9 tahun)
  // - Remaja: dari 10 tahun sampai 19 tahun (10 - 19 tahun)
  // - Dewasa: 20 tahun sampai 62 tahun (20 - 62 tahun)
  // - Lansia: 63 tahun ke atas (>= 63 tahun)
  const getAgeCategory = (age: number): 'Batita' | 'Balita' | 'Anak-anak' | 'Remaja' | 'Dewasa' | 'Lansia' => {
    if (age < 3) return 'Batita';
    if (age < 5) return 'Balita';
    if (age < 10) return 'Anak-anak';
    if (age <= 19) return 'Remaja';
    if (age <= 62) return 'Dewasa';
    return 'Lansia';
  };

  // Compile entire population: all Kepala Keluarga + all Anggota Keluarga
  const allResidents: PersonItem[] = useMemo(() => {
    const list: PersonItem[] = [];
    wargaList.forEach(w => {
      // 1. Kepala Keluarga
      const kkGender = determineGender({
        jenisKelamin: w.jenisKelamin,
        nik: w.nik,
        hubungan: 'Kepala Keluarga',
        isKepala: true
      });
      const kkAge = determineAge({
        tanggalLahir: w.tanggalLahir,
        nik: w.nik,
        keterangan: w.keterangan || w.jabatan,
        hubungan: 'Kepala Keluarga',
        isKepala: true
      });
      list.push({
        id: w.id,
        nama: w.nama,
        isKepala: true,
        hubungan: w.jabatan || 'Kepala Keluarga',
        gender: kkGender,
        age: kkAge,
        ageCategory: getAgeCategory(kkAge),
        isKtpTalagasari: !!w.isKtpTalagasari,
        gang: w.gang || 'Gang Ceria',
        alamatGsb: w.alamatGsb
      });

      // 2. Anggota Keluarga
      (w.anggotaKeluarga || []).forEach(ak => {
        const akGender = determineGender({
          jenisKelamin: ak.jenisKelamin,
          nik: ak.nik,
          hubungan: ak.hubungan,
          isKepala: false
        });
        const akAge = determineAge({
          tanggalLahir: ak.tanggalLahir,
          nik: ak.nik,
          keterangan: ak.keterangan,
          hubungan: ak.hubungan,
          isKepala: false
        });
        // Sesuai aturan: jika statusKk Menginduk, KTP status otomatis sama dengan Kepala Keluarga
        const isKtp = ak.statusKk === 'Menginduk' 
          ? !!w.isKtpTalagasari 
          : (ak.isKtpTalagasari !== undefined ? !!ak.isKtpTalagasari : !!w.isKtpTalagasari);

        list.push({
          id: ak.id || `ak-${Math.random()}`,
          nama: ak.nama,
          isKepala: false,
          hubungan: ak.hubungan || 'Anggota Keluarga',
          gender: akGender,
          age: akAge,
          ageCategory: getAgeCategory(akAge),
          isKtpTalagasari: isKtp,
          gang: w.gang || 'Gang Ceria',
          alamatGsb: w.alamatGsb
        });
      });
    });
    return list;
  }, [wargaList]);

  // General Demographic Stats
  const totalKK = wargaList.length;
  const totalWargaJiwa = allResidents.length;
  const totalLaki = allResidents.filter(r => r.gender === 'Laki-laki').length;
  const totalPerempuan = allResidents.filter(r => r.gender === 'Perempuan').length;
  const lakiPct = totalWargaJiwa > 0 ? ((totalLaki / totalWargaJiwa) * 100).toFixed(1) : '0';
  const perempuanPct = totalWargaJiwa > 0 ? ((totalPerempuan / totalWargaJiwa) * 100).toFixed(1) : '0';

  // Age Groups Breakdown
  const batitaResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Batita'), [allResidents]);
  const balitaResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Balita'), [allResidents]);
  const anakResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Anak-anak'), [allResidents]);
  const remajaResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Remaja'), [allResidents]);
  const dewasaResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Dewasa'), [allResidents]);
  const lansiaResidents = useMemo(() => allResidents.filter(r => r.ageCategory === 'Lansia'), [allResidents]);

  const demographicAgeData = useMemo(() => [
    {
      kategori: 'Batita',
      rentang: '< 3 Tahun',
      shortLabel: 'Batita (<3 thn)',
      total: batitaResidents.length,
      'Laki-laki': batitaResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: batitaResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((batitaResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#ec4899', // Pink / Rose
      badgeBg: 'bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-300 border-pink-300 dark:border-pink-700',
      deskripsi: 'Bawah Tiga Tahun (<3 thn)',
      residents: batitaResidents
    },
    {
      kategori: 'Balita',
      rentang: '3 - 4 Tahun',
      shortLabel: 'Balita (3-4 thn)',
      total: balitaResidents.length,
      'Laki-laki': balitaResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: balitaResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((balitaResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#06b6d4', // Cyan
      badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700',
      deskripsi: 'Bawah Lima Tahun (<5 thn) / PAUD',
      residents: balitaResidents
    },
    {
      kategori: 'Anak-anak',
      rentang: '5 - 9 Tahun',
      shortLabel: 'Anak (5-9 thn)',
      total: anakResidents.length,
      'Laki-laki': anakResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: anakResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((anakResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#0ea5e9', // Sky blue
      badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-300 dark:border-sky-700',
      deskripsi: 'Pelajar TK & SD',
      residents: anakResidents
    },
    {
      kategori: 'Remaja',
      rentang: '10 - 19 Tahun',
      shortLabel: 'Remaja (10-19 thn)',
      total: remajaResidents.length,
      'Laki-laki': remajaResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: remajaResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((remajaResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#8b5cf6', // Violet
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300 dark:border-purple-700',
      deskripsi: 'Pelajar SMP, SMA & Mahasiswa',
      residents: remajaResidents
    },
    {
      kategori: 'Dewasa',
      rentang: '20 - 62 Tahun',
      shortLabel: 'Dewasa (20-62 thn)',
      total: dewasaResidents.length,
      'Laki-laki': dewasaResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: dewasaResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((dewasaResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#10b981', // Emerald
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      deskripsi: 'Usia Produktif & Kepala Keluarga',
      residents: dewasaResidents
    },
    {
      kategori: 'Lansia',
      rentang: '≥ 63 Tahun',
      shortLabel: 'Lansia (≥63 thn)',
      total: lansiaResidents.length,
      'Laki-laki': lansiaResidents.filter(r => r.gender === 'Laki-laki').length,
      Perempuan: lansiaResidents.filter(r => r.gender === 'Perempuan').length,
      pct: totalWargaJiwa > 0 ? ((lansiaResidents.length / totalWargaJiwa) * 100).toFixed(1) : '0',
      color: '#f59e0b', // Amber
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
      deskripsi: 'Warga Senior & Purnatugas',
      residents: lansiaResidents
    },
  ], [allResidents, batitaResidents, balitaResidents, anakResidents, remajaResidents, dewasaResidents, lansiaResidents, totalWargaJiwa]);

  // 1. Dynamic Data Gang RT 001 (Menghitung Total KK dan Total Jiwa per Gang)
  const activeGangs = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(daftarGang) && daftarGang.length > 0) {
      daftarGang.forEach(g => {
        if (g && typeof g === 'string' && g.trim() && !list.includes(g.trim())) {
          list.push(g.trim());
        }
      });
    }
    if (Array.isArray(wargaList)) {
      wargaList.forEach(w => {
        if (w.gang && typeof w.gang === 'string' && w.gang.trim() && !list.includes(w.gang.trim())) {
          list.push(w.gang.trim());
        }
      });
    }
    return list.length > 0
      ? list
      : ['Gang Ceria', 'Gang Kembar', 'Gang Fuchsia', 'Gang Alamanda', 'Gang Alaska'];
  }, [daftarGang, wargaList]);

  const gangDataMap: Record<string, { kk: number; jiwa: number }> = {};
  activeGangs.forEach(g => {
    gangDataMap[g] = { kk: 0, jiwa: 0 };
  });

  wargaList.forEach(w => {
    let gangKey = (w.gang || '').trim();
    const found = activeGangs.find(g => g.trim().toLowerCase() === gangKey.toLowerCase());
    if (found) gangKey = found;
    if (!gangDataMap[gangKey]) gangDataMap[gangKey] = { kk: 0, jiwa: 0 };

    gangDataMap[gangKey].kk += 1;
    gangDataMap[gangKey].jiwa += 1 + (w.anggotaKeluarga?.length || 0);
  });

  const gangPieData = Object.entries(gangDataMap).map(([gang, counts]) => ({
    name: gang,
    value: counts.kk, // Primary value adalah Total KK
    kk: counts.kk,
    jiwa: counts.jiwa
  }));

  const totalJiwaInGang = gangPieData.reduce((acc, curr) => acc + curr.jiwa, 0);

  // 2. Data Kas & Dansos (Donut) - Status verified or unassigned default
  const validKas = kasList.filter(k => k.status === 'verified' || !k.status);
  
  const saldoKas = validKas
    .filter(k => k.akun === 'KAS')
    .reduce((acc, curr) => acc + (curr.jenis === 'masuk' ? curr.nominal : -curr.nominal), 0);

  const saldoDansos = validKas
    .filter(k => k.akun === 'DANSOS')
    .reduce((acc, curr) => acc + (curr.jenis === 'masuk' ? curr.nominal : -curr.nominal), 0);

  const donutKasData = [
    { name: 'Akun KAS', value: Math.max(0, saldoKas) },
    { name: 'Akun DANSOS', value: Math.max(0, saldoDansos) },
  ];

  const totalSaldo = Math.max(0, saldoKas) + Math.max(0, saldoDansos);

  // 3. Data KTP Talagasari vs Luar (Meliputi SEMUA warga: Kepala Keluarga + Anggota Keluarga)
  const ktpTalagasariAll = allResidents.filter(r => r.isKtpTalagasari);
  const ktpLuarAll = allResidents.filter(r => !r.isKtpTalagasari);

  const ktpTalagasariCount = ktpTalagasariAll.length;
  const ktpLuarCount = ktpLuarAll.length;

  const ktpKkTalagasari = ktpTalagasariAll.filter(r => r.isKepala).length;
  const ktpAkTalagasari = ktpTalagasariAll.filter(r => !r.isKepala).length;

  const ktpKkLuar = ktpLuarAll.filter(r => r.isKepala).length;
  const ktpAkLuar = ktpLuarAll.filter(r => !r.isKepala).length;

  const ktpChartData = [
    { 
      name: 'KTP Ds. Talagasari', 
      value: ktpTalagasariCount, 
      color: '#059669',
      kk: ktpKkTalagasari,
      ak: ktpAkTalagasari
    },
    { 
      name: 'KTP Luar Desa', 
      value: ktpLuarCount, 
      color: '#d97706',
      kk: ktpKkLuar,
      ak: ktpAkLuar
    },
  ];

  // 4. Arus Kas Bulanan (Tren Masuk vs Keluar dimulai dari 2 Bulan Sebelum)
  const cashFlowAnalysis = useMemo(() => {
    const today = new Date();
    let refYear = today.getFullYear();
    let refMonth = today.getMonth(); // 0-based

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthShortNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    // Strictly filter by chosen account: KAS or DANSOS (never combines or totals them together)
    const filteredKas = validKas.filter(k => k.akun === selectedAccountFilter);

    // Helper to get month key (YYYY-MM)
    const getMonthKey = (k: TransaksiKas): string => {
      if (basisGroupBy === 'TANGGAL') {
        // Prioritas tanggal transaksi riil kas (Arus Kas Nyata)
        if (k.tanggal && k.tanggal.length >= 7) {
          const match = k.tanggal.match(/^(\d{4})[-/](\d{1,2})/);
          if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
          return k.tanggal.slice(0, 7);
        }
        if (k.periodeBulan) {
          const match = k.periodeBulan.match(/^(\d{4})[-/](\d{1,2})/);
          if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
          return k.periodeBulan;
        }
      } else {
        // Prioritas periode iuran pembukuan
        if (k.periodeBulan) {
          const match = k.periodeBulan.match(/^(\d{4})[-/](\d{1,2})/);
          if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
          return k.periodeBulan;
        }
        if (k.tanggal && k.tanggal.length >= 7) {
          const match = k.tanggal.match(/^(\d{4})[-/](\d{1,2})/);
          if (match) return `${match[1]}-${match[2].padStart(2, '0')}`;
          return k.tanggal.slice(0, 7);
        }
      }
      return '';
    };

    // Pastikan refYear & refMonth mencakup bulan terbaru transaksi
    filteredKas.forEach(k => {
      const p = getMonthKey(k);
      if (p && p.includes('-')) {
        const [y, m] = p.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) {
          const mIdx = m - 1;
          if (y > refYear || (y === refYear && mIdx > refMonth)) {
            refYear = y;
            refMonth = mIdx;
          }
        }
      }
    });

    let minYear = refYear;
    let minMonth = refMonth;
    let maxYear = refYear;
    let maxMonth = refMonth;

    filteredKas.forEach(k => {
      const p = getMonthKey(k);
      if (p && p.includes('-')) {
        const [y, m] = p.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) {
          const mIdx = m - 1;
          if (y < minYear || (y === minYear && mIdx < minMonth)) {
            minYear = y;
            minMonth = mIdx;
          }
          if (y > maxYear || (y === maxYear && mIdx > maxMonth)) {
            maxYear = y;
            maxMonth = mIdx;
          }
        }
      }
    });

    // Start date calculation:
    // '2_MONTHS_BEFORE': tepat 2 bulan sebelum bulan referensi berjalan (contoh: Juli bila referensi September)
    let startD: Date;
    if (timeHorizon === '2_MONTHS_BEFORE') {
      startD = new Date(refYear, refMonth - 2, 1);
    } else if (timeHorizon === '6_MONTHS') {
      startD = new Date(refYear, refMonth - 5, 1);
    } else {
      const earliestYear = Math.min(minYear, refYear);
      const earliestMonth = minYear < refYear ? minMonth : Math.min(minMonth, refMonth - 2);
      startD = new Date(earliestYear, earliestMonth, 1);
    }

    const endD = new Date(maxYear, maxMonth, 1);
    const monthsKeys: string[] = [];
    const iterD = new Date(startD.getFullYear(), startD.getMonth(), 1);

    while (iterD <= endD) {
      const y = iterD.getFullYear();
      const m = String(iterD.getMonth() + 1).padStart(2, '0');
      monthsKeys.push(`${y}-${m}`);
      iterD.setMonth(iterD.getMonth() + 1);
    }

    // Relative reference keys
    const twoMonthsAgoD = new Date(refYear, refMonth - 2, 1);
    const twoMonthsAgoKey = `${twoMonthsAgoD.getFullYear()}-${String(twoMonthsAgoD.getMonth() + 1).padStart(2, '0')}`;
    const oneMonthAgoD = new Date(refYear, refMonth - 1, 1);
    const oneMonthAgoKey = `${oneMonthAgoD.getFullYear()}-${String(oneMonthAgoD.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthKey = `${refYear}-${String(refMonth + 1).padStart(2, '0')}`;

    const monthlyMap: Record<string, { masuk: number; keluar: number }> = {};
    monthsKeys.forEach(mk => {
      monthlyMap[mk] = { masuk: 0, keluar: 0 };
    });

    filteredKas.forEach(k => {
      const p = getMonthKey(k);
      if (monthlyMap[p]) {
        if (k.jenis === 'masuk') {
          monthlyMap[p].masuk += k.nominal;
        } else {
          monthlyMap[p].keluar += k.nominal;
        }
      }
    });

    let totalMasuk = 0;
    let totalKeluar = 0;

    const chartData = monthsKeys.map(key => {
      const [yStr, mStr] = key.split('-');
      const y = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      const vals = monthlyMap[key] || { masuk: 0, keluar: 0 };
      totalMasuk += vals.masuk;
      totalKeluar += vals.keluar;

      let relativeTag = '';
      if (key === twoMonthsAgoKey) relativeTag = '2 Bulan Lalu';
      else if (key === oneMonthAgoKey) relativeTag = '1 Bulan Lalu';
      else if (key === currentMonthKey) relativeTag = 'Bulan Ini';
      else if (key > currentMonthKey) relativeTag = 'Mendatang';
      else relativeTag = 'Lampau';

      const shortLabel = `${monthShortNames[mIdx]} '${yStr.slice(2)}`;
      const fullLabel = `${monthNames[mIdx]} ${y}`;

      return {
        key,
        periode: shortLabel,
        fullPeriode: fullLabel,
        relativeTag,
        account: selectedAccountFilter,
        Masuk: vals.masuk,
        Keluar: vals.keluar,
        Selisih: vals.masuk - vals.keluar,
      };
    });

    const netCashflow = totalMasuk - totalKeluar;

    return {
      chartData,
      totalMasuk,
      totalKeluar,
      netCashflow,
      twoMonthsAgoLabel: `${monthNames[twoMonthsAgoD.getMonth()]} ${twoMonthsAgoD.getFullYear()}`,
      currentMonthLabel: `${monthNames[refMonth]} ${refYear}`,
    };
  }, [validKas, timeHorizon, selectedAccountFilter, basisGroupBy]);

  const formatShortRupiah = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
    return val.toString();
  };

  // Custom Active Shape for Pie Charts (Smooth Pop-out + Glowing Halo Ring)
  const renderActivePieShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g className="transition-all duration-300 pointer-events-none">
        {/* Luminous outer halo */}
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 3}
          outerRadius={outerRadius + 8}
          fill={fill}
          opacity={0.3}
        />
        {/* Main expanded slice */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 5}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Custom Callout Label for Donut Chart (Garis tipis & label: Biru KAS, Hijau DANSOS)
  const renderCustomDonutLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, index, name, value } = props;
    if (!value || value <= 0 || totalSaldo <= 0) return null;

    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);

    // Titik awal tepat di tepi luar irisan
    const sx = cx + (outerRadius + 3) * cos;
    const sy = cy + (outerRadius + 3) * sin;
    // Titik siku garis (elbow)
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    // Titik ujung horizontal
    const ex = mx + (cos >= 0 ? 1 : -1) * 16;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const isKas = name?.includes('KAS') || index === 0;
    const color = isKas ? '#0284c7' : '#10b981'; // Biru Kas, Hijau Dansos
    const labelTitle = isKas ? 'KAS' : 'DANSOS';
    const pct = `${(percent * 100).toFixed(0)}%`;

    return (
      <g className="transition-all duration-300 pointer-events-none">
        {/* Titik pin kecil di tepi irisan */}
        <circle cx={sx} cy={sy} r={2.5} fill={color} />
        {/* Garis tipis penunjuk yang menghubungkan ke label */}
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={color}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        {/* Teks penjelas (Biru KAS, Hijau DANSOS) */}
        <text
          x={ex + (cos >= 0 ? 5 : -5)}
          y={ey}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill={color}
          className="text-xs font-bold"
          style={{ fontSize: '11px', fontWeight: 700 }}
        >
          {`${labelTitle}: ${pct}`}
        </text>
      </g>
    );
  };

  // Custom Cursor for Bar Chart: Replaces the harsh default white rectangle with an ambient glow aura & neon indicator
  const CustomBarCursor = (props: any) => {
    const { x, y, width, height } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
    const paddingX = 6;
    const curX = x - paddingX;
    const curW = width + (paddingX * 2);

    return (
      <g className="pointer-events-none transition-all duration-300">
        {/* Soft rounded gradient column aura - replaces harsh plain white */}
        <rect
          x={curX}
          y={y}
          width={curW}
          height={height}
          rx={12}
          ry={12}
          fill="url(#columnHoverAura)"
        />
        {/* Top glowing neon indicator pill */}
        <rect
          x={curX + 6}
          y={y}
          width={Math.max(12, curW - 12)}
          height={3.5}
          rx={2}
          fill="#6366f1"
        />
        {/* High-tech stylish dashed border guide */}
        <rect
          x={curX}
          y={y}
          width={curW}
          height={height}
          rx={12}
          ry={12}
          fill="none"
          stroke="#818cf8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeOpacity={0.4}
        />
      </g>
    );
  };

  // Custom Cursor for Demographic Bar Chart: Replaces harsh plain white rectangle with high-tech dual neon cursor
  const CustomDemographicBarCursor = (props: any) => {
    const { x, y, width, height } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
    const paddingX = 8;
    const curX = x - paddingX;
    const curW = width + (paddingX * 2);
    const halfPill = Math.max(10, (curW - 16) / 2);

    return (
      <g className="pointer-events-none transition-all duration-300">
        {/* Soft rounded gradient column aura - replaces plain white */}
        <rect
          x={curX}
          y={y}
          width={curW}
          height={height}
          rx={12}
          ry={12}
          fill="url(#demographicHoverAura)"
        />
        {/* Dual neon indicator: Indigo for Laki-laki and Pink for Perempuan */}
        <rect
          x={curX + 6}
          y={y}
          width={halfPill}
          height={3.5}
          rx={2}
          fill="#818cf8"
        />
        <rect
          x={curX + 6 + halfPill + 4}
          y={y}
          width={halfPill}
          height={3.5}
          rx={2}
          fill="#f472b6"
        />
        {/* High-tech stylish dashed border guide with subtle neon purple glow */}
        <rect
          x={curX}
          y={y}
          width={curW}
          height={height}
          rx={12}
          ry={12}
          fill="none"
          stroke="#a855f7"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          strokeOpacity={0.45}
        />
      </g>
    );
  };

  // Creative, Innovative & User-Friendly Cash Flow Tooltip
  const CashFlowTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (!data) return null;

    const masuk = Number(data.Masuk) || 0;
    const keluar = Number(data.Keluar) || 0;
    const selisih = Number(data.Selisih) || 0;
    const isSurplus = selisih >= 0;
    const totalVolume = masuk + keluar;
    const masukPct = totalVolume > 0 ? Math.round((masuk / totalVolume) * 100) : 0;
    const keluarPct = totalVolume > 0 ? 100 - masukPct : 0;
    const isKas = (data.account || selectedAccountFilter) === 'KAS';
    const accountTitle = isKas ? 'Akun KAS RT (Operasional Mandiri)' : 'Akun DANSOS (Santunan Warga Mandiri)';
    const accountBadge = isKas ? 'KAS RT' : 'DANSOS';

    return (
      <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 text-xs min-w-[270px] max-w-[320px] transition-all">
        {/* Header with Month + Relative Badge */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${isKas ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100">{data.fullPeriode}</div>
              <div className={`text-[10px] font-semibold ${isKas ? 'text-sky-300' : 'text-emerald-300'}`}>
                {accountTitle}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              data.relativeTag === 'Bulan Ini' 
                ? 'bg-indigo-900/60 text-indigo-300 border-indigo-500/60 ring-2 ring-indigo-500/20' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {data.relativeTag}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              isKas ? 'bg-sky-950 text-sky-300 border border-sky-700/50' : 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
            }`}>
              {accountBadge}
            </span>
          </div>
        </div>

        {/* Visual Ratio Progress Bar (Innovative!) */}
        {totalVolume > 0 && (
          <div className="my-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Masuk: {masukPct}%
              </span>
              <span className="text-rose-400 flex items-center gap-1">
                Keluar: {keluarPct}%
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${masukPct}%` }} 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300" 
              />
              <div 
                style={{ width: `${keluarPct}%` }} 
                className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-300" 
              />
            </div>
          </div>
        )}

        {/* Financial Details */}
        <div className="space-y-1.5 my-2.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-900/40">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span className="font-semibold text-[11px]">{isKas ? 'KAS Masuk:' : 'DANSOS Masuk:'}</span>
            </div>
            <span className="font-black text-xs text-emerald-300">
              Rp {masuk.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/40 border border-rose-900/40">
            <div className="flex items-center gap-1.5 text-rose-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-[11px]">{isKas ? 'KAS Keluar:' : 'DANSOS Keluar:'}</span>
            </div>
            <span className="font-black text-xs text-rose-300">
              Rp {keluar.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Net Cashflow (Surplus vs Defisit Status Pill) */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
          isSurplus 
            ? 'bg-emerald-900/20 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-900/20 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-1.5">
            {isSurplus ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isSurplus ? 'Surplus Bersih' : 'Defisit Bersih'}
              </div>
              <div className="text-xs font-black">
                {isSurplus ? '+' : ''}Rp {selisih.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
            isSurplus ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {isSurplus ? 'SEHAT' : 'DEFISIT'}
          </span>
        </div>

        <div className="mt-2 text-[9px] text-slate-400 text-center font-medium italic">
          *Akun mandiri — tidak dihitung gabung dengan akun lainnya
        </div>
      </div>
    );
  };

  // Tooltip for Gang Pie Chart
  const GangTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const name = data.name;
    const kkValue = Number(data.payload?.kk || data.value) || 0;
    const jiwaValue = Number(data.payload?.jiwa) || 0;
    const color = data.payload?.fill || '#3b82f6';
    const pct = totalKK > 0 ? ((kkValue / totalKK) * 100).toFixed(1) : '0';

    return (
      <div className="bg-slate-950/95 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl shadow-2xl border border-sky-500/30 text-xs min-w-[200px]">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }}></span>
          <span className="font-bold text-slate-100 text-sm">{name}</span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400">Kepala Keluarga:</span>
          <span className="font-black text-slate-100">{kkValue} KK</span>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400">Total Jiwa:</span>
          <span className="font-black text-sky-300">{jiwaValue} Orang</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Porsi dari Total KK:</span>
          <span className="font-bold px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: `${color}25`, color }}>
            {pct}% ({kkValue} dari {totalKK} KK)
          </span>
        </div>
      </div>
    );
  };

  // Tooltip for Donut Kas vs Dansos
  const DonutKasTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const name = data.name;
    const value = Number(data.value) || 0;
    const isKas = name.includes('KAS');
    const color = isKas ? '#0284c7' : '#10b981';

    return (
      <div className="bg-slate-950/95 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl shadow-2xl border border-emerald-500/30 text-xs min-w-[210px]">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
          <div className="p-1 rounded-lg" style={{ backgroundColor: `${color}30`, color }}>
            {isKas ? <Landmark className="w-3.5 h-3.5" /> : <HeartHandshake className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">{name}</div>
            <div className="text-[10px] text-slate-400">{isKas ? 'Operasional Lingkungan' : 'Santunan Sosial Warga'}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400">Saldo Mandiri:</span>
          <span className={`font-black text-sm ${isKas ? 'text-sky-300' : 'text-emerald-300'}`}>
            Rp {value.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Alokasi Khusus:</span>
          <span className="font-bold px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: `${color}25`, color }}>
            {isKas ? 'Operasional RT' : 'Santunan Warga'}
          </span>
        </div>
      </div>
    );
  };

  // Tooltip for KTP Chart (Meliputi SEMUA warga: Kepala Keluarga + Anggota Keluarga)
  const KtpTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const name = data.name;
    const value = Number(data.value) || 0;
    const kk = Number(data.payload?.kk) || 0;
    const ak = Number(data.payload?.ak) || 0;
    const isTalagasari = name.includes('Talagasari');
    const color = isTalagasari ? '#059669' : '#d97706';
    const pct = totalWargaJiwa > 0 ? ((value / totalWargaJiwa) * 100).toFixed(1) : '0';

    return (
      <div className="bg-slate-950/95 backdrop-blur-md text-white px-3.5 py-3 rounded-2xl shadow-2xl border border-amber-500/30 text-xs min-w-[220px]">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: color }}></span>
          <div>
            <div className="font-bold text-slate-100 text-sm">{name}</div>
            <div className="text-[10px] text-slate-400">{isTalagasari ? 'Warga Tetap Resmi Desa' : 'Warga KTP Luar / Domisili'}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400">Total Semua Jiwa:</span>
          <span className="font-black text-sm text-slate-100">{value} Orang</span>
        </div>
        <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-300">
          <span className="text-slate-400">Rincian:</span>
          <span>{kk} Kepala Keluarga • {ak} Anggota</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
          <span className="text-slate-400">Persentase:</span>
          <span className="font-bold px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: `${color}25`, color }}>
            {pct}% dari {totalWargaJiwa} jiwa
          </span>
        </div>
      </div>
    );
  };

  // Tooltip for Demographic Bar Chart & Pie Chart
  const DemographicTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const catName = label || payload[0]?.payload?.shortLabel || payload[0]?.payload?.kategori || payload[0]?.name;
    const catData = demographicAgeData.find(d => d.shortLabel === catName || d.kategori === catName) || demographicAgeData[0];
    const laki = payload[0]?.payload?.['Laki-laki'] ?? (payload.find((p: any) => p.dataKey === 'Laki-laki')?.value || 0);
    const perempuan = payload[0]?.payload?.Perempuan ?? (payload.find((p: any) => p.dataKey === 'Perempuan')?.value || 0);
    const totalGroup = laki + perempuan;
    const groupPct = totalWargaJiwa > 0 ? ((totalGroup / totalWargaJiwa) * 100).toFixed(1) : '0';
    const lakiPct = totalGroup > 0 ? Math.round((laki / totalGroup) * 100) : 0;
    const perempuanPct = totalGroup > 0 ? 100 - lakiPct : 0;

    return (
      <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 text-xs min-w-[250px] transition-all ring-1 ring-indigo-500/20 shadow-indigo-500/20">
        <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_#6366f1]" style={{ backgroundColor: catData.color }}></span>
            <div>
              <span className="font-bold text-slate-100 text-sm">{catData.kategori}</span>
              <span className="text-[10px] text-slate-400 block">{catData.rentang} ({catData.deskripsi})</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/60 ring-2 ring-indigo-500/20">
            {groupPct}% Populasi
          </span>
        </div>

        {/* Visual Neon Ratio Progress Bar (matching cash flow style) */}
        {totalGroup > 0 && (
          <div className="my-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span className="text-indigo-300 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]"></span>
                Laki-laki: {lakiPct}%
              </span>
              <span className="text-pink-300 flex items-center gap-1 font-semibold">
                Perempuan: {perempuanPct}%
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]"></span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${lakiPct}%` }} 
                className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full transition-all duration-300 shadow-[0_0_8px_#6366f1]" 
              />
              <div 
                style={{ width: `${perempuanPct}%` }} 
                className="bg-gradient-to-r from-pink-500 to-rose-400 h-full transition-all duration-300 shadow-[0_0_8px_#ec4899]" 
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2 font-bold bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-300">Total Kelompok Usia:</span>
          <span className="text-sm font-black text-white">{totalGroup} Jiwa</span>
        </div>

        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-indigo-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]"></span>
              Laki-laki:
            </span>
            <span className="font-bold">{laki} Jiwa {totalGroup > 0 ? `(${lakiPct}%)` : ''}</span>
          </div>
          <div className="flex items-center justify-between text-pink-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]"></span>
              Perempuan:
            </span>
            <span className="font-bold">{perempuan} Jiwa {totalGroup > 0 ? `(${perempuanPct}%)` : ''}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Kolom Chart: Distribusi Warga per Gang (Friendly Sky/Blue Theme) */}
        <div className="bg-gradient-to-b from-sky-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-2xl p-5 border-2 border-sky-200 dark:border-sky-900/50 shadow-md shadow-sky-500/5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
                  <Home className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Distribusi Warga per Gang
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-sky-800 dark:text-sky-200 bg-sky-100 dark:bg-sky-900/60 px-2.5 py-0.5 rounded-full border border-sky-300 dark:border-sky-700">
                  Total: {totalKK} KK ({totalJiwaInGang} Jiwa)
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sebaran {totalKK} Kepala Keluarga ({totalJiwaInGang} Jiwa) di {activeGangs.length} gang RT 001
            </p>
          </div>

          <div className="h-60 my-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gangPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  activeShape={renderActivePieShape}
                  label={totalKK > 0 ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : undefined}
                >
                  {gangPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={GANG_COLORS[index % GANG_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<GangTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-sky-100 dark:border-slate-800">
            {gangPieData.map((item, idx) => {
              const color = GANG_COLORS[idx % GANG_COLORS.length];
              return (
                <div 
                  key={item.name} 
                  className="flex-1 min-w-[85px] p-2 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700/60 shadow-2xs text-center transition-all hover:border-sky-300"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[95px]" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="text-xs font-black" style={{ color }}>
                    {item.value} <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400">KK</span>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {item.jiwa} <span className="text-[9px] font-normal">Jiwa</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Kolom Chart: Akun KAS vs DANSOS (Friendly Emerald/Teal Theme) */}
        <div className="bg-gradient-to-b from-emerald-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-2xl p-5 border-2 border-emerald-200 dark:border-emerald-900/50 shadow-md shadow-emerald-500/5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Akun KAS vs DANSOS
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                RT 001 / 004
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perbandingan saldo operasional KAS vs santunan DANSOS
            </p>
          </div>

          <div className="h-60 my-2 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutKasData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  label={renderCustomDonutLabel}
                  labelLine={false}
                  activeShape={renderActivePieShape}
                  onMouseEnter={(_, index) => setHoveredDonut(donutKasData[index])}
                  onMouseLeave={() => setHoveredDonut(null)}
                >
                  {donutKasData.map((_, index) => (
                    <Cell key={`donut-${index}`} fill={KAS_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutKasTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text fades out smoothly during slice hover so it never collides with the tooltip popover */}
            <div className={`absolute text-center pointer-events-none transition-all duration-200 ${hoveredDonut ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Alokasi Mandiri
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-emerald-400">
                KAS & DANSOS
              </div>
            </div>
          </div>

          <div className="flex justify-around pt-3 border-t border-emerald-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-600 shrink-0"></span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">KAS: Rp {saldoKas.toLocaleString('id-ID')}</div>
                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                  Operasional RT (Mandiri)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0"></span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  DANSOS: Rp {saldoDansos.toLocaleString('id-ID')}
                </span>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Santunan Warga (Mandiri)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Kolom Chart: Status KTP Ds. Talagasari vs Luar (Meliputi SEMUA Warga: KK + Anggota) */}
        <div className="bg-gradient-to-b from-amber-50/80 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-2xl p-5 border-2 border-amber-200 dark:border-amber-900/50 shadow-md shadow-amber-500/5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Status KTP Kependudukan
                </h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                Semua Warga ({totalWargaJiwa} Jiwa)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Perbandingan KTP seluruh {totalWargaJiwa} jiwa ({totalKK} KK & {totalWargaJiwa - totalKK} anggota keluarga)
            </p>
          </div>

          <div className="h-60 my-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ktpChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  activeShape={renderActivePieShape}
                  label={({ name, value }) => `${value} (${totalWargaJiwa ? ((value / totalWargaJiwa) * 100).toFixed(0) : 0}%)`}
                >
                  {ktpChartData.map((entry, index) => (
                    <Cell key={`ktp-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<KtpTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around pt-3 border-t border-amber-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0"></span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">KTP Talagasari</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  {ktpTalagasariCount} Jiwa ({totalWargaJiwa ? ((ktpTalagasariCount / totalWargaJiwa) * 100).toFixed(0) : 0}%)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {ktpKkTalagasari} KK • {ktpAkTalagasari} Anggota
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-600 shrink-0"></span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">KTP Luar Desa</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                  {ktpLuarCount} Jiwa ({totalWargaJiwa ? ((ktpLuarCount / totalWargaJiwa) * 100).toFixed(0) : 0}%)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {ktpKkLuar} KK • {ktpAkLuar} Anggota
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* NEW: Demografi & Piramida Usia Penduduk RT 001 */}
      <div className="bg-gradient-to-b from-slate-50/80 via-white to-indigo-50/30 dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-900 rounded-3xl p-5 sm:p-6 border-2 border-indigo-200/80 dark:border-indigo-900/60 shadow-lg shadow-indigo-500/5 transition-colors space-y-6">
        
        {/* Header & Toggle Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Demografi & Komposisi Usia Penduduk RT 001
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Total: {totalWargaJiwa} Jiwa ({totalKK} KK)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Statistik lengkap seluruh warga menurut jenis kelamin (Laki-laki vs Perempuan) dan 6 kelompok usia: Batita (&lt;3 thn), Balita (&lt;5 thn), Anak-anak, Remaja, Dewasa, dan Lansia.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center self-start md:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setDemoViewMode('BAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                demoViewMode === 'BAR'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grafik Batang Gender</span>
            </button>
            <button
              onClick={() => setDemoViewMode('DONUT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                demoViewMode === 'DONUT'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Proporsi Usia</span>
            </button>
          </div>
        </div>

        {/* Gender Ratio Bar & Quick Summary Stats */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-indigo-100 dark:border-slate-700/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 dark:text-slate-200">Rasio Jenis Kelamin:</span>
              <span className="text-slate-500 dark:text-slate-400">Total {totalWargaJiwa} Jiwa Terdata</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-xs"></span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  Laki-laki: {totalLaki} Jiwa ({lakiPct}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-xs"></span>
                <span className="font-bold text-pink-700 dark:text-pink-300">
                  Perempuan: {totalPerempuan} Jiwa ({perempuanPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-700/70 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${lakiPct}%` }}
              className="bg-gradient-to-r from-indigo-600 to-blue-500 h-full transition-all duration-500 relative group"
              title={`Laki-laki: ${totalLaki} Jiwa (${lakiPct}%)`}
            />
            <div 
              style={{ width: `${perempuanPct}%` }}
              className="bg-gradient-to-r from-pink-500 to-rose-400 h-full transition-all duration-500 relative group"
              title={`Perempuan: ${totalPerempuan} Jiwa (${perempuanPct}%)`}
            />
          </div>
        </div>

        {/* Chart Visualization Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Main Visual: Bar or Donut Chart (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>
                  {demoViewMode === 'BAR' 
                    ? 'Breakdown Laki-laki vs Perempuan per Kelompok Usia' 
                    : 'Porsi Kelompok Usia dari Total Populasi'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Unit: Jiwa (Orang)
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {demoViewMode === 'BAR' ? (
                  <BarChart
                    data={demographicAgeData}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <defs>
                      {/* Ambient aura for demographic column hover - replaces harsh plain white rectangle */}
                      <linearGradient id="demographicHoverAura" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.24} />
                        <stop offset="50%" stopColor="#c084fc" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f472b6" stopOpacity={0.02} />
                      </linearGradient>

                      {/* Laki-laki standard gradient */}
                      <linearGradient id="lakiBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4338ca" />
                      </linearGradient>

                      {/* Laki-laki dynamic hover neon gradient */}
                      <linearGradient id="lakiBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c7d2fe" />
                        <stop offset="35%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#3730a3" />
                      </linearGradient>

                      {/* Perempuan standard gradient */}
                      <linearGradient id="perempuanBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#be185d" />
                      </linearGradient>

                      {/* Perempuan dynamic hover neon gradient */}
                      <linearGradient id="perempuanBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fbcfe8" />
                        <stop offset="35%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#9d174d" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="shortLabel" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      cursor={<CustomDemographicBarCursor />}
                      content={<DemographicTooltip />} 
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    />
                    <Bar 
                      dataKey="Laki-laki" 
                      fill="url(#lakiBarGradient)" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={45} 
                      name="Laki-laki"
                      activeBar={{
                        fill: 'url(#lakiBarHoverGradient)',
                        stroke: '#818cf8',
                        strokeWidth: 2,
                        filter: 'drop-shadow(0 4px 12px rgba(99, 102, 241, 0.65))'
                      }}
                    />
                    <Bar 
                      dataKey="Perempuan" 
                      fill="url(#perempuanBarGradient)" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={45} 
                      name="Perempuan"
                      activeBar={{
                        fill: 'url(#perempuanBarHoverGradient)',
                        stroke: '#f472b6',
                        strokeWidth: 2,
                        filter: 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.65))'
                      }}
                    />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={demographicAgeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="kategori"
                      activeShape={renderActivePieShape}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {demographicAgeData.map((entry) => (
                        <Cell key={`cell-demo-${entry.kategori}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DemographicTooltip />} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demographic Insights & Highlights (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Ringkasan Usia Penduduk</span>
            </div>

            <div className="space-y-2">
              {demographicAgeData.map((item) => {
                const isSelected = selectedAgeCat === item.kategori;
                return (
                  <div
                    key={item.kategori}
                    onClick={() => setSelectedAgeCat(isSelected ? null : item.kategori)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20' 
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{item.kategori}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                        {item.rentang}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                        {item.total} <span className="text-[10px] font-normal text-slate-500">Jiwa</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {item.pct}% dari total
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        ♂ Laki-laki: {item['Laki-laki']}
                      </span>
                      <span className="text-pink-600 dark:text-pink-400 font-medium">
                        ♀ Perempuan: {item.Perempuan}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6 Interactive Age Category Cards Grid & Posyandu Highlight */}
        <div className="space-y-3 pt-2">
          {/* Posyandu & Balita Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-pink-50 via-cyan-50 to-indigo-50 dark:from-pink-950/30 dark:via-cyan-950/30 dark:to-indigo-950/30 border border-pink-200/80 dark:border-pink-900/50 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xs">
                <Baby className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Sasaran Posyandu Balita RT 001 (&lt; 5 Tahun):
                  </span>
                  <span className="text-xs font-black text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 border border-pink-200 dark:border-pink-800">
                    Total {batitaResidents.length + balitaResidents.length} Jiwa
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Terdiri dari <span className="font-bold text-pink-600 dark:text-pink-400">{batitaResidents.length} Batita</span> (&lt;3 thn) dan <span className="font-bold text-cyan-600 dark:text-cyan-400">{balitaResidents.length} Balita</span> (3-4 thn / PAUD).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Program Imunisasi & Timbang Bulanan</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Rincian 6 Kategori Usia (Klik kartu untuk melihat nama-nama warga)
            </span>
            {selectedAgeCat && (
              <button 
                onClick={() => setSelectedAgeCat(null)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Tutup Rincian
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Batita */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Batita' ? null : 'Batita')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Batita'
                  ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 ring-2 ring-pink-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-pink-200 dark:border-pink-900/50 hover:border-pink-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-pink-500 text-white shadow-xs">
                  <Baby className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-300">
                  &lt; 3 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Batita</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {batitaResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="Bawah Tiga Tahun">
                Bawah Tiga Tahun (&lt;3 thn)
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-pink-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {batitaResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {batitaResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((batitaResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            {/* 2. Balita */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Balita' ? null : 'Balita')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Balita'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-cyan-200 dark:border-cyan-900/50 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-cyan-500 text-white shadow-xs">
                  <Smile className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300">
                  &lt; 5 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Balita</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {balitaResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="Usia 3-4 Tahun / PAUD">
                Usia 3-4 Thn / PAUD
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-cyan-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {balitaResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {balitaResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((balitaResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            {/* 3. Anak-anak */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Anak-anak' ? null : 'Anak-anak')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Anak-anak'
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 ring-2 ring-sky-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-sky-200 dark:border-sky-900/50 hover:border-sky-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-sky-500 text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                  5 - 9 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Anak-anak</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {anakResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="Pelajar TK & SD">
                Pelajar TK & SD
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-sky-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {anakResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {anakResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((anakResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            {/* 4. Remaja */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Remaja' ? null : 'Remaja')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Remaja'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-purple-200 dark:border-purple-900/50 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-purple-500 text-white shadow-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                  10 - 19 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Remaja</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {remajaResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="SMP, SMA & Mahasiswa">
                SMP, SMA & Kuliah
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-purple-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {remajaResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {remajaResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((remajaResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            {/* 5. Dewasa */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Dewasa' ? null : 'Dewasa')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Dewasa'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-xs">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  20 - 62 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Dewasa</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {dewasaResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="Produktif & Kepala Keluarga">
                Produktif &amp; KK
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-emerald-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {dewasaResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {dewasaResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((dewasaResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            {/* 6. Lansia */}
            <div 
              onClick={() => setSelectedAgeCat(selectedAgeCat === 'Lansia' ? null : 'Lansia')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedAgeCat === 'Lansia'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-white/90 dark:bg-slate-800/90 border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Heart className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  ≥ 63 Tahun
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Lansia</div>
              <div className="text-lg font-black text-slate-900 dark:text-white my-0.5">
                {lansiaResidents.length} <span className="text-xs font-normal text-slate-500">Jiwa</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 truncate" title="Warga Senior & Purnatugas">
                Warga Senior
              </p>
              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-amber-100 dark:border-slate-700">
                <span className="text-indigo-600 font-semibold">♂ {lansiaResidents.filter(r => r.gender === 'Laki-laki').length}</span>
                <span className="text-pink-600 font-semibold">♀ {lansiaResidents.filter(r => r.gender === 'Perempuan').length}</span>
                <span className="text-slate-400">{totalWargaJiwa > 0 ? ((lansiaResidents.length / totalWargaJiwa) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Drill-down Expandable Citizen List for Selected Age Category */}
          {selectedAgeCat && (
            <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Daftar Warga Kategori: {selectedAgeCat}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold">
                    {demographicAgeData.find(d => d.kategori === selectedAgeCat)?.residents.length || 0} Orang
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAgeCat(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕ Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {(demographicAgeData.find(d => d.kategori === selectedAgeCat)?.residents || []).map((person) => (
                  <div 
                    key={person.id} 
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-600/50 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${person.gender === 'Laki-laki' ? 'bg-indigo-500' : 'bg-pink-500'}`}></span>
                        <span className="truncate max-w-[140px]" title={person.nama}>{person.nama}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {person.hubungan} • {person.gang}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                        {person.age} thn
                      </span>
                      <span className={`block text-[9px] font-semibold ${person.isKtpTalagasari ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {person.isKtpTalagasari ? 'KTP Talagasari' : 'KTP Luar'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. Kolom Chart: Grafik Arus Kas Masuk vs Keluar (Mulai dari 2 Bulan Sebelum) */}
      <div className="bg-gradient-to-b from-indigo-50/70 to-white dark:from-slate-800/80 dark:to-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-indigo-200 dark:border-indigo-900/50 shadow-md shadow-indigo-500/5 transition-colors space-y-6">
        {/* Header & Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className={`p-2.5 rounded-xl text-white shadow-xs ${selectedAccountFilter === 'KAS' ? 'bg-sky-600 shadow-sky-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Grafik Arus Kas Masuk & Keluar</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedAccountFilter === 'KAS'
                      ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  }`}>
                    {selectedAccountFilter === 'KAS' ? 'Akun KAS RT (Operasional)' : 'Akun DANSOS (Dana Sosial)'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Akun Mandiri
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualisasi perbandingan tren realisasi masuk vs keluar khusus{' '}
                  <strong className={selectedAccountFilter === 'KAS' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                    {selectedAccountFilter === 'KAS' ? 'Akun KAS RT (Operasional Lingkungan)' : 'Akun DANSOS (Santunan Warga)'}
                  </strong>
                  {' '}— dikelola mandiri secara terpisah tanpa penggabungan total silang.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Legend Indicator */}
          <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-xs self-start lg:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                {selectedAccountFilter === 'KAS' ? 'KAS Masuk' : 'DANSOS Masuk'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                {selectedAccountFilter === 'KAS' ? 'KAS Keluar' : 'DANSOS Keluar'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Controls (Rentang Waktu dan Pilihan Akun Mandiri) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-indigo-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Rentang:
            </span>
            <button
              onClick={() => setTimeHorizon('2_MONTHS_BEFORE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeHorizon === '2_MONTHS_BEFORE'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Mulai 2 Bulan Sebelum
            </button>
            <button
              onClick={() => setTimeHorizon('6_MONTHS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeHorizon === '6_MONTHS'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              6 Bulan Terakhir
            </button>
            <button
              onClick={() => setTimeHorizon('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeHorizon === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Account filter: Only KAS or DANSOS (NO "Semua" button - Never totals them together) */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-bold px-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-indigo-500" />
                Pilih Akun Mandiri:
              </span>
              <button
                onClick={() => setSelectedAccountFilter('KAS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedAccountFilter === 'KAS'
                    ? 'bg-sky-600 text-white shadow-xs shadow-sky-500/30 ring-1 ring-sky-300 dark:ring-sky-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedAccountFilter === 'KAS' ? 'bg-white' : 'bg-sky-500'}`}></span>
                Akun KAS RT (Operasional)
              </button>
              <button
                onClick={() => setSelectedAccountFilter('DANSOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedAccountFilter === 'DANSOS'
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 ring-1 ring-emerald-300 dark:ring-emerald-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${selectedAccountFilter === 'DANSOS' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                Akun DANSOS (Dana Sosial)
              </button>
            </div>
          </div>
        </div>

        {/* 3 Summary Metric Cards for Selected Range & Chosen Account */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/30 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Masuk ({selectedAccountFilter === 'KAS' ? 'Akun KAS' : 'Akun DANSOS'})
              </p>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                Rp {cashFlowAnalysis.totalMasuk.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-rose-100 dark:border-rose-900/30 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Keluar ({selectedAccountFilter === 'KAS' ? 'Akun KAS' : 'Akun DANSOS'})
              </p>
              <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                Rp {cashFlowAnalysis.totalKeluar.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/30 shadow-xs flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${cashFlowAnalysis.netCashflow >= 0 ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'}`}>
              {cashFlowAnalysis.netCashflow >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Arus Bersih {selectedAccountFilter} {cashFlowAnalysis.netCashflow >= 0 ? '(Surplus)' : '(Defisit)'}
              </p>
              <p className={`text-base sm:text-lg font-black ${cashFlowAnalysis.netCashflow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {cashFlowAnalysis.netCashflow >= 0 ? '+' : ''}Rp {cashFlowAnalysis.netCashflow.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-72 w-full bg-white dark:bg-slate-800/60 rounded-xl p-3 border border-indigo-100/80 dark:border-slate-700/60 shadow-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowAnalysis.chartData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
              <defs>
                {/* Ambient aura for column hover - replaces harsh plain white rectangle */}
                <linearGradient id="columnHoverAura" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.16} />
                  <stop offset="60%" stopColor="#818cf8" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.01} />
                </linearGradient>

                {/* Kas Masuk gradient */}
                <linearGradient id="masukBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>

                {/* Kas Masuk dynamic hover glow gradient */}
                <linearGradient id="masukBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6ee7b7" />
                  <stop offset="40%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>

                {/* Kas Keluar gradient */}
                <linearGradient id="keluarBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>

                {/* Kas Keluar dynamic hover glow gradient */}
                <linearGradient id="keluarBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fda4af" />
                  <stop offset="40%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
              <XAxis 
                dataKey="periode" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                tickFormatter={formatShortRupiah} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={<CustomBarCursor />}
                content={<CashFlowTooltip />}
              />
              <Bar 
                dataKey="Masuk" 
                fill="url(#masukBarGradient)" 
                radius={[6, 6, 2, 2]} 
                maxBarSize={48} 
                name={selectedAccountFilter === 'KAS' ? 'KAS Masuk' : 'DANSOS Masuk'}
                activeBar={{
                  fill: 'url(#masukBarHoverGradient)',
                  stroke: '#34d399',
                  strokeWidth: 2,
                  filter: 'drop-shadow(0 4px 10px rgba(16, 185, 129, 0.45))'
                }}
              />
              <Bar 
                dataKey="Keluar" 
                fill="url(#keluarBarGradient)" 
                radius={[6, 6, 2, 2]} 
                maxBarSize={48} 
                name={selectedAccountFilter === 'KAS' ? 'KAS Keluar' : 'DANSOS Keluar'}
                activeBar={{
                  fill: 'url(#keluarBarHoverGradient)',
                  stroke: '#fb7185',
                  strokeWidth: 2,
                  filter: 'drop-shadow(0 4px 10px rgba(244, 63, 94, 0.45))'
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Month-by-Month Breakdown Cards */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
              Rincian Per Periode Bulan — Akun {selectedAccountFilter === 'KAS' ? 'KAS RT (Operasional)' : 'DANSOS (Dana Sosial)'}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {cashFlowAnalysis.chartData.length} Periode Bulan Terpantau
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cashFlowAnalysis.chartData.map((item) => (
              <div 
                key={item.key} 
                className={`p-3 rounded-xl border transition-all ${
                  item.relativeTag === '2 Bulan Lalu'
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60'
                    : item.relativeTag === 'Bulan Ini'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 ring-1 ring-emerald-400/30'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.fullPeriode}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    item.relativeTag === '2 Bulan Lalu'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                      : item.relativeTag === '1 Bulan Lalu'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      : item.relativeTag === 'Bulan Ini'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {item.relativeTag}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {selectedAccountFilter === 'KAS' ? 'KAS Masuk:' : 'DANSOS Masuk:'}
                    </span>
                    <span className="font-semibold">Rp {item.Masuk.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {selectedAccountFilter === 'KAS' ? 'KAS Keluar:' : 'DANSOS Keluar:'}
                    </span>
                    <span className="font-semibold">Rp {item.Keluar.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Arus Bersih ({selectedAccountFilter}):
                    </span>
                    <span className={`text-xs font-bold ${item.Selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item.Selisih >= 0 ? '+' : ''}Rp {item.Selisih.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
