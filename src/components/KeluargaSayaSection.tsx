import React, { useState, useMemo, useRef } from 'react';
import { Warga, AnggotaKeluarga, UserSession, HubunganKeluarga, JenisKelamin, StatusKkAnggota } from '../types';
import {
  Users,
  UserPlus,
  Home,
  User,
  Phone,
  Calendar,
  Briefcase,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  Baby,
  GraduationCap,
  Sparkles,
  Info,
  Upload,
  FileText,
  Eye,
  Camera,
  MapPin,
  Check,
  AlertTriangle
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { ImagePreviewModal } from './ImagePreviewModal';

interface KeluargaSayaSectionProps {
  wargaList: Warga[];
  currentUser: UserSession | null;
  daftarGang?: string[];
  onUpdateWarga: (id: string, updates: Partial<Warga>) => Promise<void>;
  onOpenLogin?: () => void;
  onOpenBayarKas?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const HUBUNGAN_OPTIONS: HubunganKeluarga[] = [
  'Istri',
  'Anak',
  'Orang Tua',
  'Mertua',
  'Famili Lain',
  'Lainnya'
];

const PENDIDIKAN_OPTIONS = [
  'Belum / Tidak Sekolah',
  'PAUD / TK',
  'SD / MI Sederajat',
  'SMP / MTs Sederajat',
  'SMA / SMK / MA Sederajat',
  'Diploma (D1 - D3)',
  'Sarjana (S1 / D4)',
  'Magister (S2)',
  'Doktor (S3)',
  'Lainnya'
];

const PEKERJAAN_SUGGESTIONS = [
  'Pelajar / Siswa',
  'Mahasiswa',
  'Ibu Rumah Tangga',
  'Karyawan Swasta',
  'Wiraswasta / Usahawan',
  'PNS / ASN / PPPK',
  'Buruh Harian Lepas',
  'TNI / POLRI',
  'Guru / Tenaga Pengajar',
  'Tenaga Medis / Kesehatan',
  'Pensiunan',
  'Belum / Tidak Bekerja'
];

export const KeluargaSayaSection: React.FC<KeluargaSayaSectionProps> = ({
  wargaList,
  currentUser,
  daftarGang,
  onUpdateWarga,
  onOpenLogin,
  onOpenBayarKas,
  onNavigateTab
}) => {
  // Find the matching Warga record for current logged-in user
  const myWarga = useMemo(() => {
    if (!currentUser) return null;
    const cleanUserAddr = currentUser.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');
    return (
      wargaList.find(w => w.id === currentUser.id) ||
      wargaList.find(w => w.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '') === cleanUserAddr) ||
      null
    );
  }, [wargaList, currentUser]);

  // Dynamic Gangs integrated from AppSettings (daftarGang) & existing records
  const activeGangs = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(daftarGang) && daftarGang.length > 0) {
      daftarGang.forEach(g => {
        if (g && typeof g === 'string' && g.trim() && !list.includes(g.trim())) {
          list.push(g.trim());
        }
      });
    }
    // Include any gang names present in wargaList
    if (Array.isArray(wargaList)) {
      wargaList.forEach(w => {
        if (w.gang && typeof w.gang === 'string' && w.gang.trim() && !list.includes(w.gang.trim())) {
          list.push(w.gang.trim());
        }
      });
    }
    // Include current warga's assigned gang
    if (myWarga?.gang && typeof myWarga.gang === 'string' && myWarga.gang.trim() && !list.includes(myWarga.gang.trim())) {
      list.push(myWarga.gang.trim());
    }
    return list.length > 0
      ? list
      : ['Gang Ceria', 'Gang Kembar', 'Gang Fuchsia', 'Gang Alamanda', 'Gang Alaska'];
  }, [daftarGang, wargaList, myWarga?.gang]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnggotaId, setEditingAnggotaId] = useState<string | null>(null);
  const [isDeletingAnggota, setIsDeletingAnggota] = useState<AnggotaKeluarga | null>(null);
  const [isEditKkOpen, setIsEditKkOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string;
  }>({ isOpen: false, title: '' });

  // Uploading state
  const [isUploadingKtpKk, setIsUploadingKtpKk] = useState<string | null>(null);

  // Hidden input refs for file selection
  const ktpInputRef = useRef<HTMLInputElement>(null);
  const kkInputRef = useRef<HTMLInputElement>(null);
  const anggotaKtpInputRef = useRef<HTMLInputElement>(null);
  const anggotaKkInputRef = useRef<HTMLInputElement>(null);

  // Form State for Anggota Keluarga
  const [formData, setFormData] = useState<Partial<AnggotaKeluarga>>({
    nama: '',
    hubungan: 'Istri',
    jenisKelamin: 'Perempuan',
    statusKk: 'Menginduk',
    noKk: '',
    fotoKk: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    pendidikan: 'SMA / SMK / MA Sederajat',
    noHp: '',
    keterangan: '',
    isKtpTalagasari: true,
    fotoKtp: ''
  });

  // Form State for Kepala Keluarga quick edit (Contact, NIK, KK, and Address)
  const [kkFormData, setKkFormData] = useState({
    nama: '',
    noHp: '',
    noKk: '',
    nik: '',
    alamatGsb: '',
    gang: activeGangs[0] || 'Gang Ceria',
    alamatKtp: '',
    isKtpTalagasari: true,
    statusTinggal: 'Permanen' as 'Permanen' | 'Kontrak',
    jenisKelamin: 'Laki-laki' as JenisKelamin | string,
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    pendidikan: '',
    keterangan: '',
    fotoKtp: '',
    fotoKk: ''
  });

  const anggotaList: AnggotaKeluarga[] = useMemo(() => {
    return Array.isArray(myWarga?.anggotaKeluarga) ? myWarga.anggotaKeluarga : [];
  }, [myWarga]);

  const totalJiwa = 1 + anggotaList.length;

  // Not logged in view
  if (!currentUser) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Akses Data Keluarga Terproteksi</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          Untuk mengelola anggota keluarga, mengedit alamat, dan mengunggah dokumen KTP/KK secara mandiri, silakan masuk terlebih dahulu menggunakan akun alamat rumah GSB Anda (contoh: F2/22).
        </p>
        {onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk / Login Akun Rumah</span>
          </button>
        )}
      </div>
    );
  }

  // Super Admin view (Super Admin is a system account, not a citizen dwelling unit)
  if (currentUser?.isSuperAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-purple-200 dark:border-purple-800 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 mx-auto flex items-center justify-center mb-4 border border-purple-200 dark:border-purple-800">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 text-xs font-bold rounded-full mb-2 border border-purple-200 dark:border-purple-800">
          Mode Super Administrator Aktif
        </div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">Akun Pengelola Tingkat Tertinggi</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          Akun <strong>superadmin</strong> adalah akun sistem tingkat root sebagai proteksi darurat dan tidak terdaftar sebagai data rumah warga. Untuk mengelola data warga, KK, atau anggota keluarga warga, silakan gunakan menu <strong>Kelola Warga</strong>.
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('kelola-warga')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Buka Menu Kelola Warga</span>
          </button>
        )}
      </div>
    );
  }

  // Warga record not found in database
  if (!myWarga) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-slate-800 dark:text-white">Data Rumah Belum Terdaftar</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          Data untuk alamat rumah <strong>{currentUser.alamatGsb}</strong> belum ditemukan di database RT 001. Silakan hubungi pengurus RT.
        </p>
      </div>
    );
  }

  // Handlers for File Upload (KTP & KK)
  const handleUploadKtpKk = async (type: 'ktp' | 'kk', file: File) => {
    if (!myWarga) return;
    setIsUploadingKtpKk(type);
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      const updates = type === 'ktp' ? { fotoKtp: base64 } : { fotoKk: base64 };
      await onUpdateWarga(myWarga.id, updates);
      setStatusMessage({
        type: 'success',
        text: `Dokumen ${type === 'ktp' ? 'KTP Kepala Keluarga' : 'Kartu Keluarga (KK)'} berhasil diunggah dan disimpan!`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setStatusMessage({
        type: 'error',
        text: 'Gagal mengunggah dokumen: ' + (err?.message || err)
      });
    } finally {
      setIsUploadingKtpKk(null);
    }
  };

  const handleDeleteDokumenKk = async (type: 'ktp' | 'kk') => {
    if (!myWarga) return;
    if (!window.confirm(`Hapus berkas ${type === 'ktp' ? 'KTP Kepala Keluarga' : 'Kartu Keluarga'}?`)) return;

    setIsSaving(true);
    try {
      const updates = type === 'ktp' ? { fotoKtp: '' } : { fotoKk: '' };
      await onUpdateWarga(myWarga.id, updates);
      setStatusMessage({
        type: 'success',
        text: `Berkas ${type === 'ktp' ? 'KTP' : 'KK'} berhasil dihapus.`
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal menghapus berkas: ' + (err?.message || err)
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Anggota KTP
  const handleUploadAnggotaKtp = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setFormData(prev => ({ ...prev, fotoKtp: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar: ' + (err?.message || err));
    }
  };

  // Upload Anggota KK (Wajib untuk Beda KK / Keluarga Lain)
  const handleUploadAnggotaKk = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setFormData(prev => ({ ...prev, fotoKk: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar KK anggota: ' + (err?.message || err));
    }
  };

  const handleOpenAdd = () => {
    setEditingAnggotaId(null);
    const kepalaKtpStatus = myWarga?.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true;
    setFormData({
      nama: '',
      hubungan: 'Istri',
      jenisKelamin: 'Perempuan',
      statusKk: 'Menginduk',
      noKk: myWarga?.noKk || '',
      fotoKk: '',
      nik: '',
      tempatLahir: '',
      tanggalLahir: '',
      pekerjaan: '',
      pendidikan: 'SMA / SMK / MA Sederajat',
      noHp: '',
      keterangan: '',
      isKtpTalagasari: kepalaKtpStatus,
      fotoKtp: ''
    });
    setIsModalOpen(true);
    setStatusMessage(null);
  };

  const handleOpenEdit = (item: AnggotaKeluarga) => {
    setEditingAnggotaId(item.id);
    const kepalaKtpStatus = myWarga?.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true;
    const isIstriOrAnak = item.hubungan === 'Istri' || item.hubungan === 'Anak';
    const resolvedStatusKk: StatusKkAnggota = item.statusKk 
      ? item.statusKk 
      : (isIstriOrAnak ? 'Menginduk' : (item.noKk || item.fotoKk ? 'Beda KK' : 'Menginduk'));

    setFormData({
      nama: item.nama || '',
      hubungan: item.hubungan || 'Istri',
      jenisKelamin: item.jenisKelamin || 'Perempuan',
      statusKk: resolvedStatusKk,
      noKk: resolvedStatusKk === 'Beda KK' ? (item.noKk || '') : (myWarga?.noKk || ''),
      fotoKk: item.fotoKk || '',
      nik: item.nik || '',
      tempatLahir: item.tempatLahir || (item.tempatTanggalLahir ? item.tempatTanggalLahir.split(',')[0]?.trim() : ''),
      tanggalLahir: item.tanggalLahir || '',
      pekerjaan: item.pekerjaan || item.pekerjaanPendidikan || '',
      pendidikan: item.pendidikan || 'SMA / SMK / MA Sederajat',
      noHp: item.noHp || '',
      keterangan: item.keterangan || '',
      isKtpTalagasari: resolvedStatusKk === 'Beda KK' 
        ? (item.isKtpTalagasari !== undefined ? item.isKtpTalagasari : kepalaKtpStatus)
        : kepalaKtpStatus,
      fotoKtp: item.fotoKtp || ''
    });
    setIsModalOpen(true);
    setStatusMessage(null);
  };

  const handleOpenEditKk = () => {
    setKkFormData({
      nama: myWarga.nama || '',
      noHp: myWarga.noHp || '',
      noKk: myWarga.noKk || '',
      nik: myWarga.nik || '',
      alamatGsb: myWarga.alamatGsb || '',
      gang: myWarga.gang || activeGangs[0] || 'Gang Ceria',
      alamatKtp: myWarga.alamatKtp || '',
      isKtpTalagasari: myWarga.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true,
      statusTinggal: myWarga.statusTinggal || 'Permanen',
      jenisKelamin: myWarga.jenisKelamin || 'Laki-laki',
      tempatLahir: myWarga.tempatLahir || '',
      tanggalLahir: myWarga.tanggalLahir || '',
      pekerjaan: myWarga.pekerjaan || '',
      pendidikan: myWarga.pendidikan || '',
      keterangan: myWarga.keterangan || '',
      fotoKtp: myWarga.fotoKtp || '',
      fotoKk: myWarga.fotoKk || ''
    });
    setIsEditKkOpen(true);
    setStatusMessage(null);
  };

  // Save Kepala Keluarga: contact, mandatory NIK, mandatory KK, and address
  const handleSaveKk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myWarga) return;

    const cleanNik = kkFormData.nik.replace(/\D/g, '').trim();
    const cleanKk = kkFormData.noKk.replace(/\D/g, '').trim();

    // Mandatory NIK validation (Requirement 3)
    if (!cleanNik) {
      setStatusMessage({
        type: 'error',
        text: 'Nomor NIK Kepala Keluarga wajib diisi!'
      });
      return;
    }
    if (cleanNik.length !== 16) {
      setStatusMessage({
        type: 'error',
        text: `Nomor NIK Kepala Keluarga wajib tepat 16 digit angka (saat ini ${cleanNik.length} digit).`
      });
      return;
    }

    // Mandatory KK validation (Requirement 3)
    if (!cleanKk) {
      setStatusMessage({
        type: 'error',
        text: 'Nomor Kartu Keluarga (KK) wajib diisi!'
      });
      return;
    }
    if (cleanKk.length !== 16) {
      setStatusMessage({
        type: 'error',
        text: `Nomor Kartu Keluarga (KK) wajib tepat 16 digit angka (saat ini ${cleanKk.length} digit).`
      });
      return;
    }

    // Address validation
    if (!kkFormData.alamatGsb.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Alamat Rumah GSB tidak boleh kosong.'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Sinkronisasi status KTP seluruh anggota keluarga yang menginduk KK ke status KTP Kepala Keluarga
      const updatedAnggotaList = (myWarga.anggotaKeluarga || []).map(a => {
        if (a.statusKk !== 'Beda KK') {
          return {
            ...a,
            isKtpTalagasari: kkFormData.isKtpTalagasari
          };
        }
        return a;
      });

      await onUpdateWarga(myWarga.id, {
        noHp: kkFormData.noHp.trim(),
        noKk: cleanKk,
        nik: cleanNik,
        alamatGsb: kkFormData.alamatGsb.trim(),
        gang: kkFormData.gang,
        alamatKtp: kkFormData.alamatKtp.trim(),
        isKtpTalagasari: kkFormData.isKtpTalagasari,
        anggotaKeluarga: updatedAnggotaList,
        statusTinggal: kkFormData.statusTinggal,
        jenisKelamin: kkFormData.jenisKelamin,
        tempatLahir: kkFormData.tempatLahir.trim(),
        tanggalLahir: kkFormData.tanggalLahir,
        pekerjaan: kkFormData.pekerjaan.trim(),
        pendidikan: kkFormData.pendidikan,
        keterangan: kkFormData.keterangan.trim()
      });
      setIsEditKkOpen(false);
      setStatusMessage({
        type: 'success',
        text: 'Data Kepala Keluarga, Alamat & NIK/KK berhasil diperbarui!'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: 'Gagal memperbarui data: ' + (err?.message || err)
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Anggota Keluarga (Add / Edit)
  const handleSaveAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myWarga) return;

    if (!formData.nama || !formData.nama.trim()) {
      setStatusMessage({ type: 'error', text: 'Nama lengkap anggota keluarga wajib diisi.' });
      return;
    }

    const cleanNik = formData.nik ? formData.nik.replace(/\D/g, '').trim() : '';
    if (cleanNik && cleanNik.length !== 16) {
      setStatusMessage({
        type: 'error',
        text: `Jika NIK diisi, nomor NIK harus 16 digit angka (saat ini ${cleanNik.length} digit).`
      });
      return;
    }

    // Validasi Kartu Keluarga (Requirement 1 & 2):
    // 1. Jika Istri & Anak: statusKk otomatis Menginduk ke KK Kepala Keluarga.
    // 2. Jika Keluarga Lain Beda KK: WAJIB isi nomor KK 16 digit dan WAJIB upload foto KK.
    const isBedaKk = formData.statusKk === 'Beda KK';
    const cleanNoKkAnggota = formData.noKk ? formData.noKk.replace(/\D/g, '').trim() : '';
    const kepalaKtpStatus = myWarga.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true;
    const resolvedIsKtpTalagasari = isBedaKk
      ? (formData.isKtpTalagasari !== undefined ? formData.isKtpTalagasari : true)
      : kepalaKtpStatus;

    if (isBedaKk) {
      if (!cleanNoKkAnggota) {
        setStatusMessage({
          type: 'error',
          text: `Untuk anggota keluarga lain yang berstatus Beda KK (${formData.nama}), Nomor Kartu Keluarga (KK) 16 digit WAJIB diisi!`
        });
        return;
      }
      if (cleanNoKkAnggota.length !== 16) {
        setStatusMessage({
          type: 'error',
          text: `Nomor Kartu Keluarga (KK) anggota harus tepat 16 digit angka (saat ini ${cleanNoKkAnggota.length} digit).`
        });
        return;
      }
      if (!formData.fotoKk) {
        setStatusMessage({
          type: 'error',
          text: `Untuk anggota keluarga lain yang berstatus Beda KK (${formData.nama}), berkas/foto Kartu Keluarga (KK) WAJIB diunggah!`
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const currentAnggota = Array.isArray(myWarga.anggotaKeluarga) ? [...myWarga.anggotaKeluarga] : [];

      if (editingAnggotaId) {
        // Update existing member
        const updatedList = currentAnggota.map(a => {
          if (a.id === editingAnggotaId) {
            return {
              ...a,
              nama: formData.nama!.trim(),
              hubungan: formData.hubungan || 'Istri',
              jenisKelamin: formData.jenisKelamin || 'Perempuan',
              statusKk: (isBedaKk ? 'Beda KK' : 'Menginduk') as StatusKkAnggota,
              noKk: isBedaKk ? cleanNoKkAnggota : (myWarga.noKk || undefined),
              fotoKk: isBedaKk ? (formData.fotoKk || undefined) : undefined,
              nik: cleanNik || undefined,
              tempatLahir: formData.tempatLahir ? formData.tempatLahir.trim() : undefined,
              tanggalLahir: formData.tanggalLahir || undefined,
              pekerjaan: formData.pekerjaan ? formData.pekerjaan.trim() : undefined,
              pendidikan: formData.pendidikan || undefined,
              tempatTanggalLahir: formData.tempatLahir && formData.tanggalLahir ? `${formData.tempatLahir}, ${formData.tanggalLahir}` : undefined,
              pekerjaanPendidikan: formData.pekerjaan && formData.pendidikan ? `${formData.pekerjaan} / ${formData.pendidikan}` : (formData.pekerjaan || formData.pendidikan),
              noHp: formData.noHp ? formData.noHp.trim() : undefined,
              keterangan: formData.keterangan ? formData.keterangan.trim() : undefined,
              isKtpTalagasari: resolvedIsKtpTalagasari,
              fotoKtp: formData.fotoKtp || undefined
            };
          }
          return a;
        });

        await onUpdateWarga(myWarga.id, { anggotaKeluarga: updatedList });
        setStatusMessage({
          type: 'success',
          text: `Data anggota keluarga "${formData.nama}" berhasil diperbarui!`
        });
      } else {
        // Add new member
        const newAnggota: AnggotaKeluarga = {
          id: `ak-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          nama: formData.nama!.trim(),
          hubungan: formData.hubungan || 'Istri',
          jenisKelamin: formData.jenisKelamin || 'Perempuan',
          statusKk: (isBedaKk ? 'Beda KK' : 'Menginduk') as StatusKkAnggota,
          noKk: isBedaKk ? cleanNoKkAnggota : (myWarga.noKk || undefined),
          fotoKk: isBedaKk ? (formData.fotoKk || undefined) : undefined,
          nik: cleanNik || undefined,
          tempatLahir: formData.tempatLahir ? formData.tempatLahir.trim() : undefined,
          tanggalLahir: formData.tanggalLahir || undefined,
          pekerjaan: formData.pekerjaan ? formData.pekerjaan.trim() : undefined,
          pendidikan: formData.pendidikan || undefined,
          tempatTanggalLahir: formData.tempatLahir && formData.tanggalLahir ? `${formData.tempatLahir}, ${formData.tanggalLahir}` : undefined,
          pekerjaanPendidikan: formData.pekerjaan && formData.pendidikan ? `${formData.pekerjaan} / ${formData.pendidikan}` : (formData.pekerjaan || formData.pendidikan),
          noHp: formData.noHp ? formData.noHp.trim() : undefined,
          keterangan: formData.keterangan ? formData.keterangan.trim() : undefined,
          isKtpTalagasari: resolvedIsKtpTalagasari,
          fotoKtp: formData.fotoKtp || undefined
        };

        const updatedList = [...currentAnggota, newAnggota];
        await onUpdateWarga(myWarga.id, { anggotaKeluarga: updatedList });
        setStatusMessage({
          type: 'success',
          text: `Anggota keluarga "${newAnggota.nama}" (${newAnggota.hubungan}) berhasil ditambahkan!`
        });
      }

      setIsModalOpen(false);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving family member:', err);
      setStatusMessage({
        type: 'error',
        text: 'Gagal menyimpan anggota keluarga: ' + (err?.message || err)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!myWarga || !isDeletingAnggota) return;

    setIsSaving(true);
    try {
      const currentAnggota = Array.isArray(myWarga.anggotaKeluarga) ? [...myWarga.anggotaKeluarga] : [];
      const updatedList = currentAnggota.filter(a => a.id !== isDeletingAnggota.id);

      await onUpdateWarga(myWarga.id, { anggotaKeluarga: updatedList });
      setStatusMessage({
        type: 'success',
        text: `Anggota keluarga "${isDeletingAnggota.nama}" telah dihapus dari daftar.`
      });
      setIsDeletingAnggota(null);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error deleting family member:', err);
      setStatusMessage({
        type: 'error',
        text: 'Gagal menghapus anggota keluarga: ' + (err?.message || err)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getHubunganBadgeStyle = (hubungan: string) => {
    switch (hubungan) {
      case 'Istri':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900';
      case 'Anak':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
      case 'Orang Tua':
      case 'Mertua':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
      case 'Famili Lain':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast / Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-medium border shadow-xs animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Layanan Mandiri Warga RT 001 RW 004</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Data Anggota Keluarga Rumah {myWarga.alamatGsb}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Kelola data keluarga, perbarui alamat & kontak, serta unggah berkas KTP & Kartu Keluarga (KK) secara mandiri. Data langsung terhubung ke sensus RT 001 RW 004.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>+ Tambah Anggota Keluarga</span>
          </button>

          {onOpenBayarKas && (
            <button
              onClick={onOpenBayarKas}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
            >
              <span>Bayar Kas Rumah</span>
            </button>
          )}
        </div>
      </div>

      {/* Information Cards: Ringkasan Rumah & Total Jiwa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>Alamat Rumah GSB</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
            {myWarga.alamatGsb}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{myWarga.gang} • RT 001 / RW 004</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-2xs">
          <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Jiwa di Rumah</span>
          </div>
          <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mt-1">
            {totalJiwa} <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">Jiwa</span>
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
            1 KK + {anggotaList.length} Anggota Keluarga
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Status KTP KK</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {myWarga.isKtpTalagasari ? (
              <span className="text-emerald-600 dark:text-emerald-400">KTP Talagasari</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">Luar Desa</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Status Tinggal: {myWarga.statusTinggal}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>Dokumen Terunggah</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                myWarga.fotoKtp
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              KTP {myWarga.fotoKtp ? '✓' : '✗'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                myWarga.fotoKk
                  ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              }`}
            >
              KK {myWarga.fotoKk ? '✓' : '✗'}
            </span>
          </div>
          <div
            className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 cursor-pointer hover:underline"
            onClick={handleOpenEditKk}
          >
            Perbarui Data & Alamat
          </div>
        </div>
      </div>

      {/* SECTION: Upload KTP & Kartu Keluarga (KK) Kepala Keluarga (Requirement 2) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Dokumen Kependudukan Rumah (KTP & Kartu Keluarga)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unggah foto atau scan KTP Kepala Keluarga dan Kartu Keluarga (KK) asli untuk verifikasi data resmi RT
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Format: JPG / PNG / WEBP (Maks. 5MB, otomatis dikompres aman)
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: KTP Kepala Keluarga */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    KTP Kepala Keluarga
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    NIK: {myWarga.nik || 'Belum diisi'}
                  </p>
                </div>
              </div>

              {myWarga.fotoKtp ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <Check className="w-3 h-3" />
                  <span>KTP Terunggah</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Belum Upload KTP</span>
                </span>
              )}
            </div>

            {/* Content area: thumbnail or upload dropzone */}
            {myWarga.fotoKtp ? (
              <div className="space-y-2.5">
                <div
                  onClick={() =>
                    setPreviewImage({
                      isOpen: true,
                      title: `KTP - ${myWarga.nama}`,
                      subtitle: `NIK: ${myWarga.nik} • Blok ${myWarga.alamatGsb}`,
                      imageUrl: myWarga.fotoKtp
                    })
                  }
                  className="relative group h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 cursor-pointer shadow-xs"
                >
                  <img
                    src={myWarga.fotoKtp}
                    alt="KTP Kepala Keluarga"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>Klik untuk Melihat Penuh</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        isOpen: true,
                        title: `KTP - ${myWarga.nama}`,
                        subtitle: `NIK: ${myWarga.nik} • Blok ${myWarga.alamatGsb}`,
                        imageUrl: myWarga.fotoKtp
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => ktpInputRef.current?.click()}
                    disabled={isUploadingKtpKk === 'ktp'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingKtpKk === 'ktp' ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDokumenKk('ktp')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => ktpInputRef.current?.click()}
                className="h-36 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-slate-800/60 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
              >
                <Camera className="w-8 h-8 text-slate-400 mb-1.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isUploadingKtpKk === 'ktp' ? 'Sedang Mengunggah & Memproses...' : 'Klik atau Tarik Foto KTP ke Sini'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Foto jelas atau scan KTP asli Kepala Keluarga
                </span>
              </div>
            )}

            <input
              type="file"
              ref={ktpInputRef}
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadKtpKk('ktp', file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Card 2: Kartu Keluarga (KK) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Kartu Keluarga (KK)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    No. KK: {myWarga.noKk || 'Belum diisi'}
                  </p>
                </div>
              </div>

              {myWarga.fotoKk ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                  <Check className="w-3 h-3" />
                  <span>KK Terunggah</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Belum Upload KK</span>
                </span>
              )}
            </div>

            {/* Content area: thumbnail or upload dropzone */}
            {myWarga.fotoKk ? (
              <div className="space-y-2.5">
                <div
                  onClick={() =>
                    setPreviewImage({
                      isOpen: true,
                      title: `Kartu Keluarga - Rumah ${myWarga.alamatGsb}`,
                      subtitle: `Nomor KK: ${myWarga.noKk} • Kepala Keluarga: ${myWarga.nama}`,
                      imageUrl: myWarga.fotoKk
                    })
                  }
                  className="relative group h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 cursor-pointer shadow-xs"
                >
                  <img
                    src={myWarga.fotoKk}
                    alt="Kartu Keluarga"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-semibold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>Klik untuk Melihat Penuh</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage({
                        isOpen: true,
                        title: `Kartu Keluarga - Rumah ${myWarga.alamatGsb}`,
                        subtitle: `Nomor KK: ${myWarga.noKk} • Kepala Keluarga: ${myWarga.nama}`,
                        imageUrl: myWarga.fotoKk
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => kkInputRef.current?.click()}
                    disabled={isUploadingKtpKk === 'kk'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingKtpKk === 'kk' ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDokumenKk('kk')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => kkInputRef.current?.click()}
                className="h-36 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/60 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
              >
                <Camera className="w-8 h-8 text-slate-400 mb-1.5" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isUploadingKtpKk === 'kk' ? 'Sedang Mengunggah & Memproses...' : 'Klik atau Tarik Foto Kartu Keluarga (KK)'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Foto jelas atau scan Kartu Keluarga asli
                </span>
              </div>
            )}

            <input
              type="file"
              ref={kkInputRef}
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadKtpKk('kk', file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </div>

      {/* Info Box: Iuran Kas RT tidak berlipat */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">Informasi Sensus Kependudukan Mandiri:</p>
          <p className="text-blue-700 dark:text-blue-300 leading-relaxed text-[11px]">
            Penambahan anggota keluarga <strong>tidak menambah atau melipatgandakan tagihan iuran kas RT</strong>. Iuran kas RT 001 tetap dihitung per rumah/KK. Data anggota keluarga hanya digunakan untuk keperluan pendataan kependudukan, bansos, dan sensus warga RT 001/RW 004.
          </p>
        </div>
      </div>

      {/* Section 1: Data Kepala Keluarga (KK) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              <User className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Kepala Keluarga (Penanggung Jawab Rumah)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Warga terdaftar sebagai pemilik atau penyewa alamat rumah ini
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenEditKk}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>Perbarui Data, Alamat & NIK/KK</span>
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Nama Lengkap & Jabatan</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm block mt-0.5">
              {myWarga.nama}
            </span>
            {myWarga.jabatan && myWarga.jabatan !== 'Warga' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {myWarga.jabatan}
              </span>
            )}
            {myWarga.jenisKelamin && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {myWarga.jenisKelamin}
                {myWarga.tempatLahir && ` • Lahir di ${myWarga.tempatLahir}`}
                {myWarga.tanggalLahir && ` (${myWarga.tanggalLahir})`}
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">NIK & No KK (Wajib)</span>
            <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 space-y-0.5">
              <div className="flex items-center gap-1">
                <span>NIK:</span>
                <span className={myWarga.nik ? 'font-bold' : 'text-rose-500 italic'}>
                  {myWarga.nik || 'Belum diisi *'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">KK:</span>
                <span className={myWarga.noKk ? 'font-bold text-slate-700 dark:text-slate-300' : 'text-rose-500 italic'}>
                  {myWarga.noKk || 'Belum diisi *'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">No. HP / WhatsApp & Pekerjaan</span>
            <div className="mt-0.5 space-y-0.5">
              {myWarga.noHp ? (
                <a
                  href={`https://wa.me/${myWarga.noHp.replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-blue-600 dark:text-blue-400 hover:underline font-semibold block"
                >
                  {myWarga.noHp}
                </a>
              ) : (
                <span className="text-slate-400 italic block">Belum diisi</span>
              )}
              <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                {myWarga.pekerjaan || 'Pekerjaan belum diisi'}
                {myWarga.pendidikan && ` • ${myWarga.pendidikan}`}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Alamat Sesuai KTP & GSB</span>
            <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 leading-relaxed line-clamp-2" title={myWarga.alamatKtp}>
              {myWarga.alamatKtp || 'Alamat KTP belum diisi'}
            </p>
            <div className="text-[10px] text-slate-400 mt-1">
              Rumah GSB: <strong>{myWarga.alamatGsb}</strong> ({myWarga.gang})
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Daftar Anggota Keluarga */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Daftar Anggota Keluarga ({anggotaList.length} Orang)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Istri, anak, orang tua, mertua, atau famili yang bertempat tinggal di rumah ini
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota Keluarga</span>
          </button>
        </div>

        {/* Empty State */}
        {anggotaList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Belum Ada Anggota Keluarga yang Didaftarkan
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda tinggal bersama istri, anak, atau sanak keluarga di rumah {myWarga.alamatGsb}? Silakan klik tombol di bawah untuk mendaftarkan mereka secara mandiri.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Anggota Keluarga Pertama</span>
            </button>
          </div>
        ) : (
          /* Cards Grid of Family Members */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anggotaList.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4.5 shadow-2xs hover:shadow-xs transition-all space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Row: Avatar, Name, Relationship Badge & Actions */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          item.jenisKelamin === 'Perempuan'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {item.hubungan === 'Anak' ? (
                          <Baby className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                          {item.nama}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getHubunganBadgeStyle(
                              item.hubungan
                            )}`}
                          >
                            {item.hubungan}
                          </span>
                          {item.jenisKelamin && (
                            <span className="text-[10px] text-slate-400">
                              • {item.jenisKelamin}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                              item.isKtpTalagasari
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {item.isKtpTalagasari ? 'KTP Talagasari' : 'KTP Luar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data Anggota Keluarga"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsDeletingAnggota(item)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Anggota Keluarga"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Details with separated Pekerjaan & Pendidikan (Requirement 6) */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70">
                    {item.nik && (
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-slate-400 font-sans text-[10px]">NIK:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{item.nik}</span>
                      </div>
                    )}

                    {(item.tempatLahir || item.tanggalLahir || item.tempatTanggalLahir) && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {item.tempatLahir && item.tanggalLahir
                            ? `${item.tempatLahir}, ${item.tanggalLahir}`
                            : item.tempatLahir || item.tanggalLahir || item.tempatTanggalLahir}
                        </span>
                      </div>
                    )}

                    {item.pekerjaan && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Pekerjaan: <strong>{item.pekerjaan}</strong></span>
                      </div>
                    )}

                    {item.pendidikan && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Pendidikan: <strong>{item.pendidikan}</strong></span>
                      </div>
                    )}

                    {!item.pekerjaan && !item.pendidikan && item.pekerjaanPendidikan && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.pekerjaanPendidikan}</span>
                      </div>
                    )}

                    {item.noHp && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <a
                          href={`https://wa.me/${item.noHp.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                        >
                          {item.noHp}
                        </a>
                      </div>
                    )}

                    {item.keterangan && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 italic">
                        Catatan: {item.keterangan}
                      </div>
                    )}
                  </div>

                  {/* Status Kartu Keluarga (KK) Badge & Preview (Requirement 1 & 2) */}
                  <div className="pt-1 flex items-center justify-between gap-1 flex-wrap">
                    {item.statusKk === 'Beda KK' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <FileText className="w-3 h-3 text-purple-600" />
                        <span>Beda KK: {item.noKk ? item.noKk : 'KK Terpisah'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        <span>KK Menginduk (No: {myWarga.noKk || item.noKk || 'Satu KK'})</span>
                      </span>
                    )}

                    {item.statusKk === 'Beda KK' ? (
                      item.fotoKk ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              isOpen: true,
                              title: `Kartu Keluarga Terpisah - ${item.nama}`,
                              subtitle: `Beda KK • No. KK: ${item.noKk || '-'}`,
                              imageUrl: item.fotoKk
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-purple-600" />
                          <span>Lihat KK Anggota</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Wajib Upload KK</span>
                        </span>
                      )
                    ) : (
                      myWarga.fotoKk ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              isOpen: true,
                              title: `Kartu Keluarga - ${myWarga.nama} (Kepala Keluarga)`,
                              subtitle: `Menginduk KK • No. KK: ${myWarga.noKk || '-'}`,
                              imageUrl: myWarga.fotoKk
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>Lihat KK (Menginduk)</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          KK Kepala Keluarga belum diunggah
                        </span>
                      )
                    )}
                  </div>

                  {/* KTP Anggota Badge & Preview (Requirement 4 & 7) */}
                  <div className="pt-1 flex items-center justify-between">
                    {item.fotoKtp ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            isOpen: true,
                            title: `KTP Anggota - ${item.nama}`,
                            subtitle: `${item.hubungan} • NIK: ${item.nik || '-'}`,
                            imageUrl: item.fotoKtp
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <Eye className="w-3 h-3" />
                        <span>KTP Terunggah (Lihat)</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <AlertTriangle className="w-3 h-3 text-slate-400" />
                        <span>Belum Upload KTP</span>
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400">
                      Rumah: {myWarga.alamatGsb}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Hubungan: {item.hubungan}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tersinkron RT</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Tambah / Edit Anggota Keluarga (Separated Pekerjaan & Pendidikan, KTP upload, Status KTP) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-colors animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <UserPlus className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {editingAnggotaId ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga Baru'}
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Alamat Rumah: {myWarga.alamatGsb} ({myWarga.gang})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAnggota} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Anggota Keluarga *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahmawati"
                  value={formData.nama || ''}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Hubungan Keluarga & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hubungan dengan KK *
                  </label>
                  <select
                    value={formData.hubungan || 'Istri'}
                    onChange={e => {
                      const newHub = e.target.value as HubunganKeluarga;
                      const isIstriOrAnak = newHub === 'Istri' || newHub === 'Anak';
                      let autoJk = formData.jenisKelamin;
                      if (newHub === 'Istri') autoJk = 'Perempuan';

                      const newStatusKk = isIstriOrAnak ? 'Menginduk' : 'Beda KK';
                      const kepalaKtpStatus = myWarga?.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true;

                      setFormData(prev => ({
                        ...prev,
                        hubungan: newHub,
                        jenisKelamin: autoJk,
                        // Sesuai Aturan 1 & 2:
                        // Istri & anak menginduk otomatis ke KK kepala keluarga
                        // Keluarga lain serumah beda KK otomatis switched ke Beda KK
                        statusKk: newStatusKk,
                        noKk: isIstriOrAnak ? (myWarga?.noKk || '') : (prev.statusKk === 'Beda KK' ? prev.noKk : ''),
                        fotoKk: isIstriOrAnak ? '' : prev.fotoKk,
                        isKtpTalagasari: newStatusKk === 'Menginduk' ? kepalaKtpStatus : prev.isKtpTalagasari
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {HUBUNGAN_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin *
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, jenisKelamin: 'Laki-laki' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer ${
                        formData.jenisKelamin === 'Laki-laki'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Laki-laki
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, jenisKelamin: 'Perempuan' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer ${
                        formData.jenisKelamin === 'Perempuan'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Perempuan
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Kartu Keluarga (KK): Menginduk vs Beda KK (Requirement 1 & 2) */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs mb-1.5">
                    Status Kartu Keluarga (KK) Anggota *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const kepalaKtpStatus = myWarga?.isKtpTalagasari !== undefined ? myWarga.isKtpTalagasari : true;
                        setFormData(prev => ({
                          ...prev,
                          statusKk: 'Menginduk',
                          noKk: myWarga?.noKk || '',
                          fotoKk: '',
                          isKtpTalagasari: kepalaKtpStatus
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        formData.statusKk !== 'Beda KK'
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${formData.statusKk !== 'Beda KK' ? 'bg-blue-600' : 'bg-slate-300'}`} />
                        <span>Menginduk KK Kepala Keluarga</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Untuk istri & anak (Satu KK dengan Kepala Keluarga)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          statusKk: 'Beda KK',
                          noKk: prev.statusKk === 'Beda KK' ? prev.noKk : ''
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        formData.statusKk === 'Beda KK'
                          ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-500 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${formData.statusKk === 'Beda KK' ? 'bg-purple-600' : 'bg-slate-300'}`} />
                        <span>Beda KK (Keluarga Lain Serumah)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Famili/Orang Tua/Lainnya (Wajib No. KK & Upload KK)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Info Panel if Menginduk */}
                {formData.statusKk !== 'Beda KK' ? (
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-900/50 text-[11px] text-blue-900 dark:text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-200">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>KK Otomatis Menginduk ke Kepala Keluarga ({myWarga.nama})</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-600 dark:text-slate-400">Nomor KK Kepala Keluarga:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {myWarga.noKk || '(Belum diset di profil KK)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-400">Berkas Dokumen KK:</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {myWarga.fotoKk ? '✓ Berkas KK Kepala Keluarga Terhubung' : '⚠ Berkas KK Kepala Keluarga belum diunggah'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                      * Sesuai ketentuan: Istri dan anak tinggal satu rumah menginduk ke KK Kepala Keluarga tanpa perlu unggah berkas terpisah.
                    </p>
                  </div>
                ) : (
                  /* Mandatory KK Input & Upload for Beda KK */
                  <div className="space-y-3 p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/80">
                    <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-200 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Keluarga Lain Beda KK: Wajib Mengisi No. KK & Upload Berkas KK</span>
                    </div>

                    {/* Input No KK */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          Nomor Kartu Keluarga (KK) Anggota *
                        </label>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                          {formData.noKk?.replace(/\D/g, '').length || 0}/16 Digit
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={16}
                        placeholder="3603xxxxxxxxxxxx"
                        value={formData.noKk || ''}
                        onChange={e => setFormData({ ...formData, noKk: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full px-3 py-2 border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono focus:ring-2 focus:ring-purple-500 text-xs"
                      />
                    </div>

                    {/* Upload Foto KK Anggota */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Foto / Berkas Kartu Keluarga (KK) Wajib *</span>
                        </label>
                        {formData.fotoKk && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            ✓ Berkas Terunggah
                          </span>
                        )}
                      </div>

                      {formData.fotoKk ? (
                        <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-800">
                          <img
                            src={formData.fotoKk}
                            alt="Preview KK Anggota"
                            className="w-16 h-12 object-cover rounded-lg border border-purple-300 shadow-2xs cursor-pointer"
                            onClick={() =>
                              setPreviewImage({
                                isOpen: true,
                                title: `KK Anggota - ${formData.nama || 'Anggota'}`,
                                subtitle: `Beda KK • No. KK: ${formData.noKk || '-'}`,
                                imageUrl: formData.fotoKk
                              })
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                              Dokumen KK Terlampir
                            </div>
                            <div className="text-[10px] text-slate-400">Klik gambar untuk melihat</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => anggotaKkInputRef.current?.click()}
                              className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg cursor-pointer"
                            >
                              Ganti
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, fotoKk: '' })}
                              className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => anggotaKkInputRef.current?.click()}
                          className="w-full py-2.5 px-3 border border-dashed border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 cursor-pointer text-xs font-semibold"
                        >
                          <Upload className="w-4 h-4 text-purple-600" />
                          <span>Pilih Berkas Foto Kartu Keluarga (KK)</span>
                        </button>
                      )}

                      <input
                        type="file"
                        ref={anggotaKkInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAnggotaKk(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* NIK & Status KTP Talagasari vs Luar (Requirement 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NIK / No. KIA (16 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="3603xxxxxxxxxxxx"
                    value={formData.nik || ''}
                    onChange={e => setFormData({ ...formData, nik: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Opsional jika anak belum ber-KTP
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Status KTP Anggota *
                    </label>
                    {formData.statusKk !== 'Beda KK' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                        <Lock className="w-3 h-3" />
                        Terkunci (Menginduk KK)
                      </span>
                    )}
                  </div>

                  {formData.statusKk !== 'Beda KK' ? (
                    // KK Menginduk -> KTP otomatis sama dengan Kepala Keluarga dan TERKUNCI / TIDAK BISA DIUBAH
                    <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            myWarga.isKtpTalagasari ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {myWarga.isKtpTalagasari ? 'KTP Ds. Talagasari' : 'KTP Luar Desa Talagasari'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          Sama dengan KK
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Karena Kartu Keluarga (KK) menginduk ke Kepala Keluarga ({myWarga.nama}), domisili KTP otomatis sama ({myWarga.isKtpTalagasari ? 'Ds. Talagasari' : 'Luar Desa'}) dan tidak dapat diubah.
                      </p>
                    </div>
                  ) : (
                    // Beda KK -> Bisa dipilih bebas
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isKtpTalagasari: true })}
                        className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer ${
                          formData.isKtpTalagasari
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        KTP Talagasari
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isKtpTalagasari: false })}
                        className={`py-2 px-2.5 rounded-xl border text-center font-bold text-xs transition-colors cursor-pointer ${
                          !formData.isKtpTalagasari
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        KTP Luar Desa
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tempat & Tanggal Lahir (Popuplist Date Picker) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Tangerang"
                    value={formData.tempatLahir || ''}
                    onChange={e => setFormData({ ...formData, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Lahir (Popuplist Date)
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalLahir || ''}
                    onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Pemisahan Field Pekerjaan & Pendidikan (Requirement 6) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pekerjaan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pelajar, Karyawan, IRT"
                    value={formData.pekerjaan || ''}
                    onChange={e => setFormData({ ...formData, pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Pelajar', 'Karyawan', 'Ibu Rumah Tangga', 'Belum Bekerja'].map(sug => (
                      <button
                        type="button"
                        key={sug}
                        onClick={() => setFormData({ ...formData, pekerjaan: sug })}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] hover:bg-indigo-50"
                      >
                        +{sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pendidikan Terakhir / Saat Ini
                  </label>
                  <select
                    value={formData.pendidikan || 'SMA / SMK / MA Sederajat'}
                    onChange={e => setFormData({ ...formData, pendidikan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {PENDIDIKAN_OPTIONS.map(pend => (
                      <option key={pend} value={pend}>
                        {pend}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* No. WhatsApp & Keterangan Tambahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={formData.noHp || ''}
                    onChange={e => setFormData({ ...formData, noHp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Opsional</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Batita, Balita, Pelajar, Lansia"
                    value={formData.keterangan || ''}
                    onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-400 self-center">Pilihan cepat:</span>
                    {['Batita (<3 thn)', 'Balita (<5 thn)', 'Pelajar TK/SD', 'Pelajar SMP/SMA', 'Mahasiswa', 'Lansia'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFormData({ ...formData, keterangan: tag })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-600"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Opsional</span>
                </div>
              </div>

              {/* Upload KTP Anggota Keluarga (Requirement 4) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Upload Foto KTP Anggota (Opsional)</span>
                  </label>
                  {formData.fotoKtp && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Foto Terpilih
                    </span>
                  )}
                </div>

                {formData.fotoKtp ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.fotoKtp}
                      alt="Preview KTP"
                      className="w-16 h-12 object-cover rounded-lg border border-slate-300 shadow-2xs"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => anggotaKtpInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer"
                      >
                        Ganti Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, fotoKtp: '' })}
                        className="px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => anggotaKtpInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:border-indigo-500 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Pilih Berkas Foto KTP Anggota</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={anggotaKtpInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadAnggotaKtp(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Menyimpan...' : editingAnggotaId ? 'Simpan Perubahan' : 'Tambahkan ke Keluarga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Data NIK, KK, Alamat & Kontak Kepala Keluarga (Requirements 1 & 3) */}
      {isEditKkOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors animate-in fade-in max-h-[94vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Perbarui Data NIK, KK, Alamat & Kontak Kepala Keluarga
                  </h3>
                  <p className="text-[11px] text-blue-100">
                    Alamat Rumah: {myWarga.alamatGsb} • RT 001 RW 004
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditKkOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKk} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Nama Kepala Keluarga (Read-Only) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kepala Keluarga (Tercatat Resmi)
                </label>
                <input
                  type="text"
                  disabled
                  value={myWarga.nama}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nama KK ditetapkan oleh pengurus RT. Jika perlu koreksi ejaan nama, silakan hubungi pengurus RT.
                </span>
              </div>

              {/* Requirement 3: NIK & KK WAJIB 16 Digit */}
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Identitas Resmi (Wajib Diisi 16 Digit Angka) *</span>
                  </span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                    Wajib Sesuai KTP / KK
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor NIK Kepala Keluarga *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3603xxxxxxxxxxxx"
                      value={kkFormData.nik}
                      onChange={e =>
                        setKkFormData({
                          ...kkFormData,
                          nik: e.target.value.replace(/[^0-9]/g, '')
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                        kkFormData.nik.length === 16
                          ? 'border-emerald-500 text-emerald-900 dark:text-emerald-100'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className={kkFormData.nik.length === 16 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {kkFormData.nik.length === 16 ? '✓ Lengkap 16 digit' : 'Wajib 16 digit angka'}
                      </span>
                      <span className="font-mono text-slate-400">({kkFormData.nik.length}/16)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor Kartu Keluarga (KK) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3603xxxxxxxxxxxx"
                      value={kkFormData.noKk}
                      onChange={e =>
                        setKkFormData({
                          ...kkFormData,
                          noKk: e.target.value.replace(/[^0-9]/g, '')
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white ${
                        kkFormData.noKk.length === 16
                          ? 'border-emerald-500 text-emerald-900 dark:text-emerald-100'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    />
                    <div className="flex justify-between items-center text-[10px] mt-0.5">
                      <span className={kkFormData.noKk.length === 16 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {kkFormData.noKk.length === 16 ? '✓ Lengkap 16 digit' : 'Wajib 16 digit angka'}
                      </span>
                      <span className="font-mono text-slate-400">({kkFormData.noKk.length}/16)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 1: Edit Alamat Rumah GSB & Gang */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>Alamat Hunian Rumah di RT 001 *</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nomor / Blok Rumah GSB *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: F2/22 atau F222"
                      value={kkFormData.alamatGsb}
                      onChange={e => setKkFormData({ ...kkFormData, alamatGsb: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pilihan Gang RT 001 *
                    </label>
                    <select
                      value={kkFormData.gang}
                      onChange={e => setKkFormData({ ...kkFormData, gang: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {activeGangs.map(g => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Hunian Tinggal *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKkFormData({ ...kkFormData, statusTinggal: 'Permanen' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                        kkFormData.statusTinggal === 'Permanen'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Permanen (Milik Pribadi)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKkFormData({ ...kkFormData, statusTinggal: 'Kontrak' })}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                        kkFormData.statusTinggal === 'Kontrak'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Kontrak / Sewa
                    </button>
                  </div>
                </div>
              </div>

              {/* Requirement 1: Alamat Lengkap Sesuai KTP */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap Sesuai KTP *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ketik alamat lengkap sesuai KTP. Jika mencakup Talagasari, otomatis terhitung KTP Ds. Talagasari."
                  value={kkFormData.alamatKtp}
                  onChange={e => {
                    const text = e.target.value;
                    const isTalaga = /talagasari/i.test(text);
                    setKkFormData({
                      ...kkFormData,
                      alamatKtp: text,
                      isKtpTalagasari: isTalaga
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Radio Status KTP Talagasari vs Luar */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Status KTP:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="kkIsTalagasari"
                    checked={kkFormData.isKtpTalagasari === true}
                    onChange={() => setKkFormData({ ...kkFormData, isKtpTalagasari: true })}
                    className="text-emerald-600"
                  />
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">KTP Ds. Talagasari</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="kkIsTalagasari"
                    checked={kkFormData.isKtpTalagasari === false}
                    onChange={() => setKkFormData({ ...kkFormData, isKtpTalagasari: false })}
                    className="text-amber-600"
                  />
                  <span className="text-amber-700 dark:text-amber-300 font-bold">Luar Desa Talagasari</span>
                </label>
              </div>

              {/* Kontak WhatsApp & Tempat, Tanggal Lahir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. WhatsApp / HP Kepala Keluarga *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789"
                    value={kkFormData.noHp}
                    onChange={e => setKkFormData({ ...kkFormData, noHp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={kkFormData.jenisKelamin}
                    onChange={e => setKkFormData({ ...kkFormData, jenisKelamin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Tempat & Tanggal Lahir (Popuplist Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Tangerang"
                    value={kkFormData.tempatLahir}
                    onChange={e => setKkFormData({ ...kkFormData, tempatLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Lahir (Popuplist Date)
                  </label>
                  <input
                    type="date"
                    value={kkFormData.tanggalLahir}
                    onChange={e => setKkFormData({ ...kkFormData, tanggalLahir: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pekerjaan & Pendidikan Kepala Keluarga */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pekerjaan Kepala Keluarga
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Karyawan Swasta, Wiraswasta"
                    value={kkFormData.pekerjaan}
                    onChange={e => setKkFormData({ ...kkFormData, pekerjaan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pendidikan Terakhir
                  </label>
                  <select
                    value={kkFormData.pendidikan || 'SMA / SMK / MA Sederajat'}
                    onChange={e => setKkFormData({ ...kkFormData, pendidikan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {PENDIDIKAN_OPTIONS.map(pend => (
                      <option key={pend} value={pend}>
                        {pend}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)"
                  value={kkFormData.keterangan}
                  onChange={e => setKkFormData({ ...kkFormData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditKkOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Pembaruan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Anggota Keluarga */}
      {isDeletingAnggota && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-5 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Hapus Anggota Keluarga?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yakin ingin menghapus <strong>{isDeletingAnggota.nama}</strong> ({isDeletingAnggota.hubungan}) dari daftar anggota keluarga rumah {myWarga.alamatGsb}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeletingAnggota(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom & View Modal */}
      <ImagePreviewModal
        isOpen={previewImage.isOpen}
        onClose={() => setPreviewImage({ isOpen: false, title: '' })}
        title={previewImage.title}
        subtitle={previewImage.subtitle}
        imageUrl={previewImage.imageUrl}
      />
    </div>
  );
};
