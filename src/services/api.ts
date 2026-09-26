import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot 
} from 'firebase/firestore';
import { db, testFirebaseConnection, handleFirestoreError, OperationType } from '../firebase';
import { 
  DatabaseSchema, 
  Warga, 
  TransaksiKas, 
  AgendaKegiatan, 
  NotulenRapat, 
  PengaduanWarga,
  AppSettings, 
  deduplicateKas, 
  deduplicateNotulen,
  deduplicateAgenda,
  deduplicateWarga,
  deduplicatePengaduan,
  sortKasNewestFirst,
  sortPengaduanNewestFirst
} from '../types';
import { initialData } from '../initialData';

// In-memory set of deleted item IDs to prevent race-condition resurrections
const deletedKasTombstones = new Set<string>();
const deletedWargaTombstones = new Set<string>();
const deletedAgendaTombstones = new Set<string>();
const deletedNotulenTombstones = new Set<string>();
const deletedPengaduanTombstones = new Set<string>();

export const LOCAL_STORAGE_KEY = 'gsb_rt001_rw004_db';

// Safely remove any undefined properties before writing to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = cleanForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// Safely read local storage database
export function getLocalDatabase(): DatabaseSchema | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.warga) && Array.isArray(parsed.kas)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading localStorage database:', e);
  }
  return null;
}

// Safely write to local storage with timestamp
export function setLocalDatabase(data: DatabaseSchema): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    if (!data.lastModified) {
      data.lastModified = Date.now();
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

// Write batch in chunks of 400 to respect Firestore 500 limit
async function writeBatchChunked(operations: Array<{ type: 'set' | 'delete'; ref: any; data?: any }>) {
  const chunkSize = 400;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, cleanForFirestore(op.data));
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

// Seed or fully replace database in Firestore
export async function seedFirestore(data: DatabaseSchema): Promise<void> {
  try {
    const operations: Array<{ type: 'set'; ref: any; data: any }> = [];

    // Settings
    operations.push({
      type: 'set',
      ref: doc(db, 'settings', 'general'),
      data: cleanForFirestore(data.settings)
    });

    // Warga
    for (const w of data.warga || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'warga', w.id),
        data: cleanForFirestore(w)
      });
    }

    // Kas
    for (const k of data.kas || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'kas', k.id),
        data: cleanForFirestore(k)
      });
    }

    // Agenda
    for (const a of data.agenda || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'agenda', a.id),
        data: cleanForFirestore(a)
      });
    }

    // Notulen
    for (const n of data.notulen || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'notulen', n.id),
        data: cleanForFirestore(n)
      });
    }

    // Pengaduan
    for (const p of data.pengaduan || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'pengaduan', p.id),
        data: cleanForFirestore(p)
      });
    }

    await writeBatchChunked(operations);
    console.info(`[Firebase] Successfully synced database to Cloud Firestore: ${data.warga?.length || 0} warga, ${data.kas?.length || 0} kas, ${data.pengaduan?.length || 0} pengaduan.`);
  } catch (err: any) {
    console.error('[Firebase] Failed writing to Firestore:', err);
    if (err?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, 'batch');
    }
    throw err;
  }
}

// Fetch database with Cloud Firestore as Primary Source of Truth
export async function getAppData(): Promise<DatabaseSchema> {
  let localDb = getLocalDatabase();

  // Try querying backend server database if available to incorporate any locally saved complaints/updates
  try {
    const sRes = await fetch(`/api/data?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (sRes.ok) {
      const serverDb: DatabaseSchema = await sRes.json();
      if (serverDb) {
        if (!localDb) {
          localDb = serverDb;
        } else {
          // Merge server pengaduan into localDb
          const serverPengaduan = serverDb.pengaduan || [];
          const localPengaduan = localDb.pengaduan || [];
          const mergedMap = new Map<string, PengaduanWarga>();
          for (const lp of localPengaduan) if (lp?.id) mergedMap.set(lp.id, lp);
          for (const sp of serverPengaduan) {
            if (!sp?.id) continue;
            const ex = mergedMap.get(sp.id);
            if (!ex) {
              mergedMap.set(sp.id, sp);
            } else if (sp.status === 'Selesai' || sp.status === 'Diproses' || sp.tanggapanRt) {
              mergedMap.set(sp.id, { ...ex, ...sp });
            }
          }
          localDb.pengaduan = Array.from(mergedMap.values());
        }
      }
    }
  } catch {
    // Non-fatal if offline
  }

  try {
    // 1. Try reading directly from Cloud Firestore
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    
    if (settingsDoc.exists()) {
      const rawSettings = settingsDoc.data() || {};
      const settings: AppSettings = {
        ...initialData.settings,
        ...rawSettings,
        rekening: {
          ...initialData.settings.rekening,
          ...(rawSettings.rekening || {})
        },
        iuranKasNominal: rawSettings.iuranKasNominal !== undefined ? Number(rawSettings.iuranKasNominal) : (initialData.settings.iuranKasNominal ?? 20000),
        iuranDansosNominal: rawSettings.iuranDansosNominal !== undefined ? Number(rawSettings.iuranDansosNominal) : (initialData.settings.iuranDansosNominal ?? 10000),
        logoUrl: rawSettings.logoUrl !== undefined ? rawSettings.logoUrl : (initialData.settings.logoUrl || ''),
        daftarGang: Array.isArray(rawSettings.daftarGang) && rawSettings.daftarGang.length > 0
          ? rawSettings.daftarGang
          : (localDb?.settings?.daftarGang && localDb.settings.daftarGang.length > 0
              ? localDb.settings.daftarGang
              : (initialData.settings.daftarGang || ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5']))
      };

      // Preserve local custom settings if Firestore general doc was unpopulated or default
      if (localDb?.settings) {
        let needSettingsSync = false;
        if (localDb.settings.logoUrl && !settings.logoUrl) {
          settings.logoUrl = localDb.settings.logoUrl;
          needSettingsSync = true;
        }
        if (localDb.settings.iuranKasNominal !== undefined && rawSettings.iuranKasNominal === undefined) {
          settings.iuranKasNominal = localDb.settings.iuranKasNominal;
          needSettingsSync = true;
        }
        if (localDb.settings.iuranDansosNominal !== undefined && rawSettings.iuranDansosNominal === undefined) {
          settings.iuranDansosNominal = localDb.settings.iuranDansosNominal;
          needSettingsSync = true;
        }
        if (Array.isArray(localDb.settings.daftarGang) && !rawSettings.daftarGang) {
          settings.daftarGang = localDb.settings.daftarGang;
          needSettingsSync = true;
        }
        if (needSettingsSync) {
          setDoc(doc(db, 'settings', 'general'), cleanForFirestore(settings), { merge: true }).catch(console.warn);
        }
      }
      
      const [wargaSnap, kasSnap, agendaSnap, notulenSnap, pengaduanSnap] = await Promise.all([
        getDocs(collection(db, 'warga')),
        getDocs(collection(db, 'kas')),
        getDocs(collection(db, 'agenda')),
        getDocs(collection(db, 'notulen')),
        getDocs(collection(db, 'pengaduan'))
      ]);

      const warga: Warga[] = [];
      wargaSnap.forEach(d => warga.push(d.data() as Warga));

      const kas: TransaksiKas[] = [];
      kasSnap.forEach(d => kas.push(d.data() as TransaksiKas));

      const agenda: AgendaKegiatan[] = [];
      agendaSnap.forEach(d => agenda.push(d.data() as AgendaKegiatan));

      const notulen: NotulenRapat[] = [];
      notulenSnap.forEach(d => notulen.push(d.data() as NotulenRapat));

      const pengaduan: PengaduanWarga[] = [];
      pengaduanSnap.forEach(d => pengaduan.push(d.data() as PengaduanWarga));

      // Deduplicate, filter out any recently deleted tombstones, and sort kas descending (newest input first)
      const validKas = kas.filter(k => k && k.id && !deletedKasTombstones.has(k.id));
      const finalKas = deduplicateKas(validKas);
      const validWarga = deduplicateWarga(warga.filter(w => w && w.id && !deletedWargaTombstones.has(w.id)));
      const validAgenda = deduplicateAgenda(agenda.filter(a => a && a.id && !deletedAgendaTombstones.has(a.id)));
      const validNotulen = deduplicateNotulen(notulen.filter(n => n && n.id && !deletedNotulenTombstones.has(n.id)));
      const validPengaduan = deduplicatePengaduan(pengaduan.filter(p => p && p.id && !deletedPengaduanTombstones.has(p.id)));

      // Merge Firestore pengaduan with server / localDb records
      const pengaduanMap = new Map<string, PengaduanWarga>();

      // 1. Seed with localDb / server items
      if (localDb?.pengaduan) {
        for (const p of localDb.pengaduan) {
          if (p && p.id && !deletedPengaduanTombstones.has(p.id)) {
            pengaduanMap.set(p.id, p);
          }
        }
      }

      // 2. Overlay Firestore items
      for (const p of validPengaduan) {
        const existing = pengaduanMap.get(p.id);
        if (!existing) {
          pengaduanMap.set(p.id, p);
        } else {
          // If local record has a more progressed status (e.g. Selesai vs Menunggu or has tanggapanRt), keep it and sync to Firestore
          const localIsMoreProgressed = 
            (existing.status === 'Selesai' && p.status !== 'Selesai') ||
            (existing.status === 'Diproses' && p.status === 'Menunggu') ||
            (Boolean(existing.tanggapanRt) && !p.tanggapanRt);
          
          if (localIsMoreProgressed) {
            // Write to Firestore so Cloud is immediately up to date
            setDoc(doc(db, 'pengaduan', p.id), cleanForFirestore(existing), { merge: true }).catch(console.warn);
          } else {
            pengaduanMap.set(p.id, { ...existing, ...p });
          }
        }
      }

      // 3. If any item from local/server is missing in Firestore, sync it to Firestore now
      for (const [id, item] of pengaduanMap.entries()) {
        if (!validPengaduan.some(p => p.id === id)) {
          setDoc(doc(db, 'pengaduan', id), cleanForFirestore(item)).catch(console.warn);
        }
      }

      // 4. Fallback if empty
      let finalPengaduan = Array.from(pengaduanMap.values());
      if (finalPengaduan.length === 0) {
        finalPengaduan = initialData.pengaduan || [];
      }
      finalPengaduan = deduplicatePengaduan(finalPengaduan).sort(sortPengaduanNewestFirst);

      const cloudDb: DatabaseSchema = {
        settings,
        warga: validWarga,
        kas: finalKas,
        agenda: validAgenda,
        notulen: validNotulen,
        pengaduan: finalPengaduan,
        lastModified: Date.now(),
        version: 2
      };

      setLocalDatabase(cloudDb);
      return cloudDb;
    }

    // 2. If Firestore is empty (initial deployment), seed it with local cache (if available) or initialData
    console.info('[Firebase] Firestore is brand new. Seeding initial data to Cloud...');
    const seedSource: DatabaseSchema = (localDb && (localDb.kas?.length > 0 || localDb.warga?.length > 0))
      ? localDb
      : initialData;

    await seedFirestore(seedSource);
    setLocalDatabase(seedSource);
    return seedSource;

  } catch (firestoreErr) {
    console.warn('[Firebase] Firestore read failed, falling back to server/local cache:', firestoreErr);
  }

  // 3. Fallback to Express backend if Firestore is temporarily unreachable
  try {
    const res = await fetch(`/api/data?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });

    if (res.ok) {
      const serverDb: DatabaseSchema = await res.json();
      setLocalDatabase(serverDb);
      return serverDb;
    }
  } catch (backendErr) {
    console.warn('[Backend] Server API fallback failed:', backendErr);
  }

  // 4. Ultimate offline fallback: Local Storage
  if (localDb) {
    return localDb;
  }

  const fresh: DatabaseSchema = { ...initialData, lastModified: Date.now(), version: 1 };
  setLocalDatabase(fresh);
  return fresh;
}

// Real-time Firestore synchronization subscription
export function subscribeToDatabase(onUpdate: (data: DatabaseSchema) => void): () => void {
  let isSubscribed = true;
  let debounceTimer: any = null;

  const triggerUpdate = async () => {
    if (!isSubscribed) return;
    try {
      const fresh = await getAppData();
      if (isSubscribed) {
        onUpdate(fresh);
      }
    } catch (e) {
      console.warn('[Firebase] Real-time sync update error:', e);
    }
  };

  const scheduleUpdate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerUpdate, 250);
  };

  try {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), scheduleUpdate, () => {});
    const unsubKas = onSnapshot(collection(db, 'kas'), scheduleUpdate, () => {});
    const unsubWarga = onSnapshot(collection(db, 'warga'), scheduleUpdate, () => {});
    const unsubAgenda = onSnapshot(collection(db, 'agenda'), scheduleUpdate, () => {});
    const unsubNotulen = onSnapshot(collection(db, 'notulen'), scheduleUpdate, () => {});
    const unsubPengaduan = onSnapshot(collection(db, 'pengaduan'), scheduleUpdate, () => {});

    return () => {
      isSubscribed = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubSettings();
      unsubKas();
      unsubWarga();
      unsubAgenda();
      unsubNotulen();
      unsubPengaduan();
    };
  } catch (err) {
    console.warn('[Firebase] Real-time subscription error:', err);
    return () => { isSubscribed = false; };
  }
}

// Check server sync status (lightweight polling)
export async function apiCheckSyncStatus(): Promise<{
  status: string;
  lastModified: number;
  version: number;
  counts: { warga: number; kas: number; agenda: number; notulen: number; pengaduan?: number };
} | null> {
  try {
    const res = await fetch(`/api/sync-check?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // server unreachable
  }
  return null;
}

// Explicit sync data to Firestore & backend
export async function syncData(data: DatabaseSchema): Promise<DatabaseSchema> {
  data.lastModified = Date.now();
  setLocalDatabase(data);

  // 1. Save to Cloud Firestore
  try {
    await seedFirestore(data);
  } catch (err) {
    console.warn('[Firebase] syncData Firestore error:', err);
  }

  // 2. Also notify Express backend for container disk backup
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (err) {
    console.warn('Backend sync failed, Cloud Firestore is safe:', err);
  }

  return data;
}

// Restore database from backup file
export async function apiRestoreDatabase(data: DatabaseSchema): Promise<{ success: boolean; message?: string; stats?: any }> {
  data.lastModified = Date.now();
  setLocalDatabase(data);

  // 1. Restore directly to Cloud Firestore
  try {
    await seedFirestore(data);
  } catch (err: any) {
    console.error('[Firebase] Error restoring to Firestore:', err);
    if (err?.message?.includes('Missing or insufficient permissions')) {
      handleFirestoreError(err, OperationType.WRITE, 'restore');
    }
    throw new Error('Gagal memulihkan data ke Cloud Firestore: ' + (err?.message || String(err)));
  }

  // 2. Also update local server
  try {
    await fetch('/api/database/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch {
    // safe since Firestore is already updated
  }

  return { 
    success: true, 
    message: 'Database berhasil dipulihkan ke Cloud Firestore dan tersinkronisasi ke seluruh perangkat.',
    stats: {
      warga: data.warga?.length || 0,
      kas: data.kas?.length || 0,
      agenda: data.agenda?.length || 0,
      notulen: data.notulen?.length || 0
    }
  };
}

// Authentication API
export async function loginUser(alamatGsb: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  const cleanInput = alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '');

  // 1. Check Super Admin Root Credentials directly
  if (cleanInput === 'superadmin' || cleanInput === 'super-admin') {
    if (password === 'rootadmin') {
      return {
        success: true,
        user: {
          id: 'user-superadmin',
          nama: 'Super Administrator',
          alamatGsb: 'superadmin',
          isAdmin: true,
          isSuperAdmin: true,
          gang: 'Kantor Sekretariat RT',
          statusTinggal: 'Permanen',
          jabatan: 'Super Admin'
        }
      };
    } else {
      return { success: false, error: 'Password Super Admin salah.' };
    }
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alamatGsb, password })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      return result;
    }
    return { success: false, error: result.error || 'Login gagal' };
  } catch {
    // Local / Firestore fallback login if server is offline
    const data = await getAppData();
    const user = data.warga.find(w => w.alamatGsb.trim().toLowerCase().replace(/[\s\/-]/g, '') === cleanInput);
    if (!user) {
      return { success: false, error: 'Alamat rumah GSB / Username tidak ditemukan.' };
    }
    const validPassword = user.password || (user.isAdmin ? 'admin' : 'warga');
    if (password !== validPassword && password !== user.password) {
      return { success: false, error: 'Password salah. (Default admin: "admin", warga: "warga")' };
    }
    return {
      success: true,
      user: {
        id: user.id,
        nama: user.nama,
        alamatGsb: user.alamatGsb,
        isAdmin: user.isAdmin,
        isSuperAdmin: false,
        gang: user.gang,
        statusTinggal: user.statusTinggal
      }
    };
  }
}

export async function changeUserPassword(id: string, alamatGsb: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  // 1. Update in Cloud Firestore
  try {
    await setDoc(doc(db, 'warga', id), { password: newPassword }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Password update Firestore error:', err);
  }

  // 2. Also update server
  try {
    await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, alamatGsb, oldPassword, newPassword })
    });
  } catch {
    // ignore
  }

  const local = getLocalDatabase();
  if (local) {
    const u = local.warga.find(w => w.id === id || w.alamatGsb === alamatGsb);
    if (u) {
      u.password = newPassword;
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true };
}

// Warga CRUD with Cloud Firestore
export async function apiAddWarga(warga: Warga): Promise<{ success: boolean; warga: Warga }> {
  // 1. Save directly to Cloud Firestore
  try {
    await setDoc(doc(db, 'warga', warga.id), cleanForFirestore(warga));
  } catch (err: any) {
    console.error('[Firebase] apiAddWarga error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.CREATE, `warga/${warga.id}`);
    }
    throw new Error('Gagal menyimpan data warga ke Cloud Firestore: ' + (err?.message || err));
  }

  // 2. Notify server and cache
  fetch('/api/warga', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(warga)
  }).catch(() => {});

  const local = getLocalDatabase();
  if (local) {
    const idx = local.warga.findIndex(w => w.id === warga.id);
    if (idx !== -1) {
      local.warga[idx] = warga;
    } else {
      local.warga.unshift(warga);
    }
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, warga };
}

export async function apiUpdateWarga(id: string, updates: Partial<Warga>): Promise<{ success: boolean; warga: Warga }> {
  // 1. Update in Cloud Firestore
  try {
    await setDoc(doc(db, 'warga', id), cleanForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[Firebase] apiUpdateWarga error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.UPDATE, `warga/${id}`);
    }
    throw new Error('Gagal memperbarui data warga di Cloud Firestore: ' + (err?.message || err));
  }

  // 2. Notify server and cache
  fetch(`/api/warga/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(() => {});

  const local = getLocalDatabase();
  let updatedWarga: Warga | null = null;
  if (local) {
    const idx = local.warga.findIndex(w => w.id === id);
    if (idx !== -1) {
      local.warga[idx] = { ...local.warga[idx], ...updates };
      updatedWarga = local.warga[idx];
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true, warga: (updatedWarga || updates) as Warga };
}

export async function apiDeleteWarga(id: string): Promise<{ success: boolean }> {
  // 1. Mark as tombstone immediately
  deletedWargaTombstones.add(id);

  // 2. Immediate local cache cleanup
  const local = getLocalDatabase();
  if (local) {
    local.warga = local.warga.filter(w => w.id !== id);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  // 3. Delete in Cloud Firestore
  try {
    await deleteDoc(doc(db, 'warga', id));
  } catch (err) {
    console.error('[Firebase] apiDeleteWarga error:', err);
  }

  // 4. Notify server
  fetch(`/api/warga/${id}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}

// Kas CRUD with Cloud Firestore
export async function apiAddKas(kas: TransaksiKas): Promise<{ success: boolean; kas: TransaksiKas }> {
  // 1. Save directly to Cloud Firestore
  try {
    await setDoc(doc(db, 'kas', kas.id), cleanForFirestore(kas));
    console.info('[Firebase] Kas transaction successfully written to Cloud Firestore:', kas.id);
  } catch (err: any) {
    console.error('[Firebase] apiAddKas error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.CREATE, `kas/${kas.id}`);
    }
    throw new Error('Gagal menyimpan transaksi kas ke Cloud Firestore: ' + (err?.message || err));
  }

  // 2. Notify server and cache
  fetch('/api/kas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kas)
  }).catch(() => {});

  const local = getLocalDatabase();
  if (local) {
    const idx = local.kas.findIndex(k => k.id === kas.id);
    if (idx !== -1) {
      local.kas[idx] = kas;
    } else {
      local.kas.unshift(kas);
    }
    local.kas = deduplicateKas(local.kas);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, kas };
}

export async function apiAddKasBatch(items: TransaksiKas[]): Promise<{ success: boolean; items: TransaksiKas[] }> {
  // 1. Save batch to Cloud Firestore
  try {
    const operations = items.map(item => ({
      type: 'set' as const,
      ref: doc(db, 'kas', item.id),
      data: item
    }));
    await writeBatchChunked(operations);
  } catch (err: any) {
    console.error('[Firebase] apiAddKasBatch error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.WRITE, 'kas/batch');
    }
    throw new Error('Gagal mencatat transaksi massal ke Cloud Firestore: ' + (err?.message || err));
  }

  // 2. Notify server and cache
  fetch('/api/kas/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  }).catch(() => {});

  const local = getLocalDatabase();
  if (local) {
    for (const item of items) {
      const idx = local.kas.findIndex(k => k.id === item.id);
      if (idx !== -1) {
        local.kas[idx] = item;
      } else {
        local.kas.unshift(item);
      }
    }
    local.kas = deduplicateKas(local.kas);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, items };
}

export async function apiUpdateKas(id: string, updates: Partial<TransaksiKas>): Promise<{ success: boolean; kas: TransaksiKas }> {
  // 1. Update in Cloud Firestore
  try {
    await setDoc(doc(db, 'kas', id), cleanForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[Firebase] apiUpdateKas error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.UPDATE, `kas/${id}`);
    }
    throw new Error('Gagal memperbarui transaksi kas di Cloud Firestore: ' + (err?.message || err));
  }

  // 2. Notify server and cache
  fetch(`/api/kas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(() => {});

  const local = getLocalDatabase();
  let updatedKas: TransaksiKas | null = null;
  if (local) {
    const idx = local.kas.findIndex(k => k.id === id);
    if (idx !== -1) {
      local.kas[idx] = { ...local.kas[idx], ...updates };
      local.kas = deduplicateKas(local.kas);
      updatedKas = local.kas[idx];
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true, kas: (updatedKas || updates) as TransaksiKas };
}

export async function apiDeleteKas(id: string): Promise<{ success: boolean }> {
  // 1. Mark as tombstone immediately
  deletedKasTombstones.add(id);

  // 2. Immediate local cache cleanup
  const local = getLocalDatabase();
  if (local) {
    local.kas = local.kas.filter(k => k.id !== id);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  // 3. Delete in Cloud Firestore
  try {
    await deleteDoc(doc(db, 'kas', id));
  } catch (err) {
    console.error('[Firebase] apiDeleteKas error:', err);
  }

  // 4. Notify server
  fetch(`/api/kas/${id}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}

// Agenda CRUD with Cloud Firestore
export async function apiAddAgenda(agenda: AgendaKegiatan): Promise<{ success: boolean; agenda: AgendaKegiatan }> {
  try {
    await setDoc(doc(db, 'agenda', agenda.id), cleanForFirestore(agenda));
  } catch (err: any) {
    console.error('[Firebase] apiAddAgenda error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.CREATE, `agenda/${agenda.id}`);
    }
    throw new Error('Gagal menyimpan agenda ke Cloud Firestore: ' + (err?.message || err));
  }

  fetch('/api/agenda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agenda)
  }).catch(() => {});

  const local = getLocalDatabase();
  if (local) {
    const idx = local.agenda.findIndex(a => a.id === agenda.id);
    if (idx !== -1) {
      local.agenda[idx] = agenda;
    } else {
      local.agenda.unshift(agenda);
    }
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, agenda };
}

export async function apiUpdateAgenda(id: string, updates: Partial<AgendaKegiatan>): Promise<{ success: boolean; agenda: AgendaKegiatan }> {
  try {
    await setDoc(doc(db, 'agenda', id), cleanForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[Firebase] apiUpdateAgenda error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.UPDATE, `agenda/${id}`);
    }
    throw new Error('Gagal memperbarui agenda di Cloud Firestore: ' + (err?.message || err));
  }

  fetch(`/api/agenda/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(() => {});

  const local = getLocalDatabase();
  let updatedAgenda: AgendaKegiatan | null = null;
  if (local) {
    const idx = local.agenda.findIndex(a => a.id === id);
    if (idx !== -1) {
      local.agenda[idx] = { ...local.agenda[idx], ...updates };
      updatedAgenda = local.agenda[idx];
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true, agenda: (updatedAgenda || updates) as AgendaKegiatan };
}

export async function apiDeleteAgenda(id: string): Promise<{ success: boolean }> {
  // 1. Mark as tombstone immediately
  deletedAgendaTombstones.add(id);

  // 2. Immediate local cache cleanup
  const local = getLocalDatabase();
  if (local) {
    local.agenda = local.agenda.filter(a => a.id !== id);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  // 3. Delete in Cloud Firestore
  try {
    await deleteDoc(doc(db, 'agenda', id));
  } catch (err) {
    console.error('[Firebase] apiDeleteAgenda error:', err);
  }

  // 4. Notify server
  fetch(`/api/agenda/${id}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}

// Notulen CRUD with Cloud Firestore
export async function apiAddNotulen(notulen: NotulenRapat): Promise<{ success: boolean; notulen: NotulenRapat }> {
  try {
    await setDoc(doc(db, 'notulen', notulen.id), cleanForFirestore(notulen));
  } catch (err: any) {
    console.error('[Firebase] apiAddNotulen error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.CREATE, `notulen/${notulen.id}`);
    }
    throw new Error('Gagal menyimpan notulen ke Cloud Firestore: ' + (err?.message || err));
  }

  fetch('/api/notulen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notulen)
  }).catch(() => {});

  const local = getLocalDatabase();
  if (local) {
    const idx = local.notulen.findIndex(n => n.id === notulen.id);
    if (idx !== -1) {
      local.notulen[idx] = notulen;
      local.notulen = deduplicateNotulen(local.notulen);
    } else {
      local.notulen = deduplicateNotulen([notulen, ...local.notulen]);
    }
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, notulen };
}

export async function apiUpdateNotulen(id: string, updates: Partial<NotulenRapat>): Promise<{ success: boolean; notulen: NotulenRapat }> {
  try {
    await setDoc(doc(db, 'notulen', id), cleanForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[Firebase] apiUpdateNotulen error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.UPDATE, `notulen/${id}`);
    }
    throw new Error('Gagal memperbarui notulen di Cloud Firestore: ' + (err?.message || err));
  }

  fetch(`/api/notulen/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(() => {});

  const local = getLocalDatabase();
  let updatedNotulen: NotulenRapat | null = null;
  if (local) {
    const idx = local.notulen.findIndex(n => n.id === id);
    if (idx !== -1) {
      local.notulen[idx] = { ...local.notulen[idx], ...updates };
      updatedNotulen = local.notulen[idx];
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true, notulen: (updatedNotulen || updates) as NotulenRapat };
}

export async function apiDeleteNotulen(id: string): Promise<{ success: boolean }> {
  // 1. Mark as tombstone immediately
  deletedNotulenTombstones.add(id);

  // 2. Immediate local cache cleanup
  const local = getLocalDatabase();
  if (local) {
    local.notulen = local.notulen.filter(n => n.id !== id);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  // 3. Delete in Cloud Firestore
  try {
    await deleteDoc(doc(db, 'notulen', id));
  } catch (err) {
    console.error('[Firebase] apiDeleteNotulen error:', err);
  }

  // 4. Notify server
  fetch(`/api/notulen/${id}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}

// ==========================================
// PENGADUAN CRUD
// ==========================================

export async function apiAddPengaduan(aduan: PengaduanWarga): Promise<{ success: boolean; pengaduan: PengaduanWarga }> {
  try {
    await setDoc(doc(db, 'pengaduan', aduan.id), cleanForFirestore(aduan));
    console.info('[Firebase] apiAddPengaduan saved to Cloud Firestore:', aduan.id);
  } catch (err: any) {
    console.error('[Firebase] apiAddPengaduan error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.CREATE, `pengaduan/${aduan.id}`);
    }
    throw new Error('Gagal menyimpan pengaduan ke Cloud Firestore: ' + (err?.message || err));
  }

  // Backup to Express server if running
  fetch('/api/pengaduan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aduan)
  }).catch(() => {});

  // Immediate local cache update
  const local = getLocalDatabase();
  if (local) {
    const existingList = local.pengaduan || [];
    local.pengaduan = deduplicatePengaduan([aduan, ...existingList]);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, pengaduan: aduan };
}

export async function apiUpdatePengaduan(id: string, updates: Partial<PengaduanWarga>): Promise<{ success: boolean; pengaduan: PengaduanWarga }> {
  try {
    await setDoc(doc(db, 'pengaduan', id), cleanForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[Firebase] apiUpdatePengaduan error:', err);
    if (err && (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions'))) {
      handleFirestoreError(err, OperationType.UPDATE, `pengaduan/${id}`);
    }
    throw new Error('Gagal memperbarui pengaduan di Cloud Firestore: ' + (err?.message || err));
  }

  fetch(`/api/pengaduan/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  }).catch(() => {});

  const local = getLocalDatabase();
  let updatedPengaduan: PengaduanWarga | null = null;
  if (local) {
    local.pengaduan = local.pengaduan || [];
    const idx = local.pengaduan.findIndex(p => p.id === id);
    if (idx !== -1) {
      local.pengaduan[idx] = { ...local.pengaduan[idx], ...updates };
      updatedPengaduan = local.pengaduan[idx];
      local.lastModified = Date.now();
      setLocalDatabase(local);
    }
  }

  return { success: true, pengaduan: (updatedPengaduan || updates) as PengaduanWarga };
}

export async function apiDeletePengaduan(id: string): Promise<{ success: boolean }> {
  // 1. Mark as tombstone immediately
  deletedPengaduanTombstones.add(id);

  // 2. Immediate local cache cleanup
  const local = getLocalDatabase();
  if (local && local.pengaduan) {
    local.pengaduan = local.pengaduan.filter(p => p.id !== id);
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  // 3. Delete in Cloud Firestore
  try {
    await deleteDoc(doc(db, 'pengaduan', id));
  } catch (err) {
    console.error('[Firebase] apiDeletePengaduan error:', err);
  }

  // 4. Notify server
  fetch(`/api/pengaduan/${id}`, { method: 'DELETE' }).catch(() => {});

  return { success: true };
}

// Settings update with Cloud Firestore & server
export async function apiUpdateSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
  const local = getLocalDatabase() || initialData;
  const mergedSettings: AppSettings = {
    ...local.settings,
    ...settings,
    rekening: settings.rekening ? { ...local.settings.rekening, ...settings.rekening } : local.settings.rekening
  };

  // 1. Immediately persist locally so changes (such as logo) apply with zero lag
  local.settings = mergedSettings;
  local.lastModified = Date.now();
  setLocalDatabase(local);

  // 2. Persist to Express backend server
  try {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedSettings)
    });
  } catch (serverErr) {
    console.warn('[Server] Settings update to Express server failed:', serverErr);
  }

  // 3. Persist to Cloud Firestore
  try {
    await setDoc(doc(db, 'settings', 'general'), cleanForFirestore(mergedSettings), { merge: true });
    console.info('[Firebase] Settings successfully updated in Cloud Firestore:', mergedSettings);
  } catch (err) {
    console.warn('[Firebase] Warning updating settings in Cloud Firestore (persisted locally & server):', err);
  }

  return { success: true, settings: mergedSettings };
}

export interface SyncResult {
  database: DatabaseSchema;
  settingsSynced: boolean;
  cloudConnected: boolean;
  message: string;
  syncedCounts: {
    warga: number;
    kas: number;
    agenda: number;
    notulen: number;
  };
  settingsDetails: {
    namaRtRw: string;
    hasLogo: boolean;
    bank: string;
    iuranKas: number;
    iuranDansos: number;
    totalGang: number;
  };
}

// Full Two-Way Cloud Synchronization (Settings + Data Warga + Kas + Agenda + Notulen)
export async function syncAllWithCloud(currentDb?: DatabaseSchema): Promise<SyncResult> {
  const activeDb = currentDb || getLocalDatabase() || initialData;
  let cloudConnected = false;
  let settingsSynced = false;

  // 1. Explicitly push all active settings to Cloud Firestore (settings/general)
  try {
    if (activeDb.settings) {
      const cleanedSettings = cleanForFirestore(activeDb.settings);
      await setDoc(doc(db, 'settings', 'general'), cleanedSettings, { merge: true });
      console.info('[Firebase] Settings synchronized to Cloud Firestore successfully.');
      settingsSynced = true;
      cloudConnected = true;
    }
  } catch (settingsErr) {
    console.warn('[Firebase] Settings push to Cloud error:', settingsErr);
  }

  // 2. Also persist settings to server disk for local backup
  try {
    if (activeDb.settings) {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeDb.settings)
      });
    }
  } catch (e) {
    // backup warning
  }

  // 3. Ensure local records (warga, kas, agenda, notulen) are synced to Cloud Firestore
  try {
    const operations: Array<{ type: 'set'; ref: any; data: any }> = [];

    for (const w of activeDb.warga || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'warga', w.id),
        data: cleanForFirestore(w)
      });
    }

    for (const k of activeDb.kas || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'kas', k.id),
        data: cleanForFirestore(k)
      });
    }

    for (const a of activeDb.agenda || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'agenda', a.id),
        data: cleanForFirestore(a)
      });
    }

    for (const n of activeDb.notulen || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'notulen', n.id),
        data: cleanForFirestore(n)
      });
    }

    for (const p of activeDb.pengaduan || []) {
      operations.push({
        type: 'set',
        ref: doc(db, 'pengaduan', p.id),
        data: cleanForFirestore(p)
      });
    }

    if (operations.length > 0) {
      await writeBatchChunked(operations);
      cloudConnected = true;
    }
  } catch (recordsErr) {
    console.warn('[Firebase] Warning syncing records batch to Cloud:', recordsErr);
  }

  // 4. Notify Express backend to ensure disk database.json stays in sync
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeDb)
    });
  } catch {
    // server unreachable is non-fatal since Cloud Firestore is primary
  }

  // 5. Fetch fresh consolidated database from Cloud Firestore to ensure two-way parity
  let freshDatabase: DatabaseSchema;
  try {
    freshDatabase = await getAppData();
    cloudConnected = true;
  } catch {
    freshDatabase = activeDb;
  }

  freshDatabase.lastModified = Date.now();
  setLocalDatabase(freshDatabase);

  const syncedCounts = {
    warga: freshDatabase.warga?.length || 0,
    kas: freshDatabase.kas?.length || 0,
    agenda: freshDatabase.agenda?.length || 0,
    notulen: freshDatabase.notulen?.length || 0,
    pengaduan: freshDatabase.pengaduan?.length || 0
  };

  const settingsDetails = {
    namaRtRw: freshDatabase.settings.namaRtRw || 'RT 001 / RW 004',
    hasLogo: Boolean(freshDatabase.settings.logoUrl),
    bank: freshDatabase.settings.rekening?.bank || 'Bank Jago',
    iuranKas: freshDatabase.settings.iuranKasNominal ?? 20000,
    iuranDansos: freshDatabase.settings.iuranDansosNominal ?? 10000,
    totalGang: freshDatabase.settings.daftarGang?.length || 5
  };

  const message = cloudConnected
    ? `Sinkronisasi Cloud Berhasil! Pengaturan (Logo RT, Rekening ${settingsDetails.bank}, Tarif Kas Rp ${settingsDetails.iuranKas.toLocaleString('id-ID')}, Dansos Rp ${settingsDetails.iuranDansos.toLocaleString('id-ID')}, ${settingsDetails.totalGang} Gang) & seluruh data (${syncedCounts.warga} warga, ${syncedCounts.kas} transaksi kas) telah tersinkronkan ke Cloud Firestore.`
    : `Sinkronisasi selesai menggunakan cache lokal dan server (${syncedCounts.warga} warga, ${syncedCounts.kas} transaksi kas).`;

  return {
    database: freshDatabase,
    settingsSynced,
    cloudConnected,
    message,
    syncedCounts,
    settingsDetails
  };
}

// Gang Management
export async function apiRenameGang(oldName: string, newName: string): Promise<{ success: boolean; daftarGang: string[]; wargaUpdated: number }> {
  const local = getLocalDatabase() || initialData;
  const newDaftarGang = (local.settings.daftarGang || []).map(g => g === oldName ? newName.trim() : g);

  try {
    await setDoc(doc(db, 'settings', 'general'), { daftarGang: newDaftarGang }, { merge: true });
    
    // Update warga that belonged to old gang
    const wargaSnap = await getDocs(collection(db, 'warga'));
    const batch = writeBatch(db);
    let count = 0;
    wargaSnap.forEach(d => {
      const w = d.data() as Warga;
      if (w.gang === oldName) {
        batch.update(doc(db, 'warga', w.id), { gang: newName.trim() });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firebase] Rename gang Cloud error:', err);
  }

  fetch('/api/gang/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName })
  }).catch(() => {});

  if (local) {
    local.settings.daftarGang = newDaftarGang;
    local.warga.forEach(w => {
      if (w.gang === oldName) w.gang = newName.trim();
    });
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, daftarGang: newDaftarGang, wargaUpdated: 1 };
}

export async function apiDeleteGang(gangName: string, fallbackGang?: string): Promise<{ success: boolean; daftarGang: string[]; wargaReassigned: number }> {
  const local = getLocalDatabase() || initialData;
  const newDaftarGang = (local.settings.daftarGang || []).filter(g => g !== gangName);
  const fb = fallbackGang || newDaftarGang[0] || 'Gang 1';

  try {
    await setDoc(doc(db, 'settings', 'general'), { daftarGang: newDaftarGang }, { merge: true });
    
    const wargaSnap = await getDocs(collection(db, 'warga'));
    const batch = writeBatch(db);
    let count = 0;
    wargaSnap.forEach(d => {
      const w = d.data() as Warga;
      if (w.gang === gangName) {
        batch.update(doc(db, 'warga', w.id), { gang: fb });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.warn('[Firebase] Delete gang Cloud error:', err);
  }

  fetch('/api/gang/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gangName, fallbackGang })
  }).catch(() => {});

  if (local) {
    local.settings.daftarGang = newDaftarGang;
    local.warga.forEach(w => {
      if (w.gang === gangName) w.gang = fb;
    });
    local.lastModified = Date.now();
    setLocalDatabase(local);
  }

  return { success: true, daftarGang: newDaftarGang, wargaReassigned: 1 };
}

// Synchronized server time
export async function apiGetServerTime(): Promise<{ iso: string; timestamp: number; timezone: string }> {
  try {
    const res = await fetch(`/api/server-time?t=${Date.now()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback to local clock
  }
  const now = new Date();
  return {
    iso: now.toISOString(),
    timestamp: now.getTime(),
    timezone: 'Asia/Jakarta'
  };
}

// Unified apiService object
export const apiService = {
  getDatabase: getAppData,
  saveDatabase: syncData,
  syncAllWithCloud: syncAllWithCloud,
  restoreDatabase: apiRestoreDatabase,
  checkSyncStatus: apiCheckSyncStatus,
  getServerTime: apiGetServerTime,
  renameGang: apiRenameGang,
  deleteGang: apiDeleteGang,
  subscribeToDatabase: subscribeToDatabase,
  testFirebase: testFirebaseConnection,
  
  addWarga: async (warga: Warga): Promise<Warga> => {
    const res = await apiAddWarga(warga);
    return res.warga;
  },
  
  updateWarga: async (id: string, updates: Partial<Warga>): Promise<Warga> => {
    const res = await apiUpdateWarga(id, updates);
    return res.warga;
  },
  
  deleteWarga: async (id: string): Promise<boolean> => {
    const res = await apiDeleteWarga(id);
    return res.success;
  },
  
  addKas: async (kas: TransaksiKas): Promise<TransaksiKas> => {
    const res = await apiAddKas(kas);
    return res.kas;
  },

  addKasBatch: async (items: TransaksiKas[]): Promise<TransaksiKas[]> => {
    const res = await apiAddKasBatch(items);
    return res.items;
  },
  
  updateKas: async (id: string, updates: Partial<TransaksiKas>): Promise<TransaksiKas> => {
    const res = await apiUpdateKas(id, updates);
    return res.kas;
  },
  
  deleteKas: async (id: string): Promise<boolean> => {
    const res = await apiDeleteKas(id);
    return res.success;
  },
  
  addAgenda: async (agenda: AgendaKegiatan): Promise<AgendaKegiatan> => {
    const res = await apiAddAgenda(agenda);
    return res.agenda;
  },
  
  updateAgenda: async (id: string, updates: Partial<AgendaKegiatan>): Promise<AgendaKegiatan> => {
    const res = await apiUpdateAgenda(id, updates);
    return res.agenda;
  },
  
  deleteAgenda: async (id: string): Promise<boolean> => {
    const res = await apiDeleteAgenda(id);
    return res.success;
  },
  
  addNotulen: async (notulen: NotulenRapat): Promise<NotulenRapat> => {
    const res = await apiAddNotulen(notulen);
    return res.notulen;
  },
  
  updateNotulen: async (id: string, updates: Partial<NotulenRapat>): Promise<NotulenRapat> => {
    const res = await apiUpdateNotulen(id, updates);
    return res.notulen;
  },
  
  deleteNotulen: async (id: string): Promise<boolean> => {
    const res = await apiDeleteNotulen(id);
    return res.success;
  },

  addPengaduan: async (aduan: PengaduanWarga): Promise<PengaduanWarga> => {
    const res = await apiAddPengaduan(aduan);
    return res.pengaduan;
  },

  updatePengaduan: async (id: string, updates: Partial<PengaduanWarga>): Promise<PengaduanWarga> => {
    const res = await apiUpdatePengaduan(id, updates);
    return res.pengaduan;
  },

  deletePengaduan: async (id: string): Promise<boolean> => {
    const res = await apiDeletePengaduan(id);
    return res.success;
  },
  
  updateSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
    const res = await apiUpdateSettings(settings);
    return res.settings;
  },

  loginUser: async (alamatGsb: string, password: string) => {
    return loginUser(alamatGsb, password);
  },

  changePassword: async (id: string, alamatGsb: string, oldPass: string, newPass: string) => {
    return changeUserPassword(id, alamatGsb, oldPass, newPass);
  }
};
