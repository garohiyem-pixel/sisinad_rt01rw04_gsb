export type AkunKas = 'KAS' | 'DANSOS';
export type JenisTransaksi = 'masuk' | 'keluar';
export type StatusTinggal = 'Permanen' | 'Kontrak';
export type StatusPembayaran = 'verified' | 'pending' | 'rejected';
export type HubunganKeluarga = 'Istri' | 'Anak' | 'Orang Tua' | 'Mertua' | 'Famili Lain' | 'Lainnya';
export type JenisKelamin = 'Laki-laki' | 'Perempuan';
export type StatusKkAnggota = 'Menginduk' | 'Beda KK';

export interface AnggotaKeluarga {
  id: string;
  nama: string;
  nik?: string;
  hubungan: HubunganKeluarga | string;
  // Status Kartu Keluarga
  statusKk?: StatusKkAnggota; // 'Menginduk' (ikut KK Kepala Keluarga) atau 'Beda KK' (KK terpisah)
  noKk?: string;              // Nomor KK (16 digit), wajib diisi jika statusKk === 'Beda KK'
  fotoKk?: string;            // Base64 dokumen KK, wajib diunggah jika statusKk === 'Beda KK'
  jenisKelamin?: JenisKelamin | string;
  tempatLahir?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  tempatTanggalLahir?: string; // backward compat
  pekerjaan?: string;
  pendidikan?: string;
  pekerjaanPendidikan?: string; // backward compat
  noHp?: string;
  keterangan?: string; // Misal: 'Balita', 'Pelajar', 'Lansia'
  isKtpTalagasari?: boolean; // Pilihan KTP Talagasari atau Luar
  fotoKtp?: string; // Base64 data URL / image URL
}

export interface Warga {
  id: string;
  nik: string;
  noKk: string;
  nama: string;
  alamatGsb: string; // Misal: "F2/22", "Blok A1 No 05"
  gang: string;      // "Gang 1", "Gang 2", "Gang 3", "Gang 4", "Gang 5"
  alamatKtp: string; // Alamat lengkap sesuai KTP
  isKtpTalagasari: boolean; // Otomatis terdeteksi atau dipilih (apakah KTP Ds. Talagasari)
  noHp: string;
  statusTinggal: StatusTinggal;
  isAdmin: boolean;
  jabatan?: string; // 'Ketua RT' | 'Sekretaris RT' | 'Bendahara RT' | 'Humas RT' | 'Warga' | custom
  password?: string;
  jenisKelamin?: JenisKelamin | string;
  tempatLahir?: string;
  tanggalLahir?: string; // YYYY-MM-DD
  pekerjaan?: string;
  pendidikan?: string;
  keterangan?: string;
  fotoKtp?: string; // Base64 foto/scan KTP Kepala Keluarga
  fotoKk?: string;  // Base64 foto/scan Kartu Keluarga
  anggotaKeluarga?: AnggotaKeluarga[];
  createdAt: string;
}

export interface TransaksiKas {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: JenisTransaksi;
  akun: AkunKas;
  nominal: number;
  peruntukan: string; // Deskripsi/keterangan keperluan
  alamatGsb?: string; // Alamat warga jika iuran masuk
  namaWarga?: string;
  periodeBulan?: string; // Format: YYYY-MM
  metode: 'Tunai' | 'Transfer Bank Jago' | 'DANA' | 'GoPay' | 'SeaBank' | 'QRIS';
  status: StatusPembayaran;
  buktiBayar?: string; // base64 / URL gambar bukti
  catatan?: string;
  inputBy: string; // "Admin" atau alamatGsb
  createdAt: string;
}

export interface AgendaKegiatan {
  id: string;
  judul: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;   // Misal: "07:30 - Selesai WIB"
  lokasi: string;
  deskripsi: string;
  kategori: 'Kerja Bakti' | 'Rapat' | 'Keagamaan' | 'Posyandu' | 'Sosial' | 'Lainnya';
  status: 'Akan Datang' | 'Selesai' | 'Berlangsung';
  penanggungJawab: string;
}

export interface NotulenRapat {
  id: string;
  judulRapat: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;
  tempat: string;
  pimpinanRapat: string;
  notulis: string;
  narasumber?: string[]; // Daftar nama narasumber / pemateri rapat (maks. 5 orang)
  jumlahHadir: number;
  daftarHadir?: string[]; // Daftar nama/warga yang hadir dalam rapat
  agendaPembahasan: string;
  isiNotulen: string; // Isi lengkap teks notulen
  keputusan: string[]; // Butir-butir keputusan rapat
  dokumenAsliNama?: string; // Nama file .doc/.docx/.pdf yang diupload
  createdAt: string;
}

export type KategoriPengaduan = 
  | 'Keamanan & Ketertiban' 
  | 'Fasilitas & Infrastruktur' 
  | 'Kebersihan & Lingkungan' 
  | 'Sosial & Kemasyarakatan' 
  | 'Lainnya';

export type StatusPengaduan = 
  | 'Menunggu'    // Baru diajukan / pending review pengurus
  | 'Diproses'    // Sedang ditindaklanjuti
  | 'Selesai'     // Tuntas ditangani
  | 'Ditolak';    // Tidak relevan / dibatalkan

export interface PengaduanWarga {
  id: string;
  pelaporUserId?: string; // ID user akun warga yang mengajukan
  judul: string;
  kategori: KategoriPengaduan;
  deskripsi: string;
  lokasiGang: string; // e.g. "Gang Ceria", "Gang Kembar", "Fasum / Lapangan", dll.
  namaPelapor: string;
  alamatGsb: string; // Blok rumah pelapor, e.g. "D11/33"
  isAnonim: boolean; // Jika true, identitas pelapor (Nama & Blok Rumah) otomatis disamarkan
  noHp?: string; // Kontak untuk konfirmasi tindak lanjut (opsional)
  fotoBukti?: string; // Base64 data URL foto
  status: StatusPengaduan;
  tanggapanRt?: string; // Catatan respon / progres penanganan dari pengurus RT
  tanggalTanggapan?: string;
  petugasPenindak?: string; // Seksi / Pengurus yang menangani (e.g. "Seksi Keamanan & Ketertiban")
  createdAt: string;
}

export interface RekeningBank {
  bank: string;
  atasNama: string;
  nomorRekening: string;
  nomorDana: string;
  nomorGopay: string;
  nomorSeabank: string;
  keterangan: string;
}

export interface AppSettings {
  namaRtRw: string;
  perumahan: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  logoUrl: string;
  rekening: RekeningBank;
  iuranKasNominal: number;
  iuranDansosNominal: number;
  periodeAktif: string; // e.g. "2026-09"
  daftarGang?: string[]; // List nama gang RT 001 (e.g. ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'])
}

export interface DatabaseSchema {
  settings: AppSettings;
  warga: Warga[];
  kas: TransaksiKas[];
  agenda: AgendaKegiatan[];
  notulen: NotulenRapat[];
  pengaduan?: PengaduanWarga[];
  lastModified?: number;
  version?: number;
}

export interface UserSession {
  alamatGsb: string;
  nama: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  id: string;
  gang?: string;
  jabatan?: string;
}

/**
 * Comparator to sort Warga:
 * Warga yang pertama di-input berada paling bawah, dan yang baru di-input berada paling atas.
 * 1. Most recent `createdAt` timestamp on top (descending)
 * 2. If createdAt equal or missing, numeric timestamp from `id` on top (descending)
 * 3. Fallback to id string comparison (descending)
 */
export function sortWargaNewestFirst(a: Warga, b: Warga): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. By createdAt descending (newest timestamp on top)
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (timeB !== timeA) {
    return timeB - timeA;
  }

  // 2. Extract numeric ID e.g. w-1789... vs w-1
  const extractIdNum = (id: string = '') => {
    const match = id.match(/w-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const idNumA = extractIdNum(a.id);
  const idNumB = extractIdNum(b.id);
  if (idNumB !== idNumA) {
    return idNumB - idNumA;
  }

  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Comparator to sort Kas transactions:
 * 1. Most recent `tanggal` (YYYY-MM-DD) on top (descending)
 * 2. If same date, most recent `createdAt` timestamp on top (descending)
 * 3. If createdAt equal or missing, numeric timestamp from `id` on top (descending)
 * 4. Fallback to id string comparison
 */
export function sortKasNewestFirst(a: TransaksiKas, b: TransaksiKas): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. By tanggal descending (e.g. 2026-09-16 before 2026-09-15)
  const dateA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
  const dateB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
  if (dateB !== dateA) {
    return dateB - dateA;
  }

  // 2. By createdAt descending (newest input timestamp first)
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (timeB !== timeA) {
    return timeB - timeA;
  }

  // 3. Extract numeric timestamp from ID if starts with k-<timestamp>
  const extractIdTime = (id: string = '') => {
    const match = id.match(/k-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const idTimeA = extractIdTime(a.id);
  const idTimeB = extractIdTime(b.id);
  if (idTimeB !== idTimeA) {
    return idTimeB - idTimeA;
  }

  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Deduplicate kas items by id, keeping the first occurrence and sorting newest first
 */
export function deduplicateKas(kasList: TransaksiKas[]): TransaksiKas[] {
  if (!Array.isArray(kasList)) return [];
  const seen = new Set<string>();
  const result: TransaksiKas[] = [];
  for (const raw of kasList) {
    if (!raw || !raw.id) continue;
    if (!seen.has(raw.id)) {
      seen.add(raw.id);
      let item = { ...raw };
      // If tanggal is present in standard YYYY-MM format, synchronize periodeBulan
      // especially if it was defaulted to '2026-09' while the actual transaction occurred in another month
      if (item.tanggal && item.tanggal.length >= 7) {
        const match = item.tanggal.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          const tglMonth = `${match[1]}-${match[2].padStart(2, '0')}`;
          if (!item.periodeBulan || (item.periodeBulan === '2026-09' && tglMonth !== '2026-09')) {
            item.periodeBulan = tglMonth;
          }
        }
      }
      result.push(item);
    }
  }
  return result.sort(sortKasNewestFirst);
}

/**
 * Sort notulen newest first (by tanggal descending, then createdAt/id descending)
 */
export function sortNotulenNewestFirst(a: NotulenRapat, b: NotulenRapat): number {
  const dateA = a?.tanggal ? new Date(a.tanggal).getTime() : 0;
  const dateB = b?.tanggal ? new Date(b.tanggal).getTime() : 0;
  if (dateB !== dateA) {
    return dateB - dateA;
  }
  const createdA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createdB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (createdB !== createdA) {
    return createdB - createdA;
  }
  return (b?.id || '').localeCompare(a?.id || '');
}

/**
 * Deduplicate notulen items by id, keeping the first occurrence and sorting newest first
 */
export function deduplicateNotulen(notulenList: NotulenRapat[]): NotulenRapat[] {
  if (!Array.isArray(notulenList)) return [];
  const seen = new Set<string>();
  const result: NotulenRapat[] = [];
  for (const item of notulenList) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result.sort(sortNotulenNewestFirst);
}

/**
 * Deduplicate agenda items by id, keeping the first occurrence
 */
export function deduplicateAgenda(agendaList: AgendaKegiatan[]): AgendaKegiatan[] {
  if (!Array.isArray(agendaList)) return [];
  const seen = new Set<string>();
  const result: AgendaKegiatan[] = [];
  for (const item of agendaList) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Deduplicate warga items by id, keeping the first occurrence
 */
export function deduplicateWarga(wargaList: Warga[]): Warga[] {
  if (!Array.isArray(wargaList)) return [];
  const seen = new Set<string>();
  const result: Warga[] = [];
  for (const item of wargaList) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Comparator to sort Pengaduan items newest first
 */
export function sortPengaduanNewestFirst(a: PengaduanWarga, b: PengaduanWarga): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (timeB !== timeA) return timeB - timeA;
  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Deduplicate pengaduan items by id
 */
export function deduplicatePengaduan(pengaduanList: PengaduanWarga[]): PengaduanWarga[] {
  if (!Array.isArray(pengaduanList)) return [];
  const seen = new Set<string>();
  const result: PengaduanWarga[] = [];
  for (const item of pengaduanList) {
    if (!item || !item.id) continue;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result.sort(sortPengaduanNewestFirst);
}

