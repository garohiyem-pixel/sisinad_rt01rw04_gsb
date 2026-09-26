import React, { useState, useMemo } from 'react';
import { TransaksiKas, AkunKas, JenisTransaksi, Warga, StatusPembayaran, AppSettings, sortKasNewestFirst } from '../types';
import { 
  CreditCard, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  X,
  CheckCircle2,
  Calendar,
  Clock,
  Eye,
  ShieldCheck,
  Check,
  AlertTriangle,
  XCircle,
  Lock
} from 'lucide-react';

interface KelolaKasModalProps {
  kasList: TransaksiKas[];
  wargaList: Warga[];
  settings: AppSettings;
  onAddKas: (kas: TransaksiKas) => Promise<void>;
  onUpdateKas: (id: string, kas: Partial<TransaksiKas>) => Promise<void>;
  onDeleteKas: (id: string) => Promise<void>;
}

export const KelolaKasModal: React.FC<KelolaKasModalProps> = ({
  kasList,
  wargaList,
  settings,
  onAddKas,
  onUpdateKas,
  onDeleteKas
}) => {
  const defaultKas = settings?.iuranKasNominal !== undefined ? Number(settings.iuranKasNominal) : 20000;
  const defaultDansos = settings?.iuranDansosNominal !== undefined ? Number(settings.iuranDansosNominal) : 10000;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kasToDelete, setKasToDelete] = useState<TransaksiKas | null>(null);
  const [kasToVerify, setKasToVerify] = useState<TransaksiKas | null>(null);
  const [kasToReject, setKasToReject] = useState<TransaksiKas | null>(null);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Dana belum masuk ke mutasi rekening bank kas RT.');
  const [verifyConfirmed, setVerifyConfirmed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAkun, setFilterAkun] = useState<'ALL' | 'KAS' | 'DANSOS'>('ALL');
  const [filterJenis, setFilterJenis] = useState<'ALL' | 'masuk' | 'keluar'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'pending' | 'verified' | 'rejected'>('ALL');

  const pendingList = kasList.filter(k => k.status === 'pending');
  const pendingCount = pendingList.length;

  const [formData, setFormData] = useState<Partial<TransaksiKas>>({
    tanggal: new Date().toISOString().slice(0, 10),
    jenis: 'masuk',
    akun: 'KAS',
    nominal: defaultKas,
    peruntukan: 'Iuran Kas RT',
    alamatGsb: '',
    namaWarga: '',
    periodeBulan: '2026-09',
    metode: 'Tunai',
    status: 'verified'
  });

  const handleOpenAdd = (jenis: JenisTransaksi = 'masuk', akun: AkunKas = 'KAS') => {
    setEditingId(null);
    setSubmitError(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultMonth = todayStr.slice(0, 7);
    const suggestedNominal = jenis === 'masuk' 
      ? (akun === 'KAS' ? defaultKas : defaultDansos)
      : 150000;
    const suggestedPeruntukan = jenis === 'masuk'
      ? (akun === 'KAS' ? 'Iuran Kas RT' : 'Iuran Dansos RT')
      : 'Pengeluaran RT';

    setFormData({
      tanggal: todayStr,
      jenis: jenis,
      akun: akun,
      nominal: suggestedNominal,
      peruntukan: suggestedPeruntukan,
      alamatGsb: '',
      namaWarga: '',
      periodeBulan: defaultMonth,
      metode: 'Tunai',
      status: 'verified'
    });
    setFormOpen(true);
  };

  const handleOpenEdit = (k: TransaksiKas) => {
    setEditingId(k.id);
    setSubmitError(null);
    setFormData(k);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.peruntukan || !formData.nominal) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (editingId) {
        await onUpdateKas(editingId, formData);
      } else {
        const newKas: TransaksiKas = {
          id: `k-${Date.now()}`,
          tanggal: formData.tanggal || new Date().toISOString().slice(0, 10),
          jenis: (formData.jenis as JenisTransaksi) || 'masuk',
          akun: (formData.akun as AkunKas) || 'KAS',
          nominal: Number(formData.nominal) || 0,
          peruntukan: formData.peruntukan || '',
          alamatGsb: formData.alamatGsb || undefined,
          namaWarga: formData.namaWarga || undefined,
          periodeBulan: formData.periodeBulan || '2026-09',
          metode: (formData.metode as any) || 'Tunai',
          status: 'verified',
          inputBy: 'Admin',
          createdAt: new Date().toISOString()
        };
        await onAddKas(newKas);
      }
      setFormOpen(false);
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal mencatat transaksi kas ke database server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (kas: TransaksiKas) => {
    setDeleteError(null);
    setKasToDelete(kas);
  };

  const handleConfirmDelete = async () => {
    if (!kasToDelete) return;
    const targetId = kasToDelete.id;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDeleteKas(targetId);
      setKasToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete kas:', err);
      setDeleteError(err?.message || 'Gagal menghapus transaksi. Silakan coba kembali.');
      setKasToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmVerify = async () => {
    if (!kasToVerify) return;
    try {
      setIsProcessing(true);
      const verifiedNote = kasToVerify.catatan 
        ? `${kasToVerify.catatan} | Diverifikasi Bendahara: Dana masuk rekening RT`
        : 'Diverifikasi Bendahara: Dana masuk rekening RT';

      await onUpdateKas(kasToVerify.id, {
        status: 'verified',
        catatan: verifiedNote
      });
      setKasToVerify(null);
      setVerifyConfirmed(false);
    } catch (err: any) {
      console.error('Failed to verify kas:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!kasToReject) return;
    try {
      setIsProcessing(true);
      const rejectedNote = `Ditolak Bendahara: ${rejectReason}`;
      await onUpdateKas(kasToReject.id, {
        status: 'rejected',
        catatan: rejectedNote
      });
      setKasToReject(null);
      setRejectReason('Dana belum masuk ke mutasi rekening bank kas RT.');
    } catch (err: any) {
      console.error('Failed to reject kas:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Deduplikasi ID dan pengurutan presisi: transaksi yang baru diinput selalu di posisi paling atas
  const filteredKas = useMemo(() => {
    const seen = new Set<string>();
    const deduped: TransaksiKas[] = [];
    for (const item of kasList) {
      if (!item || !item.id) continue;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        deduped.push(item);
      }
    }

    return deduped
      .filter(k => {
        if (filterAkun !== 'ALL' && k.akun !== filterAkun) return false;
        if (filterJenis !== 'ALL' && k.jenis !== filterJenis) return false;
        if (filterStatus !== 'ALL') {
          const currentStatus = k.status || 'verified';
          if (currentStatus !== filterStatus) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            (k.peruntukan && k.peruntukan.toLowerCase().includes(q)) ||
            (k.alamatGsb && k.alamatGsb.toLowerCase().includes(q)) ||
            (k.namaWarga && k.namaWarga.toLowerCase().includes(q)) ||
            (k.catatan && k.catatan.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort(sortKasNewestFirst);
  }, [kasList, filterAkun, filterJenis, filterStatus, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Kelola Transaksi Kas Masuk & Keluar (KAS / DANSOS)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin menentukan akun pembukuan (KAS atau DANSOS), nominal dinamis dan verifikasi keamanan kas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('masuk')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ Kas Masuk</span>
          </button>
          <button
            onClick={() => handleOpenAdd('keluar')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>- Kas Keluar</span>
          </button>
        </div>
      </div>

      {/* BANNER SISTEM KEAMANAN VERIFIKASI PEMBAYARAN KAS ONLINE */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border-2 border-amber-400/50 dark:border-amber-500/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Verifikasi Pembayaran Kas Online ({pendingCount} Menunggu Konfirmasi Bank)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider animate-pulse">
                  Perlu Cek Rekening
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Terdapat {pendingCount} pembayaran online dari warga. Sesuai sistem keamanan, dana <strong>belum masuk ke laporan kas dan saldo</strong> sebelum Bendahara memverifikasi mutasi rekening bank/e-wallet RT dan memastikan uang telah masuk.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={() => setFilterStatus(filterStatus === 'pending' ? 'ALL' : 'pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                filterStatus === 'pending'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {filterStatus === 'pending' ? 'Tampilkan Semua' : `Periksa Pembayaran (${pendingCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Delete Error Notification */}
      {deleteError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center justify-between animate-in fade-in">
          <span>{deleteError}</span>
          <button 
            type="button" 
            onClick={() => setDeleteError(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Status:</span>
          {(['ALL', 'pending', 'verified', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterStatus === st 
                  ? (st === 'pending' ? 'bg-amber-500 text-slate-950 font-bold' : st === 'verified' ? 'bg-emerald-600 text-white font-bold' : st === 'rejected' ? 'bg-rose-600 text-white font-bold' : 'bg-blue-600 text-white font-bold')
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st === 'ALL' && <span>Semua Status</span>}
              {st === 'pending' && (
                <>
                  <Clock className="w-3 h-3 text-amber-900" />
                  <span>Menunggu ({pendingCount})</span>
                </>
              )}
              {st === 'verified' && (
                <>
                  <Check className="w-3 h-3 text-emerald-300" />
                  <span>Terverifikasi (Masuk Kas)</span>
                </>
              )}
              {st === 'rejected' && (
                <>
                  <XCircle className="w-3 h-3 text-rose-300" />
                  <span>Ditolak</span>
                </>
              )}
            </button>
          ))}

          <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>

          <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Akun:</span>
          {(['ALL', 'KAS', 'DANSOS'] as const).map(ak => (
            <button
              key={ak}
              onClick={() => setFilterAkun(ak)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterAkun === ak 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {ak === 'ALL' ? 'Semua' : ak}
            </button>
          ))}

          <span className="text-slate-300 dark:text-slate-600 mx-1">|</span>

          <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Jenis:</span>
          {(['ALL', 'masuk', 'keluar'] as const).map(jn => (
            <button
              key={jn}
              onClick={() => setFilterJenis(jn)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterJenis === jn 
                  ? 'bg-slate-800 dark:bg-slate-700 text-white font-bold' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {jn === 'ALL' ? 'Semua' : jn === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari peruntukan / alamat / nama..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table & Mobile Cards Transaksi Kas */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Akun</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Peruntukan / Keterangan</th>
                <th className="py-3 px-4">Warga / Alamat GSB</th>
                <th className="py-3 px-4">Metode & Bukti</th>
                <th className="py-3 px-4 text-center">Status Pembukuan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi / Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredKas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada transaksi kas yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredKas.map(k => (
                  <tr 
                    key={k.id} 
                    className={`transition-colors ${
                      k.status === 'pending' 
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{k.tanggal}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        k.akun === 'KAS' 
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300' 
                          : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        {k.akun}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {k.jenis === 'masuk' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Masuk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <ArrowDownRight className="w-3.5 h-3.5" /> Keluar
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-xs">
                      <div>{k.peruntukan}</div>
                      {k.catatan && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                          {k.catatan}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {k.alamatGsb ? (
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">{k.alamatGsb}</strong>
                          {k.namaWarga && <span className="block text-[11px] text-slate-400 dark:text-slate-500">{k.namaWarga}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{k.metode}</span>
                        {k.buktiBayar && (
                          <button
                            type="button"
                            onClick={() => setViewingProof(k.buktiBayar || null)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                            title="Lihat Foto Bukti Transfer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Struk</span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {k.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs animate-pulse whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          <span>Menunggu Verifikasi</span>
                        </span>
                      ) : k.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 whitespace-nowrap" title={k.catatan || 'Ditolak'}>
                          <XCircle className="w-3 h-3" />
                          <span>Ditolak</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                          <Check className="w-3 h-3" />
                          <span>Masuk Kas</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      <span className={k.jenis === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                        {k.jenis === 'masuk' ? '+' : '-'}{formatRupiah(k.nominal)}
                      </span>
                      {k.status === 'pending' && (
                        <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium">Belum di kas</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {k.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => {
                                setKasToVerify(k);
                                setVerifyConfirmed(false);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer transition-colors"
                              title="Verifikasi Masuknya Dana ke Rekening Kas RT"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verifikasi</span>
                            </button>
                            <button
                              onClick={() => {
                                setKasToReject(k);
                                setRejectReason('Dana belum masuk ke mutasi rekening bank kas RT.');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="Tolak Pembayaran"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(k)}
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(k)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Transaksi Kas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredKas.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada transaksi kas yang sesuai filter.
            </div>
          ) : (
            filteredKas.map(k => (
              <div 
                key={k.id}
                className={`p-4 space-y-3 transition-colors ${
                  k.status === 'pending'
                    ? 'bg-amber-50/50 dark:bg-amber-950/20'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                {/* Header row: Tanggal, Akun, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                      {k.tanggal}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      k.akun === 'KAS'
                        ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      {k.akun}
                    </span>
                  </div>
                  <div>
                    {k.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                        <Clock className="w-3 h-3" /> Menunggu Verifikasi
                      </span>
                    ) : k.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        <Check className="w-3 h-3" /> Masuk Kas
                      </span>
                    )}
                  </div>
                </div>

                {/* Main: Nominal & Peruntukan */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                      {k.peruntukan}
                    </div>
                    {k.alamatGsb && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Blok {k.alamatGsb}</span>
                        {k.namaWarga && <span className="ml-1 text-slate-500 dark:text-slate-400">({k.namaWarga})</span>}
                      </div>
                    )}
                    {k.catatan && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                        {k.catatan}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-mono font-bold text-sm block ${
                      k.jenis === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {k.jenis === 'masuk' ? '+' : '-'}{formatRupiah(k.nominal)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {k.metode}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons Bar */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {k.buktiBayar && (
                      <button
                        type="button"
                        onClick={() => setViewingProof(k.buktiBayar || null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Bukti
                      </button>
                    )}
                    {k.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setKasToVerify(k);
                            setVerifyConfirmed(false);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verifikasi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKasToReject(k);
                            setRejectReason('Dana belum masuk ke mutasi rekening bank kas RT.');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Tolak
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(k)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Edit
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(k)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Form Add / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Transaksi Kas' : `Input Uang Kas ${formData.jenis === 'masuk' ? 'Masuk' : 'Keluar'}`}
              </h3>
              <button 
                onClick={() => setFormOpen(false)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              {submitError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 font-medium">
                  {submitError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Transaksi *</label>
                  <select
                    value={formData.jenis}
                    onChange={e => setFormData({ ...formData, jenis: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="masuk">Uang Masuk (+)</option>
                    <option value="keluar">Uang Keluar (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Akun Kas *</label>
                  <select
                    value={formData.akun}
                    onChange={e => {
                      const nextAkun = e.target.value as AkunKas;
                      if (!editingId && formData.jenis === 'masuk') {
                        setFormData({
                          ...formData,
                          akun: nextAkun,
                          nominal: nextAkun === 'KAS' ? defaultKas : defaultDansos,
                          peruntukan: nextAkun === 'KAS' ? 'Iuran Kas RT' : 'Iuran Dansos RT'
                        });
                      } else {
                        setFormData({ ...formData, akun: nextAkun });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="KAS">Akun KAS (Kas Operasional RT - Rp {defaultKas.toLocaleString('id-ID')})</option>
                    <option value="DANSOS">Akun DANSOS (Dana Sosial - Rp {defaultDansos.toLocaleString('id-ID')})</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={formData.nominal || ''}
                    onChange={e => setFormData({ ...formData, nominal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal || ''}
                    onChange={e => {
                      const newTgl = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        tanggal: newTgl,
                        periodeBulan: (newTgl && newTgl.length >= 7) ? newTgl.slice(0, 7) : prev.periodeBulan
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peruntukan / Keperluan Jelas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Iuran Kas Warga / Pembelian Lampu Jalan / Santunan Warga Sakit"
                  value={formData.peruntukan || ''}
                  onChange={e => setFormData({ ...formData, peruntukan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat GSB (Jika dari/ke Warga)</label>
                  <input
                    type="text"
                    placeholder="Contoh: F2/22"
                    value={formData.alamatGsb || ''}
                    onChange={e => setFormData({ ...formData, alamatGsb: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.metode || 'Tunai'}
                    onChange={e => setFormData({ ...formData, metode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank Jago">Transfer Bank Jago</option>
                    <option value="DANA">DANA</option>
                    <option value="GoPay">GoPay</option>
                    <option value="SeaBank">SeaBank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Periode Pembukuan</label>
                  <select
                    value={formData.periodeBulan || '2026-09'}
                    onChange={e => setFormData({ ...formData, periodeBulan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="2026-12">Desember 2026</option>
                    <option value="2026-11">November 2026</option>
                    <option value="2026-10">Oktober 2026</option>
                    <option value="2026-09">September 2026</option>
                    <option value="2026-08">Agustus 2026</option>
                    <option value="2026-07">Juli 2026</option>
                    <option value="2026-06">Juni 2026</option>
                    <option value="2026-05">Mei 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-03">Maret 2026</option>
                    <option value="2026-02">Februari 2026</option>
                    <option value="2026-01">Januari 2026</option>
                    {formData.periodeBulan && !['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'].includes(formData.periodeBulan) && (
                      <option value={formData.periodeBulan}>{formData.periodeBulan}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Pembukuan Kas</label>
                  <select
                    value={formData.status || 'verified'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-hidden"
                  >
                    <option value="verified">✅ Terverifikasi (Masuk Laporan & Saldo)</option>
                    <option value="pending">⏳ Menunggu Verifikasi (Pending Mutasi)</option>
                    <option value="rejected">❌ Ditolak (Tidak Masuk Saldo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: No referensi transfer / catatan verifikasi"
                  value={formData.catatan || ''}
                  onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span>{isSubmitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Catat Transaksi Kas')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI DANA MASUK (BENDHARA APPROVAL) */}
      {kasToVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-emerald-500/30 dark:border-emerald-500/40 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Verifikasi Pembayaran Kas Online
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sistem Keamanan Pembukuan Kas RT 004
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setKasToVerify(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Peringatan Keamanan:</strong> Jangan menyetujui sebelum mengecek mutasi rekening bank kas RT. Pastikan dana benar-benar masuk dan nominal sesuai sebelum masuk ke laporan kas resmi.
              </div>
            </div>

            {/* Rincian Transaksi */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Nama Warga:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {kasToVerify.namaWarga || 'Warga'} ({kasToVerify.alamatGsb || '-'})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Metode & Tujuan:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {kasToVerify.metode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Akun Pembukuan:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  {kasToVerify.akun === 'KAS' ? 'Kas Operasional RT' : 'Dana Sosial'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Periode & Tanggal:</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">
                  {kasToVerify.periodeBulan} ({kasToVerify.tanggal})
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Nominal yang Ditransfer:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatRupiah(kasToVerify.nominal)}
                </span>
              </div>
            </div>

            {/* Bukti Bayar / Struk Foto */}
            {kasToVerify.buktiBayar ? (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    Bukti Struk Transfer yang Diupload Warga:
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingProof(kasToVerify.buktiBayar || null)}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
                  >
                    Perbesar Gambar
                  </button>
                </div>
                <div 
                  onClick={() => setViewingProof(kasToVerify.buktiBayar || null)}
                  className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 cursor-pointer group bg-black/10 flex items-center justify-center"
                >
                  <img 
                    src={kasToVerify.buktiBayar} 
                    alt="Bukti Transfer" 
                    className="w-full max-h-48 object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-1">
                    <Eye className="w-4 h-4" /> Klik untuk perbesar
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-center">
                Warga tidak melampirkan bukti struk gambar. Harap periksa mutasi bank dengan ekstra hati-hati!
              </div>
            )}

            {/* Checkbox Konfirmasi Mutasi Rekening */}
            <div className="mt-4 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/70 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verifyConfirmed}
                  onChange={e => setVerifyConfirmed(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 mt-0.5 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  Saya (Bendahara RT) menyatakan telah membuka mutasi m-banking / e-wallet RT dan <strong>memastikan dana {formatRupiah(kasToVerify.nominal)} benar-benar telah masuk ke rekening</strong>.
                </span>
              </label>
            </div>

            {/* Aksi Verifikasi */}
            <div className="mt-5 flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = kasToVerify;
                  setKasToVerify(null);
                  setKasToReject(target);
                }}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak Pembayaran</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setKasToVerify(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={!verifyConfirmed || isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isProcessing ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Konfirmasi Dana Masuk (Catat ke Kas)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK PEMBAYARAN ONLINE */}
      {kasToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900 text-xs">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tolak Pengajuan Pembayaran
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transaksi tidak akan dihitung di kas RT
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Warga:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{kasToReject.namaWarga} ({kasToReject.alamatGsb})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(kasToReject.nominal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="text-slate-700 dark:text-slate-300">{kasToReject.metode}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Alasan Penolakan (Akan disimpan di catatan transaksi):
              </label>
              
              {/* Quick Reason Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  'Dana belum masuk ke mutasi rekening bank kas RT.',
                  'Bukti struk tidak valid atau tidak terbaca.',
                  'Nominal transfer tidak sesuai dengan tagihan.',
                  'Duplikasi pengajuan pembayaran.'
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] text-left transition-colors cursor-pointer ${
                      rejectReason === reason
                        ? 'bg-rose-600 text-white font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Tulis alasan penolakan untuk warga..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setKasToReject(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? 'Memproses...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX BUKTI BAYAR / STRUK */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Bukti Foto Struk / Transfer Bank
              </h3>
              <button
                onClick={() => setViewingProof(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-xl p-2">
              <img 
                src={viewingProof} 
                alt="Bukti Transfer Penuh" 
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Periksa nomor referensi, nama pengirim, dan nominal dengan cermat.</span>
              <button
                onClick={() => setViewingProof(null)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Transaksi Kas */}
      {kasToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Hapus Transaksi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan menghapus data kas dari pembukuan RT.
                </p>
              </div>
            </div>

            {/* Info Transaksi */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mb-5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Akun:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  kasToDelete.akun === 'KAS'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                }`}>
                  {kasToDelete.akun === 'KAS' ? 'Kas RT' : 'Dana Sosial'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Jenis:</span>
                <span className={`font-bold ${kasToDelete.jenis === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {kasToDelete.jenis === 'masuk' ? 'Pemasukan (+)' : 'Pengeluaran (-)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Nominal:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                  {formatRupiah(kasToDelete.nominal)}
                </span>
              </div>
              <div className="flex justify-between items-start pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 shrink-0 mr-2">Keperluan:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                  {kasToDelete.peruntukan}
                </span>
              </div>
              {kasToDelete.alamatGsb && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Alamat Warga:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Blok {kasToDelete.alamatGsb} {kasToDelete.namaWarga ? `(${kasToDelete.namaWarga})` : ''}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Tanggal:</span>
                <span>{kasToDelete.tanggal}</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setKasToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
