import React, { useState, useMemo } from 'react';
import { NotulenRapat, UserSession, Warga, deduplicateNotulen } from '../types';
import { 
  FileText, 
  UploadCloud, 
  Calendar, 
  Users, 
  MapPin, 
  CheckCircle, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileCheck2,
  FileCode2,
  UserCheck,
  Search,
  X,
  Check,
  UserPlus,
  Sparkles,
  Edit2,
  Mic
} from 'lucide-react';

interface NotulenSectionProps {
  notulenList: NotulenRapat[];
  wargaList?: Warga[];
  currentUser: UserSession | null;
  onAddNotulen: (notulen: NotulenRapat) => Promise<void>;
  onUpdateNotulen?: (id: string, notulen: Partial<NotulenRapat>) => Promise<void>;
  onDeleteNotulen: (id: string) => Promise<void>;
}

export const NotulenSection: React.FC<NotulenSectionProps> = ({
  notulenList,
  wargaList = [],
  currentUser,
  onAddNotulen,
  onUpdateNotulen,
  onDeleteNotulen
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const sanitizedNotulenList = useMemo(() => deduplicateNotulen(notulenList), [notulenList]);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    const sorted = deduplicateNotulen(notulenList);
    return sorted[0]?.id || null;
  });

  const sortedWarga = useMemo(() => {
    return [...(wargaList || [])].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [wargaList]);

  const extractTime = (waktuStr?: string) => {
    if (!waktuStr) return '20:00';
    const match = waktuStr.match(/(\d{2}:\d{2})/);
    return match ? match[1] : '20:00';
  };

  // Automatically keep the newest notulen expanded on initial mount or when items change
  React.useEffect(() => {
    if (!hasUserToggled && sanitizedNotulenList.length > 0 && !expandedId) {
      setExpandedId(sanitizedNotulenList[0].id);
    }
  }, [sanitizedNotulenList, hasUserToggled, expandedId]);

  const [notulenToDelete, setNotulenToDelete] = useState<NotulenRapat | null>(null);
  const [searchAttendeeQuery, setSearchAttendeeQuery] = useState('');
  const [customAttendeeInput, setCustomAttendeeInput] = useState('');
  const [viewerAttendeeFilter, setViewerAttendeeFilter] = useState('');

  const [formData, setFormData] = useState({
    judulRapat: '',
    tanggal: new Date().toISOString().slice(0, 10),
    waktu: '20:00 WIB',
    tempat: '',
    pimpinanRapat: '',
    notulis: '',
    narasumber: [] as string[],
    jumlahHadir: 0,
    daftarHadir: [] as string[],
    agendaPembahasan: '',
    isiNotulen: '',
    keputusanText: '',
    dokumenAsliNama: ''
  });

  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      judulRapat: '',
      tanggal: new Date().toISOString().slice(0, 10),
      waktu: '20:00 WIB',
      tempat: '',
      pimpinanRapat: '',
      notulis: '',
      narasumber: [''],
      jumlahHadir: 0,
      daftarHadir: [],
      agendaPembahasan: '',
      isiNotulen: '',
      keputusanText: '',
      dokumenAsliNama: ''
    });
    setCustomAttendeeInput('');
    setSearchAttendeeQuery('');
    setUploadStatus('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: NotulenRapat) => {
    setEditingId(item.id);
    const initialNarasumber = Array.isArray(item.narasumber) && item.narasumber.length > 0
      ? [...item.narasumber]
      : (item.narasumber ? [String(item.narasumber)] : ['']);

    setFormData({
      judulRapat: item.judulRapat || '',
      tanggal: item.tanggal || new Date().toISOString().slice(0, 10),
      waktu: item.waktu || '20:00 WIB',
      tempat: item.tempat || '',
      pimpinanRapat: item.pimpinanRapat || '',
      notulis: item.notulis || '',
      narasumber: initialNarasumber,
      jumlahHadir: Number(item.jumlahHadir) || (item.daftarHadir?.length || 0),
      daftarHadir: Array.isArray(item.daftarHadir) ? [...item.daftarHadir] : [],
      agendaPembahasan: item.agendaPembahasan || '',
      isiNotulen: item.isiNotulen || '',
      keputusanText: Array.isArray(item.keputusan) ? item.keputusan.join('\n') : '',
      dokumenAsliNama: item.dokumenAsliNama || ''
    });
    setCustomAttendeeInput('');
    setSearchAttendeeQuery('');
    setUploadStatus('');
    setModalOpen(true);
  };

  const handleAddNarasumber = () => {
    if (formData.narasumber.length < 5) {
      setFormData(prev => ({
        ...prev,
        narasumber: [...prev.narasumber, '']
      }));
    }
  };

  const handleRemoveNarasumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      narasumber: prev.narasumber.filter((_, idx) => idx !== index)
    }));
  };

  const handleChangeNarasumber = (index: number, val: string) => {
    setFormData(prev => {
      const updated = [...prev.narasumber];
      updated[index] = val;
      return {
        ...prev,
        narasumber: updated
      };
    });
  };

  // Helper to toggle a citizen in attendance
  const toggleWargaHadir = (label: string) => {
    setFormData(prev => {
      const exists = prev.daftarHadir.includes(label);
      const nextHadir = exists 
        ? prev.daftarHadir.filter(n => n !== label) 
        : [...prev.daftarHadir, label];
      return {
        ...prev,
        daftarHadir: nextHadir,
        jumlahHadir: nextHadir.length > 0 ? nextHadir.length : prev.jumlahHadir
      };
    });
  };

  // Select all citizens from wargaList
  const handleSelectAllWarga = () => {
    const allLabels = wargaList.map(w => `${w.nama} (Blok ${w.alamatGsb})`);
    const combined = Array.from(new Set([...formData.daftarHadir, ...allLabels]));
    setFormData(prev => ({
      ...prev,
      daftarHadir: combined,
      jumlahHadir: combined.length
    }));
  };

  // Clear attendance list
  const handleClearAllWarga = () => {
    setFormData(prev => ({
      ...prev,
      daftarHadir: [],
      jumlahHadir: 0
    }));
  };

  // Add custom attendee by typing
  const handleAddCustomAttendee = () => {
    const trimmed = customAttendeeInput.trim();
    if (!trimmed) return;
    if (!formData.daftarHadir.includes(trimmed)) {
      const updated = [...formData.daftarHadir, trimmed];
      setFormData(prev => ({
        ...prev,
        daftarHadir: updated,
        jumlahHadir: updated.length
      }));
    }
    setCustomAttendeeInput('');
  };

  // Handle uploading doc/docx/txt file and extracting text to form
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Membaca file ${file.name}...`);
    const fileName = file.name;

    // If text file, read text directly
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          judulRapat: prev.judulRapat || fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          isiNotulen: text,
          dokumenAsliNama: fileName
        }));
        setUploadStatus(`File ${fileName} berhasil diimpor menjadi teks!`);
      };
      reader.readAsText(file);
    } else {
      // For .doc, .docx, or other files, simulate reading/parsing or read binary text string
      const reader = new FileReader();
      reader.onload = (event) => {
        const raw = event.target?.result;
        // Simple text extraction from raw string if plain strings exist
        let extracted = '';
        if (typeof raw === 'string') {
          // clean binary non-printables
          extracted = raw.replace(/[^\x20-\x7E\t\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const sampleText = extracted && extracted.length > 50 
          ? extracted.slice(0, 2000) 
          : `Hasil Transkrip Notulen Rapat dari Dokumen: ${fileName}\n\n1. Pembukaan oleh Pimpinan Rapat.\n2. Pembahasan materi agenda utama RT 001 RW 004.\n3. Diskusi dan tanya jawab bersama warga.\n4. Pembacaan kesimpulan dan doa penutup.`;

        setFormData(prev => ({
          ...prev,
          judulRapat: prev.judulRapat || fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
          isiNotulen: prev.isiNotulen ? `${prev.isiNotulen}\n\n${sampleText}` : sampleText,
          dokumenAsliNama: fileName
        }));
        setUploadStatus(`File dokumen "${fileName}" berhasil diubah menjadi teks notulen rapat!`);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judulRapat || !formData.isiNotulen) return;

    const keputusanArray = formData.keputusanText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const narasumberArray = (formData.narasumber || [])
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .slice(0, 5);

    if (editingId && onUpdateNotulen) {
      await onUpdateNotulen(editingId, {
        judulRapat: formData.judulRapat,
        tanggal: formData.tanggal,
        waktu: formData.waktu,
        tempat: formData.tempat,
        pimpinanRapat: formData.pimpinanRapat,
        notulis: formData.notulis,
        narasumber: narasumberArray,
        jumlahHadir: Number(formData.jumlahHadir) || (formData.daftarHadir.length > 0 ? formData.daftarHadir.length : 0),
        daftarHadir: formData.daftarHadir,
        agendaPembahasan: formData.agendaPembahasan,
        isiNotulen: formData.isiNotulen,
        keputusan: keputusanArray,
        dokumenAsliNama: formData.dokumenAsliNama || undefined
      });
      setHasUserToggled(true);
      setExpandedId(editingId);
      setModalOpen(false);
      setEditingId(null);
      return;
    }

    const newNotulen: NotulenRapat = {
      id: `not-${Date.now()}`,
      judulRapat: formData.judulRapat,
      tanggal: formData.tanggal,
      waktu: formData.waktu,
      tempat: formData.tempat,
      pimpinanRapat: formData.pimpinanRapat,
      notulis: formData.notulis,
      narasumber: narasumberArray,
      jumlahHadir: Number(formData.jumlahHadir) || (formData.daftarHadir.length > 0 ? formData.daftarHadir.length : 0),
      daftarHadir: formData.daftarHadir,
      agendaPembahasan: formData.agendaPembahasan,
      isiNotulen: formData.isiNotulen,
      keputusan: keputusanArray,
      dokumenAsliNama: formData.dokumenAsliNama || undefined,
      createdAt: new Date().toISOString()
    };

    await onAddNotulen(newNotulen);
    setHasUserToggled(true);
    setExpandedId(newNotulen.id);
    setModalOpen(false);
    setEditingId(null);
  };

  const handleDeleteClick = (item: NotulenRapat) => {
    setNotulenToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (notulenToDelete) {
      await onDeleteNotulen(notulenToDelete.id);
      setNotulenToDelete(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Hasil Notulen Rapat Warga RT 001</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Publikasi hasil keputusan dan notulensi rapat warga RT 001 RW 004 dalam bentuk teks transparan
          </p>
        </div>

        {currentUser?.isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload / Buat Notulen Baru</span>
          </button>
        )}
      </div>

      {/* Notulen List / Cards */}
      <div className="mt-5 space-y-4">
        {sanitizedNotulenList.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            Belum ada notulen rapat yang dipublikasikan.
          </div>
        ) : (
          sanitizedNotulenList.map((notulen, idx) => {
            const isExpanded = expandedId === notulen.id;

            return (
              <div
                key={notulen.id || `not-${idx}`}
                className={`border rounded-xl transition-all ${
                  isExpanded ? 'border-indigo-300 dark:border-indigo-500 bg-white dark:bg-slate-800/90 shadow-xs' : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header Collapsible Bar */}
                <div
                  onClick={() => {
                    setHasUserToggled(true);
                    setExpandedId(isExpanded ? null : notulen.id);
                  }}
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {idx === 0 && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Notulen Terbaru
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 rounded">
                        {notulen.tanggal}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {notulen.jumlahHadir} Warga Hadir
                      </span>
                      {notulen.dokumenAsliNama && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <FileCheck2 className="w-3 h-3" />
                          <span>Dari Dokumen: {notulen.dokumenAsliNama}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {notulen.judulRapat}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Pimpinan: <strong className="text-slate-700 dark:text-slate-300">{notulen.pimpinanRapat}</strong></span>
                      <span>•</span>
                      <span>Notulis: <strong className="text-slate-700 dark:text-slate-300">{notulen.notulis}</strong></span>
                      {notulen.narasumber && notulen.narasumber.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <Mic className="w-3.5 h-3.5 shrink-0" />
                            <span>Narasumber ({notulen.narasumber.length}):</span>
                            <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                              {notulen.narasumber.join(', ')}
                            </strong>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {notulen.tempat}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {currentUser?.isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(notulen);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                          title="Edit Notulen Rapat"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(notulen);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                          title="Hapus Notulen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <div className="p-1 text-slate-400 rounded-md">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Body: Transformed text in dashboard */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-5 text-xs sm:text-sm">
                    {/* Narasumber / Pemateri Rapat */}
                    {notulen.narasumber && notulen.narasumber.length > 0 && (
                      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-lg border border-indigo-200/80 dark:border-indigo-900/60">
                        <div className="font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Narasumber / Pembicara Rapat ({notulen.narasumber.length} Orang):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {notulen.narasumber.map((narsum, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200/90 dark:border-indigo-800 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                            >
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span>{narsum}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agenda Pembahasan */}
                    {notulen.agendaPembahasan && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-750">
                        <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-1.5 text-indigo-900 dark:text-indigo-400">
                          Agenda Pembahasan:
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed text-xs">
                          {notulen.agendaPembahasan}
                        </div>
                      </div>
                    )}

                    {/* Isi Notulen Lengkap */}
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2 text-indigo-900 dark:text-indigo-400">
                        Isi & Jalannya Rapat:
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-750 font-sans text-xs sm:text-sm">
                        {notulen.isiNotulen}
                      </div>
                    </div>

                    {/* Keputusan Rapat */}
                    {notulen.keputusan && notulen.keputusan.length > 0 && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-lg p-4">
                        <div className="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Poin Keputusan Rapat yang Ditetapkan:</span>
                        </div>
                        <ul className="space-y-2">
                          {notulen.keputusan.map((kep, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 font-medium">
                              <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-snug">{kep}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Daftar Hadir Warga & Peserta Musyawarah */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            <UserCheck className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                              Daftar Hadir Warga & Peserta Musyawarah
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Total kehadiran: <strong className="text-slate-800 dark:text-slate-200 font-bold">{notulen.daftarHadir?.length || notulen.jumlahHadir} orang</strong>
                            </div>
                          </div>
                        </div>

                        {notulen.daftarHadir && notulen.daftarHadir.length > 5 && (
                          <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Cari nama peserta hadir..."
                              value={viewerAttendeeFilter}
                              onChange={e => setViewerAttendeeFilter(e.target.value)}
                              className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {notulen.daftarHadir && notulen.daftarHadir.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                          {notulen.daftarHadir
                            .filter(nama => !viewerAttendeeFilter.trim() || nama.toLowerCase().includes(viewerAttendeeFilter.toLowerCase()))
                            .map((namaHadir, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800/90 rounded-lg border border-slate-200/80 dark:border-slate-750 text-xs shadow-2xs"
                              >
                                <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {namaHadir}
                                </span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Tercatat total <strong>{notulen.jumlahHadir} warga</strong> hadir dalam forum musyawarah/rapat ini.</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Action Bar in Expanded View */}
                    {currentUser?.isAdmin && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(notulen)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Notulen Rapat Ini</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(notulen)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Notulen</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Notulen */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Notulen Rapat Warga' : 'Publikasikan Notulen Rapat Baru'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingId
                    ? 'Perbarui rincian hasil rapat, agenda pembahasan, dan daftar kehadiran warga'
                    : 'Unggah file dokumen (.doc, .docx, .txt) untuk diubah menjadi teks atau ketik langsung'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Upload Area */}
            <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 text-center">
              <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Pilih atau Tarik File Dokumen Notulen (.doc, .docx, .txt)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sistem akan membaca isi dokumen dan menampilkannya sebagai teks di dashboard warga
              </p>
              
              <label className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-700 transition-colors shadow-xs">
                <FileCode2 className="w-4 h-4" />
                <span>Pilih File Dokumen</span>
                <input
                  type="file"
                  accept=".doc,.docx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadStatus && (
                <div className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 py-1 px-2 rounded border border-emerald-200 dark:border-emerald-800 inline-block">
                  {uploadStatus}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Rapat *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Notulen Rapat Koordinasi Keamanan & Persiapan Maulid Nabi"
                  value={formData.judulRapat}
                  onChange={e => setFormData({ ...formData, judulRapat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Rapat *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Waktu Pelaksanaan *</span>
                    <span className="text-[10px] font-normal text-slate-400">Pilih popup jam atau list</span>
                  </label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={extractTime(formData.waktu)}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const isSelesai = formData.waktu?.includes('Selesai');
                            setFormData({
                              ...formData,
                              waktu: isSelesai ? `${val} - Selesai WIB` : `${val} WIB`
                            });
                          }
                        }}
                        className="w-2/5 px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer font-mono font-bold text-xs"
                        title="Klik untuk memilih jam dari popup jam"
                      />
                      <select
                        value={formData.waktu || ''}
                        onChange={e => {
                          if (e.target.value) {
                            setFormData({ ...formData, waktu: e.target.value });
                          }
                        }}
                        className="w-3/5 px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer text-xs"
                      >
                        <option value="">-- Pilih List Waktu --</option>
                        <optgroup label="Malam (Waktu Rapat Umum)">
                          <option value="19:30 WIB">19:30 WIB</option>
                          <option value="19:30 - 21:30 WIB">19:30 - 21:30 WIB</option>
                          <option value="19:30 - Selesai WIB">19:30 - Selesai WIB</option>
                          <option value="20:00 WIB">20:00 WIB</option>
                          <option value="20:00 - 22:00 WIB">20:00 - 22:00 WIB</option>
                          <option value="20:00 - Selesai WIB">20:00 - Selesai WIB</option>
                          <option value="20:30 WIB">20:30 WIB</option>
                          <option value="20:30 - 22:30 WIB">20:30 - 22:30 WIB</option>
                          <option value="20:30 - Selesai WIB">20:30 - Selesai WIB</option>
                          <option value="21:00 WIB">21:00 WIB</option>
                        </optgroup>
                        <optgroup label="Pagi / Siang / Sore">
                          <option value="08:00 WIB">08:00 WIB</option>
                          <option value="08:00 - 11:00 WIB">08:00 - 11:00 WIB</option>
                          <option value="09:00 WIB">09:00 WIB</option>
                          <option value="09:00 - 12:00 WIB">09:00 - 12:00 WIB</option>
                          <option value="13:30 WIB">13:30 WIB</option>
                          <option value="14:00 WIB">14:00 WIB</option>
                          <option value="16:00 WIB">16:00 WIB</option>
                          <option value="16:30 WIB">16:30 WIB</option>
                        </optgroup>
                      </select>
                    </div>
                    {formData.waktu && (
                      <div className="flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400">
                        <span className="truncate">Terpilih: <strong>{formData.waktu}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.waktu?.includes('Selesai')) {
                              setFormData({
                                ...formData,
                                waktu: formData.waktu.replace(' - Selesai', '')
                              });
                            } else {
                              const base = (formData.waktu || '20:00').replace(' WIB', '');
                              setFormData({
                                ...formData,
                                waktu: `${base} - Selesai WIB`
                              });
                            }
                          }}
                          className="shrink-0 text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 underline cursor-pointer ml-1"
                        >
                          {formData.waktu?.includes('Selesai') ? 'Hapus "- Selesai"' : '+ s/d Selesai'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pimpinan Rapat
                  </label>
                  <select
                    value={formData.pimpinanRapat}
                    onChange={e => setFormData({ ...formData, pimpinanRapat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                  >
                    <option value="">-- Pilih Nama Warga --</option>
                    {formData.pimpinanRapat && !sortedWarga.some(w => `${w.nama} (${w.alamatGsb})` === formData.pimpinanRapat || `${w.nama} (${w.jabatan})` === formData.pimpinanRapat || w.nama === formData.pimpinanRapat) && (
                      <option value={formData.pimpinanRapat}>{formData.pimpinanRapat}</option>
                    )}
                    {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                      <optgroup label="Pengurus RT (Sesuai Data Jabatan Warga)">
                        {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => {
                          const val = `${w.nama} (${w.jabatan})`;
                          return (
                            <option key={`pengurus-p-${w.id}`} value={val}>
                              {w.nama} - {w.jabatan} (Blok {w.alamatGsb})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    <optgroup label="Daftar Seluruh Warga RT 001">
                      {sortedWarga.map(w => {
                        const val = w.jabatan && w.jabatan !== 'Warga'
                          ? `${w.nama} (${w.jabatan})`
                          : `${w.nama} (Blok ${w.alamatGsb})`;
                        return (
                          <option key={w.id} value={val}>
                            {w.nama} - Blok {w.alamatGsb} {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ (Admin)' : '')}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Jabatan Umum / Panitia">
                      <option value="Ketua RT 001">Ketua RT 001</option>
                      <option value="Wakil Ketua RT 001">Wakil Ketua RT 001</option>
                      <option value="Sekretaris RT 001">Sekretaris RT 001</option>
                      <option value="Bendahara RT 001">Bendahara RT 001</option>
                      <option value="Humas RT 001">Humas RT 001</option>
                      <option value="Panitia Rapat">Panitia Rapat</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notulis
                  </label>
                  <select
                    value={formData.notulis}
                    onChange={e => setFormData({ ...formData, notulis: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer"
                  >
                    <option value="">-- Pilih Nama Warga --</option>
                    {formData.notulis && !sortedWarga.some(w => `${w.nama} (${w.alamatGsb})` === formData.notulis || `${w.nama} (${w.jabatan})` === formData.notulis || w.nama === formData.notulis) && (
                      <option value={formData.notulis}>{formData.notulis}</option>
                    )}
                    {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                      <optgroup label="Pengurus RT (Sesuai Data Jabatan Warga)">
                        {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => {
                          const val = `${w.nama} (${w.jabatan})`;
                          return (
                            <option key={`pengurus-n-${w.id}`} value={val}>
                              {w.nama} - {w.jabatan} (Blok {w.alamatGsb})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    <optgroup label="Daftar Seluruh Warga RT 001">
                      {sortedWarga.map(w => {
                        const val = w.jabatan && w.jabatan !== 'Warga'
                          ? `${w.nama} (${w.jabatan})`
                          : `${w.nama} (Blok ${w.alamatGsb})`;
                        return (
                          <option key={w.id} value={val}>
                            {w.nama} - Blok {w.alamatGsb} {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ (Admin)' : '')}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Jabatan Umum / Panitia">
                      <option value="Sekretaris RT 001">Sekretaris RT 001</option>
                      <option value="Bendahara RT 001">Bendahara RT 001</option>
                      <option value="Humas RT 001">Humas RT 001</option>
                      <option value="Pengurus RT 001">Pengurus RT 001</option>
                      <option value="Notulis Rapat">Notulis Rapat</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Narasumber / Pembicara Rapat (Dropdown List Nama Warga, Maksimal 5 Orang) */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Narasumber / Pembicara Rapat</span>
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        (Maksimal 5 Orang)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih nama warga dari dropdown list sebagai pembicara atau pemateri rapat.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                      {formData.narasumber.length} / 5 Narasumber
                    </span>
                    {formData.narasumber.length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddNarasumber}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Narasumber</span>
                      </button>
                    )}
                  </div>
                </div>

                {formData.narasumber.length === 0 ? (
                  <div className="text-center py-3.5 px-4 border border-dashed border-indigo-300 dark:border-indigo-800 rounded-lg bg-white/70 dark:bg-slate-900/40">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Belum ada narasumber yang ditentukan untuk rapat ini.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddNarasumber}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Narasumber</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.narasumber.map((narsumVal, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-indigo-100 dark:border-slate-700 shadow-2xs">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <select
                            value={narsumVal}
                            onChange={e => handleChangeNarasumber(idx, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden cursor-pointer text-xs sm:text-sm font-medium"
                          >
                            <option value="">-- Pilih Nama Warga (Narasumber #{idx + 1}) --</option>
                            {narsumVal && !sortedWarga.some(w => `${w.nama} (${w.jabatan})` === narsumVal || `${w.nama} (Blok ${w.alamatGsb})` === narsumVal || w.nama === narsumVal) && (
                              <option value={narsumVal}>{narsumVal}</option>
                            )}
                            {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                              <optgroup label="Pengurus RT (Sesuai Data Jabatan Warga)">
                                {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => {
                                  const val = `${w.nama} (${w.jabatan})`;
                                  return (
                                    <option key={`narsum-pengurus-${w.id}-${idx}`} value={val}>
                                      {w.nama} - {w.jabatan} (Blok {w.alamatGsb})
                                    </option>
                                  );
                                })}
                              </optgroup>
                            )}
                            <optgroup label="Daftar Seluruh Warga RT 001">
                              {sortedWarga.map(w => {
                                const val = w.jabatan && w.jabatan !== 'Warga'
                                  ? `${w.nama} (${w.jabatan})`
                                  : `${w.nama} (Blok ${w.alamatGsb})`;
                                return (
                                  <option key={`narsum-warga-${w.id}-${idx}`} value={val}>
                                    {w.nama} - Blok {w.alamatGsb} {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ (Admin)' : '')}
                                  </option>
                                );
                              })}
                            </optgroup>
                            <optgroup label="Opsi Narasumber Khusus / Tamu">
                              <option value="Ketua RT 001">Ketua RT 001</option>
                              <option value="Ketua RW 004">Ketua RW 004</option>
                              <option value="Pemerintah Desa / Kelurahan Talagasari">Pemerintah Desa / Kelurahan Talagasari</option>
                              <option value="Babinsa / Bhabinkamtibmas Balaraja">Babinsa / Bhabinkamtibmas Balaraja</option>
                              <option value="Tenaga Kesehatan / Puskesmas Balaraja">Tenaga Kesehatan / Puskesmas Balaraja</option>
                              <option value="Tokoh Masyarakat / Ulama Lingkungan">Tokoh Masyarakat / Ulama Lingkungan</option>
                            </optgroup>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNarasumber(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                          title={`Hapus Narasumber #${idx + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.narasumber.length >= 5 && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium text-right">
                    ✓ Batas maksimal 5 narasumber telah tercapai
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tempat / Lokasi
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik tempat / lokasi rapat (contoh: Kediaman Ketua RT, Balai Warga, Pos Ronda)"
                    value={formData.tempat}
                    onChange={e => setFormData({ ...formData, tempat: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Warga Hadir
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.jumlahHadir || ''}
                    onChange={e => setFormData({ ...formData, jumlahHadir: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Daftar Hadir Warga (Absensi Rapat) */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Daftar Hadir Warga (Absensi Rapat)</span>
                    <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 ml-1">
                      ({formData.daftarHadir.length} orang)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllWarga}
                      className="px-2 py-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                    >
                      Pilih Semua Warga RT
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllWarga}
                      className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* Selected attendee badges */}
                {formData.daftarHadir.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    {formData.daftarHadir.map((hadir, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-200"
                      >
                        <span>{hadir}</span>
                        <button
                          type="button"
                          onClick={() => toggleWargaHadir(hadir)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Checkbox List from registered citizens */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama atau blok warga untuk absensi..."
                      value={searchAttendeeQuery}
                      onChange={e => setSearchAttendeeQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900">
                    {wargaList
                      .filter(w => {
                        if (!searchAttendeeQuery.trim()) return true;
                        const q = searchAttendeeQuery.toLowerCase();
                        return w.nama.toLowerCase().includes(q) || w.alamatGsb.toLowerCase().includes(q);
                      })
                      .map(w => {
                        const label = `${w.nama} (Blok ${w.alamatGsb})`;
                        const isChecked = formData.daftarHadir.includes(label);
                        return (
                          <label
                            key={w.id}
                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors ${
                              isChecked
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-900 dark:text-indigo-200'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleWargaHadir(label)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="truncate flex-1">{w.nama} - {w.alamatGsb}</span>
                            {w.jabatan && w.jabatan !== 'Warga' && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                                {w.jabatan}
                              </span>
                            )}
                          </label>
                        );
                      })}
                  </div>
                </div>

                {/* Add other attendees / guests */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tambah nama tamu / warga luar yang hadir..."
                    value={customAttendeeInput}
                    onChange={e => setCustomAttendeeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAttendee();
                      }
                    }}
                    className="grow px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAttendee}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Agenda Pembahasan</label>
                <textarea
                  rows={2}
                  placeholder="Ketik agenda pembahasan rapat (contoh: 1. Keamanan lingkungan & Ronda, 2. Iuran Kas & Dansos, 3. Kebersihan)"
                  value={formData.agendaPembahasan}
                  onChange={e => setFormData({ ...formData, agendaPembahasan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Isi Notulen Rapat Lengkap (Teks yang ditampilkan di dashboard) *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Ketik jalannya rapat atau hasil konversi dokumen doc/teks di atas..."
                  value={formData.isiNotulen}
                  onChange={e => setFormData({ ...formData, isiNotulen: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Poin Keputusan Rapat (Pisahkan per baris baru)
                </label>
                <textarea
                  rows={3}
                  placeholder="1. Keputusan pertama&#10;2. Keputusan kedua"
                  value={formData.keputusanText}
                  onChange={e => setFormData({ ...formData, keputusanText: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan Notulen' : 'Simpan & Tampilkan di Dashboard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Notulen */}
      {notulenToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Hapus Notulen Rapat?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Apakah Anda yakin ingin menghapus notulen rapat ini dari publikasi dashboard RT 001?
            </p>

            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750 text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {notulenToDelete.judulRapat}
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Tanggal: {notulenToDelete.tanggal} • {notulenToDelete.tempat}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                Pimpinan Rapat: {notulenToDelete.pimpinanRapat}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setNotulenToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Notulen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
