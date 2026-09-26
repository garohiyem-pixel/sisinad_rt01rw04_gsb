import React, { useState, useMemo } from 'react';
import { AgendaKegiatan, UserSession, Warga, deduplicateAgenda } from '../types';
import { Calendar, Clock, MapPin, Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AgendaSectionProps {
  agendaList: AgendaKegiatan[];
  wargaList?: Warga[];
  currentUser: UserSession | null;
  onAddAgenda: (agenda: AgendaKegiatan) => Promise<void>;
  onUpdateAgenda: (id: string, agenda: Partial<AgendaKegiatan>) => Promise<void>;
  onDeleteAgenda: (id: string) => Promise<void>;
}

export const AgendaSection: React.FC<AgendaSectionProps> = ({
  agendaList,
  wargaList = [],
  currentUser,
  onAddAgenda,
  onUpdateAgenda,
  onDeleteAgenda
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [agendaToDelete, setAgendaToDelete] = useState<AgendaKegiatan | null>(null);

  const sortedWarga = useMemo(() => {
    return [...(wargaList || [])].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [wargaList]);

  const extractTime = (waktuStr?: string) => {
    if (!waktuStr) return '08:00';
    const match = waktuStr.match(/(\d{2}:\d{2})/);
    return match ? match[1] : '08:00';
  };

  const [formData, setFormData] = useState<Partial<AgendaKegiatan>>({
    judul: '',
    tanggal: new Date().toISOString().slice(0, 10),
    waktu: '08:00 WIB',
    lokasi: '',
    deskripsi: '',
    kategori: 'Kerja Bakti',
    status: 'Akan Datang',
    penanggungJawab: ''
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      judul: '',
      tanggal: new Date().toISOString().slice(0, 10),
      waktu: '08:00 WIB',
      lokasi: '',
      deskripsi: '',
      kategori: 'Kerja Bakti',
      status: 'Akan Datang',
      penanggungJawab: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: AgendaKegiatan) => {
    setEditingId(item.id);
    setFormData(item);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.tanggal) return;

    if (editingId) {
      await onUpdateAgenda(editingId, formData);
    } else {
      const newAgenda: AgendaKegiatan = {
        id: `ag-${Date.now()}`,
        judul: formData.judul || '',
        tanggal: formData.tanggal || '',
        waktu: formData.waktu || '',
        lokasi: formData.lokasi || '',
        deskripsi: formData.deskripsi || '',
        kategori: (formData.kategori as any) || 'Lainnya',
        status: (formData.status as any) || 'Akan Datang',
        penanggungJawab: formData.penanggungJawab || ''
      };
      await onAddAgenda(newAgenda);
    }
    setModalOpen(false);
  };

  const handleDeleteClick = (item: AgendaKegiatan) => {
    setAgendaToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (agendaToDelete) {
      await onDeleteAgenda(agendaToDelete.id);
      setAgendaToDelete(null);
    }
  };

  const getCategoryColor = (kat: string) => {
    switch (kat) {
      case 'Kerja Bakti':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Keagamaan':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Rapat':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Posyandu':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'Sosial':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  // Format date to Indonesian
  const formatTanggalIndo = (tglStr: string) => {
    try {
      const d = new Date(tglStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return tglStr;
    }
  };

  const sanitizedAgendaList = useMemo(() => deduplicateAgenda(agendaList), [agendaList]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Agenda & Jadwal Kegiatan Warga</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Jadwal kegiatan rutin dan khusus RT 001 RW 004 (Kerja Bakti, Maulid, Rapat, Posyandu)
          </p>
        </div>

        {currentUser?.isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Agenda Kegiatan</span>
          </button>
        )}
      </div>

      {/* List Agendas */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sanitizedAgendaList.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-slate-400 text-xs">
            Belum ada jadwal kegiatan yang ditambahkan.
          </div>
        ) : (
          sanitizedAgendaList.map((item, idx) => (
            <div
              key={item.id || `ag-${idx}`}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-850 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryColor(item.kategori)}`}>
                    {item.kategori}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {item.status === 'Selesai' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> {item.status}</span>
                    )}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-2 leading-snug">
                  {item.judul}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                  {item.deskripsi}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-750 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{formatTanggalIndo(item.tanggal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{item.waktu}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{item.lokasi}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    PJ: <strong className="text-slate-600 dark:text-slate-300">{item.penanggungJawab}</strong>
                  </span>

                  {currentUser?.isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors"
                        title="Edit Agenda"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-md transition-colors"
                        title="Hapus Agenda Ini"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Agenda */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingId ? 'Edit Jadwal Kegiatan' : 'Tambah Jadwal Kegiatan RT Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Kegiatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kerja Bakti Massal, Rapat Koordinasi, dll."
                  value={formData.judul || ''}
                  onChange={e => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal || ''}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Waktu Kegiatan *</span>
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
                        className="w-2/5 px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer font-mono font-bold text-xs"
                        title="Klik untuk memilih jam dari popup jam"
                      />
                      <select
                        value={formData.waktu || ''}
                        onChange={e => {
                          if (e.target.value) {
                            setFormData({ ...formData, waktu: e.target.value });
                          }
                        }}
                        className="w-3/5 px-2 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer text-xs"
                      >
                        <option value="">-- Pilih List Waktu --</option>
                        <optgroup label="Pagi / Siang">
                          <option value="06:00 WIB">06:00 WIB</option>
                          <option value="06:30 WIB">06:30 WIB</option>
                          <option value="07:00 WIB">07:00 WIB</option>
                          <option value="07:00 - 10:00 WIB">07:00 - 10:00 WIB</option>
                          <option value="07:30 WIB">07:30 WIB</option>
                          <option value="08:00 WIB">08:00 WIB</option>
                          <option value="08:00 - 11:00 WIB">08:00 - 11:00 WIB</option>
                          <option value="08:00 - Selesai WIB">08:00 - Selesai WIB</option>
                          <option value="08:30 WIB">08:30 WIB</option>
                          <option value="09:00 WIB">09:00 WIB</option>
                          <option value="10:00 WIB">10:00 WIB</option>
                          <option value="13:30 WIB">13:30 WIB</option>
                          <option value="14:00 WIB">14:00 WIB</option>
                          <option value="15:30 WIB">15:30 WIB</option>
                        </optgroup>
                        <optgroup label="Sore / Malam">
                          <option value="16:00 WIB">16:00 WIB</option>
                          <option value="16:30 WIB">16:30 WIB</option>
                          <option value="19:00 WIB">19:00 WIB</option>
                          <option value="19:30 WIB">19:30 WIB</option>
                          <option value="19:30 - 22:00 WIB">19:30 - 22:00 WIB</option>
                          <option value="19:30 - Selesai WIB">19:30 - Selesai WIB</option>
                          <option value="20:00 WIB">20:00 WIB</option>
                          <option value="20:00 - 22:00 WIB">20:00 - 22:00 WIB</option>
                          <option value="20:00 - Selesai WIB">20:00 - Selesai WIB</option>
                          <option value="20:30 WIB">20:30 WIB</option>
                          <option value="21:00 WIB">21:00 WIB</option>
                        </optgroup>
                      </select>
                    </div>
                    {formData.waktu && (
                      <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400">
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
                              const base = (formData.waktu || '08:00').replace(' WIB', '');
                              setFormData({
                                ...formData,
                                waktu: `${base} - Selesai WIB`
                              });
                            }
                          }}
                          className="shrink-0 text-[10px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-300 underline cursor-pointer ml-1"
                        >
                          {formData.waktu?.includes('Selesai') ? 'Hapus "- Selesai"' : '+ s/d Selesai'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                  <select
                    value={formData.kategori || 'Kerja Bakti'}
                    onChange={e => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Kerja Bakti">Kerja Bakti</option>
                    <option value="Keagamaan">Keagamaan / Maulid</option>
                    <option value="Rapat">Rapat Warga / Pengurus</option>
                    <option value="Posyandu">Posyandu</option>
                    <option value="Sosial">Sosial / Takziah</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status || 'Akan Datang'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Lokasi Kegiatan</label>
                <input
                  type="text"
                  placeholder="Ketik lokasi kegiatan (contoh: Lapangan Fasum RT 001, Pos Ronda, dll)"
                  value={formData.lokasi || ''}
                  onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Penanggung Jawab (PJ) *</label>
                <select
                  value={formData.penanggungJawab || ''}
                  onChange={e => setFormData({ ...formData, penanggungJawab: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                >
                  <option value="">-- Pilih Nama Warga (Penanggung Jawab) --</option>
                  {formData.penanggungJawab && !sortedWarga.some(w => `${w.nama} (${w.alamatGsb})` === formData.penanggungJawab || `${w.nama} (${w.jabatan})` === formData.penanggungJawab || w.nama === formData.penanggungJawab) && !['Ketua RT 001', 'Panitia Kegiatan RT 001', 'Pengurus RT 001'].includes(formData.penanggungJawab) && (
                    <option value={formData.penanggungJawab}>{formData.penanggungJawab}</option>
                  )}
                  {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                    <optgroup label="Pengurus RT (Sesuai Data Jabatan Warga)">
                      {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => {
                        const val = `${w.nama} (${w.jabatan})`;
                        return (
                          <option key={`pengurus-pj-${w.id}`} value={val}>
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
                        : `${w.nama} (${w.alamatGsb})`;
                      return (
                        <option key={w.id} value={val}>
                          {w.nama} - {w.alamatGsb} {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ (Admin)' : '')}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Opsi Panitia / Umum">
                    <option value="Ketua RT 001">Ketua RT 001</option>
                    <option value="Panitia Kegiatan RT 001">Panitia Kegiatan RT 001</option>
                    <option value="Pengurus RT 001">Pengurus RT 001</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  rows={3}
                  placeholder="Rincian kegiatan, perlengkapan yang perlu dibawa warga, dll."
                  value={formData.deskripsi || ''}
                  onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const currentItem = agendaList.find(a => a.id === editingId);
                      if (currentItem) {
                        setModalOpen(false);
                        handleDeleteClick(currentItem);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Agenda Ini</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Tambah Agenda'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Agenda */}
      {agendaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Konfirmasi Hapus Agenda Kegiatan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Apakah Anda yakin ingin menghapus agenda kegiatan berikut dari jadwal warga RT 001?
            </p>

            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {agendaToDelete.judul}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{formatTanggalIndo(agendaToDelete.tanggal)}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{agendaToDelete.waktu}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{agendaToDelete.lokasi}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAgendaToDelete(null)}
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
                <span>Ya, Hapus Agenda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
