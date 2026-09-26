import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initialData } from './src/initialData';
import { DatabaseSchema, Warga, TransaksiKas, AgendaKegiatan, NotulenRapat, PengaduanWarga, deduplicateKas, sortKasNewestFirst } from './src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DB_BACKUP = path.join(DATA_DIR, 'database.backup.json');

// Ensure database directory and file exist with bulletproof atomic read
function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      // Check if backup exists
      if (fs.existsSync(DB_BACKUP)) {
        try {
          const backupContent = fs.readFileSync(DB_BACKUP, 'utf-8');
          const backupParsed = JSON.parse(backupContent);
          if (backupParsed && Array.isArray(backupParsed.warga)) {
            fs.writeFileSync(DB_FILE, backupContent, 'utf-8');
            return backupParsed;
          }
        } catch (e) {
          console.warn('Backup file read failed, falling back to initialData');
        }
      }

      const init: DatabaseSchema = {
        ...initialData,
        lastModified: Date.now(),
        version: 1
      };
      saveDatabase(init);
      return init;
    }

    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: DatabaseSchema = JSON.parse(content);
    if (!parsed.lastModified) {
      parsed.lastModified = Date.now();
    }
    if (!Array.isArray(parsed.warga)) parsed.warga = [];
    if (!Array.isArray(parsed.kas)) parsed.kas = [];
    else parsed.kas = deduplicateKas(parsed.kas);
    if (!Array.isArray(parsed.agenda)) parsed.agenda = [];
    if (!Array.isArray(parsed.notulen)) parsed.notulen = [];
    if (!Array.isArray(parsed.pengaduan)) parsed.pengaduan = initialData.pengaduan || [];
    return parsed;
  } catch (err) {
    console.error('Error reading database file, attempting backup recovery:', err);
    if (fs.existsSync(DB_BACKUP)) {
      try {
        const backupContent = fs.readFileSync(DB_BACKUP, 'utf-8');
        const parsedBackup = JSON.parse(backupContent);
        if (Array.isArray(parsedBackup.kas)) {
          parsedBackup.kas = deduplicateKas(parsedBackup.kas);
        }
        return parsedBackup;
      } catch (e) {
        console.error('Backup recovery failed:', e);
      }
    }
    return { ...initialData, lastModified: Date.now(), version: 1 };
  }
}

// Atomically save database to prevent file corruption
function saveDatabase(data: DatabaseSchema): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    data.lastModified = Date.now();
    data.version = (data.version || 0) + 1;
    if (Array.isArray(data.kas)) {
      data.kas = deduplicateKas(data.kas);
    }

    const tmpFile = path.join(DATA_DIR, `database.tmp.${Date.now()}`);
    const serialized = JSON.stringify(data, null, 2);

    // 1. Write to temporary file first
    fs.writeFileSync(tmpFile, serialized, 'utf-8');

    // 2. Backup existing DB file before atomic replacement
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, DB_BACKUP);
      } catch (e) {
        // non-fatal backup error
      }
    }

    // 3. Atomically rename temporary file to destination
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error atomically saving database:', err);
    return false;
  }
}

// Normalize house address for flexible matching (e.g. F222 -> F2/22 or F2-22)
function normalizeAddress(addr: string): string {
  return (addr || '').trim().toLowerCase().replace(/[\s\/-]/g, '');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Generous limit for high-res logo uploads and large database backups
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Anti-caching headers for all API requests to ensure fresh data across all devices
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Fast lightweight sync-check endpoint for polling across devices
  app.get('/api/sync-check', (req, res) => {
    const db = getDatabase();
    res.json({
      status: 'ok',
      lastModified: db.lastModified || 0,
      version: db.version || 1,
      counts: {
        warga: db.warga.length,
        kas: db.kas.length,
        agenda: db.agenda.length,
        notulen: db.notulen.length,
        pengaduan: (db.pengaduan || []).length
      }
    });
  });

  // Get synchronized server time
  app.get('/api/server-time', (req, res) => {
    const now = new Date();
    res.json({
      iso: now.toISOString(),
      timestamp: now.getTime(),
      timezone: 'Asia/Jakarta'
    });
  });

  // Smart non-destructive synchronization endpoint
  app.post('/api/sync', (req, res) => {
    try {
      const clientData = req.body as Partial<DatabaseSchema>;
      if (!clientData) {
        return res.status(400).json({ error: 'Data sinkronisasi tidak valid.' });
      }

      const db = getDatabase();
      let hasChanges = false;

      // Merge warga (by id or unique combination)
      if (Array.isArray(clientData.warga) && clientData.warga.length > 0) {
        for (const cw of clientData.warga) {
          const idx = db.warga.findIndex(w => w.id === cw.id);
          if (idx === -1) {
            db.warga.push(cw);
            hasChanges = true;
          } else {
            // Keep the record with the most complete data
            db.warga[idx] = { ...db.warga[idx], ...cw };
          }
        }
      }

      // Merge kas (by id)
      if (Array.isArray(clientData.kas) && clientData.kas.length > 0) {
        for (const ck of clientData.kas) {
          const idx = db.kas.findIndex(k => k.id === ck.id);
          if (idx === -1) {
            db.kas.unshift(ck);
            hasChanges = true;
          } else {
            db.kas[idx] = { ...db.kas[idx], ...ck };
          }
        }
      }

      // Merge agenda (by id)
      if (Array.isArray(clientData.agenda) && clientData.agenda.length > 0) {
        for (const ca of clientData.agenda) {
          const idx = db.agenda.findIndex(a => a.id === ca.id);
          if (idx === -1) {
            db.agenda.push(ca);
            hasChanges = true;
          } else {
            db.agenda[idx] = { ...db.agenda[idx], ...ca };
          }
        }
      }

      // Merge notulen (by id)
      if (Array.isArray(clientData.notulen) && clientData.notulen.length > 0) {
        for (const cn of clientData.notulen) {
          const idx = db.notulen.findIndex(n => n.id === cn.id);
          if (idx === -1) {
            db.notulen.unshift(cn);
            hasChanges = true;
          } else {
            db.notulen[idx] = { ...db.notulen[idx], ...cn };
          }
        }
      }

      // Merge pengaduan (by id)
      if (Array.isArray(clientData.pengaduan) && clientData.pengaduan.length > 0) {
        if (!Array.isArray(db.pengaduan)) db.pengaduan = [];
        for (const cp of clientData.pengaduan) {
          const idx = db.pengaduan.findIndex(p => p.id === cp.id);
          if (idx === -1) {
            db.pengaduan.unshift(cp);
            hasChanges = true;
          } else {
            db.pengaduan[idx] = { ...db.pengaduan[idx], ...cp };
            hasChanges = true;
          }
        }
      }

      // Merge settings if client provided updated settings
      if (clientData.settings) {
        db.settings = {
          ...db.settings,
          ...clientData.settings,
          rekening: clientData.settings.rekening
            ? { ...db.settings.rekening, ...clientData.settings.rekening }
            : db.settings.rekening
        };
        hasChanges = true;
      }

      if (hasChanges) {
        saveDatabase(db);
      }

      res.json({
        success: true,
        database: db,
        merged: hasChanges,
        stats: {
          warga: db.warga.length,
          kas: db.kas.length,
          agenda: db.agenda.length,
          notulen: db.notulen.length,
          pengaduan: (db.pengaduan || []).length
        }
      });
    } catch (err: any) {
      console.error('Error in /api/sync:', err);
      res.status(500).json({ error: 'Gagal melakukan sinkronisasi: ' + err.message });
    }
  });

  // Rename gang and cascade to all warga
  app.post('/api/gang/rename', (req, res) => {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Nama gang lama dan nama baru wajib diisi.' });
    }

    const db = getDatabase();
    if (!db.settings.daftarGang || !Array.isArray(db.settings.daftarGang)) {
      db.settings.daftarGang = ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];
    }

    const idx = db.settings.daftarGang.indexOf(oldName);
    if (idx !== -1) {
      db.settings.daftarGang[idx] = newName.trim();
    } else if (!db.settings.daftarGang.includes(newName.trim())) {
      db.settings.daftarGang.push(newName.trim());
    }

    let updatedCount = 0;
    db.warga.forEach(w => {
      if (w.gang === oldName) {
        w.gang = newName.trim();
        updatedCount++;
      }
    });

    saveDatabase(db);
    res.json({ 
      success: true, 
      daftarGang: db.settings.daftarGang,
      wargaUpdated: updatedCount 
    });
  });

  // Delete gang and cascade to all warga
  app.post('/api/gang/delete', (req, res) => {
    const { gangName, fallbackGang } = req.body;
    if (!gangName) {
      return res.status(400).json({ error: 'Nama gang wajib diisi.' });
    }

    const db = getDatabase();
    if (!db.settings.daftarGang || !Array.isArray(db.settings.daftarGang)) {
      db.settings.daftarGang = ['Gang 1', 'Gang 2', 'Gang 3', 'Gang 4', 'Gang 5'];
    }

    db.settings.daftarGang = db.settings.daftarGang.filter(g => g !== gangName);
    const targetGang = fallbackGang || db.settings.daftarGang[0] || 'Gang 1';

    let wargaReassigned = 0;
    db.warga.forEach(w => {
      if (w.gang === gangName) {
        w.gang = targetGang;
        wargaReassigned++;
      }
    });

    saveDatabase(db);
    res.json({
      success: true,
      daftarGang: db.settings.daftarGang,
      wargaReassigned,
      fallbackGang: targetGang
    });
  });

  // Get full database
  app.get('/api/data', (req, res) => {
    const db = getDatabase();
    res.json(db);
  });

  // Login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { alamatGsb, password } = req.body;
    if (!alamatGsb || !password) {
      return res.status(400).json({ error: 'Alamat GSB / Username dan Password wajib diisi.' });
    }

    const cleanInput = normalizeAddress(alamatGsb);

    // 1. Check Super Admin Root Credentials (directly embedded in login logic, not in warga data)
    if (cleanInput === 'superadmin' || cleanInput === 'super-admin') {
      if (password === 'rootadmin') {
        return res.json({
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
        });
      } else {
        return res.status(401).json({ error: 'Password Super Admin salah.' });
      }
    }

    const db = getDatabase();
    
    // Find warga matching address
    const user = db.warga.find(w => {
      const wClean = normalizeAddress(w.alamatGsb);
      return wClean === cleanInput;
    });

    if (!user) {
      return res.status(401).json({ error: 'Alamat rumah GSB atau username tidak ditemukan dalam database.' });
    }

    // Check password (default password: 'admin' for admin or 'warga' if not changed)
    const validPassword = user.password || (user.isAdmin ? 'admin' : 'warga');
    if (user.password !== password && validPassword !== password) {
      return res.status(401).json({ error: 'Password salah. Silakan coba lagi.' });
    }

    res.json({
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
    });
  });

  // Change password
  app.post('/api/auth/change-password', (req, res) => {
    const { id, alamatGsb, oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: 'Password baru minimal 3 karakter.' });
    }

    if (id === 'user-superadmin' || normalizeAddress(alamatGsb || '') === 'superadmin') {
      return res.json({ 
        success: true, 
        message: 'Password bawaan Super Admin (rootadmin) terlindungi secara permanen di sistem sebagai master fail-safe.' 
      });
    }

    const db = getDatabase();
    const userIndex = db.warga.findIndex(w => w.id === id || normalizeAddress(w.alamatGsb) === normalizeAddress(alamatGsb || ''));

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const user = db.warga[userIndex];
    const currentPass = user.password || (user.isAdmin ? 'admin' : 'warga');
    if (oldPassword && currentPass !== oldPassword) {
      return res.status(401).json({ error: 'Password lama tidak sesuai.' });
    }

    db.warga[userIndex].password = newPassword;
    saveDatabase(db);

    res.json({ success: true, message: 'Password berhasil diperbarui!' });
  });

  // Warga CRUD
  app.post('/api/warga', (req, res) => {
    const db = getDatabase();
    const newWarga: Warga = {
      ...req.body,
      id: req.body.id || `w-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    // Check if ID already exists -> update it (upsert)
    const existingIdx = db.warga.findIndex(w => w.id === newWarga.id);
    if (existingIdx !== -1) {
      db.warga[existingIdx] = { ...db.warga[existingIdx], ...newWarga };
      saveDatabase(db);
      return res.json({ success: true, warga: db.warga[existingIdx], updated: true });
    }

    // Check if exact same resident (same name AND same address) already exists
    const duplicatePerson = db.warga.some(
      w => w.nama.trim().toLowerCase() === newWarga.nama.trim().toLowerCase() &&
           normalizeAddress(w.alamatGsb) === normalizeAddress(newWarga.alamatGsb)
    );
    if (duplicatePerson) {
      return res.status(400).json({ 
        error: `Warga dengan nama "${newWarga.nama}" di alamat ${newWarga.alamatGsb} sudah terdaftar!` 
      });
    }

    db.warga.unshift(newWarga); // Newest first
    saveDatabase(db);
    res.json({ success: true, warga: newWarga, totalWarga: db.warga.length });
  });

  app.put('/api/warga/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.warga.findIndex(w => w.id === id);
    if (index === -1) {
      // Upsert if not found so changes are never lost
      const newWarga: Warga = {
        ...req.body,
        id,
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      db.warga.unshift(newWarga);
      saveDatabase(db);
      return res.json({ success: true, warga: newWarga });
    }

    db.warga[index] = {
      ...db.warga[index],
      ...req.body
    };
    saveDatabase(db);
    res.json({ success: true, warga: db.warga[index] });
  });

  app.delete('/api/warga/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    db.warga = db.warga.filter(w => w.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Kas CRUD
  app.post('/api/kas', (req, res) => {
    const db = getDatabase();
    const newKas: TransaksiKas = {
      ...req.body,
      id: req.body.id || `k-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    // Check if already exists (upsert)
    const existingIdx = db.kas.findIndex(k => k.id === newKas.id);
    if (existingIdx !== -1) {
      db.kas[existingIdx] = { ...db.kas[existingIdx], ...newKas };
    } else {
      db.kas.unshift(newKas); // Put newest first
    }

    saveDatabase(db);
    res.json({ success: true, kas: newKas, totalKas: db.kas.length });
  });

  // Batch Kas endpoint (e.g. for simultaneous Kas RT + Dansos payment)
  app.post('/api/kas/batch', (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Data transaksi kas tidak valid.' });
    }

    const db = getDatabase();
    const savedItems: TransaksiKas[] = [];

    for (const item of items) {
      const newKas: TransaksiKas = {
        ...item,
        id: item.id || `k-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: item.createdAt || new Date().toISOString()
      };
      const existingIdx = db.kas.findIndex(k => k.id === newKas.id);
      if (existingIdx !== -1) {
        db.kas[existingIdx] = { ...db.kas[existingIdx], ...newKas };
      } else {
        db.kas.unshift(newKas);
      }
      savedItems.push(newKas);
    }

    saveDatabase(db);
    res.json({ success: true, count: savedItems.length, items: savedItems, totalKas: db.kas.length });
  });

  app.put('/api/kas/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.kas.findIndex(k => k.id === id);
    if (index === -1) {
      const newKas: TransaksiKas = {
        ...req.body,
        id,
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      db.kas.unshift(newKas);
      saveDatabase(db);
      return res.json({ success: true, kas: newKas });
    }

    db.kas[index] = {
      ...db.kas[index],
      ...req.body
    };
    saveDatabase(db);
    res.json({ success: true, kas: db.kas[index] });
  });

  app.delete('/api/kas/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    db.kas = db.kas.filter(k => k.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Agenda CRUD
  app.post('/api/agenda', (req, res) => {
    const db = getDatabase();
    const newAgenda: AgendaKegiatan = {
      ...req.body,
      id: req.body.id || `ag-${Date.now()}`
    };

    const existingIdx = db.agenda.findIndex(a => a.id === newAgenda.id);
    if (existingIdx !== -1) {
      db.agenda[existingIdx] = { ...db.agenda[existingIdx], ...newAgenda };
    } else {
      db.agenda.unshift(newAgenda);
    }

    saveDatabase(db);
    res.json({ success: true, agenda: newAgenda });
  });

  app.put('/api/agenda/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.agenda.findIndex(a => a.id === id);
    if (index === -1) {
      const newAgenda: AgendaKegiatan = {
        ...req.body,
        id
      };
      db.agenda.unshift(newAgenda);
      saveDatabase(db);
      return res.json({ success: true, agenda: newAgenda });
    }

    db.agenda[index] = {
      ...db.agenda[index],
      ...req.body
    };
    saveDatabase(db);
    res.json({ success: true, agenda: db.agenda[index] });
  });

  app.delete('/api/agenda/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    db.agenda = db.agenda.filter(a => a.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Notulen CRUD
  app.post('/api/notulen', (req, res) => {
    const db = getDatabase();
    const newNotulen: NotulenRapat = {
      ...req.body,
      id: req.body.id || `not-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    const existingIdx = db.notulen.findIndex(n => n.id === newNotulen.id);
    if (existingIdx !== -1) {
      db.notulen[existingIdx] = { ...db.notulen[existingIdx], ...newNotulen };
    } else {
      db.notulen.unshift(newNotulen); // Newest first
    }

    saveDatabase(db);
    res.json({ success: true, notulen: newNotulen });
  });

  app.put('/api/notulen/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.notulen.findIndex(n => n.id === id);
    if (index === -1) {
      const newNotulen: NotulenRapat = {
        ...req.body,
        id,
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      db.notulen.unshift(newNotulen);
      saveDatabase(db);
      return res.json({ success: true, notulen: newNotulen });
    }

    db.notulen[index] = {
      ...db.notulen[index],
      ...req.body
    };
    saveDatabase(db);
    res.json({ success: true, notulen: db.notulen[index] });
  });

  app.delete('/api/notulen/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    db.notulen = db.notulen.filter(n => n.id !== id);
    saveDatabase(db);
    res.json({ success: true });
  });

  // Pengaduan CRUD
  app.post('/api/pengaduan', (req, res) => {
    const db = getDatabase();
    if (!Array.isArray(db.pengaduan)) db.pengaduan = [];
    const newPengaduan: PengaduanWarga = {
      ...req.body,
      id: req.body.id || `aduan-${Date.now()}`,
      createdAt: req.body.createdAt || new Date().toISOString()
    };

    const existingIdx = db.pengaduan.findIndex(p => p.id === newPengaduan.id);
    if (existingIdx !== -1) {
      db.pengaduan[existingIdx] = { ...db.pengaduan[existingIdx], ...newPengaduan };
    } else {
      db.pengaduan.unshift(newPengaduan);
    }

    saveDatabase(db);
    res.json({ success: true, pengaduan: newPengaduan });
  });

  app.put('/api/pengaduan/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    if (!Array.isArray(db.pengaduan)) db.pengaduan = [];
    const index = db.pengaduan.findIndex(p => p.id === id);
    if (index === -1) {
      const newPengaduan: PengaduanWarga = {
        ...req.body,
        id,
        createdAt: req.body.createdAt || new Date().toISOString()
      };
      db.pengaduan.unshift(newPengaduan);
      saveDatabase(db);
      return res.json({ success: true, pengaduan: newPengaduan });
    }

    db.pengaduan[index] = {
      ...db.pengaduan[index],
      ...req.body
    };
    saveDatabase(db);
    res.json({ success: true, pengaduan: db.pengaduan[index] });
  });

  app.delete('/api/pengaduan/:id', (req, res) => {
    const { id } = req.params;
    const db = getDatabase();
    if (Array.isArray(db.pengaduan)) {
      db.pengaduan = db.pengaduan.filter(p => p.id !== id);
      saveDatabase(db);
    }
    res.json({ success: true });
  });

  // Settings update
  app.put('/api/settings', (req, res) => {
    const db = getDatabase();
    db.settings = {
      ...db.settings,
      ...req.body,
      rekening: req.body.rekening 
        ? { ...db.settings.rekening, ...req.body.rekening } 
        : db.settings.rekening
    };
    saveDatabase(db);
    res.json({ 
      success: true, 
      settings: db.settings, 
      lastModified: db.lastModified, 
      version: db.version 
    });
  });

  // Backup and Restore Database file
  app.get('/api/database/backup', (req, res) => {
    const db = getDatabase();
    res.setHeader('Content-disposition', `attachment; filename=rt001rw004_db_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(db, null, 2));
  });

  app.post('/api/database/restore', (req, res) => {
    const backupData = req.body;
    if (!backupData || !Array.isArray(backupData.warga) || !Array.isArray(backupData.kas)) {
      return res.status(400).json({ error: 'Format file database tidak valid. File harus memiliki data array "warga" dan "kas".' });
    }

    const currentDb = getDatabase();
    const sanitizedDb: DatabaseSchema = {
      settings: {
        ...currentDb.settings,
        ...(backupData.settings || {})
      },
      warga: backupData.warga,
      kas: backupData.kas,
      agenda: Array.isArray(backupData.agenda) ? backupData.agenda : [],
      notulen: Array.isArray(backupData.notulen) ? backupData.notulen : [],
      pengaduan: Array.isArray(backupData.pengaduan) ? backupData.pengaduan : (currentDb.pengaduan || [])
    };

    saveDatabase(sanitizedDb);
    res.json({
      success: true,
      message: 'Database berhasil dipulihkan dan disimpan di server!',
      stats: {
        wargaCount: sanitizedDb.warga.length,
        kasCount: sanitizedDb.kas.length,
        agendaCount: sanitizedDb.agenda.length,
        notulenCount: sanitizedDb.notulen.length,
        pengaduanCount: (sanitizedDb.pengaduan || []).length
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

