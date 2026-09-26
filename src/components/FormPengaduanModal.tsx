import React, { useState, useEffect, useMemo } from 'react';
import { PengaduanWarga, KategoriPengaduan, UserSession } from '../types';
import { 
  MessageSquareWarning, 
  Send, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  User, 
  Image as ImageIcon, 
  X, 
  Check, 
  Lock, 
  Info 
} from 'lucide-react';

interface FormPengaduanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  pengaduanList: PengaduanWarga[];
  availableGangs: string[];
  onAddPengaduan: (aduan: PengaduanWarga) => Promise<void>;
  onOpenLogin?: () => void;
}

const KATEGORI_OPTIONS: KategoriPengaduan[] = [
  'Keamanan & Ketertiban',
  'Fasilitas & Infrastruktur',
  'Kebersihan & Lingkungan',
  'Sosial & Kemasyarakatan',
  'Lainnya'
];

export const FormPengaduanModal: React.FC<FormPengaduanModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  pengaduanList,
  availableGangs,
  onAddPengaduan,
  onOpenLogin
}) => {
  // Form fields state
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<KategoriPengaduan>('Fasilitas & Infrastruktur');
  const [lokasiGang, setLokasiGang] = useState(currentUser?.gang || 'Gang 1');
  const [namaPelapor, setNamaPelapor] = useState(currentUser?.nama || '');
  const [alamatGsb, setAlamatGsb] = useState(currentUser?.alamatGsb || '');
  const [noHp, setNoHp] = useState('');
  const [isAnonim, setIsAnonim] = useState(false);
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Sync user details on change
  useEffect(() => {
    if (currentUser) {
      setNamaPelapor(currentUser.nama || '');
      setAlamatGsb(currentUser.alamatGsb || '');
      if (currentUser.gang) {
        setLokasiGang(currentUser.gang);
      }
    }
  }, [currentUser]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  // Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Ukuran file maksimal 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFotoBukti(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('Silakan login terlebih dahulu untuk mengajukan pengaduan.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    if (isDailyLimitReached) {
      alert(`Batas maksimal pengaduan harian tercapai. Setiap warga dibatasi maksimal ${MAX_REPORTS_PER_DAY} laporan per hari. Anda telah mengirimkan ${userReportsTodayCount} laporan pada hari ini.`);
      return;
    }

    if (!judul.trim() || !deskripsi.trim()) {
      alert('Mohon lengkapi judul dan uraian pengaduan.');
      return;
    }

    if (!isAnonim && !alamatGsb.trim() && !currentUser.alamatGsb) {
      alert('Mohon lengkapi blok rumah Anda.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newAduan: PengaduanWarga = {
        id: `aduan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pelaporUserId: currentUser.id,
        judul: judul.trim(),
        kategori,
        deskripsi: deskripsi.trim(),
        lokasiGang: lokasiGang.trim() || currentUser.gang || 'Lingkungan RT 001',
        namaPelapor: isAnonim ? 'Warga RT 001 (Anonim)' : (currentUser.nama || namaPelapor.trim() || 'Warga RT 001'),
        alamatGsb: isAnonim ? 'Disamarkan (Anonim)' : (currentUser.alamatGsb || alamatGsb.trim() || 'GSB'),
        isAnonim,
        noHp: isAnonim ? undefined : (noHp.trim() || undefined),
        fotoBukti: fotoBukti || undefined,
        status: 'Menunggu',
        createdAt: new Date().toISOString()
      };

      await onAddPengaduan(newAduan);
      setSubmitSuccess(true);
      setJudul('');
      setDeskripsi('');
      setFotoBukti(null);
      setNoHp('');

      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      alert('Gagal mengirim pengaduan: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-850/70">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
              <MessageSquareWarning className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Buat Pengaduan & Aspirasi Warga
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                RT 001 RW 004 • Griya Sutera Balaraja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Popup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {!currentUser ? (
            /* STATE 1: BELUM LOGIN */
            <div className="text-center py-6 sm:py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-300/60">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Layanan Khusus Warga RT 001 / RW 004
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                  Silakan Login Terlebih Dahulu
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Untuk menjaga validitas data pengaduan, ketertiban lingkungan, dan pertanggungjawaban aspirasi, setiap warga wajib masuk menggunakan akun warga sebelum membuat laporan pengaduan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2 text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Akun warga otomatis terhubung dengan blok rumah Anda</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Ketentuan kuota adil: maksimal 2 laporan per warga per hari</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tersedia opsi <strong>Anonim</strong> demi kenyamanan privasi bertetangga</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>Masuk / Login Akun Warga</span>
                </button>
              </div>
            </div>
          ) : isDailyLimitReached ? (
            /* STATE 2: KUOTA HARIAN HABIS (2/2) */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-rose-900 dark:text-rose-200">
                    Batas Maksimal Harian Tercapai (2/2 Laporan)
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                    Halo <strong>{currentUser.nama}</strong> ({currentUser.alamatGsb}), demi pemerataan tindak lanjut, setiap warga dibatasi maksimal 2 laporan per hari. Anda dapat membuat laporan baru kembali besok.
                  </p>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                  <span>Daftar Pengaduan Anda Hari Ini:</span>
                  <span className="text-[11px] font-semibold text-slate-500">2 dari 2 laporan</span>
                </div>
                <div className="space-y-2">
                  {todayUserReports.map(aduan => (
                    <div key={aduan.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {aduan.judul}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{aduan.kategori}</span>
                          <span>•</span>
                          <span>{aduan.lokasiGang}</span>
                          <span>•</span>
                          <span>{aduan.isAnonim ? 'Anonim' : aduan.alamatGsb}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 self-start sm:self-auto ${
                        aduan.status === 'Menunggu' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        aduan.status === 'Diproses' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                        aduan.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {aduan.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : submitSuccess ? (
            /* STATE 3: PENGADUAN BERHASIL DIKIRIM */
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                Pengaduan Berhasil Dikirim!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Laporan Anda telah tersimpan dan akan segera ditinjau oleh Pengurus RT 001 RW 004. Anda dapat memantau proses tindak lanjutnya pada feed pengaduan.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Tutup & Lihat di Feed Pengaduan
                </button>
              </div>
            </div>
          ) : (
            /* STATE 4: FORM INPUT PENGADUAN */
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Status Akun & Kuota Warga */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{currentUser.nama}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                        Blok {currentUser.alamatGsb}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {currentUser.gang || 'Griya Sutera Balaraja'} • Terverifikasi
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Sisa Kuota:
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                    {remainingQuota} / {MAX_REPORTS_PER_DAY} Hari Ini
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pengaduan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lampu Penerangan Jalan Depan Rumah D11/12 Mati"
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Pengaduan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={kategori}
                    onChange={e => setKategori(e.target.value as KategoriPengaduan)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium text-xs"
                  >
                    {KATEGORI_OPTIONS.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Gang / Tempat Kejadian <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={lokasiGang}
                    onChange={e => setLokasiGang(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-medium text-xs"
                  >
                    {availableGangs.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="Fasum / Lapangan">Fasum / Lapangan RT</option>
                    <option value="Pos Ronda / Gerbang Utama">Pos Ronda / Gerbang Utama</option>
                    <option value="Jalan Utama GSB">Jalan Utama GSB</option>
                    <option value="Lainnya">Lokasi Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pelapor {isAnonim && <span className="text-slate-400 font-normal">(Disamarkan)</span>}
                  </label>
                  <input
                    type="text"
                    disabled={isAnonim}
                    placeholder="Nama Anda"
                    value={isAnonim ? 'Warga RT 001 (Anonim)' : namaPelapor}
                    onChange={e => setNamaPelapor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden disabled:bg-slate-100 dark:disabled:bg-slate-800/50 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blok Rumah GSB {isAnonim ? (
                      <span className="text-slate-400 font-normal">(Disamarkan)</span>
                    ) : (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required={!isAnonim}
                    disabled={isAnonim}
                    placeholder="Contoh: D11/33"
                    value={isAnonim ? 'Disamarkan (Anonim)' : alamatGsb}
                    onChange={e => setAlamatGsb(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-mono disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp {isAnonim ? (
                      <span className="text-slate-400 font-normal">(Disamarkan)</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(Opsional)</span>
                    )}
                  </label>
                  <input
                    type="tel"
                    disabled={isAnonim}
                    placeholder={isAnonim ? 'Disamarkan (Anonim)' : '08xxxxxxxxxx'}
                    value={isAnonim ? '' : noHp}
                    onChange={e => setNoHp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden font-mono disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400 text-xs"
                  />
                </div>
              </div>

              {/* Checkbox Anonim */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-modal-anonim"
                  checked={isAnonim}
                  onChange={e => setIsAnonim(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chk-modal-anonim" className="cursor-pointer text-slate-700 dark:text-slate-300 leading-tight">
                  <span className="font-bold">Kirim sebagai Laporan Anonim</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Identitas Anda (<strong>Nama Pelapor</strong> dan <strong>Blok Rumah</strong>) akan disamarkan sebagai &quot;Warga RT 001 (Anonim)&quot; pada feed publik demi privasi bertetangga.
                  </p>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian Lengkap Pengaduan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan permasalahan secara jelas dan lengkap (sejak kapan terjadi, dampak yang ditimbulkan, dan usulan solusi jika ada)..."
                  value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed text-xs"
                />
              </div>

              {/* Upload Foto Bukti */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Foto Bukti Kondisi Lapangan <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>Pilih Foto Bukti</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {fotoBukti && (
                    <div className="flex items-center gap-2">
                      <img 
                        src={fotoBukti} 
                        alt="Preview" 
                        className="w-10 h-10 object-cover rounded-lg border border-slate-300 dark:border-slate-700" 
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">Foto siap diunggah</span>
                      <button
                        type="button"
                        onClick={() => setFotoBukti(null)}
                        className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 text-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengirim Pengaduan...' : 'Kirim Pengaduan Sekarang'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
