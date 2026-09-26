import React, { useState, useMemo } from 'react';
import { TransaksiKas, AppSettings, Warga } from '../types';
import { Download, X, Calendar, Landmark, HeartHandshake, CheckCircle2, UserCheck, Loader2, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

interface LaporanKasModalProps {
  isOpen: boolean;
  onClose: () => void;
  kasList: TransaksiKas[];
  settings: AppSettings;
  wargaList?: Warga[];
}

export const LaporanKasModal: React.FC<LaporanKasModalProps> = ({
  isOpen,
  onClose,
  kasList,
  settings,
  wargaList = []
}) => {
  const [selectedPeriode, setSelectedPeriode] = useState<string>('2026-09');

  // Sorted list of warga for dropdown selection
  const sortedWarga = useMemo(() => {
    if (!wargaList || wargaList.length === 0) return [];
    return [...wargaList].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [wargaList]);

  // Default values must be EMPTY as requested: default kosong
  const [namaKetuaRT, setNamaKetuaRT] = useState<string>('');
  const [namaBendahara, setNamaBendahara] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Available unique periods
  const periods = useMemo(() => {
    const set = new Set<string>();
    kasList.forEach(k => {
      if (k.tanggal && k.tanggal.length >= 7) set.add(k.tanggal.slice(0, 7));
      if (k.periodeBulan) set.add(k.periodeBulan);
    });
    return Array.from(set).sort().reverse();
  }, [kasList]);

  // Filter transactions by selected period (or all)
  const filteredKas = useMemo(() => {
    return kasList.filter(k => {
      if (k.status !== 'verified') return false;
      if (selectedPeriode === 'ALL') return true;
      const pTgl = (k.tanggal && k.tanggal.length >= 7) ? k.tanggal.slice(0, 7) : null;
      return k.periodeBulan === selectedPeriode || pTgl === selectedPeriode;
    });
  }, [kasList, selectedPeriode]);

  // Separate accounts and directions
  const kasMasuk = filteredKas.filter(k => k.akun === 'KAS' && k.jenis === 'masuk');
  const kasKeluar = filteredKas.filter(k => k.akun === 'KAS' && k.jenis === 'keluar');
  const totalKasMasuk = kasMasuk.reduce((a, b) => a + b.nominal, 0);
  const totalKasKeluar = kasKeluar.reduce((a, b) => a + b.nominal, 0);
  const subtotalSaldoKas = totalKasMasuk - totalKasKeluar;

  const dansosMasuk = filteredKas.filter(k => k.akun === 'DANSOS' && k.jenis === 'masuk');
  const dansosKeluar = filteredKas.filter(k => k.akun === 'DANSOS' && k.jenis === 'keluar');
  const totalDansosMasuk = dansosMasuk.reduce((a, b) => a + b.nominal, 0);
  const totalDansosKeluar = dansosKeluar.reduce((a, b) => a + b.nominal, 0);
  const subtotalSaldoDansos = totalDansosMasuk - totalDansosKeluar;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getPeriodeLabel = (p: string) => {
    if (p === 'ALL') return 'Seluruh Riwayat Transaksi (Semua Periode)';
    const [y, m] = p.split('-');
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const idx = parseInt(m, 10) - 1;
    return `${months[idx] || m} ${y}`;
  };

  const handleDownloadPDF = async () => {
    const originalElement = document.getElementById('printable-report');
    if (!originalElement) return;

    try {
      setIsGeneratingPdf(true);
      setStatusMessage('Sedang menyiapkan dokumen PDF lengkap...');

      // Clone original element off-screen without any max-height or overflow constraints
      const clone = originalElement.cloneNode(true) as HTMLElement;
      clone.id = 'printable-report-pdf-clone';
      clone.style.width = '794px';
      clone.style.minWidth = '794px';
      clone.style.maxWidth = '794px';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.position = 'fixed';
      clone.style.top = '-99999px';
      clone.style.left = '0px';
      clone.style.zIndex = '-9999';
      clone.style.backgroundColor = '#ffffff';
      clone.style.boxSizing = 'border-box';

      document.body.appendChild(clone);

      // Brief delay to ensure styles are painted
      await new Promise(resolve => setTimeout(resolve, 80));

      const fullHeight = clone.scrollHeight || clone.offsetHeight;

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: fullHeight,
        windowWidth: 794,
        windowHeight: fullHeight,
        scrollY: 0,
        scrollX: 0
      });

      // Remove clone from DOM
      clone.remove();

      // Initialize jsPDF (A4 portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 10; // mm
      const usableWidth = pageWidth - (margin * 2); // 190 mm
      const usableHeight = pageHeight - (margin * 2); // 277 mm

      const pxPerMm = canvas.width / usableWidth;
      const pageCanvasHeightInPx = Math.floor(usableHeight * pxPerMm);

      let renderedHeight = 0;
      let pageIndex = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeightInPx, canvas.height - renderedHeight);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            renderedHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
        }

        const sliceHeightInMm = sliceHeight / pxPerMm;
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(pageImgData, 'JPEG', margin, margin, usableWidth, sliceHeightInMm);

        renderedHeight += sliceHeight;
        pageIndex++;
      }

      const cleanPeriode = selectedPeriode === 'ALL' ? 'Semua_Periode' : selectedPeriode;
      pdf.save(`Laporan_Kas_RT001_RW004_${cleanPeriode}.pdf`);
      setStatusMessage('File PDF berhasil diunduh lengkap!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Gagal generate PDF:', err);
      const existingClone = document.getElementById('printable-report-pdf-clone');
      if (existingClone) existingClone.remove();
      setStatusMessage('Terjadi kendala saat unduh PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print-modal-portal print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print-modal-container print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex flex-col gap-3 print-controls print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Download className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm">Unduh Laporan Kas RT & Dansos (PDF)</h3>
                <p className="text-xs text-slate-300">Dokumen resmi A4 lengkap dengan rincian transaksi dan tanda tangan pengurus</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Periode selector */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300">Periode:</span>
                <select
                  value={selectedPeriode}
                  onChange={e => setSelectedPeriode(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-hidden cursor-pointer"
                >
                  {periods.map(p => (
                    <option key={p} value={p} className="bg-slate-900 text-white">
                      {getPeriodeLabel(p)}
                    </option>
                  ))}
                  <option value="ALL" className="bg-slate-900 text-white">Semua Periode</option>
                </select>
              </div>

              {/* Tombol Unduh PDF Asli */}
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                title="Unduh langsung sebagai file dokumen PDF"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="text-xs py-1.5 px-3 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-200 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Form Input & Dropdown List Warga untuk Tanda Tangan Ketua RT & Bendahara */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Pilihan Ketua RT */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1.5">
              <label className="block text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  Nama Ketua RT (Penandatangan)
                </span>
              </label>
              <select
                onChange={e => setNamaKetuaRT(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-hidden"
                value={sortedWarga.some(w => w.nama === namaKetuaRT) ? namaKetuaRT : ''}
              >
                <option value="">-- Pilih Nama Warga --</option>
                {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                  <optgroup label="Pengurus RT (Sesuai Jabatan)">
                    {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => (
                      <option key={`k-pengurus-${w.id}`} value={w.nama}>
                        {w.nama} - {w.jabatan} (Blok {w.alamatGsb})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Seluruh Warga RT 001">
                  {sortedWarga.map(w => (
                    <option key={w.id} value={w.nama}>
                      {w.nama} (Blok {w.alamatGsb}) {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ Admin' : '')}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={namaKetuaRT}
                onChange={e => setNamaKetuaRT(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 text-white rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Pilihan Bendahara */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1.5">
              <label className="block text-slate-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Nama Bendahara (Penandatangan)
                </span>
              </label>
              <select
                onChange={e => setNamaBendahara(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
                value={sortedWarga.some(w => w.nama === namaBendahara) ? namaBendahara : ''}
              >
                <option value="">-- Pilih Nama Warga --</option>
                {sortedWarga.some(w => w.jabatan && w.jabatan !== 'Warga') && (
                  <optgroup label="Pengurus RT (Sesuai Jabatan)">
                    {sortedWarga.filter(w => w.jabatan && w.jabatan !== 'Warga').map(w => (
                      <option key={`b-pengurus-${w.id}`} value={w.nama}>
                        {w.nama} - {w.jabatan} (Blok {w.alamatGsb})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Seluruh Warga RT 001">
                  {sortedWarga.map(w => (
                    <option key={w.id} value={w.nama}>
                      {w.nama} (Blok {w.alamatGsb}) {w.jabatan && w.jabatan !== 'Warga' ? `[${w.jabatan}]` : (w.isAdmin ? '★ Admin' : '')}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={namaBendahara}
                onChange={e => setNamaBendahara(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 text-white rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Printable Document Paper Area */}
        <div id="printable-report" className="p-6 sm:p-10 overflow-y-auto text-slate-900 bg-white space-y-6 text-xs sm:text-sm">
          
          {/* KOP SURAT RESMI */}
          <div className="border-b-2 border-slate-900 pb-4 relative flex items-center justify-between gap-4">
            <div className="w-14 h-14 shrink-0 flex items-center justify-center">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt="Logo RT" 
                  className="w-14 h-14 object-contain" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-700 text-white flex flex-col items-center justify-center font-bold text-xs">
                  <div>RT 01</div>
                  <div className="text-[10px]">RW 04</div>
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <div className="uppercase font-extrabold tracking-wider text-base sm:text-lg text-slate-900 leading-tight">
                RUKUN TETANGGA 001 / RUKUN WARGA 004
              </div>
              <div className="uppercase font-bold tracking-tight text-sm sm:text-base text-slate-800 mt-0.5">
                {settings.perumahan}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {settings.desa}, {settings.kecamatan}, {settings.kabupaten}
              </div>
            </div>
            <div className="w-14 h-14 shrink-0 hidden sm:block"></div>
          </div>

          {/* Document Title */}
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide underline underline-offset-4">
              LAPORAN KEUANGAN KAS & DANA SOSIAL
            </h2>
            <div className="text-xs font-semibold text-slate-600">
              Periode Laporan: <span className="text-slate-900 uppercase">{getPeriodeLabel(selectedPeriode)}</span>
            </div>
          </div>

          {/* BAGIAN 1: AKUN KAS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-blue-600 pb-1.5 text-blue-900">
              <Landmark className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                I. Rincian Keuangan Akun KAS (Kas Operasional & Pembangunan RT)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kas Masuk */}
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="font-bold text-xs text-emerald-800 pb-1 mb-2 border-b border-slate-100 flex justify-between">
                  <span>A. Pemasukan Akun KAS</span>
                  <span>{kasMasuk.length} Transaksi</span>
                </div>
                {kasMasuk.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-2 text-xs">Tidak ada pemasukan pada periode ini</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-1">Tgl / Warga</th>
                        <th className="py-1">Peruntukan</th>
                        <th className="py-1 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kasMasuk.map(k => (
                        <tr key={k.id}>
                          <td className="py-1 pr-2 font-mono text-[11px]">
                            {k.tanggal}
                            {k.alamatGsb && <span className="block text-slate-500 font-sans text-[10px]">Rumah {k.alamatGsb}</span>}
                          </td>
                          <td className="py-1 text-slate-700">{k.peruntukan}</td>
                          <td className="py-1 text-right font-medium text-emerald-700">{formatRupiah(k.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-emerald-800">
                  <span>Total Pemasukan KAS:</span>
                  <span>{formatRupiah(totalKasMasuk)}</span>
                </div>
              </div>

              {/* Kas Keluar */}
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="font-bold text-xs text-rose-800 pb-1 mb-2 border-b border-slate-100 flex justify-between">
                  <span>B. Pengeluaran Akun KAS</span>
                  <span>{kasKeluar.length} Transaksi</span>
                </div>
                {kasKeluar.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-2 text-xs">Tidak ada pengeluaran pada periode ini</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-1">Tgl</th>
                        <th className="py-1">Peruntukan / Keperluan</th>
                        <th className="py-1 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kasKeluar.map(k => (
                        <tr key={k.id}>
                          <td className="py-1 pr-2 font-mono text-[11px]">{k.tanggal}</td>
                          <td className="py-1 text-slate-700">{k.peruntukan}</td>
                          <td className="py-1 text-right font-medium text-rose-700">{formatRupiah(k.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-rose-800">
                  <span>Total Pengeluaran KAS:</span>
                  <span>{formatRupiah(totalKasKeluar)}</span>
                </div>
              </div>
            </div>

            {/* Subtotal Kas */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 flex justify-between items-center text-xs sm:text-sm font-bold text-blue-950">
              <span>SUBTOTAL SALDO AKUN KAS (Pemasukan - Pengeluaran):</span>
              <span className="text-base text-blue-800">{formatRupiah(subtotalSaldoKas)}</span>
            </div>
          </div>

          {/* BAGIAN 2: AKUN DANSOS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 border-b border-emerald-600 pb-1.5 text-emerald-900">
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm uppercase tracking-wide">
                II. Rincian Keuangan Akun DANSOS (Dana Sosial & Santunan Warga)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dansos Masuk */}
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="font-bold text-xs text-emerald-800 pb-1 mb-2 border-b border-slate-100 flex justify-between">
                  <span>A. Pemasukan Akun DANSOS</span>
                  <span>{dansosMasuk.length} Transaksi</span>
                </div>
                {dansosMasuk.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-2 text-xs">Tidak ada pemasukan dansos pada periode ini</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-1">Tgl / Warga</th>
                        <th className="py-1">Peruntukan</th>
                        <th className="py-1 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dansosMasuk.map(k => (
                        <tr key={k.id}>
                          <td className="py-1 pr-2 font-mono text-[11px]">
                            {k.tanggal}
                            {k.alamatGsb && <span className="block text-slate-500 font-sans text-[10px]">Rumah {k.alamatGsb}</span>}
                          </td>
                          <td className="py-1 text-slate-700">{k.peruntukan}</td>
                          <td className="py-1 text-right font-medium text-emerald-700">{formatRupiah(k.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-emerald-800">
                  <span>Total Pemasukan DANSOS:</span>
                  <span>{formatRupiah(totalDansosMasuk)}</span>
                </div>
              </div>

              {/* Dansos Keluar */}
              <div className="border border-slate-200 rounded-lg p-3">
                <div className="font-bold text-xs text-rose-800 pb-1 mb-2 border-b border-slate-100 flex justify-between">
                  <span>B. Pengeluaran Akun DANSOS</span>
                  <span>{dansosKeluar.length} Transaksi</span>
                </div>
                {dansosKeluar.length === 0 ? (
                  <div className="text-slate-400 italic text-center py-2 text-xs">Tidak ada pengeluaran dansos pada periode ini</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-1">Tgl</th>
                        <th className="py-1">Peruntukan / Santunan</th>
                        <th className="py-1 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dansosKeluar.map(k => (
                        <tr key={k.id}>
                          <td className="py-1 pr-2 font-mono text-[11px]">{k.tanggal}</td>
                          <td className="py-1 text-slate-700">{k.peruntukan}</td>
                          <td className="py-1 text-right font-medium text-rose-700">{formatRupiah(k.nominal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-xs text-rose-800">
                  <span>Total Pengeluaran DANSOS:</span>
                  <span>{formatRupiah(totalDansosKeluar)}</span>
                </div>
              </div>
            </div>

            {/* Subtotal Dansos */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 flex justify-between items-center text-xs sm:text-sm font-bold text-emerald-950">
              <span>SUBTOTAL SALDO AKUN DANSOS (Pemasukan - Pengeluaran):</span>
              <span className="text-base text-emerald-800">{formatRupiah(subtotalSaldoDansos)}</span>
            </div>
          </div>

          {/* BAGIAN 3: REKAPITULASI AKHIR SALDO MASING-MASING AKUN (TERPISAH & NON-GABUNG) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  III. Rekapitulasi Akhir Saldo Kas & Dansos
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Dua pos alokasi mandiri yang berdiri sendiri sesuai ketetapan musyawarah RT 001 RW 004
                </div>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saldo Terverifikasi & Riil
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-800/80 rounded-lg p-3 border border-sky-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-sky-300 font-bold uppercase tracking-wider">
                    Saldo Akhir Akun KAS (Operasional RT)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Masuk: {formatRupiah(totalKasMasuk)} | Keluar: {formatRupiah(totalKasKeluar)}
                  </div>
                </div>
                <div className="text-xl font-black text-sky-300">
                  {formatRupiah(subtotalSaldoKas)}
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-lg p-3 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
                    Saldo Akhir Akun DANSOS (Santunan Warga)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Masuk: {formatRupiah(totalDansosMasuk)} | Keluar: {formatRupiah(totalDansosKeluar)}
                  </div>
                </div>
                <div className="text-xl font-black text-emerald-300">
                  {formatRupiah(subtotalSaldoDansos)}
                </div>
              </div>
            </div>
          </div>

          {/* TANDA TANGAN PENGURUS RT */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs sm:text-sm avoid-page-break">
            <div>
              <div className="text-slate-500 mb-16">
                Mengetahui,<br />
                <strong>Ketua RT 001 RW 004</strong>
              </div>
              <div className="font-bold underline text-slate-900 uppercase tracking-wide min-h-[22px]">
                {namaKetuaRT.trim() ? namaKetuaRT : '( .................................................. )'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Ketua RT 001 RW 004</div>
            </div>

            <div>
              <div className="text-slate-500 mb-16">
                Balaraja, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />
                <strong>Bendahara RT 001 RW 004</strong>
              </div>
              <div className="font-bold underline text-slate-900 uppercase tracking-wide min-h-[22px]">
                {namaBendahara.trim() ? namaBendahara : '( .................................................. )'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Bendahara / Pengelola Kas</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
