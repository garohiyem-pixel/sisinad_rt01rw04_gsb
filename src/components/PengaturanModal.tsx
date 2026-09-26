import React, { useState, useEffect } from 'react';
import { AppSettings, DatabaseSchema, UserSession } from '../types';
import { 
  Settings, 
  Image as ImageIcon, 
  CreditCard, 
  Database, 
  Download, 
  Upload, 
  Check, 
  Sparkles, 
  KeyRound,
  ShieldCheck,
  Building,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  FileCode,
  X,
  RefreshCw,
  Save
} from 'lucide-react';

interface PengaturanModalProps {
  settings: AppSettings;
  fullDatabase: DatabaseSchema;
  currentUser?: UserSession | null;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onRestoreDatabase: (db: DatabaseSchema) => Promise<void>;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

// Presets for RT 001 RW 04 Logo
const PRESET_LOGOS = [
  {
    id: 'default',
    title: 'Default Modern RT 01',
    description: 'Emblem gradasi biru-indigo RT 01 / RW 04',
    url: ''
  },
  {
    id: 'garuda',
    title: 'Garuda Nusantara',
    description: 'Lambang resmi merah putih kebangsaan',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23D97706"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="%23991B1B"/><circle cx="50" cy="50" r="44" fill="none" stroke="%23FBBF24" stroke-width="2.5"/><path d="M50 16 L54 28 L66 28 L56 36 L60 48 L50 40 L40 48 L44 36 L34 28 L46 28 Z" fill="url(%23gold)"/><path d="M25 52 C35 44 65 44 75 52 C70 65 50 82 50 82 C50 82 30 65 25 52 Z" fill="%23FDE68A" stroke="%23D97706" stroke-width="2"/><path d="M40 56 L60 56 L50 72 Z" fill="%23DC2626"/><text x="50" y="93" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900" fill="%23FEF3C7">RT 01 / RW 04</text></svg>'
  },
  {
    id: 'lingkungan',
    title: 'Warga Rukun Sejahtera',
    description: 'Emblem hijau alam & pemukiman guyub',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23059669"/><stop offset="100%" stop-color="%23047857"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="url(%23bg)"/><circle cx="50" cy="50" r="44" fill="none" stroke="%23A7F3D0" stroke-width="2.5"/><path d="M50 20 L24 42 L32 42 L32 72 L68 72 L68 42 L76 42 Z" fill="%23FFFFFF"/><path d="M42 50 L58 50 L58 72 L42 72 Z" fill="%23047857"/><circle cx="50" cy="36" r="5" fill="%23F59E0B"/><path d="M50 72 Q65 60 70 45 Q55 52 50 72" fill="%2334D399"/><text x="50" y="87" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="900" fill="%23FFFFFF">WARGA RUKUN</text></svg>'
  },
  {
    id: 'perisai',
    title: 'Perisai Keamanan RT',
    description: 'Emblem ketertiban & harmoni GSB',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="shield" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231D4ED8"/><stop offset="100%" stop-color="%231E3A8A"/></linearGradient></defs><path d="M50 8 C72 8 86 16 86 38 C86 66 50 92 50 92 C50 92 14 66 14 38 C14 16 28 8 50 8 Z" fill="url(%23shield)" stroke="%23F59E0B" stroke-width="3"/><circle cx="50" cy="45" r="22" fill="%231E40AF" stroke="%23FDE68A" stroke-width="2"/><path d="M50 30 L54 40 L64 40 L56 46 L59 56 L50 50 L41 56 L44 46 L36 40 L46 40 Z" fill="%23F59E0B"/><text x="50" y="76" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="900" fill="%23FFFFFF">GSB RT 01</text></svg>'
  }
];

export const PengaturanModal: React.FC<PengaturanModalProps> = ({
  settings,
  fullDatabase,
  currentUser,
  onUpdateSettings,
  onRestoreDatabase,
  onManualSync,
  isSyncing = false
}) => {
  const [logoInput, setLogoInput] = useState<string>(settings.logoUrl || '');
  const [isDirtyLogo, setIsDirtyLogo] = useState<boolean>(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState<boolean>(false);
  const [isSavingLogoOnly, setIsSavingLogoOnly] = useState<boolean>(false);
  const [logoSuccessMessage, setLogoSuccessMessage] = useState<string | null>(null);
  const [logoErrorMessage, setLogoErrorMessage] = useState<string | null>(null);
  const [logoFileSize, setLogoFileSize] = useState<string | null>(null);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);
  const [urlDraftInput, setUrlDraftInput] = useState<string>('');

  const [rekeningForm, setRekeningForm] = useState({ ...settings.rekening });
  const [iuranForm, setIuranForm] = useState({
    kas: settings.iuranKasNominal !== undefined ? settings.iuranKasNominal : 20000,
    dansos: settings.iuranDansosNominal !== undefined ? settings.iuranDansosNominal : 10000
  });

  // Dynamic synchronization: ensure form state stays in sync with Firestore & server settings
  useEffect(() => {
    // Only update logo from prop if user is not actively editing it
    if (!isDirtyLogo) {
      setLogoInput(settings.logoUrl || '');
      setUrlDraftInput(settings.logoUrl && !settings.logoUrl.startsWith('data:') ? settings.logoUrl : '');
      setLogoLoadError(false);
    }
    if (settings.rekening) {
      setRekeningForm({ ...settings.rekening });
    }
    setIuranForm({
      kas: settings.iuranKasNominal !== undefined ? settings.iuranKasNominal : 20000,
      dansos: settings.iuranDansosNominal !== undefined ? settings.iuranDansosNominal : 10000
    });
  }, [settings, isDirtyLogo]);

  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  // Staged database for upload preview & confirmation
  const [stagedBackup, setStagedBackup] = useState<{
    data: DatabaseSchema;
    fileName: string;
    wargaCount: number;
    kasCount: number;
    agendaCount: number;
    notulenCount: number;
  } | null>(null);

  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreNotification, setRestoreNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Ultra-reliable logo file upload with automatic canvas optimization (max 256x256, compressed jpeg)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoErrorMessage('Harap pilih file gambar yang valid (JPG, PNG, WEBP, SVG).');
      return;
    }

    setIsProcessingLogo(true);
    setLogoErrorMessage(null);
    setLogoSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 256;
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
            // Ultra-compact JPEG encoding (~15-30KB) ensures rapid Firestore writes and zero quota issues
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            setLogoInput(optimized);
            setIsDirtyLogo(true);
            setLogoLoadError(false);
            const sizeKb = Math.round((optimized.length * 0.75) / 1024);
            setLogoFileSize(`${sizeKb} KB (teroptimasi)`);
          } else {
            const raw = event.target?.result as string;
            setLogoInput(raw);
            setIsDirtyLogo(true);
            setLogoLoadError(false);
          }
        } catch (err: any) {
          console.error('Canvas processing error:', err);
          setLogoInput(event.target?.result as string);
          setIsDirtyLogo(true);
          setLogoLoadError(false);
        } finally {
          setIsProcessingLogo(false);
        }
      };

      img.onerror = () => {
        setLogoErrorMessage('Gagal memuat gambar. Pastikan format file didukung browser.');
        setIsProcessingLogo(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setLogoErrorMessage('Gagal membaca file gambar.');
      setIsProcessingLogo(false);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Instant save just for Logo RT
  const handleSaveLogoOnly = async () => {
    setIsSavingLogoOnly(true);
    setLogoErrorMessage(null);
    setLogoSuccessMessage(null);
    try {
      await onUpdateSettings({
        logoUrl: logoInput.trim()
      });
      setIsDirtyLogo(false);
      setLogoSuccessMessage('Logo RT berhasil disimpan & diperbarui di website!');
      setTimeout(() => setLogoSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Gagal menyimpan logo:', err);
      setLogoErrorMessage(err?.message || 'Gagal menyimpan logo ke database.');
    } finally {
      setIsSavingLogoOnly(false);
    }
  };

  // Handle Preset selection
  const handleSelectPreset = (url: string) => {
    setLogoInput(url);
    setUrlDraftInput(url.startsWith('http') ? url : '');
    setIsDirtyLogo(true);
    setLogoLoadError(false);
    setLogoFileSize(null);
    setLogoErrorMessage(null);
  };

  // Handle URL apply
  const handleApplyUrl = () => {
    if (!urlDraftInput.trim()) {
      setLogoErrorMessage('Harap masukkan link URL gambar.');
      return;
    }
    setLogoInput(urlDraftInput.trim());
    setIsDirtyLogo(true);
    setLogoLoadError(false);
    setLogoFileSize(null);
    setLogoErrorMessage(null);
  };

  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveError(null);
    try {
      const parsedKas = Number(iuranForm.kas);
      const parsedDansos = Number(iuranForm.dansos);
      const cleanKas = isNaN(parsedKas) ? 0 : Math.max(0, parsedKas);
      const cleanDansos = isNaN(parsedDansos) ? 0 : Math.max(0, parsedDansos);

      await onUpdateSettings({
        logoUrl: logoInput.trim(),
        rekening: rekeningForm,
        iuranKasNominal: cleanKas,
        iuranDansosNominal: cleanDansos
      });
      setIsDirtyLogo(false);
      setSavedStatus('Pengaturan, logo, dan tarif iuran berhasil disimpan permanen ke Cloud Database!');
      setTimeout(() => setSavedStatus(null), 4000);
    } catch (err: any) {
      console.error('Gagal menyimpan pengaturan:', err);
      setSaveError(err?.message || 'Gagal menyimpan pengaturan ke database server.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Download database JSON file
  const handleDownloadDatabaseFile = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullDatabase, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `database_rt001_rw004_gsb_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download database code file as initialData.ts
  const handleDownloadInitialDataFile = () => {
    const fileContent = `import { DatabaseSchema } from "./types";\n\nexport const initialData: DatabaseSchema = ${JSON.stringify(fullDatabase, null, 2)};\n\nexport const initialDatabase = initialData;\nexport default initialData;\n`;
    const dataStr = 'data:text/typescript;charset=utf-8,' + encodeURIComponent(fileContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'initialData.ts');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Restore database JSON file
  const handleUploadDatabaseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (json && Array.isArray(json.warga) && Array.isArray(json.kas)) {
          setStagedBackup({
            data: json,
            fileName: file.name,
            wargaCount: json.warga.length,
            kasCount: json.kas.length,
            agendaCount: Array.isArray(json.agenda) ? json.agenda.length : 0,
            notulenCount: Array.isArray(json.notulen) ? json.notulen.length : 0
          });
          setRestoreNotification(null);
        } else {
          setRestoreNotification({
            type: 'error',
            message: 'Format File Tidak Sesuai',
            details: 'File JSON database harus memiliki data array "warga" dan "kas".'
          });
        }
      } catch (err: any) {
        setRestoreNotification({
          type: 'error',
          message: 'Gagal Membaca File Database',
          details: 'Pastikan file yang dipilih adalah format JSON yang valid. (' + (err?.message || err) + ')'
        });
      } finally {
        // Reset input file value so user can upload the same or another file
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!stagedBackup) return;
    try {
      setIsRestoring(true);
      await onRestoreDatabase(stagedBackup.data);
      const { fileName, wargaCount, kasCount, agendaCount, notulenCount } = stagedBackup;
      setStagedBackup(null);
      setRestoreNotification({
        type: 'success',
        message: 'Database Berhasil Diunggah & Diterapkan ke Website!',
        details: `File "${fileName}" telah berhasil dimuat. Data web otomatis disinkronkan: ${wargaCount} data warga, ${kasCount} transaksi kas, ${agendaCount} agenda, dan ${notulenCount} notulen rapat.`
      });

      // Update local form state if settings exist in backup
      if (stagedBackup.data.settings) {
        if (stagedBackup.data.settings.logoUrl) {
          setLogoInput(stagedBackup.data.settings.logoUrl);
        }
        if (stagedBackup.data.settings.rekening) {
          setRekeningForm({ ...stagedBackup.data.settings.rekening });
        }
        if (stagedBackup.data.settings.iuranKasNominal !== undefined || stagedBackup.data.settings.iuranDansosNominal !== undefined) {
          setIuranForm({
            kas: stagedBackup.data.settings.iuranKasNominal ?? 20000,
            dansos: stagedBackup.data.settings.iuranDansosNominal ?? 10000
          });
        }
      }
    } catch (err: any) {
      setRestoreNotification({
        type: 'error',
        message: 'Gagal Memulihkan Database',
        details: err?.message || 'Terjadi kesalahan saat memproses data ke server.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Pengaturan Website, Logo RT, & Rekening Bank
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola identitas visual, rekening penampung kas warga, tarif iuran, dan sinkronisasi Cloud Firestore
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cloud Firestore Aktif</span>
          </div>

          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Kirim dan perbarui pengaturan ke Cloud Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Cloud'}</span>
            </button>
          )}

          {savedStatus && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-bounce">
              <Check className="w-4 h-4" />
              <span>{savedStatus}</span>
            </div>
          )}
          {saveError && (
            <div className="px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
              <span>{saveError}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} noValidate className="space-y-6">
        
        {/* 1. Pengaturan Logo RT */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  1. Logo Rukun Tetangga (RT) di Website
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Logo tampil di header utama website, kuitansi kas warga, dan laporan PDF
                </p>
              </div>
            </div>

            {/* Direct Save Logo Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveLogoOnly}
                disabled={isSavingLogoOnly || isProcessingLogo}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Simpan perubahan logo sekarang tanpa perlu mengisi form lainnya"
              >
                {isSavingLogoOnly ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Logo Sekarang</span>
                  </>
                )}
              </button>

              {logoInput && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPreset('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Reset Default
                </button>
              )}
            </div>
          </div>

          {/* Feedback Badges for Logo */}
          {logoSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{logoSuccessMessage}</span>
            </div>
          )}

          {logoErrorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{logoErrorMessage}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start gap-6 pt-1">
            {/* Logo Preview */}
            <div className="flex flex-col items-center shrink-0 w-full md:w-auto">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-slate-200 dark:border-slate-700 overflow-hidden relative">
                {logoInput && !logoLoadError ? (
                  <img 
                    src={logoInput} 
                    alt="Preview Logo RT" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-xs text-blue-200 font-semibold tracking-wider">RT 01</div>
                    <div className="text-xl font-black mt-0.5">RW 04</div>
                  </div>
                )}

                {isProcessingLogo && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-[10px] gap-1">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center mt-2 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pratinjau Logo</span>
                {logoFileSize && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                    {logoFileSize}
                  </span>
                )}
                {isDirtyLogo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Belum disimpan
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-4 w-full text-xs">
              {/* Option A: Preset Logos */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Pilihan Lambang Resmi & Preset Cepat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_LOGOS.map(preset => {
                    const isSelected = logoInput === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs">
                          {preset.url ? (
                            <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                          ) : (
                            <span>RT 01</span>
                          )}
                        </div>
                        <span className="font-bold text-[11px] text-slate-800 dark:text-white leading-tight">
                          {preset.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option B: Upload file */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Atau Upload File Gambar Logo dari HP / Laptop:
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Mendukung PNG transparan, JPG, WEBP. Gambar otomatis dikompresi agar loading cepat.
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={isProcessingLogo}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
                />
              </div>

              {/* Option C: Direct Image URL */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Atau Masukkan Link / URL Gambar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/logo-rt.png"
                    value={urlDraftInput}
                    onChange={e => setUrlDraftInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Terapkan URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Pengaturan Rekening Tujuan Pembayaran */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                2. Rekening Bank & E-Wallet Penampung Kas RT
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data rekening ini otomatis tampil saat warga melakukan pembayaran kas online
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Bank *</label>
              <input
                type="text"
                required
                value={rekeningForm.bank}
                onChange={e => setRekeningForm({ ...rekeningForm, bank: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-semibold outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Rekening Bank *</label>
              <input
                type="text"
                required
                value={rekeningForm.nomorRekening}
                onChange={e => setRekeningForm({ ...rekeningForm, nomorRekening: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Pemilik Rekening (Atas Nama) *</label>
              <input
                type="text"
                required
                value={rekeningForm.atasNama}
                onChange={e => setRekeningForm({ ...rekeningForm, atasNama: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor E-Wallet DANA</label>
              <input
                type="text"
                value={rekeningForm.nomorDana}
                onChange={e => setRekeningForm({ ...rekeningForm, nomorDana: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor E-Wallet GoPay</label>
              <input
                type="text"
                value={rekeningForm.nomorGopay}
                onChange={e => setRekeningForm({ ...rekeningForm, nomorGopay: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Rekening SeaBank</label>
              <input
                type="text"
                value={rekeningForm.nomorSeabank}
                onChange={e => setRekeningForm({ ...rekeningForm, nomorSeabank: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Besaran Iuran Wajib Bulanan */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
              3. Tarif Iuran Rutin Warga Bulanan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tarif Iuran KAS RT (Rp)</label>
              <input
                type="number"
                min={0}
                value={iuranForm.kas}
                onChange={e => setIuranForm({ ...iuranForm, kas: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tarif Iuran DANSOS (Rp)</label>
              <input
                type="number"
                min={0}
                value={iuranForm.dansos}
                onChange={e => setIuranForm({ ...iuranForm, dansos: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold text-sm outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingSettings}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-colors text-xs flex items-center gap-2"
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Pengaturan & Tarif</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 4. Kelola & Ubah Nama Gang RT 001 */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                4. Daftar Gang Aktif RT 001 RW 004
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nama gang dapat dikelola & diubah oleh Admin pada tab <strong>Kelola Warga</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="text-slate-600 dark:text-slate-400">
            Daftar gang aktif saat ini di RT 001 RW 004:
          </div>
          <div className="flex flex-wrap gap-2">
            {(settings.daftarGang && settings.daftarGang.length > 0
              ? settings.daftarGang
              : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5']
            ).map((gang, idx) => {
              const wargaInGang = fullDatabase.warga.filter(w => w.gang === gang).length;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{gang}</span>
                  <span className="text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md text-slate-600 dark:text-slate-400 font-mono">
                    {wargaInGang} KK
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. File Database & Backup (Khusus Mode Super Admin) */}
      {currentUser?.isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-purple-200 dark:border-purple-800/80 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                    5. File Database RT (Penyimpanan & Pencadangan Aman)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                    Khusus Super Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Riwayat data warga, kas dan notulen tersimpan di server <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200">data/database.json</code> dan dapat diunduh kapan saja
                </p>
              </div>
            </div>
          </div>

          {/* Notifikasi Hasil Upload Database */}
          {restoreNotification && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs animate-in fade-in zoom-in-95 transition-all ${
                restoreNotification.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {restoreNotification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold text-sm">{restoreNotification.message}</div>
                  {restoreNotification.details && (
                    <p className="text-xs opacity-90 leading-relaxed">{restoreNotification.details}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreNotification(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-purple-950 dark:text-purple-200">Unduh Salinan File Database RT</div>
              <p className="text-purple-800 dark:text-purple-300 text-[11px] mt-0.5">
                Berisi {fullDatabase.warga.length} warga, {fullDatabase.kas.length} transaksi kas, {fullDatabase.agenda.length} agenda, dan {fullDatabase.notulen.length} notulen rapat.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={handleDownloadDatabaseFile}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors text-xs shrink-0"
                title="Download database dalam format JSON"
              >
                <Download className="w-4 h-4" />
                <span>Format .json</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadInitialDataFile}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors text-xs shrink-0"
                title="Download database dalam kode initialData.ts"
              >
                <FileCode className="w-4 h-4" />
                <span>Format initialData.ts</span>
              </button>
            </div>
          </div>

          {/* Restore DB */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-slate-800 dark:text-white">Pulihkan / Unggah File Database JSON</div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Unggah file cadangan JSON untuk memulihkan dan memperbarui seluruh data di website
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors text-xs shrink-0">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Pilih File Database JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleUploadDatabaseFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Pemulihan Database (Khusus Super Admin) */}
      {currentUser?.isSuperAdmin && stagedBackup && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                <FileJson className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Konfirmasi Unggah Database</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[260px]">
                  {stagedBackup.fileName}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                File database valid. Berikut adalah rincian data yang akan dimuat dan diterapkan ke website:
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Data Warga:</div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">
                    {stagedBackup.wargaCount} Warga
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Transaksi Kas:</div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">
                    {stagedBackup.kasCount} Catatan
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Agenda Kegiatan:</div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">
                    {stagedBackup.agendaCount} Agenda
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400">Notulen Rapat:</div>
                  <div className="font-bold text-slate-800 dark:text-white text-sm">
                    {stagedBackup.notulenCount} Notulen
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <strong>Perhatian:</strong> Menerapkan file ini akan menggantikan data aktif saat ini di server dan website dengan data dari file cadangan ini.
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStagedBackup(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menerapkan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Terapkan & Perbarui Web</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
