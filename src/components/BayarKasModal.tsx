import React, { useState } from 'react';
import { AppSettings, UserSession, Warga, TransaksiKas } from '../types';
import { 
  CreditCard, 
  Copy, 
  Check, 
  UploadCloud, 
  X, 
  QrCode, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  Smartphone,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Eye,
  Lock
} from 'lucide-react';

interface BayarKasModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  currentUser: UserSession | null;
  wargaList: Warga[];
  onBayarSuccess: (kasItems: TransaksiKas[]) => Promise<void>;
}

export const BayarKasModal: React.FC<BayarKasModalProps> = ({
  isOpen,
  onClose,
  settings,
  currentUser,
  wargaList,
  onBayarSuccess
}) => {
  const [alamatGsb, setAlamatGsb] = useState<string>(currentUser?.alamatGsb || 'F2/22');
  const [namaWarga, setNamaWarga] = useState<string>(currentUser?.nama || '');
  const [periodeBulan, setPeriodeBulan] = useState<string>('2026-09');
  
  const [nominalKas, setNominalKas] = useState<number>(settings.iuranKasNominal !== undefined ? Number(settings.iuranKasNominal) : 20000);
  const [nominalDansos, setNominalDansos] = useState<number>(settings.iuranDansosNominal !== undefined ? Number(settings.iuranDansosNominal) : 10000);
  
  // Dynamic sync when modal opens or settings change from cloud
  React.useEffect(() => {
    if (isOpen) {
      setNominalKas(settings.iuranKasNominal !== undefined ? Number(settings.iuranKasNominal) : 20000);
      setNominalDansos(settings.iuranDansosNominal !== undefined ? Number(settings.iuranDansosNominal) : 10000);
    }
  }, [isOpen, settings.iuranKasNominal, settings.iuranDansosNominal]);
  
  const [selectedMetode, setSelectedMetode] = useState<'Transfer Bank Jago' | 'DANA' | 'GoPay' | 'SeaBank' | 'QRIS'>('Transfer Bank Jago');
  const [buktiBayar, setBuktiBayar] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState<TransaksiKas[] | null>(null);

  // Auto-sync resident name when address changes
  React.useEffect(() => {
    if (currentUser) {
      setAlamatGsb(currentUser.alamatGsb);
      setNamaWarga(currentUser.nama);
    } else {
      const found = wargaList.find(w => w.alamatGsb.toLowerCase() === alamatGsb.toLowerCase());
      if (found) {
        setNamaWarga(found.nama);
      }
    }
  }, [alamatGsb, currentUser, wargaList]);

  if (!isOpen) return null;

  const totalBayar = Number(nominalKas) + Number(nominalDansos);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setBuktiBayar(compressed);
          } else {
            setBuktiBayar(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    setSubmittedSuccess(null);
    setSubmitError(null);
    setBuktiBayar('');
    setCatatan('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalBayar <= 0) return;

    // SISTEM KEAMANAN PEMBAYARAN KAS RT:
    // Wajib melampirkan bukti transfer agar Bendahara dapat mencocokkan mutasi bank/e-wallet
    if (!buktiBayar) {
      setSubmitError('Sistem Keamanan RT: Anda wajib melampirkan foto bukti transfer / struk pembayaran. Bukti ini diperlukan oleh Bendahara RT untuk memverifikasi kecocokan mutasi rekening bank sebelum dana dimasukkan ke kas.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      // Sesuai sistem keamanan kas RT: pembayaran online berstatus 'pending' (Menunggu Verifikasi Bendahara)
      // Uang baru resmi masuk ke laporan kas dan saldo setelah Bendahara memastikan dana masuk ke rekening RT!
      const kasEntries: TransaksiKas[] = [];

      if (nominalKas > 0) {
        kasEntries.push({
          id: `k-${Date.now()}-1`,
          tanggal: today,
          jenis: 'masuk',
          akun: 'KAS',
          nominal: Number(nominalKas),
          peruntukan: `Iuran Kas RT Bulan ${periodeBulan}`,
          alamatGsb: alamatGsb,
          namaWarga: namaWarga,
          periodeBulan: periodeBulan,
          metode: selectedMetode,
          status: 'pending', // Menunggu verifikasi mutasi rekening oleh Bendahara
          buktiBayar: buktiBayar,
          catatan: catatan ? `${catatan} (Online via ${selectedMetode})` : `Online via ${selectedMetode}`,
          inputBy: currentUser ? currentUser.alamatGsb : alamatGsb,
          createdAt: now
        });
      }

      if (nominalDansos > 0) {
        kasEntries.push({
          id: `k-${Date.now()}-2`,
          tanggal: today,
          jenis: 'masuk',
          akun: 'DANSOS',
          nominal: Number(nominalDansos),
          peruntukan: `Iuran Dansos Warga Bulan ${periodeBulan}`,
          alamatGsb: alamatGsb,
          namaWarga: namaWarga,
          periodeBulan: periodeBulan,
          metode: selectedMetode,
          status: 'pending', // Menunggu verifikasi mutasi rekening oleh Bendahara
          buktiBayar: buktiBayar,
          catatan: catatan ? `${catatan} (Online via ${selectedMetode})` : `Online via ${selectedMetode}`,
          inputBy: currentUser ? currentUser.alamatGsb : alamatGsb,
          createdAt: now
        });
      }

      await onBayarSuccess(kasEntries);
      setSubmittedSuccess(kasEntries);
    } catch (err: any) {
      console.error('Gagal mencatat pembayaran:', err);
      setSubmitError(err?.message || 'Gagal menyimpan transaksi pembayaran ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-colors">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Pembayaran Uang Kas Online</h3>
              <p className="text-xs text-blue-100">RT 001 RW 004 Perum Griya Sutera Balaraja</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* JIKA BERHASIL KIRIM: TAMPILKAN STATUS MENUNGGU VERIFIKASI */}
        {submittedSuccess ? (
          <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Pengajuan Pembayaran Berhasil Dikirim!
              </h4>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                Status: Menunggu Verifikasi Bendahara RT
              </div>
            </div>

            {/* Security Explanation Box */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-blue-950 dark:text-blue-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Sistem Keamanan & Verifikasi Mutasi Rekening</span>
              </div>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90">
                Demi ketertiban dan akurasi kas RT 001/004, dana pembayaran online <strong>TIDAK langsung masuk ke kas</strong> sampai Bendahara RT memeriksa mutasi rekening bank/e-wallet RT dan memastikan dana sebesar <strong>{formatRupiah(totalBayar)}</strong> benar-benar telah masuk.
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ Begitu dana terkonfirmasi masuk oleh Bendahara, status pembayaran rumah Anda otomatis berubah menjadi <strong>Terverifikasi (Lunas)</strong> dan dicatat dalam Laporan Kas RT resmi.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200 dark:border-slate-700">
                Rincian Pengajuan Pembayaran
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Rumah / Warga:</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{alamatGsb}</strong> - {namaWarga}
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Periode Iuran:</span>
                  <strong className="text-slate-900 dark:text-white">{periodeBulan}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Metode Transfer:</span>
                  <strong className="text-blue-600 dark:text-blue-400">{selectedMetode}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Total Nominal:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{formatRupiah(totalBayar)}</strong>
                  <span className="block text-[10px] text-slate-400">(Kas: {formatRupiah(nominalKas)}, Dansos: {formatRupiah(nominalDansos)})</span>
                </div>
              </div>

              {buktiBayar && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 shrink-0">
                    <img src={buktiBayar} alt="Struk Bukti" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Foto Struk Terlampir</span>
                    Bendahara RT akan mencocokkan struk ini dengan mutasi rekening.
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-center"
              >
                Tutup & Cek Status di Riwayat Kas Saya
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
            {submitError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-snug">{submitError}</div>
              </div>
            )}

            {/* Security Notice Banner */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="font-bold text-amber-950 dark:text-amber-100">Prosedur Keamanan Kas RT: </strong>
                Pembayaran online <strong>tidak otomatis langsung masuk ke laporan kas</strong>. Status akan tercatat sebagai <em>Menunggu Verifikasi</em> sampai Bendahara RT memastikan mutasi dana telah masuk ke rekening bank RT. Harap lampirkan foto struk transfer.
              </div>
            </div>
          
          {/* Identitas Warga */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">Identitas Pembayar</span>
              {currentUser && (
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                  Terisi Otomatis
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Alamat Rumah GSB *</label>
                {currentUser ? (
                  <input
                    type="text"
                    disabled
                    value={currentUser.alamatGsb}
                    className="w-full px-3 py-2 bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-bold font-mono"
                  />
                ) : (
                  <select
                    value={alamatGsb}
                    onChange={e => {
                      setAlamatGsb(e.target.value);
                      const w = wargaList.find(item => item.alamatGsb === e.target.value);
                      if (w) setNamaWarga(w.nama);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium outline-hidden"
                  >
                    {wargaList.map(w => (
                      <option key={w.id} value={w.alamatGsb}>
                        {w.alamatGsb} - {w.nama} ({w.gang})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Warga</label>
                <input
                  type="text"
                  value={namaWarga}
                  onChange={e => setNamaWarga(e.target.value)}
                  placeholder="Nama Kepala Keluarga / Penghuni"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Periode Bulan Iuran *</label>
              <select
                value={periodeBulan}
                onChange={e => setPeriodeBulan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium outline-hidden"
              >
                <option value="2026-09">September 2026 (Bulan Ini)</option>
                <option value="2026-10">Oktober 2026</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
              </select>
            </div>
          </div>

          {/* Rincian Akun KAS & DANSOS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 p-3 rounded-xl">
              <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">Iuran KAS RT</label>
              <input
                type="number"
                value={nominalKas}
                onChange={e => setNominalKas(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg font-bold text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
              <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">Kas Operasional Lingkungan</span>
            </div>

            <div className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/40 p-3 rounded-xl">
              <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">Iuran DANSOS</label>
              <input
                type="number"
                value={nominalDansos}
                onChange={e => setNominalDansos(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg font-bold text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">Santunan & Bantuan Sosial</span>
            </div>
          </div>

          {/* Total Bayar Banner */}
          <div className="p-3 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white rounded-xl flex items-center justify-between">
            <span className="font-semibold text-slate-300">Total Nominal Pembayaran:</span>
            <span className="text-lg font-black text-amber-300">{formatRupiah(totalBayar)}</span>
          </div>

          {/* Pilihan Saluran Gateway Pembayaran */}
          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-2">
              Pilih Metode Transfer / Gateway Pembayaran:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'Transfer Bank Jago', label: 'Bank Jago', icon: '🏛️' },
                { id: 'DANA', label: 'DANA', icon: '💙' },
                { id: 'GoPay', label: 'GoPay', icon: '💚' },
                { id: 'SeaBank', label: 'SeaBank', icon: '🧡' },
                { id: 'QRIS', label: 'QRIS', icon: '📱' },
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedMetode(item.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedMetode === item.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-base mb-0.5">{item.icon}</div>
                  <div className="text-[11px] truncate">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Account Details */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
            <div className="text-amber-900 dark:text-amber-200 font-bold flex items-center justify-between text-xs">
              <span>Rekening Tujuan Pembayaran Resmi RT 001:</span>
              <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-bold">Resmi</span>
            </div>

            {selectedMetode === 'Transfer Bank Jago' && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Bank Jago</div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                    {settings.rekening.nomorRekening}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">a/n <strong>{settings.rekening.atasNama}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(settings.rekening.nomorRekening, 'jago')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {copiedKey === 'jago' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'jago' ? 'Tersalin' : 'Salin Rek'}</span>
                </button>
              </div>
            )}

            {selectedMetode === 'DANA' && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                <div>
                  <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">Nomor Akun DANA</div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                    {settings.rekening.nomorDana || '081418685262'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">a/n <strong>{settings.rekening.atasNama}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(settings.rekening.nomorDana || '081418685262', 'dana')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {copiedKey === 'dana' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'dana' ? 'Tersalin' : 'Salin No'}</span>
                </button>
              </div>
            )}

            {selectedMetode === 'GoPay' && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">Nomor Akun GoPay</div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                    {settings.rekening.nomorGopay || '081418685262'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">a/n <strong>{settings.rekening.atasNama}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(settings.rekening.nomorGopay || '081418685262', 'gopay')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {copiedKey === 'gopay' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'gopay' ? 'Tersalin' : 'Salin No'}</span>
                </button>
              </div>
            )}

            {selectedMetode === 'SeaBank' && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                <div>
                  <div className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold">Nomor Rekening SeaBank</div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider">
                    {settings.rekening.nomorSeabank || '901418685262'}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">a/n <strong>{settings.rekening.atasNama}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(settings.rekening.nomorSeabank || '901418685262', 'seabank')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                >
                  {copiedKey === 'seabank' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'seabank' ? 'Tersalin' : 'Salin No'}</span>
                </button>
              </div>
            )}

            {selectedMetode === 'QRIS' && (
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 text-center space-y-2">
                <div className="w-32 h-32 mx-auto bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white">
                  <QrCode className="w-24 h-24" />
                </div>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  QRIS RT 001 RW 004 GSB (Semua Pembayaran)
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  NMID: ID102026198810 / Rek: Bank Jago Arif Rohman
                </div>
              </div>
            )}

            <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
              ℹ️ Harap cantumkan keterangan/berita transfer: <strong className="text-slate-900 dark:text-white">IURAN RT {alamatGsb}</strong>
            </div>
          </div>

          {/* Upload Bukti Pembayaran */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Upload Foto Bukti Transfer / Struk Bank <span className="text-rose-500 font-bold">*Wajib</span>
              </label>
              {buktiBayar && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Struk Terlampir
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-blue-300 dark:border-blue-800 hover:border-blue-500 rounded-xl cursor-pointer bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                  <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300 font-bold">
                    {buktiBayar ? 'Ganti Foto Struk Bukti' : 'Pilih Foto Struk / Screenshot Transfer'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {buktiBayar && (
                  <div className="relative group w-14 h-14 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 shadow-xs">
                    <img src={buktiBayar} alt="Bukti" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setBuktiBayar('')}
                      title="Hapus foto struk"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Format gambar (JPG, PNG). Foto bukti akan diperiksa oleh Bendahara RT sebelum mencocokkan mutasi rekening bank kas.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Transfer dari rekening an. Budi via Bank Jago"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'Mengirim Pengajuan...' : 'Ajukan Pembayaran & Verifikasi Bank'}</span>
            </button>
          </div>
        </form>
      )}
      </div>
    </div>
  );
};
