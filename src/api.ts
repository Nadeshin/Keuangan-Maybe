import { getEffectiveScriptUrl } from './config';
import { Transaksi, Kategori, Anggaran, Tabungan, Tagihan, AppSettings, DashboardResponse } from './types';

// Helper SHA-256 di browser untuk simulasi lokal jika SCRIPT_URL belum diset
async function sha256Hex(str: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = enc.encode(str);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hash resmi untuk PIN default 624426 (64 karakter hex)
export const DEFAULT_PIN_HASH = 'dcbd9266e3b5b0bd17c934413dd2de22a7a5da8f68d2573e2c452b9dfe30309c';

function logSimulasi(aksi: string, detail: string | Record<string, unknown>) {
  try {
    const logs = getLocalData<any[]>('LOG', []);
    logs.push({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      aksi,
      detail: typeof detail === 'object' ? JSON.stringify(detail) : String(detail),
    });
    setLocalData('LOG', logs);
  } catch (e) {
    console.error('Log error', e);
  }
}

// Default Seed Data untuk Mode Simulasi AI Studio
const INITIAL_CATEGORIES: Kategori[] = [
  { id_kategori: 'kat_gaji', nama: 'Gaji', tipe: 'masuk', warna: '#2E7D32', icon: 'Briefcase' },
  { id_kategori: 'kat_bonus', nama: 'Bonus', tipe: 'masuk', warna: '#0288D1', icon: 'Award' },
  { id_kategori: 'kat_jualan', nama: 'Jualan', tipe: 'masuk', warna: '#ED6C02', icon: 'TrendingUp' },
  { id_kategori: 'kat_lainnya_masuk', nama: 'Lainnya', tipe: 'masuk', warna: '#757575', icon: 'PlusCircle' },
  { id_kategori: 'kat_makan', nama: 'Makan', tipe: 'keluar', warna: '#E53935', icon: 'Utensils' },
  { id_kategori: 'kat_transport', nama: 'Transport', tipe: 'keluar', warna: '#FB8C00', icon: 'Car' },
  { id_kategori: 'kat_belanja', nama: 'Belanja', tipe: 'keluar', warna: '#8E24AA', icon: 'ShoppingBag' },
  { id_kategori: 'kat_tagihan', nama: 'Tagihan', tipe: 'keluar', warna: '#D81B60', icon: 'CreditCard' },
  { id_kategori: 'kat_kesehatan', nama: 'Kesehatan', tipe: 'keluar', warna: '#00897B', icon: 'HeartPulse' },
  { id_kategori: 'kat_hiburan', nama: 'Hiburan', tipe: 'keluar', warna: '#3949AB', icon: 'Film' },
  { id_kategori: 'kat_pendidikan', nama: 'Pendidikan', tipe: 'keluar', warna: '#1E88E5', icon: 'GraduationCap' },
  { id_kategori: 'kat_tabungan', nama: 'Tabungan', tipe: 'keluar', warna: '#43A047', icon: 'PiggyBank' },
  { id_kategori: 'kat_lainnya_keluar', nama: 'Lainnya', tipe: 'keluar', warna: '#546E7A', icon: 'MoreHorizontal' },
];

function getLocalData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem('PKP_LOCAL_' + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalData(key: string, value: unknown) {
  try {
    localStorage.setItem('PKP_LOCAL_' + key, JSON.stringify(value));
  } catch (e) {
    console.error('Local storage save error', e);
  }
}

// Inisialisasi data simulasi (V2 Fresh: Kosong siap pakai tanpa dummy data)
if (!localStorage.getItem('PKP_LOCAL_INIT_V2')) {
  localStorage.setItem('PKP_LOCAL_INIT_V2', 'true');
  
  // Hapus cache data contoh versi lama
  localStorage.removeItem('PKP_LOCAL_INIT');

  // Wajib tetap ada: 13 kategori default
  setLocalData('KATEGORI', INITIAL_CATEGORIES);

  // Inisialisasi FRESH sebagai array kosong []
  setLocalData('TRANSAKSI', []);
  setLocalData('ANGGARAN', []);
  setLocalData('TABUNGAN', []);
  setLocalData('TAGIHAN', []);

  // SHA-256 default PIN 624426 jika belum ada
  const existingPin = getLocalData<string>('PIN_HASH', '');
  setLocalData('PIN_HASH', existingPin || DEFAULT_PIN_HASH);

  // Settings default jika belum ada
  const existingSettings = getLocalData<any>('SETTINGS', null);
  setLocalData('SETTINGS', existingSettings || {
    no_wa_owner: '6281234567890',
    tema_aktif: 'Casual',
    palet_aktif: 'Blue-Ocean',
    mode_gelap: 'false',
    auto_split_percent: '10',
  });
}

// Generic API caller to Google Apps Script Web App
export async function callApi(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const scriptUrl = getEffectiveScriptUrl();

  // Bila SCRIPT_URL belum dikonfigurasi, jalankan mesin simulasi lokal persis spesifikasi PRD
  if (!scriptUrl) {
    return handleLocalSimulation(action, payload);
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ action, ...payload }),
    });

    const data = await res.json();
    if (data.error === 403) {
      sessionStorage.removeItem('AUTH_TOKEN');
      window.dispatchEvent(new Event('auth_expired'));
      throw new Error('Sesi kedaluwarsa. Silakan masukkan PIN kembali.');
    }
    return data;
  } catch (err: any) {
    console.error('API Error:', err);
    throw err;
  }
}

// Simulasi Backend Lokal di Browser (Sesuai Logic Code.gs)
let failedCount = 0;
let lockUntil = 0;

async function handleLocalSimulation(action: string, payload: Record<string, any>): Promise<any> {
  // Simulasi network delay kecil
  await new Promise(r => setTimeout(r, 120));

  const nowTime = Date.now();
  if (nowTime < lockUntil) {
    const sisaDetik = Math.ceil((lockUntil - nowTime) / 1000);
    return {
      success: false,
      error: `Akses terkunci karena 5x salah PIN. Tunggu ${sisaDetik} detik lagi.`,
      locked: true,
      remainingSeconds: sisaDetik,
    };
  }

  // 1. VERIFY PIN (Murni periksa inputHash === storedHash dengan self-healing jika hash rusak)
  if (action === 'verifyPin') {
    const pin = String(payload.pin || '').trim();
    const inputHash = await sha256Hex(pin);
    let storedHash = getLocalData<string>('PIN_HASH', DEFAULT_PIN_HASH);

    // Self-healing jika stored hash tidak cocok format /^[0-9a-f]{64}$/
    if (!/^[0-9a-f]{64}$/i.test(storedHash)) {
      storedHash = DEFAULT_PIN_HASH;
      setLocalData('PIN_HASH', storedHash);
      logSimulasi('pin_hash_diperbaiki', 'Hash PIN rusak atau tidak valid terdeteksi, dipulihkan otomatis ke default SHA-256.');
    }

    const isCorrect = inputHash === storedHash;

    if (isCorrect) {
      failedCount = 0;
      const token = 'SIM_TOKEN_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      return {
        success: true,
        token,
        settings: getLocalData('SETTINGS', {}),
      };
    } else {
      failedCount++;
      if (failedCount >= 5) {
        lockUntil = Date.now() + 5 * 60 * 1000; // 5 menit
        failedCount = 0;
        return {
          success: false,
          error: 'PIN salah 5x berturut-turut! Akses terkunci selama 5 menit.',
          locked: true,
          remainingSeconds: 300,
        };
      }
      return {
        success: false,
        error: `PIN salah! Sisa kesempatan: ${5 - failedCount}x.`,
        locked: false,
        remainingAttempts: 5 - failedCount,
      };
    }
  }

  // Cek token untuk endpoint selain verifyPin
  const token = payload.token;
  if (!token) {
    return { error: 403, message: 'Token tidak valid' };
  }

  // 2. CHANGE PIN (Murni hash check dengan self-healing)
  if (action === 'changePin') {
    const oldPin = String(payload.oldPin || '').trim();
    const newPin = String(payload.newPin || '').trim();
    const oldHash = await sha256Hex(oldPin);
    let storedHash = getLocalData<string>('PIN_HASH', DEFAULT_PIN_HASH);

    if (!/^[0-9a-f]{64}$/i.test(storedHash)) {
      storedHash = DEFAULT_PIN_HASH;
      setLocalData('PIN_HASH', storedHash);
      logSimulasi('pin_hash_diperbaiki', 'Hash PIN lama rusak saat ganti PIN, dipulihkan otomatis ke default.');
    }

    if (oldHash !== storedHash) {
      return { success: false, error: 'PIN lama salah.' };
    }
    const newHash = await sha256Hex(newPin);
    setLocalData('PIN_HASH', newHash);
    return { success: true, message: 'PIN berhasil diubah.' };
  }

  // 3. GET DASHBOARD
  if (action === 'getDashboard') {
    const now = new Date();
    const curBulan = payload.bulan || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    const kats = getLocalData<Kategori[]>('KATEGORI', []);
    const anggs = getLocalData<Anggaran[]>('ANGGARAN', []);
    const tabs = getLocalData<Tabungan[]>('TABUNGAN', []);

    let totalSaldo = 0;
    let pemasukanBulan = 0;
    let pengeluaranBulan = 0;
    const catSpent: Record<string, number> = {};

    for (const t of trxs) {
      const jml = Number(t.jumlah) || 0;
      const bln = t.tanggal.substring(0, 7);
      if (t.tipe === 'masuk') {
        totalSaldo += jml;
        if (bln === curBulan) pemasukanBulan += jml;
      } else {
        totalSaldo -= jml;
        if (bln === curBulan) {
          pengeluaranBulan += jml;
          catSpent[t.id_kategori] = (catSpent[t.id_kategori] || 0) + jml;
        }
      }
    }

    let totalLimitAnggaran = 0;
    const listAnggaran = anggs
      .filter(a => a.bulan === curBulan)
      .map(a => {
        const terpakai = catSpent[a.id_kategori] || 0;
        const persen = a.limit > 0 ? Math.round((terpakai / a.limit) * 100) : 0;
        totalLimitAnggaran += a.limit;
        return { ...a, terpakai, persen };
      });

    const sisaAnggaran = Math.max(0, totalLimitAnggaran - pengeluaranBulan);

    const mapKat: Record<string, Kategori> = {};
    for (const k of kats) mapKat[k.id_kategori] = k;

    const listTab = tabs.map(tb => ({
      ...tb,
      persen: tb.target > 0 ? Math.min(100, Math.round((tb.terkumpul / tb.target) * 100)) : 0,
    }));

    return {
      success: true,
      bulan: curBulan,
      ringkasan: {
        totalSaldo,
        pemasukanBulan,
        pengeluaranBulan,
        sisaAnggaran,
        totalLimitAnggaran,
        totalTargetTabungan: tabs.reduce((acc, t) => acc + t.target, 0),
        totalTerkumpulTabungan: tabs.reduce((acc, t) => acc + t.terkumpul, 0),
      },
      anggaran: listAnggaran,
      tabungan: listTab,
      kategori: mapKat,
      transaksiTerbaru: [...trxs].reverse().slice(0, 10),
    } as DashboardResponse;
  }

  // 4. ADD TRANSAKSI
  if (action === 'addTransaksi') {
    const trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    const anggs = getLocalData<Anggaran[]>('ANGGARAN', []);
    const tipe = payload.tipe as 'masuk' | 'keluar';
    const jumlah = Number(payload.jumlah) || 0;
    const tanggal = payload.tanggal || new Date().toISOString().slice(0, 10);
    const bulan = tanggal.slice(0, 7);
    const catId = payload.id_kategori;
    const forceBypass = payload.forceBypass === true;

    // Cek Anggaran
    if (tipe === 'keluar') {
      const budget = anggs.find(a => a.bulan === bulan && a.id_kategori === catId);
      if (budget) {
        const currentSpent = trxs
          .filter(t => t.tipe === 'keluar' && t.tanggal.slice(0, 7) === bulan && t.id_kategori === catId)
          .reduce((sum, t) => sum + t.jumlah, 0);

        const totalSetelahIni = currentSpent + jumlah;

        if (budget.mode === 'blokir' && totalSetelahIni > budget.limit && !forceBypass) {
          return {
            success: false,
            blocked: true,
            error: `Transaksi Ditolak! Limit anggaran kategori '${catId}' adalah Rp${budget.limit.toLocaleString('id-ID')}, sedangkan pengeluaran saat ini Rp${currentSpent.toLocaleString('id-ID')}. (Mode Blokir)`,
          };
        }

        if (budget.mode === 'peringatan' && totalSetelahIni > budget.limit && !forceBypass) {
          return {
            success: false,
            warning: true,
            error: `Perhatian: Transaksi ini melebihi limit anggaran (Limit: Rp${budget.limit.toLocaleString('id-ID')}, akan menjadi: Rp${totalSetelahIni.toLocaleString('id-ID')}). Tetap lanjutkan?`,
          };
        }
      }
    }

    // Auto-split Tabungan jika masuk
    let autoSplitNominal = 0;
    if (tipe === 'masuk' && payload.id_tabungan_split) {
      const sets = getLocalData<AppSettings>('SETTINGS', {});
      const pct = Number(sets.auto_split_percent || 10);
      if (pct > 0) {
        autoSplitNominal = (jumlah * pct) / 100;
        const tabs = getLocalData<Tabungan[]>('TABUNGAN', []);
        const idx = tabs.findIndex(t => t.id === payload.id_tabungan_split);
        if (idx !== -1) {
          tabs[idx].terkumpul += autoSplitNominal;
          setLocalData('TABUNGAN', tabs);
        }
      }
    }

    const newTrx: Transaksi = {
      id: 'TRX_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tanggal,
      tipe,
      jumlah,
      id_kategori: catId,
      catatan: payload.catatan || '',
      sumber: (payload.sumber as any) || 'web',
      file_url: payload.file_url || '',
    };
    trxs.push(newTrx);
    setLocalData('TRANSAKSI', trxs);
    return { success: true, id: newTrx.id, autoSplitNominal };
  }

  // FIX 3: UPDATE TRANSAKSI SIMULASI
  if (action === 'updateTransaksi') {
    const trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    const anggs = getLocalData<Anggaran[]>('ANGGARAN', []);
    const id = String(payload.id || '');
    const idx = trxs.findIndex(t => t.id === id);

    if (idx === -1) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }

    const tipe = (payload.tipe as 'masuk' | 'keluar') || trxs[idx].tipe;
    const jumlah = Number(payload.jumlah) || 0;
    const tanggal = payload.tanggal || trxs[idx].tanggal;
    const bulan = tanggal.slice(0, 7);
    const catId = payload.id_kategori || trxs[idx].id_kategori;
    const forceBypass = payload.forceBypass === true;

    // Cek Anggaran jika pengeluaran (abaikan transaksi yang sedang diedit dari currentSpent)
    if (tipe === 'keluar') {
      const budget = anggs.find(a => a.bulan === bulan && a.id_kategori === catId);
      if (budget) {
        const currentSpent = trxs
          .filter(t => t.id !== id && t.tipe === 'keluar' && t.tanggal.slice(0, 7) === bulan && t.id_kategori === catId)
          .reduce((sum, t) => sum + t.jumlah, 0);

        const totalSetelahIni = currentSpent + jumlah;

        if (budget.mode === 'blokir' && totalSetelahIni > budget.limit && !forceBypass) {
          return {
            success: false,
            blocked: true,
            error: `Update Ditolak! Limit anggaran kategori '${catId}' adalah Rp${budget.limit.toLocaleString('id-ID')}, sedangkan pengeluaran saat ini Rp${currentSpent.toLocaleString('id-ID')}. (Mode Blokir)`,
          };
        }

        if (budget.mode === 'peringatan' && totalSetelahIni > budget.limit && !forceBypass) {
          return {
            success: false,
            warning: true,
            error: `Perhatian: Update ini melebihi limit anggaran (Limit: Rp${budget.limit.toLocaleString('id-ID')}, akan menjadi: Rp${totalSetelahIni.toLocaleString('id-ID')}). Tetap lanjutkan?`,
          };
        }
      }
    }

    trxs[idx] = {
      ...trxs[idx],
      tanggal,
      tipe,
      jumlah,
      id_kategori: catId,
      catatan: payload.catatan !== undefined ? payload.catatan : trxs[idx].catatan,
      file_url: payload.file_url !== undefined ? payload.file_url : trxs[idx].file_url,
    };
    setLocalData('TRANSAKSI', trxs);
    return { success: true, id };
  }

  // 5. GET TRANSAKSI
  if (action === 'getTransaksi') {
    let trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    if (payload.startDate) trxs = trxs.filter(t => t.tanggal >= payload.startDate);
    if (payload.endDate) trxs = trxs.filter(t => t.tanggal <= payload.endDate);
    if (payload.categoryId) trxs = trxs.filter(t => t.id_kategori === payload.categoryId);
    if (payload.tipe) trxs = trxs.filter(t => t.tipe === payload.tipe);
    trxs.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    return { success: true, data: trxs, total: trxs.length };
  }

  // 6. DELETE TRANSAKSI
  if (action === 'deleteTransaksi') {
    let trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    trxs = trxs.filter(t => t.id !== payload.id);
    setLocalData('TRANSAKSI', trxs);
    return { success: true };
  }

  // 7. KATEGORI CRUD
  if (action === 'getKategori') {
    return { success: true, data: getLocalData<Kategori[]>('KATEGORI', []) };
  }
  if (action === 'saveKategori') {
    const kats = getLocalData<Kategori[]>('KATEGORI', []);
    const id = payload.id_kategori || 'kat_' + Date.now();
    const idx = kats.findIndex(k => k.id_kategori === id);
    const item: Kategori = {
      id_kategori: id,
      nama: payload.nama,
      tipe: payload.tipe,
      warna: payload.warna || '#2196F3',
      icon: payload.icon || 'Tag',
    };
    if (idx !== -1) kats[idx] = item;
    else kats.push(item);
    setLocalData('KATEGORI', kats);
    return { success: true, id_kategori: id };
  }

  // 8. ANGGARAN CRUD
  if (action === 'getAnggaran') {
    const anggs = getLocalData<Anggaran[]>('ANGGARAN', []);
    const curBulan = payload.bulan || new Date().toISOString().slice(0, 7);
    return { success: true, data: anggs.filter(a => a.bulan === curBulan) };
  }
  if (action === 'saveAnggaran') {
    const anggs = getLocalData<Anggaran[]>('ANGGARAN', []);
    const id = payload.id || 'ANG_' + Date.now();
    const idx = anggs.findIndex(a => a.id === id || (a.bulan === payload.bulan && a.id_kategori === payload.id_kategori));
    const item: Anggaran = {
      id,
      bulan: payload.bulan,
      id_kategori: payload.id_kategori,
      limit: Number(payload.limit) || 0,
      mode: payload.mode || 'peringatan',
    };
    if (idx !== -1) anggs[idx] = item;
    else anggs.push(item);
    setLocalData('ANGGARAN', anggs);
    return { success: true, id };
  }

  // 9. TABUNGAN CRUD & SETOR/TARIK
  if (action === 'getTabungan') {
    return { success: true, data: getLocalData<Tabungan[]>('TABUNGAN', []) };
  }
  if (action === 'saveTabungan') {
    const tabs = getLocalData<Tabungan[]>('TABUNGAN', []);
    const id = payload.id || 'TAB_' + Date.now();
    const idx = tabs.findIndex(t => t.id === id);
    const item: Tabungan = {
      id,
      nama: payload.nama,
      target: Number(payload.target) || 0,
      terkumpul: Number(payload.terkumpul) || 0,
      deadline: payload.deadline || '',
    };
    if (idx !== -1) tabs[idx] = item;
    else tabs.push(item);
    setLocalData('TABUNGAN', tabs);
    return { success: true, id };
  }
  if (action === 'setorTarikTabungan') {
    const tabs = getLocalData<Tabungan[]>('TABUNGAN', []);
    const trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    const idx = tabs.findIndex(t => t.id === payload.id);
    if (idx === -1) return { success: false, error: 'Tabungan tidak ditemukan' };

    const nominal = Number(payload.nominal) || 0;
    const aksi = payload.aksi === 'tarik' ? 'tarik' : 'setor';
    tabs[idx].terkumpul = aksi === 'setor' ? tabs[idx].terkumpul + nominal : Math.max(0, tabs[idx].terkumpul - nominal);
    setLocalData('TABUNGAN', tabs);

    // Auto-catat ke transaksi
    const newTrx: Transaksi = {
      id: 'TRX_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tanggal: new Date().toISOString().slice(0, 10),
      tipe: aksi === 'setor' ? 'keluar' : 'masuk',
      jumlah: nominal,
      id_kategori: 'kat_tabungan',
      catatan: (aksi === 'setor' ? 'Setor tabungan: ' : 'Tarik tabungan: ') + tabs[idx].nama,
      sumber: 'web',
    };
    trxs.push(newTrx);
    setLocalData('TRANSAKSI', trxs);
    return { success: true, totalBaru: tabs[idx].terkumpul };
  }

  // 10. TAGIHAN CRUD & BAYAR
  if (action === 'getTagihan') {
    return { success: true, data: getLocalData<Tagihan[]>('TAGIHAN', []) };
  }
  if (action === 'saveTagihan') {
    const tags = getLocalData<Tagihan[]>('TAGIHAN', []);
    const id = payload.id || 'TAG_' + Date.now();
    const idx = tags.findIndex(t => t.id === id);
    const item: Tagihan = {
      id,
      nama: payload.nama,
      nominal: Number(payload.nominal) || 0,
      tanggal_jatuh_tempo: payload.tanggal_jatuh_tempo,
      berulang: payload.berulang || 'Y',
      status: payload.status || 'belum',
      terakhir_dibayar: payload.terakhir_dibayar || '',
    };
    if (idx !== -1) tags[idx] = item;
    else tags.push(item);
    setLocalData('TAGIHAN', tags);
    return { success: true, id };
  }
  if (action === 'bayarTagihan') {
    const tags = getLocalData<Tagihan[]>('TAGIHAN', []);
    const trxs = getLocalData<Transaksi[]>('TRANSAKSI', []);
    const idx = tags.findIndex(t => t.id === payload.id);
    if (idx === -1) return { success: false, error: 'Tagihan tidak ditemukan' };

    const tgl = new Date().toISOString().slice(0, 10);
    tags[idx].status = 'lunas';
    tags[idx].terakhir_dibayar = tgl;
    setLocalData('TAGIHAN', tags);

    const newTrx: Transaksi = {
      id: 'TRX_' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tanggal: tgl,
      tipe: 'keluar',
      jumlah: tags[idx].nominal,
      id_kategori: 'kat_tagihan',
      catatan: 'Pembayaran tagihan: ' + tags[idx].nama,
      sumber: 'web',
    };
    trxs.push(newTrx);
    setLocalData('TRANSAKSI', trxs);
    return { success: true, message: 'Tagihan berhasil dibayar & tercatat sebagai pengeluaran.' };
  }

  // 11. SETTINGS & BACKUP
  if (action === 'getSettings') {
    return { success: true, settings: getLocalData('SETTINGS', {}) };
  }
  if (action === 'updateSettings') {
    const cur = getLocalData<AppSettings>('SETTINGS', {});
    const updated = { ...cur, ...payload.settings };
    setLocalData('SETTINGS', updated);
    return { success: true };
  }
  if (action === 'backupDrive') {
    return {
      success: true,
      fileName: 'Backup_Keuangan_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'),
      message: 'Backup simulasi berhasil disimpan ke folder /Backup Keuangan/',
    };
  }

  // 12. RESET SEMUA DATA (KOSONGKAN TRANSAKSI, ANGGARAN, TABUNGAN, TAGIHAN)
  if (action === 'resetSemuaData') {
    setLocalData('TRANSAKSI', []);
    setLocalData('ANGGARAN', []);
    setLocalData('TABUNGAN', []);
    setLocalData('TAGIHAN', []);
    return {
      success: true,
      message: 'Semua data transaksi, anggaran, tabungan, dan tagihan berhasil dikosongkan.',
    };
  }

  return { success: true };
}
