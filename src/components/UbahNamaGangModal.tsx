import React, { useState } from 'react';
import { Warga, AppSettings } from '../types';
import { MapPin, Edit3, Check, X, Plus, AlertCircle, Users, CheckCircle2, Trash2 } from 'lucide-react';

interface UbahNamaGangModalProps {
  isOpen: boolean;
  onClose: () => void;
  daftarGang: string[];
  wargaList: Warga[];
  onRenameGang: (oldName: string, newName: string) => Promise<void>;
  onAddGang: (newGangName: string) => Promise<void>;
  onDeleteGang?: (gangName: string) => Promise<void>;
}

export const UbahNamaGangModal: React.FC<UbahNamaGangModalProps> = ({
  isOpen,
  onClose,
  daftarGang,
  wargaList,
  onRenameGang,
  onAddGang,
  onDeleteGang
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [newGangInput, setNewGangInput] = useState<string>('');
  const [showAddInput, setShowAddInput] = useState<boolean>(false);
  const [gangToDelete, setGangToDelete] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentGangs = daftarGang && daftarGang.length > 0
    ? daftarGang
    : ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];

  const getWargaCount = (gangName: string) => {
    return wargaList.filter(w => w.gang === gangName).length;
  };

  const startEdit = (index: number, currentName: string) => {
    setEditingIndex(index);
    setTempName(currentName);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setTempName('');
  };

  const handleSaveRename = async (index: number, oldName: string) => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      setStatusMessage('Nama gang tidak boleh kosong.');
      return;
    }
    if (trimmed === oldName) {
      setEditingIndex(null);
      return;
    }

    try {
      setIsSubmitting(true);
      await onRenameGang(oldName, trimmed);
      setEditingIndex(null);
      setStatusMessage(`Nama gang "${oldName}" berhasil diganti menjadi "${trimmed}".`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage('Gagal mengubah nama gang: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewGang = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGangInput.trim();
    if (!trimmed) return;
    if (currentGangs.includes(trimmed)) {
      setStatusMessage(`Gang dengan nama "${trimmed}" sudah ada.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddGang(trimmed);
      setNewGangInput('');
      setShowAddInput(false);
      setStatusMessage(`Gang baru "${trimmed}" berhasil ditambahkan.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage('Gagal menambah gang: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteGang = async () => {
    if (!gangToDelete || !onDeleteGang) return;
    const target = gangToDelete;
    try {
      setIsSubmitting(true);
      await onDeleteGang(target);
      setGangToDelete(null);
      setStatusMessage(`Gang "${target}" berhasil dihapus.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage('Gagal menghapus gang: ' + (err?.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Kelola & Ubah Nama Gang RT 001
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah nama gang dan otomatis perbarui data alamat warga terkait
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast/Alert */}
        {statusMessage && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-300">
          <p className="leading-relaxed">
            <strong>Sinkronisasi Otomatis:</strong> Saat Anda mengubah nama gang, seluruh data warga dan diagram dashboard langsung terintegrasi dan otomatis disesuaikan ke nama baru secara realtime.
          </p>
        </div>

        {/* Gang List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {currentGangs.map((gang, index) => {
            const count = getWargaCount(gang);
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 transition-all"
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      placeholder="Masukkan nama gang baru..."
                      autoFocus
                      className="flex-1 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-slate-900 dark:text-white focus:outline-hidden"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveRename(index, gang);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button
                      onClick={() => handleSaveRename(index, gang)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                      title="Simpan Perubahan"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan</span>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {gang}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{count} KK / Warga Terdaftar</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Tombol Ubah Nama - Jelas terlihat dengan warna Amber kontras tinggi */}
                      <button
                        onClick={() => startEdit(index, gang)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                        title="Ubah Nama Gang Ini"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-950" />
                        <span>Ubah Nama</span>
                      </button>

                      {/* Tombol Hapus Gang - Hanya tampil jika belum ada warga yang terdaftar di gang tersebut (count === 0) */}
                      {onDeleteGang && count === 0 && currentGangs.length > 1 && (
                        <button
                          onClick={() => setGangToDelete(gang)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 active:bg-rose-300 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                          title={`Hapus ${gang} (0 Warga)`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Gang Option */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          {showAddInput ? (
            <form onSubmit={handleCreateNewGang} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Contoh: Gang Anggrek atau Gang 6 (Blok F5)"
                value={newGangInput}
                onChange={e => setNewGangInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newGangInput.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Tambah
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddInput(false);
                  setNewGangInput('');
                }}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAddInput(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Nama Gang Baru</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Konfirmasi Hapus Gang Kosong */}
      {gangToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Hapus Gang?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gang ini tidak memiliki warga terdaftar (0 Warga).</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-4">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">"{gangToDelete}"</strong> dari daftar gang RT 001?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGangToDelete(null)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGang}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
