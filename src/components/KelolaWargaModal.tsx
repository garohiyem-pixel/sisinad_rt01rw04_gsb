import React, { useState, useRef, useMemo } from 'react';
import { Warga, AnggotaKeluarga, sortWargaNewestFirst, StatusKkAnggota } from '../types';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Search, 
  Check, 
  X, 
  ShieldCheck, 
  Home, 
  Phone,
  Filter,
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Eye,
  Camera,
  Upload,
  Calendar,
  Briefcase,
  AlertCircle,
  GraduationCap,
  Lock,
  Table,
  LayoutGrid
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';
import { ImagePreviewModal } from './ImagePreviewModal';

interface KelolaWargaModalProps {
  wargaList: Warga[];
  daftarGang?: string[];
  onAddWarga: (warga: Warga) => Promise<void>;
  onUpdateWarga: (id: string, warga: Partial<Warga>) => Promise<void>;
  onDeleteWarga: (id: string) => Promise<void>;
  onOpenUbahGang?: () => void;
}

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

export const KelolaWargaModal: React.FC<KelolaWargaModalProps> = ({
  wargaList,
  daftarGang,
  onAddWarga,
  onUpdateWarga,
  onDeleteWarga,
  onOpenUbahGang
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wargaToDelete, setWargaToDelete] = useState<Warga | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGang, setFilterGang] = useState('ALL');
  const [filterDokumen, setFilterDokumen] = useState<'ALL' | 'BELUM_KTP' | 'BELUM_KK' | 'LENGKAP'>('ALL');
  const [selectedJabatanPreset, setSelectedJabatanPreset] = useState<string>('Warga');
  const [customJabatan, setCustomJabatan] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl?: string;
  }>({ isOpen: false, title: '' });

  // File upload hidden refs for admin form
  const ktpAdminInputRef = useRef<HTMLInputElement>(null);
  const kkAdminInputRef = useRef<HTMLInputElement>(null);
  const anggotaKtpAdminInputRef = useRef<HTMLInputElement>(null);
  const anggotaKkAdminInputRef = useRef<HTMLInputElement>(null);

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

  const [formData, setFormData] = useState<Partial<Warga>>({
    nik: '',
    noKk: '',
    nama: '',
    alamatGsb: '',
    gang: activeGangs[0] || 'Gang Ceria',
    alamatKtp: '',
    isKtpTalagasari: true,
    noHp: '',
    statusTinggal: 'Permanen',
    isAdmin: false,
    jabatan: 'Warga',
    password: 'warga',
    jenisKelamin: 'Laki-laki',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    pendidikan: 'SMA / SMK / MA Sederajat',
    keterangan: '',
    fotoKtp: '',
    fotoKk: '',
    anggotaKeluarga: []
  });

  const [expandedWargaId, setExpandedWargaId] = useState<string | null>(null);
  const [isAddingAnggota, setIsAddingAnggota] = useState<boolean>(false);
  const [editingAnggotaId, setEditingAnggotaId] = useState<string | null>(null);

  // Sub-form Anggota with separated Pekerjaan & Pendidikan and KTP fields
  const [anggotaForm, setAnggotaForm] = useState<{
    nama: string;
    hubungan: string;
    statusKk: StatusKkAnggota;
    noKk: string;
    fotoKk: string;
    jenisKelamin: string;
    nik: string;
    tempatLahir: string;
    tanggalLahir: string;
    pekerjaan: string;
    pendidikan: string;
    noHp: string;
    keterangan: string;
    isKtpTalagasari: boolean;
    fotoKtp: string;
  }>({
    nama: '',
    hubungan: 'Istri',
    statusKk: 'Menginduk',
    noKk: '',
    fotoKk: '',
    jenisKelamin: 'Perempuan',
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

  const handleStartAddAnggota = () => {
    setEditingAnggotaId(null);
    const kepalaKtp = formData.isKtpTalagasari !== undefined ? !!formData.isKtpTalagasari : true;
    setAnggotaForm({
      nama: '',
      hubungan: 'Istri',
      statusKk: 'Menginduk',
      noKk: formData.noKk || '',
      fotoKk: '',
      jenisKelamin: 'Perempuan',
      nik: '',
      tempatLahir: '',
      tanggalLahir: '',
      pekerjaan: '',
      pendidikan: 'SMA / SMK / MA Sederajat',
      noHp: '',
      keterangan: '',
      isKtpTalagasari: kepalaKtp,
      fotoKtp: ''
    });
    setIsAddingAnggota(true);
  };

  const handleStartEditAnggota = (anggota: AnggotaKeluarga) => {
    setEditingAnggotaId(anggota.id);
    const kepalaKtp = formData.isKtpTalagasari !== undefined ? !!formData.isKtpTalagasari : true;
    const isIstriOrAnak = anggota.hubungan === 'Istri' || anggota.hubungan === 'Anak';
    const resolvedStatusKk: StatusKkAnggota = anggota.statusKk
      ? anggota.statusKk
      : (isIstriOrAnak ? 'Menginduk' : (anggota.noKk || anggota.fotoKk ? 'Beda KK' : 'Menginduk'));

    setAnggotaForm({
      nama: anggota.nama || '',
      hubungan: anggota.hubungan || 'Anak',
      statusKk: resolvedStatusKk,
      noKk: resolvedStatusKk === 'Beda KK' ? (anggota.noKk || '') : (formData.noKk || ''),
      fotoKk: anggota.fotoKk || '',
      jenisKelamin: anggota.jenisKelamin || 'Laki-laki',
      nik: anggota.nik || '',
      tempatLahir: anggota.tempatLahir || (anggota.tempatTanggalLahir ? anggota.tempatTanggalLahir.split(',')[0]?.trim() : ''),
      tanggalLahir: anggota.tanggalLahir || '',
      pekerjaan: anggota.pekerjaan || anggota.pekerjaanPendidikan || '',
      pendidikan: anggota.pendidikan || 'SMA / SMK / MA Sederajat',
      noHp: anggota.noHp || '',
      keterangan: anggota.keterangan || '',
      isKtpTalagasari: resolvedStatusKk === 'Beda KK'
        ? (anggota.isKtpTalagasari !== undefined ? anggota.isKtpTalagasari : kepalaKtp)
        : kepalaKtp,
      fotoKtp: anggota.fotoKtp || ''
    });
    setIsAddingAnggota(true);
  };

  const handleCancelAnggota = () => {
    setIsAddingAnggota(false);
    setEditingAnggotaId(null);
  };

  const handleSaveAnggota = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!anggotaForm.nama.trim()) {
      alert('Nama anggota keluarga wajib diisi.');
      return;
    }

    const cleanNik = anggotaForm.nik.replace(/\D/g, '').trim();
    if (cleanNik && cleanNik.length !== 16) {
      alert(`NIK anggota harus 16 digit angka (saat ini ${cleanNik.length} digit).`);
      return;
    }

    // Validasi Kartu Keluarga (Requirement 1 & 2):
    const isBedaKk = anggotaForm.statusKk === 'Beda KK';
    const cleanNoKkAnggota = anggotaForm.noKk.replace(/\D/g, '').trim();

    if (isBedaKk) {
      if (!cleanNoKkAnggota) {
        alert(`Untuk anggota keluarga lain yang berstatus Beda KK (${anggotaForm.nama}), Nomor Kartu Keluarga (KK) 16 digit WAJIB diisi.`);
        return;
      }
      if (cleanNoKkAnggota.length !== 16) {
        alert(`Nomor KK anggota harus tepat 16 digit angka (saat ini ${cleanNoKkAnggota.length} digit).`);
        return;
      }
      if (!anggotaForm.fotoKk) {
        alert(`Untuk anggota keluarga lain yang berstatus Beda KK (${anggotaForm.nama}), berkas/foto Kartu Keluarga (KK) WAJIB diunggah.`);
        return;
      }
    }

    const statusKkVal: StatusKkAnggota = isBedaKk ? 'Beda KK' : 'Menginduk';
    const noKkVal = isBedaKk ? cleanNoKkAnggota : (formData.noKk ? formData.noKk.replace(/\D/g, '').trim() : undefined);
    const fotoKkVal = isBedaKk ? (anggotaForm.fotoKk || undefined) : undefined;
    const kepalaKtp = formData.isKtpTalagasari !== undefined ? !!formData.isKtpTalagasari : true;
    const resolvedIsKtpTalagasari = isBedaKk ? anggotaForm.isKtpTalagasari : kepalaKtp;

    if (editingAnggotaId) {
      setFormData(prev => ({
        ...prev,
        anggotaKeluarga: (prev.anggotaKeluarga || []).map(a => 
          a.id === editingAnggotaId 
            ? {
                ...a,
                nama: anggotaForm.nama.trim(),
                hubungan: anggotaForm.hubungan,
                jenisKelamin: anggotaForm.jenisKelamin,
                statusKk: statusKkVal,
                noKk: noKkVal,
                fotoKk: fotoKkVal,
                nik: cleanNik || undefined,
                tempatLahir: anggotaForm.tempatLahir.trim() || undefined,
                tanggalLahir: anggotaForm.tanggalLahir || undefined,
                pekerjaan: anggotaForm.pekerjaan.trim() || undefined,
                pendidikan: anggotaForm.pendidikan || undefined,
                tempatTanggalLahir: anggotaForm.tempatLahir && anggotaForm.tanggalLahir ? `${anggotaForm.tempatLahir}, ${anggotaForm.tanggalLahir}` : undefined,
                pekerjaanPendidikan: anggotaForm.pekerjaan && anggotaForm.pendidikan ? `${anggotaForm.pekerjaan} / ${anggotaForm.pendidikan}` : (anggotaForm.pekerjaan || anggotaForm.pendidikan),
                noHp: anggotaForm.noHp.trim() || undefined,
                keterangan: anggotaForm.keterangan.trim() || undefined,
                isKtpTalagasari: resolvedIsKtpTalagasari,
                fotoKtp: anggotaForm.fotoKtp || undefined
              }
            : a
        )
      }));
    } else {
      const newAnggota: AnggotaKeluarga = {
        id: `ak-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama: anggotaForm.nama.trim(),
        hubungan: anggotaForm.hubungan,
        jenisKelamin: anggotaForm.jenisKelamin,
        statusKk: statusKkVal,
        noKk: noKkVal,
        fotoKk: fotoKkVal,
        nik: cleanNik || undefined,
        tempatLahir: anggotaForm.tempatLahir.trim() || undefined,
        tanggalLahir: anggotaForm.tanggalLahir || undefined,
        pekerjaan: anggotaForm.pekerjaan.trim() || undefined,
        pendidikan: anggotaForm.pendidikan || undefined,
        tempatTanggalLahir: anggotaForm.tempatLahir && anggotaForm.tanggalLahir ? `${anggotaForm.tempatLahir}, ${anggotaForm.tanggalLahir}` : undefined,
        pekerjaanPendidikan: anggotaForm.pekerjaan && anggotaForm.pendidikan ? `${anggotaForm.pekerjaan} / ${anggotaForm.pendidikan}` : (anggotaForm.pekerjaan || anggotaForm.pendidikan),
        noHp: anggotaForm.noHp.trim() || undefined,
        keterangan: anggotaForm.keterangan.trim() || undefined,
        isKtpTalagasari: resolvedIsKtpTalagasari,
        fotoKtp: anggotaForm.fotoKtp || undefined
      };
      setFormData(prev => ({
        ...prev,
        anggotaKeluarga: [...(prev.anggotaKeluarga || []), newAnggota]
      }));
    }

    setIsAddingAnggota(false);
    setEditingAnggotaId(null);
  };

  const handleDeleteAnggota = (id: string) => {
    setFormData(prev => ({
      ...prev,
      anggotaKeluarga: (prev.anggotaKeluarga || []).filter(a => a.id !== id)
    }));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSubmitError(null);
    setSelectedJabatanPreset('Warga');
    setCustomJabatan('');
    setFormData({
      nik: '',
      noKk: '',
      nama: '',
      alamatGsb: '',
      gang: activeGangs[0] || 'Gang 1',
      alamatKtp: 'Perum Griya Sutera Balaraja, RT 001/004, Ds. Talagasari, Kec. Balaraja',
      isKtpTalagasari: true,
      noHp: '08',
      statusTinggal: 'Permanen',
      isAdmin: false,
      jabatan: 'Warga',
      password: 'warga',
      jenisKelamin: 'Laki-laki',
      tempatLahir: '',
      tanggalLahir: '',
      pekerjaan: '',
      pendidikan: 'SMA / SMK / MA Sederajat',
      keterangan: '',
      fotoKtp: '',
      fotoKk: '',
      anggotaKeluarga: []
    });
    setIsAddingAnggota(false);
    setEditingAnggotaId(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (w: Warga) => {
    setEditingId(w.id);
    setSubmitError(null);
    const standardPresets = ['Ketua RT', 'Sekretaris RT', 'Bendahara RT', 'Humas RT', 'Warga'];
    if (w.jabatan && standardPresets.includes(w.jabatan)) {
      setSelectedJabatanPreset(w.jabatan);
      setCustomJabatan('');
    } else if (w.jabatan && w.jabatan.trim() !== '') {
      setSelectedJabatanPreset('Lain-lain');
      setCustomJabatan(w.jabatan);
    } else if (w.isAdmin) {
      setSelectedJabatanPreset('Lain-lain');
      setCustomJabatan('Admin RT');
    } else {
      setSelectedJabatanPreset('Warga');
      setCustomJabatan('');
    }
    setFormData({
      ...w,
      jenisKelamin: w.jenisKelamin || 'Laki-laki',
      tempatLahir: w.tempatLahir || '',
      tanggalLahir: w.tanggalLahir || '',
      pekerjaan: w.pekerjaan || '',
      pendidikan: w.pendidikan || 'SMA / SMK / MA Sederajat',
      keterangan: w.keterangan || '',
      fotoKtp: w.fotoKtp || '',
      fotoKk: w.fotoKk || '',
      anggotaKeluarga: Array.isArray(w.anggotaKeluarga) ? [...w.anggotaKeluarga] : []
    });
    setIsAddingAnggota(false);
    setEditingAnggotaId(null);
    setFormOpen(true);
  };

  // Auto-determine whether KTP is Talagasari based on text & sync menginduk family members
  const handleAlamatKtpChange = (text: string) => {
    const isTalaga = /talagasari/i.test(text);
    setFormData(prev => ({
      ...prev,
      alamatKtp: text,
      isKtpTalagasari: isTalaga,
      anggotaKeluarga: (prev.anggotaKeluarga || []).map(ak => 
        ak.statusKk !== 'Beda KK' ? { ...ak, isKtpTalagasari: isTalaga } : ak
      )
    }));
  };

  const handleKepalaKtpStatusChange = (isTalagasari: boolean) => {
    setFormData(prev => ({
      ...prev,
      isKtpTalagasari: isTalagasari,
      anggotaKeluarga: (prev.anggotaKeluarga || []).map(ak => 
        ak.statusKk !== 'Beda KK' ? { ...ak, isKtpTalagasari: isTalagasari } : ak
      )
    }));
  };

  // Upload handler for form (Kepala Keluarga)
  const handleUploadKtpAdmin = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setFormData(prev => ({ ...prev, fotoKtp: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar KTP: ' + (err?.message || err));
    }
  };

  const handleUploadKkAdmin = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setFormData(prev => ({ ...prev, fotoKk: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar KK: ' + (err?.message || err));
    }
  };

  const handleUploadAnggotaKtpAdmin = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setAnggotaForm(prev => ({ ...prev, fotoKtp: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar KTP anggota: ' + (err?.message || err));
    }
  };

  const handleUploadAnggotaKkAdmin = async (file: File) => {
    try {
      const base64 = await compressImageFile(file, 1200, 1200, 0.82);
      setAnggotaForm(prev => ({ ...prev, fotoKk: base64 }));
    } catch (err: any) {
      alert('Gagal memproses gambar KK anggota: ' + (err?.message || err));
    }
  };

  // Submit Handler with Requirement 3 (Kepala Keluarga WAJIB NIK & KK 16 Digit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama?.trim() || !formData.alamatGsb?.trim()) {
      setSubmitError('Nama lengkap dan alamat GSB wajib diisi.');
      return;
    }

    const cleanNik = (formData.nik || '').replace(/\D/g, '').trim();
    const cleanKk = (formData.noKk || '').replace(/\D/g, '').trim();

    // Mandatory NIK & KK check for Kepala Keluarga (Requirement 3)
    if (!cleanNik) {
      setSubmitError('Nomor NIK Kepala Keluarga WAJIB diisi!');
      return;
    }
    if (cleanNik.length !== 16) {
      setSubmitError(`Nomor NIK Kepala Keluarga WAJIB tepat 16 digit angka (saat ini ${cleanNik.length} digit).`);
      return;
    }

    if (!cleanKk) {
      setSubmitError('Nomor Kartu Keluarga (KK) WAJIB diisi!');
      return;
    }
    if (cleanKk.length !== 16) {
      setSubmitError(`Nomor Kartu Keluarga (KK) WAJIB tepat 16 digit angka (saat ini ${cleanKk.length} digit).`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const finalJabatan = selectedJabatanPreset === 'Lain-lain'
      ? (customJabatan.trim() || 'Warga')
      : selectedJabatanPreset;

    const kepalaIsTalagasari = !!formData.isKtpTalagasari;
    const finalAnggotaKeluarga = (formData.anggotaKeluarga || []).map(ak => {
      const isMenginduk = ak.statusKk !== 'Beda KK';
      return isMenginduk ? { ...ak, isKtpTalagasari: kepalaIsTalagasari } : ak;
    });

    const payload: Partial<Warga> = {
      ...formData,
      nik: cleanNik,
      noKk: cleanKk,
      nama: formData.nama.trim(),
      alamatGsb: formData.alamatGsb.trim(),
      jabatan: finalJabatan,
      tempatLahir: formData.tempatLahir?.trim() || undefined,
      pekerjaan: formData.pekerjaan?.trim() || undefined,
      keterangan: formData.keterangan?.trim() || undefined,
      anggotaKeluarga: finalAnggotaKeluarga
    };

    try {
      if (editingId) {
        await onUpdateWarga(editingId, payload);
      } else {
        const newWarga: Warga = {
          id: `w-${Date.now()}`,
          nik: cleanNik,
          noKk: cleanKk,
          nama: formData.nama.trim(),
          alamatGsb: formData.alamatGsb.trim(),
          gang: formData.gang || activeGangs[0] || 'Gang 1',
          alamatKtp: formData.alamatKtp || '',
          isKtpTalagasari: kepalaIsTalagasari,
          noHp: formData.noHp || '',
          statusTinggal: (formData.statusTinggal as any) || 'Permanen',
          isAdmin: !!formData.isAdmin,
          jabatan: finalJabatan,
          password: formData.password || (formData.isAdmin ? 'admin' : 'warga'),
          jenisKelamin: formData.jenisKelamin || 'Laki-laki',
          tempatLahir: formData.tempatLahir?.trim() || undefined,
          tanggalLahir: formData.tanggalLahir || undefined,
          pekerjaan: formData.pekerjaan?.trim() || undefined,
          pendidikan: formData.pendidikan || undefined,
          keterangan: formData.keterangan?.trim() || undefined,
          fotoKtp: formData.fotoKtp || undefined,
          fotoKk: formData.fotoKk || undefined,
          anggotaKeluarga: finalAnggotaKeluarga,
          createdAt: new Date().toISOString()
        };
        await onAddWarga(newWarga);
      }
      setFormOpen(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal menyimpan data warga ke database server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (w: Warga) => {
    setWargaToDelete(w);
  };

  const handleConfirmDelete = async () => {
    if (wargaToDelete) {
      await onDeleteWarga(wargaToDelete.id);
      setWargaToDelete(null);
    }
  };

  // Filter logic including document status (Requirement 7)
  const filteredWarga = wargaList
    .filter(w => {
      if (filterGang !== 'ALL' && w.gang !== filterGang) return false;

      // Filter by document status
      if (filterDokumen === 'BELUM_KTP' && w.fotoKtp) return false;
      if (filterDokumen === 'BELUM_KK' && w.fotoKk) return false;
      if (filterDokumen === 'LENGKAP' && (!w.fotoKtp || !w.fotoKk)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hasMatchingAnggota = Array.isArray(w.anggotaKeluarga) && w.anggotaKeluarga.some(a => 
          (a.nama && a.nama.toLowerCase().includes(q)) ||
          (a.nik && a.nik.includes(q)) ||
          (a.hubungan && a.hubungan.toLowerCase().includes(q)) ||
          (a.pekerjaan && a.pekerjaan.toLowerCase().includes(q)) ||
          (a.pendidikan && a.pendidikan.toLowerCase().includes(q)) ||
          (a.keterangan && a.keterangan.toLowerCase().includes(q))
        );

        return (
          w.nama.toLowerCase().includes(q) ||
          w.alamatGsb.toLowerCase().includes(q) ||
          (w.jabatan && w.jabatan.toLowerCase().includes(q)) ||
          (w.pekerjaan && w.pekerjaan.toLowerCase().includes(q)) ||
          w.nik.includes(q) ||
          w.noKk.includes(q) ||
          hasMatchingAnggota
        );
      }
      return true;
    })
    .sort(sortWargaNewestFirst);

  const totalKK = wargaList.length;
  const totalAnggota = wargaList.reduce((acc, w) => acc + (w.anggotaKeluarga?.length || 0), 0);
  const totalJiwa = totalKK + totalAnggota;
  const totalTalagasari = wargaList.filter(w => w.isKtpTalagasari).length;
  const totalLuarDesa = totalKK - totalTalagasari;

  // Document stats
  const totalKtpKK = wargaList.filter(w => !!w.fotoKtp).length;
  const totalKkKK = wargaList.filter(w => !!w.fotoKk).length;
  const totalKtpAnggota = wargaList.reduce((acc, w) => acc + (w.anggotaKeluarga?.filter(a => !!a.fotoKtp).length || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Kelola Data Warga & Dokumen RT 001 RW 004
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Database kependudukan resmi: NIK, No KK, Alamat GSB, Berkas KTP & KK, Jenis Kelamin, Tanggal Lahir, Pekerjaan, dan Pendidikan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUbahGang && (
            <button
              onClick={onOpenUbahGang}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
              title="Ubah Nama Gang RT 001"
            >
              <MapPin className="w-4 h-4" />
              <span>Ubah Nama Gang</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Warga Baru</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik Warga, Jiwa & Dokumen (Requirement 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-blue-600" />
            <span>Kepala Keluarga (KK)</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {totalKK} <span className="text-xs font-normal text-slate-500">Rumah</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{totalTalagasari} Asli • {totalLuarDesa} Luar Desa</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-2xs">
          <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Jiwa Sensus</span>
          </div>
          <div className="text-lg font-bold text-indigo-900 dark:text-indigo-200 mt-1">
            {totalJiwa} <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">Jiwa</span>
          </div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
            {totalKK} KK + {totalAnggota} Anggota Keluarga
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KTP Terunggah</span>
          </div>
          <div className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mt-1">
            {totalKtpKK} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">/ {totalKK} KK</span>
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            +{totalKtpAnggota} KTP Anggota Terunggah
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-sky-100 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 shadow-2xs">
          <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>Berkas KK Terunggah</span>
          </div>
          <div className="text-lg font-bold text-sky-900 dark:text-sky-200 mt-1">
            {totalKkKK} <span className="text-xs font-normal text-sky-600 dark:text-sky-400">/ {totalKK} Rumah</span>
          </div>
          <div className="text-[10px] text-sky-700 dark:text-sky-400 mt-0.5">
            {totalKK - totalKkKK} Rumah Belum Upload KK
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar with Document Status Filters (Requirement 7) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 text-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Gang */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Gang:
            </span>
            {['ALL', ...activeGangs].map(gang => (
              <button
                key={gang}
                onClick={() => setFilterGang(gang)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterGang === gang
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {gang === 'ALL' ? 'Semua Gang' : gang}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari NIK, KK, Nama, Blok GSB..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Dokumen (Requirement 7) & View Mode Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-500" /> Filter Dokumen:
            </span>
            {[
              { id: 'ALL', label: 'Semua Status Dokumen' },
              { id: 'BELUM_KTP', label: 'Belum Upload KTP', badge: `${totalKK - totalKtpKK}` },
              { id: 'BELUM_KK', label: 'Belum Upload KK', badge: `${totalKK - totalKkKK}` },
              { id: 'LENGKAP', label: 'Dokumen KTP & KK Lengkap' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setFilterDokumen(d.id as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterDokumen === d.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{d.label}</span>
                {d.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterDokumen === d.id ? 'bg-indigo-700 text-white' : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                  }`}>
                    {d.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Table vs Cards (Mobile & Tablet) */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
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

      {/* TAMPILAN 1: Mode Kartu (Mobile & Tablet Friendly) */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Menampilkan <strong>{filteredWarga.length}</strong> KK</span>
            <span className="text-[11px]">Sentuh kartu untuk rincian data & dokumen</span>
          </div>

          {filteredWarga.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              Tidak ada data warga yang sesuai dengan kriteria filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWarga.map(w => {
                const isExpanded = expandedWargaId === w.id;
                const totalAnggota = Array.isArray(w.anggotaKeluarga) ? w.anggotaKeluarga.length : 0;
                const isDocComplete = !!w.fotoKtp && !!w.fotoKk;

                return (
                  <div
                    key={w.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      {/* Header Kartu: Alamat & Jabatan */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                              {w.alamatGsb}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {w.gang}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                            {w.nama}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(w)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Edit Data Warga"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(w)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                            title="Hapus Warga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detail Singkat */}
                      <div className="py-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Jabatan:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {w.jabatan || 'Warga'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Status KTP:</span>
                          <span className={`font-semibold ${w.isKtpTalagasari ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {w.isKtpTalagasari ? 'Warga Asli Talagasari' : 'KTP Luar Desa'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Dokumen:</span>
                          <span className={`font-semibold text-[10px] px-1.5 py-0.2 rounded ${
                            isDocComplete ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {isDocComplete ? 'Lengkap (KTP+KK)' : 'Belum Lengkap'}
                          </span>
                        </div>
                        {w.noHp && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">No. HP / WA:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{w.noHp}</span>
                          </div>
                        )}
                      </div>

                      {/* Preview Berkas KTP & KK Button */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        {w.fotoKtp ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                isOpen: true,
                                title: `KTP Kepala Keluarga - ${w.nama}`,
                                subtitle: `NIK: ${w.nik} • Blok ${w.alamatGsb}`,
                                imageUrl: w.fotoKtp
                              })
                            }
                            className="flex-1 py-1 text-center bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          >
                            Lihat KTP
                          </button>
                        ) : (
                          <span className="flex-1 py-1 text-center bg-slate-50 dark:bg-slate-800 text-slate-400 rounded text-[10px]">
                            KTP Kosong
                          </span>
                        )}

                        {w.fotoKk ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                isOpen: true,
                                title: `Kartu Keluarga (KK) - ${w.nama}`,
                                subtitle: `No. KK: ${w.noKk} • Blok ${w.alamatGsb}`,
                                imageUrl: w.fotoKk
                              })
                            }
                            className="flex-1 py-1 text-center bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
                          >
                            Lihat KK
                          </button>
                        ) : (
                          <span className="flex-1 py-1 text-center bg-slate-50 dark:bg-slate-800 text-slate-400 rounded text-[10px]">
                            KK Kosong
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Anggota Keluarga Accordion */}
                    {totalAnggota > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setExpandedWargaId(isExpanded ? null : w.id)}
                          className="w-full text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{totalAnggota} Anggota Keluarga</span>
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 pt-1">
                            {w.anggotaKeluarga?.map((ak, idx) => (
                              <div
                                key={ak.id || idx}
                                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-750 text-[11px]"
                              >
                                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                  <span>{ak.nama}</span>
                                  <span className="text-[10px] text-indigo-600 font-semibold">{ak.hubungan}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  NIK: {ak.nik || '-'} • {ak.jenisKelamin || '-'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN 2: Mode Table Penuh (Desktop & Scrollable) */}
      {viewMode === 'table' && (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Alamat GSB</th>
                <th className="py-3 px-4">Nama Kepala Keluarga</th>
                <th className="py-3 px-4">NIK & No KK</th>
                <th className="py-3 px-4">Dokumen KTP & KK</th>
                <th className="py-3 px-4">Alamat KTP & Status</th>
                <th className="py-3 px-4">No HP</th>
                <th className="py-3 px-4 text-center">Hak Akses</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWarga.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data warga yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredWarga.map(w => (
                  <React.Fragment key={w.id}>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      {/* Alamat GSB */}
                      <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
                        {w.alamatGsb}
                        <span className="block font-sans text-[10px] text-slate-400 font-normal">{w.gang}</span>
                      </td>

                      {/* Nama & Anggota Toggle */}
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                            <span>{w.nama}</span>
                            {w.jabatan && w.jabatan !== 'Warga' && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                w.jabatan === 'Ketua RT'
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : w.jabatan === 'Sekretaris RT'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                                  : w.jabatan === 'Bendahara RT'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : 'bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                              }`}>
                                {w.jabatan}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal flex items-center gap-1.5 flex-wrap">
                            {w.jenisKelamin && <span>{w.jenisKelamin}</span>}
                            {w.pekerjaan && <span>• {w.pekerjaan}</span>}
                          </div>

                          {/* Toggle Anggota Keluarga */}
                          {Array.isArray(w.anggotaKeluarga) && w.anggotaKeluarga.length > 0 ? (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setExpandedWargaId(expandedWargaId === w.id ? null : w.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                                title="Klik untuk melihat rincian anggota keluarga & status dokumennya"
                              >
                                <Users className="w-3 h-3" />
                                <span>+{w.anggotaKeluarga.length} Anggota</span>
                                {expandedWargaId === w.id ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                ({1 + w.anggotaKeluarga.length} Jiwa)
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              1 Jiwa (Tunggal)
                            </div>
                          )}
                        </div>
                      </td>

                      {/* NIK & No KK (Mandatory check) */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <span className="font-sans text-[10px] text-slate-400">NIK:</span>
                          <span className={w.nik ? 'font-bold' : 'text-rose-500 italic'}>
                            {w.nik || 'Belum diisi *'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-sans text-[10px] text-slate-400">KK:</span>
                          <span className={w.noKk ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500 italic'}>
                            {w.noKk || 'Belum diisi *'}
                          </span>
                        </div>
                      </td>

                      {/* Label Dokumen KTP & KK (Requirement 7) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {/* KTP Badge */}
                          {w.fotoKtp ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  isOpen: true,
                                  title: `KTP Kepala Keluarga - ${w.nama}`,
                                  subtitle: `NIK: ${w.nik} • Rumah ${w.alamatGsb}`,
                                  imageUrl: w.fotoKtp
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-pointer transition-colors"
                              title="Klik untuk melihat dokumen KTP"
                            >
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>KTP Terunggah</span>
                              <Eye className="w-3 h-3 ml-0.5 text-emerald-700" />
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>Belum Upload KTP</span>
                            </span>
                          )}

                          {/* KK Badge */}
                          <div>
                            {w.fotoKk ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImage({
                                    isOpen: true,
                                    title: `Kartu Keluarga (KK) - Rumah ${w.alamatGsb}`,
                                    subtitle: `Kepala Keluarga: ${w.nama} • No KK: ${w.noKk}`,
                                    imageUrl: w.fotoKk
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 cursor-pointer transition-colors"
                                title="Klik untuk melihat dokumen KK"
                              >
                                <Check className="w-3 h-3 text-indigo-600" />
                                <span>KK Terunggah</span>
                                <Eye className="w-3 h-3 ml-0.5 text-indigo-700" />
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span>Belum Upload KK</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Alamat KTP & Status Desa */}
                      <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        <div className="line-clamp-2" title={w.alamatKtp}>{w.alamatKtp}</div>
                        <div className="mt-1">
                          {w.isKtpTalagasari ? (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                              Ds. Talagasari
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                              Luar Desa
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            • {w.statusTinggal}
                          </span>
                        </div>
                      </td>

                      {/* No HP */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {w.noHp ? (
                          <a 
                            href={`https://wa.me/${w.noHp.replace(/^0/, '62')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {w.noHp}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Hak Akses */}
                      <td className="py-3 px-4 text-center">
                        {w.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                            <ShieldCheck className="w-3 h-3" /> Admin RT
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">Warga Biasa</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(w)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Edit Data, Alamat & Anggota Keluarga"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(w)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/50 rounded transition-colors cursor-pointer"
                            title="Hapus Warga"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Family Members Row with Document Labels (Requirement 7) */}
                    {expandedWargaId === w.id && Array.isArray(w.anggotaKeluarga) && w.anggotaKeluarga.length > 0 && (
                      <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                        <td colSpan={8} className="p-3 pl-6 sm:pl-8 border-b border-indigo-100 dark:border-indigo-900/40">
                          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                  <Users className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  Rincian Anggota Keluarga di Rumah Blok {w.alamatGsb} ({w.nama})
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  • Total {1 + w.anggotaKeluarga.length} Jiwa
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(w)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Kelola Data Anggota</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                              {w.anggotaKeluarga.map((ak, aIdx) => (
                                <div
                                  key={ak.id || aIdx}
                                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                                          {aIdx + 1}
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-white truncate">
                                          {ak.nama}
                                        </span>
                                      </div>
                                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                                        ak.hubungan === 'Istri'
                                          ? 'bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300'
                                          : ak.hubungan === 'Anak'
                                          ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300'
                                          : ak.hubungan === 'Orang Tua' || ak.hubungan === 'Mertua'
                                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                                      }`}>
                                        {ak.hubungan}
                                      </span>
                                    </div>

                                    {/* Data Lengkap Anggota */}
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-2">
                                      <div className="flex items-center gap-1">
                                        <span>Kelamin:</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{ak.jenisKelamin || '-'}</span>
                                      </div>

                                      {ak.nik && (
                                        <div className="flex items-center gap-1 font-mono">
                                          <span className="font-sans">NIK:</span>
                                          <span className="font-bold text-slate-800 dark:text-slate-200">{ak.nik}</span>
                                        </div>
                                      )}

                                      {(ak.tempatLahir || ak.tanggalLahir || ak.tempatTanggalLahir) && (
                                        <div>
                                          Lahir: {ak.tempatLahir && ak.tanggalLahir ? `${ak.tempatLahir}, ${ak.tanggalLahir}` : (ak.tempatLahir || ak.tanggalLahir || ak.tempatTanggalLahir)}
                                        </div>
                                      )}

                                      {/* Separated Pekerjaan & Pendidikan (Requirement 6) */}
                                      {ak.pekerjaan && (
                                        <div>
                                          Pekerjaan: <span className="font-medium text-slate-700 dark:text-slate-300">{ak.pekerjaan}</span>
                                        </div>
                                      )}

                                      {ak.pendidikan && (
                                        <div>
                                          Pendidikan: <span className="font-medium text-indigo-600 dark:text-indigo-400">{ak.pendidikan}</span>
                                        </div>
                                      )}

                                      {ak.noHp && (
                                        <div>
                                          WA: <a href={`https://wa.me/${ak.noHp.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{ak.noHp}</a>
                                        </div>
                                      )}

                                      {ak.keterangan && <div className="italic text-slate-400">• {ak.keterangan}</div>}
                                    </div>
                                  </div>

                                  {/* Document Label for Anggota (Requirement 7) & Status KK (Requirement 1 & 2) */}
                                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                                    {/* Status Kartu Keluarga (KK) */}
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      {ak.statusKk === 'Beda KK' ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                                          Beda KK ({ak.noKk ? ak.noKk : 'Belum No. KK'})
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                                          KK Menginduk ({w.noKk || ak.noKk || 'Satu KK'})
                                        </span>
                                      )}

                                      {ak.statusKk === 'Beda KK' ? (
                                        ak.fotoKk ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPreviewImage({
                                                isOpen: true,
                                                title: `KK Terpisah - ${ak.nama}`,
                                                subtitle: `Beda KK • No. KK: ${ak.noKk || '-'}`,
                                                imageUrl: ak.fotoKk
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 cursor-pointer"
                                          >
                                            <Eye className="w-2.5 h-2.5 text-purple-600" />
                                            <span>Lihat KK Anggota</span>
                                          </button>
                                        ) : (
                                          <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                                            Wajib Upload KK
                                          </span>
                                        )
                                      ) : (
                                        w.fotoKk ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPreviewImage({
                                                isOpen: true,
                                                title: `KK Kepala Keluarga - ${w.nama}`,
                                                subtitle: `KK Menginduk • No. KK: ${w.noKk || '-'}`,
                                                imageUrl: w.fotoKk
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 cursor-pointer"
                                          >
                                            <Eye className="w-2.5 h-2.5 text-blue-600" />
                                            <span>Lihat KK</span>
                                          </button>
                                        ) : (
                                          <span className="text-[9px] text-slate-400 italic">
                                            KK Belum Diunggah
                                          </span>
                                        )
                                      )}
                                    </div>

                                    {/* KTP Anggota */}
                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                        ak.isKtpTalagasari
                                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                          : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                                      }`}>
                                        {ak.isKtpTalagasari ? 'KTP Talagasari' : 'KTP Luar'}
                                      </span>

                                      {ak.fotoKtp ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setPreviewImage({
                                              isOpen: true,
                                              title: `KTP Anggota - ${ak.nama}`,
                                              subtitle: `${ak.hubungan} • NIK: ${ak.nik || '-'}`,
                                              imageUrl: ak.fotoKtp
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-pointer"
                                        >
                                          <Eye className="w-2.5 h-2.5" />
                                          <span>KTP Terunggah</span>
                                        </button>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 italic">
                                          Belum Upload KTP
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL FORM: Tambah / Edit Warga (Admin RT) (Requirements 3, 5, 6) */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl my-6 transition-colors animate-in fade-in max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {editingId ? 'Edit Data Warga & Anggota Keluarga' : 'Tambah Warga Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    RT 001 RW 004 Perum Griya Sutera Balaraja
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {submitError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
                  {submitError}
                </div>
              )}
              
              {/* Status / Jabatan di Lingkungan RT */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Label Status / Jabatan Warga *
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Tautan otomatis ke Notulen, Agenda & Laporan
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Ketua RT', label: 'Ketua RT', sub: 'Pimpinan RT 001' },
                    { id: 'Sekretaris RT', label: 'Sekretaris RT', sub: 'Notulis & Administrasi' },
                    { id: 'Bendahara RT', label: 'Bendahara RT', sub: 'Keuangan & Kas' },
                    { id: 'Humas RT', label: 'Humas RT', sub: 'Hubungan Masyarakat' },
                    { id: 'Lain-lain', label: 'Lain - lain', sub: 'Ketik jabatan manual' },
                    { id: 'Warga', label: 'Warga', sub: 'Warga Biasa' },
                  ].map(opt => {
                    const isSelected = selectedJabatanPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedJabatanPreset(opt.id);
                          if (['Ketua RT', 'Sekretaris RT', 'Bendahara RT', 'Humas RT'].includes(opt.id)) {
                            setFormData(prev => ({ ...prev, isAdmin: true }));
                          }
                        }}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs font-bold'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-800'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">{opt.label}</div>
                        <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'} mt-0.5 leading-none`}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedJabatanPreset === 'Lain-lain' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ketik Nama Jabatan / Posisi [Input Jabatan]:
                    </label>
                    <input
                      type="text"
                      required={selectedJabatanPreset === 'Lain-lain'}
                      placeholder="Contoh: Admin RT, Koordinator Ronda, Penasihat RT, dll."
                      value={customJabatan}
                      onChange={e => setCustomJabatan(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Checkbox Admin */}
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 flex items-center justify-between gap-3">
                <label htmlFor="isAdminCheck" className="cursor-pointer font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAdminCheck"
                    checked={!!formData.isAdmin}
                    onChange={e => setFormData({ ...formData, isAdmin: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Beri Hak Akses Sebagai Admin RT</span>
                </label>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                  {formData.isAdmin ? 'Akses penuh menu admin & sensus' : 'Akses dashboard warga biasa'}
                </span>
              </div>

              {/* Nama Lengkap & Alamat GSB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Kepala Keluarga *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Kepala Keluarga"
                    value={formData.nama || ''}
                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat GSB (User ID Login) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: F2/22 atau F222"
                    value={formData.alamatGsb || ''}
                    onChange={e => setFormData({ ...formData, alamatGsb: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Gang RT & Status Tinggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Gang RT 001 *</label>
                  <select
                    value={formData.gang || activeGangs[0] || 'Gang 1'}
                    onChange={e => setFormData({ ...formData, gang: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {activeGangs.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Hunian Tinggal *</label>
                  <select
                    value={formData.statusTinggal || 'Permanen'}
                    onChange={e => setFormData({ ...formData, statusTinggal: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="Permanen">Permanen (Pemilik Rumah)</option>
                    <option value="Kontrak">Kontrak / Sewa</option>
                  </select>
                </div>
              </div>

              {/* Requirement 3: NIK & KK Kepala Keluarga WAJIB Diisi 16 Digit */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-2">
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Identitas Resmi Kepala Keluarga (Wajib 16 Digit Angka) *</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      NIK Kepala Keluarga (16 Digit) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3603xxxxxxxxxxxx"
                      value={formData.nik || ''}
                      onChange={e => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>{formData.nik?.length === 16 ? '✓ 16 digit pas' : 'Wajib 16 digit'}</span>
                      <span>({formData.nik?.length || 0}/16)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      No. Kartu Keluarga (KK) (16 Digit) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3603xxxxxxxxxxxx"
                      value={formData.noKk || ''}
                      onChange={e => setFormData({ ...formData, noKk: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>{formData.noKk?.length === 16 ? '✓ 16 digit pas' : 'Wajib 16 digit'}</span>
                      <span>({formData.noKk?.length || 0}/16)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 5: Form Tambah Warga: Jenis Kelamin, Tempat, Tanggal Lahir (Popuplist date), Pekerjaan, Pendidikan, Keterangan Tambahan */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Biodata Tambahan Kepala Keluarga</span>
                </span>

                {/* Jenis Kelamin & Tempat Lahir */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pilihan Jenis Kelamin *
                    </label>
                    <select
                      value={formData.jenisKelamin || 'Laki-laki'}
                      onChange={e => setFormData({ ...formData, jenisKelamin: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Tangerang, Jakarta"
                      value={formData.tempatLahir || ''}
                      onChange={e => setFormData({ ...formData, tempatLahir: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Tanggal Lahir (Popuplist Date) & Pendidikan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tanggal Lahir (Popuplist Date)
                    </label>
                    <input
                      type="date"
                      value={formData.tanggalLahir || ''}
                      onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pendidikan Terakhir
                    </label>
                    <select
                      value={formData.pendidikan || 'SMA / SMK / MA Sederajat'}
                      onChange={e => setFormData({ ...formData, pendidikan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      {PENDIDIKAN_OPTIONS.map(pend => (
                        <option key={pend} value={pend}>{pend}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pekerjaan & Keterangan Tambahan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Karyawan Swasta, Wiraswasta"
                      value={formData.pekerjaan || ''}
                      onChange={e => setFormData({ ...formData, pekerjaan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Keterangan Tambahan
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan tambahan (opsional)"
                      value={formData.keterangan || ''}
                      onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[11px] text-slate-400 self-center">Pilihan cepat:</span>
                      {['Batita (<3 thn)', 'Balita (<5 thn)', 'Pelajar TK/SD', 'Pelajar SMP/SMA', 'Mahasiswa', 'Lansia'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFormData({ ...formData, keterangan: tag })}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-600"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alamat Sesuai KTP */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Sesuai KTP *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ketik alamat lengkap KTP. Jika mengandung kata 'Talagasari' akan otomatis dihitung sebagai warga KTP Ds. Talagasari."
                  value={formData.alamatKtp || ''}
                  onChange={e => handleAlamatKtpChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Radio Status KTP */}
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Status KTP:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isTalagasari"
                    checked={formData.isKtpTalagasari === true}
                    onChange={() => handleKepalaKtpStatusChange(true)}
                    className="text-emerald-600"
                  />
                  <span className="text-emerald-800 dark:text-emerald-300 font-semibold">KTP Ds. Talagasari</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="isTalagasari"
                    checked={formData.isKtpTalagasari === false}
                    onChange={() => handleKepalaKtpStatusChange(false)}
                    className="text-amber-600"
                  />
                  <span className="text-amber-800 dark:text-amber-300 font-semibold">Luar Desa Talagasari</span>
                </label>
              </div>

              {/* No HP & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">No HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={formData.noHp || ''}
                    onChange={e => setFormData({ ...formData, noHp: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password Login</label>
                  <input
                    type="text"
                    placeholder="Default: admin atau warga"
                    value={formData.password || ''}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Berkas KTP & KK Kepala Keluarga di Admin Form */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Berkas Dokumen KTP & KK Kepala Keluarga (Opsional diunggah admin)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* KTP */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">Foto KTP KK</div>
                        <div className="text-[10px] text-slate-400">
                          {formData.fotoKtp ? '✓ Terunggah' : 'Belum ada'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {formData.fotoKtp && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              isOpen: true,
                              title: `Preview KTP - ${formData.nama}`,
                              imageUrl: formData.fotoKtp
                            })
                          }
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Lihat"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => ktpAdminInputRef.current?.click()}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        {formData.fotoKtp ? 'Ganti' : 'Pilih File'}
                      </button>
                    </div>
                  </div>

                  {/* KK */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">Foto Kartu Keluarga</div>
                        <div className="text-[10px] text-slate-400">
                          {formData.fotoKk ? '✓ Terunggah' : 'Belum ada'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {formData.fotoKk && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              isOpen: true,
                              title: `Preview KK - ${formData.nama}`,
                              imageUrl: formData.fotoKk
                            })
                          }
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                          title="Lihat"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => kkAdminInputRef.current?.click()}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                      >
                        {formData.fotoKk ? 'Ganti' : 'Pilih File'}
                      </button>
                    </div>
                  </div>
                </div>

                <input
                  type="file"
                  ref={ktpAdminInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadKtpAdmin(file);
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={kkAdminInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadKkAdmin(file);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Bagian Anggota Keluarga di Bawah KK Ini */}
              <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        Daftar Anggota Keluarga di Alamat Rumah Ini
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Istri, anak, orang tua, mertua, dll. Warga juga bisa menginput mandiri via tab Keluarga Saya.
                      </p>
                    </div>
                  </div>

                  {!isAddingAnggota && (
                    <button
                      type="button"
                      onClick={handleStartAddAnggota}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Anggota</span>
                    </button>
                  )}
                </div>

                {/* Sub-Form Input Anggota Keluarga: Separated Pekerjaan & Pendidikan (Requirement 6), KTP status & upload (Requirement 4) */}
                {isAddingAnggota && (
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                        {editingAnggotaId ? 'Edit Data Anggota Keluarga' : 'Tambah Anggota Keluarga Baru'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelAnggota}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Nama Lengkap Anggota *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap anggota keluarga"
                          value={anggotaForm.nama}
                          onChange={e => setAnggotaForm({ ...anggotaForm, nama: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Hubungan Keluarga *
                        </label>
                        <select
                          value={anggotaForm.hubungan}
                          onChange={e => {
                            const val = e.target.value;
                            let autoJk = anggotaForm.jenisKelamin;
                            if (val === 'Istri') autoJk = 'Perempuan';
                            if (val === 'Suami') autoJk = 'Laki-laki';

                            const isIstriOrAnak = val === 'Istri' || val === 'Anak';
                            const newStatusKk: StatusKkAnggota = isIstriOrAnak ? 'Menginduk' : 'Beda KK';
                            const newNoKk = isIstriOrAnak ? (formData.noKk || '') : (anggotaForm.statusKk === 'Beda KK' ? anggotaForm.noKk : '');
                            const kepalaKtp = formData.isKtpTalagasari !== undefined ? !!formData.isKtpTalagasari : true;

                            setAnggotaForm({
                              ...anggotaForm,
                              hubungan: val,
                              jenisKelamin: autoJk,
                              statusKk: newStatusKk,
                              noKk: newNoKk,
                              fotoKk: isIstriOrAnak ? '' : anggotaForm.fotoKk,
                              isKtpTalagasari: newStatusKk === 'Menginduk' ? kepalaKtp : anggotaForm.isKtpTalagasari
                            });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="Istri">Istri</option>
                          <option value="Anak">Anak</option>
                          <option value="Orang Tua">Orang Tua</option>
                          <option value="Mertua">Mertua</option>
                          <option value="Famili Lain">Famili Lain</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    {/* Status Kartu Keluarga (KK) Admin Section (Requirement 1 & 2) */}
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                          Status Kartu Keluarga (KK) Anggota *
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const kepalaKtp = formData.isKtpTalagasari !== undefined ? !!formData.isKtpTalagasari : true;
                              setAnggotaForm(prev => ({
                                ...prev,
                                statusKk: 'Menginduk',
                                noKk: formData.noKk || '',
                                fotoKk: '',
                                isKtpTalagasari: kepalaKtp
                              }));
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                              anggotaForm.statusKk !== 'Beda KK'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Menginduk KK
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAnggotaForm(prev => ({
                                ...prev,
                                statusKk: 'Beda KK',
                                noKk: prev.statusKk === 'Beda KK' ? prev.noKk : ''
                              }))
                            }
                            className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                              anggotaForm.statusKk === 'Beda KK'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            Beda KK (Serumah)
                          </button>
                        </div>
                      </div>

                      {anggotaForm.statusKk !== 'Beda KK' ? (
                        <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded border border-blue-200/60 dark:border-blue-900/50 flex items-center justify-between">
                          <span>Menginduk KK Kepala Keluarga (No. KK: <strong>{formData.noKk || '(Belum diset)'}</strong>)</span>
                          <span className="text-[10px] text-slate-400">Tidak perlu upload KK terpisah</span>
                        </div>
                      ) : (
                        <div className="space-y-2 p-2 bg-purple-50/50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-800">
                          <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                            <span>Beda KK: Wajib Mengisi Nomor KK & Upload Berkas KK</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Nomor KK Anggota (16 Digit) *</span>
                                <span className="font-mono text-purple-600 font-bold">{anggotaForm.noKk?.replace(/\D/g, '').length || 0}/16</span>
                              </div>
                              <input
                                type="text"
                                maxLength={16}
                                placeholder="3603xxxxxxxxxxxx"
                                value={anggotaForm.noKk}
                                onChange={e => setAnggotaForm({ ...anggotaForm, noKk: e.target.value.replace(/\D/g, '') })}
                                className="w-full px-2.5 py-1 border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div>
                              <span className="block font-semibold text-slate-700 dark:text-slate-300 text-[10px] mb-0.5">Foto/Berkas KK Anggota *</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => anggotaKkAdminInputRef.current?.click()}
                                  className="w-full px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 text-purple-800 dark:text-purple-200 rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{anggotaForm.fotoKk ? '✓ KK Terpilih (Ganti)' : 'Upload Berkas KK'}</span>
                                </button>
                                {anggotaForm.fotoKk && (
                                  <button
                                    type="button"
                                    onClick={() => setAnggotaForm({ ...anggotaForm, fotoKk: '' })}
                                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold p-1"
                                    title="Hapus berkas KK"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                              <input
                                type="file"
                                ref={anggotaKkAdminInputRef}
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadAnggotaKkAdmin(file);
                                  e.target.value = '';
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Jenis Kelamin, NIK & Status KTP Talagasari vs Luar (Requirement 4) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Jenis Kelamin
                        </label>
                        <select
                          value={anggotaForm.jenisKelamin}
                          onChange={e => setAnggotaForm({ ...anggotaForm, jenisKelamin: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          NIK / No KIA (Opsional)
                        </label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="16 Digit NIK"
                          value={anggotaForm.nik}
                          onChange={e => setAnggotaForm({ ...anggotaForm, nik: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            Status KTP Anggota *
                          </label>
                          {anggotaForm.statusKk !== 'Beda KK' && (
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-900 inline-flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              Otomatis (Menginduk KK)
                            </span>
                          )}
                        </div>
                        {anggotaForm.statusKk !== 'Beda KK' ? (
                          <div className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center justify-between cursor-not-allowed">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${formData.isKtpTalagasari ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{formData.isKtpTalagasari ? 'KTP Ds. Talagasari' : 'Luar Desa Talagasari'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Sama dgn KK</span>
                          </div>
                        ) : (
                          <select
                            value={anggotaForm.isKtpTalagasari ? 'true' : 'false'}
                            onChange={e => setAnggotaForm({ ...anggotaForm, isKtpTalagasari: e.target.value === 'true' })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                          >
                            <option value="true">KTP Ds. Talagasari</option>
                            <option value="false">Luar Desa Talagasari</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Tempat & Tanggal Lahir (Popuplist date) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Tempat Lahir
                        </label>
                        <input
                          type="text"
                          placeholder="Tempat lahir"
                          value={anggotaForm.tempatLahir}
                          onChange={e => setAnggotaForm({ ...anggotaForm, tempatLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Tanggal Lahir (Popuplist Date)
                        </label>
                        <input
                          type="date"
                          value={anggotaForm.tanggalLahir}
                          onChange={e => setAnggotaForm({ ...anggotaForm, tanggalLahir: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Requirement 6: Pemisahan Field Pekerjaan & Pendidikan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Pekerjaan (Terpisah)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Pelajar, Mahasiswa, Karyawan"
                          value={anggotaForm.pekerjaan}
                          onChange={e => setAnggotaForm({ ...anggotaForm, pekerjaan: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Pendidikan (Terpisah)
                        </label>
                        <select
                          value={anggotaForm.pendidikan}
                          onChange={e => setAnggotaForm({ ...anggotaForm, pendidikan: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                          {PENDIDIKAN_OPTIONS.map(pend => (
                            <option key={pend} value={pend}>{pend}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* No HP & Keterangan */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          No HP / WhatsApp (Opsional)
                        </label>
                        <input
                          type="text"
                          placeholder="08..."
                          value={anggotaForm.noHp}
                          onChange={e => setAnggotaForm({ ...anggotaForm, noHp: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                          Keterangan Tambahan
                        </label>
                        <input
                          type="text"
                          placeholder="Catatan tambahan"
                          value={anggotaForm.keterangan}
                          onChange={e => setAnggotaForm({ ...anggotaForm, keterangan: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="text-[10px] text-slate-400 self-center">Pilihan cepat:</span>
                          {['Batita (<3 thn)', 'Balita (<5 thn)', 'Pelajar TK/SD', 'Pelajar SMP/SMA', 'Mahasiswa', 'Lansia'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setAnggotaForm({ ...anggotaForm, keterangan: tag })}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-600"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Upload KTP Anggota (Requirement 4) */}
                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-semibold text-[11px]">Foto KTP Anggota (Req. 4)</div>
                          <div className="text-[10px] text-slate-400">
                            {anggotaForm.fotoKtp ? '✓ Foto Terpilih' : 'Belum diunggah'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {anggotaForm.fotoKtp && (
                          <button
                            type="button"
                            onClick={() => setAnggotaForm({ ...anggotaForm, fotoKtp: '' })}
                            className="text-rose-500 hover:text-rose-600 text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => anggotaKtpAdminInputRef.current?.click()}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          {anggotaForm.fotoKtp ? 'Ganti' : 'Pilih Foto'}
                        </button>
                      </div>

                      <input
                        type="file"
                        ref={anggotaKtpAdminInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadAnggotaKtpAdmin(file);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelAnggota}
                        className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-xs cursor-pointer font-medium"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAnggota()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingAnggotaId ? 'Simpan Anggota' : 'Tambahkan'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* List Anggota Keluarga yang Sudah Ada di Form Ini */}
                {(!formData.anggotaKeluarga || formData.anggotaKeluarga.length === 0) ? (
                  <div className="p-3 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                    Belum ada anggota keluarga ditambahkan di bawah KK ini.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {formData.anggotaKeluarga.map((ak, idx) => (
                      <div
                        key={ak.id || idx}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                              <span>{ak.nama}</span>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                                ({ak.hubungan})
                              </span>
                              {ak.fotoKtp && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                                  KTP ✓
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {ak.jenisKelamin} {ak.nik ? `• NIK: ${ak.nik}` : ''} {ak.pekerjaan ? `• ${ak.pekerjaan}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditAnggota(ak)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnggota(ak.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Warga'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Warga */}
      {wargaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Data Warga?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Yakin ingin menghapus <strong>{wargaToDelete.nama}</strong> ({wargaToDelete.alamatGsb}) beserta seluruh riwayat sensus keluarganya?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWargaToDelete(null)}
                className="flex-1 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Ya, Hapus
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
