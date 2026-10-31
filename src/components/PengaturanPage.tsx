import React, { useState } from 'react';
import { useAppTheme, PALETTES } from '../themeContext';
import { callApi } from '../api';
import { getEffectiveScriptUrl, setCustomScriptUrl } from '../config';
import { ThemeMode, PaletteName } from '../types';
import { 
  Settings, 
  KeyRound, 
  Palette, 
  Moon, 
  Sun, 
  RotateCcw, 
  HardDrive, 
  Check, 
  Globe, 
  Phone, 
  ShieldCheck, 
  Sparkles,
  CloudDownload,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';

interface PengaturanPageProps {
  token: string;
  onLogout: () => void;
  onRefreshData?: () => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({ token, onLogout, onRefreshData }) => {
  const {
    theme,
    setTheme,
    palette,
    setPalette,
    isDark,
    setIsDark,
    colors,
    updateCustomColor,
    resetToDefault,
    glassCardBg,
  } = useAppTheme();

  // Change PIN State
  const [oldPin, setOldPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [pinLoading, setPinLoading] = useState<boolean>(false);
  const [pinMsg, setPinMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Script URL State
  const [scriptUrlInput, setScriptUrlInput] = useState<string>(() => getEffectiveScriptUrl());
  const [urlMsg, setUrlMsg] = useState<string>('');

  // Backup Drive State
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [backupResult, setBackupResult] = useState<string>('');

  // WhatsApp & Auto Split
  const [noWa, setNoWa] = useState<string>('6281234567890');
  const [autoSplit, setAutoSplit] = useState<string>('10');
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsMsg, setSettingsMsg] = useState<string>('');

  // Reset Semua Data Modal State (Konfirmasi 2 Langkah)
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [confirmText, setConfirmText] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetMsg, setResetMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleExecuteReset = async () => {
    if (confirmText.trim() !== 'HAPUS') return;

    setResetLoading(true);
    setResetMsg(null);
    try {
      const res = await callApi('resetSemuaData', { token });
      if (res.success) {
        setResetMsg({
          text: res.message || 'Semua data transaksi, anggaran, tabungan, dan tagihan berhasil dikosongkan.',
          error: false,
        });
        setIsResetModalOpen(false);
        setConfirmText('');
        if (onRefreshData) {
          onRefreshData();
        }
      } else {
        setResetMsg({ text: res.error || 'Gagal mengosongkan data.', error: true });
      }
    } catch (err: any) {
      setResetMsg({ text: err.message || 'Terjadi kesalahan sistem saat mereset data.', error: true });
    } finally {
      setResetLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 6) {
      setPinMsg({ text: 'PIN baru harus minimal 6 digit.', error: true });
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinMsg({ text: 'Konfirmasi PIN baru tidak cocok.', error: true });
      return;
    }

    setPinLoading(true);
    setPinMsg(null);
    try {
      const res = await callApi('changePin', { token, oldPin, newPin });
      if (res.success) {
        setPinMsg({ text: 'PIN berhasil diubah! Silakan gunakan PIN baru untuk sesi berikutnya.', error: false });
        setOldPin('');
        setNewPin('');
        setConfirmNewPin('');
      } else {
        setPinMsg({ text: res.error || 'Gagal mengubah PIN. Periksa PIN lama.', error: true });
      }
    } catch (err: any) {
      setPinMsg({ text: err.message || 'Terjadi kesalahan sistem.', error: true });
    } finally {
      setPinLoading(false);
    }
  };

  const handleSaveScriptUrl = () => {
    setCustomScriptUrl(scriptUrlInput);
    setUrlMsg('Pengaturan SCRIPT_URL berhasil diperbarui. Aplikasi akan memanggil endpoint Google Apps Script ini.');
    setTimeout(() => setUrlMsg(''), 5000);
  };

  const handleBackupNow = async () => {
    setBackupLoading(true);
    setBackupResult('');
    try {
      const res = await callApi('backupDrive', { token });
      if (res.success) {
        setBackupResult(`✅ Berhasil! File backup dibuat: ${res.fileName}`);
      } else {
        setBackupResult(`❌ Gagal: ${res.error}`);
      }
    } catch (e: any) {
      setBackupResult(`❌ Error: ${e.message}`);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleSaveAppParams = async () => {
    setSavingSettings(true);
    setSettingsMsg('');
    try {
      const res = await callApi('updateSettings', {
        token,
        settings: {
          no_wa_owner: noWa,
          auto_split_percent: autoSplit,
          tema_aktif: theme,
          palet_aktif: palette,
          mode_gelap: String(isDark),
        },
      });
      if (res.success) {
        setSettingsMsg('Pengaturan berhasil disimpan ke Sheet Settings!');
        setTimeout(() => setSettingsMsg(''), 4000);
      }
    } catch (e: any) {
      setSettingsMsg(e.message || 'Gagal menyimpan.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
          Pengaturan & Kustomisasi
        </h1>
        <p className="text-xs sm:text-sm opacity-75">
          Ganti PIN, ubah tema & warna UI, konfigurasi bot WhatsApp, serta backup Drive
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: GANTI PIN (PRD SECTION 3 & 5.1) */}
        <div
          className="p-5 theme-card space-y-4"
          style={{
            backgroundColor: glassCardBg(0.7),
            color: colors.text,
          }}
        >
          <div className="flex items-center gap-2 font-bold text-base pb-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <KeyRound className="w-5 h-5" style={{ color: colors.primary }} />
            <span>Ganti PIN Keamanan</span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            PIN default adalah <strong>624426</strong>. Ganti segera setelah instalasi pertama untuk mengamankan data keuangan Anda.
          </p>

          {pinMsg && (
            <div
              className={`p-3 rounded-xl text-xs ${
                pinMsg.error
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {pinMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1 opacity-80">PIN Lama</label>
              <input
                type="password"
                maxLength={6}
                value={oldPin}
                onChange={e => setOldPin(e.target.value.replace(/\D/g, ''))}
                placeholder="6 digit PIN lama"
                className="w-full px-3 py-2 rounded-xl border bg-transparent font-mono tracking-widest text-sm"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 opacity-80">PIN Baru</label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="6 digit PIN baru"
                className="w-full px-3 py-2 rounded-xl border bg-transparent font-mono tracking-widest text-sm"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 opacity-80">Konfirmasi PIN Baru</label>
              <input
                type="password"
                maxLength={6}
                value={confirmNewPin}
                onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ulangi 6 digit PIN baru"
                className="w-full px-3 py-2 rounded-xl border bg-transparent font-mono tracking-widest text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={pinLoading}
              className="w-full py-2.5 rounded-xl text-white font-semibold shadow-md active:scale-95 disabled:opacity-50 transition-all"
              style={{ backgroundColor: colors.primary }}
            >
              {pinLoading ? 'Menyimpan PIN...' : 'Perbarui PIN Sekarang'}
            </button>
          </form>
        </div>

        {/* SECTION 2: BACKUP DRIVE & AUTO BACKUP (PRD 5.9) */}
        <div
          className="p-5 theme-card space-y-4"
          style={{
            backgroundColor: glassCardBg(0.7),
            color: colors.text,
          }}
        >
          <div className="flex items-center gap-2 font-bold text-base pb-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <HardDrive className="w-5 h-5" style={{ color: colors.primary }} />
            <span>Backup Google Drive (PRD 5.9)</span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            Sistem menjalankan <strong>Auto-Backup harian setiap jam 23:00 WIB</strong> ke folder Drive <code className="bg-black/5 px-1.5 py-0.5 rounded">/Backup Keuangan/</code> (menyimpan 30 versi terakhir secara otomatis).
          </p>

          <div className="p-3.5 rounded-xl border bg-blue-50/60 border-blue-200 text-blue-950 text-xs space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <CloudDownload className="w-4 h-4 text-blue-600" />
              <span>Backup Manual Seketika</span>
            </div>
            <p className="opacity-80">
              Buat salinan data terbaru sekarang ke Google Drive Anda tanpa menunggu jadwal jam 23:00.
            </p>
          </div>

          {backupResult && (
            <div className="p-3 rounded-xl text-xs bg-slate-100 text-slate-800 border">
              {backupResult}
            </div>
          )}

          <button
            type="button"
            disabled={backupLoading}
            onClick={handleBackupNow}
            className="w-full py-2.5 rounded-xl text-white font-semibold shadow-md active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: colors.primary }}
          >
            <CloudDownload className="w-4 h-4" />
            <span>{backupLoading ? 'Sedang Mencadangkan...' : 'Backup Sekarang'}</span>
          </button>
        </div>

        {/* SECTION 3: TEMA & PALET (PRD SECTION 12) */}
        <div
          className="p-5 theme-card space-y-4 md:col-span-2"
          style={{
            backgroundColor: glassCardBg(0.7),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div className="flex items-center gap-2 font-bold text-base">
              <Palette className="w-5 h-5" style={{ color: colors.primary }} />
              <span>Tampilan & Tema Warna (PRD Section 12)</span>
            </div>
            <button
              onClick={resetToDefault}
              className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1 underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Pilihan 3 Tema */}
            <div className="space-y-2">
              <span className="font-bold opacity-80 block">1. Gaya Desain (3 Tema)</span>
              <div className="space-y-1.5">
                {[
                  { id: 'Casual', label: 'Casual (Rounded, Nunito, Santai)' },
                  { id: 'Profesional', label: 'Profesional (Compact, Inter, Rapi)' },
                  { id: 'Glass', label: 'Glass (Glassmorphism Blur)' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as ThemeMode)}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
                      theme === item.id ? 'bg-black/10 font-bold border-black/30 shadow-sm' : 'hover:bg-black/5 opacity-75'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan 2 Palet */}
            <div className="space-y-2">
              <span className="font-bold opacity-80 block">2. Paket Palet Warna</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => setPalette('Blue-Ocean')}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    palette === 'Blue-Ocean' ? 'ring-2 ring-blue-500 font-bold' : 'hover:bg-black/5 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span>Blue-Ocean (Default)</span>
                  </div>
                  <div className="flex gap-1">
                    {['#E3F2FD', '#90CAF9', '#2196F3', '#0D47A1'].map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>

                <button
                  onClick={() => setPalette('Green-Pao')}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    palette === 'Green-Pao' ? 'ring-2 ring-emerald-600 font-bold' : 'hover:bg-black/5 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span>Green-Pao (Dark Hijau)</span>
                  </div>
                  <div className="flex gap-1">
                    {['#092328', '#12544F', '#2A835F', '#8BBB92'].map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>
              </div>
            </div>

            {/* Mode Gelap & Custom Color Picker */}
            <div className="space-y-3">
              <div>
                <span className="font-bold opacity-80 block mb-2">3. Mode Terang / Gelap</span>
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className="w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold hover:bg-black/5 transition-all"
                >
                  {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>{isDark ? 'Mode Gelap (Aktif)' : 'Mode Terang (Aktif)'}</span>
                </button>
              </div>

              <div>
                <span className="font-bold opacity-80 block mb-1">Custom Warna Bebas</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-black/5 cursor-pointer">
                    <input
                      type="color"
                      value={colors.primary}
                      onChange={e => updateCustomColor('primary', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span>Primary</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-black/5 cursor-pointer">
                    <input
                      type="color"
                      value={colors.bg}
                      onChange={e => updateCustomColor('bg', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span>Background</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: INTEGRASI GOOGLE APPS SCRIPT & WHATSAPP */}
        <div
          className="p-5 theme-card space-y-4 md:col-span-2"
          style={{
            backgroundColor: glassCardBg(0.7),
            color: colors.text,
          }}
        >
          <div className="flex items-center gap-2 font-bold text-base pb-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <Globe className="w-5 h-5" style={{ color: colors.primary }} />
            <span>Koneksi Backend Google Apps Script (SCRIPT_URL)</span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            Masukkan URL Web App hasil deploy Google Apps Script yang berakhiran <code className="bg-black/5 px-1 rounded">/exec</code>.
          </p>

          {urlMsg && (
            <div className="p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
              {urlMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={scriptUrlInput}
              onChange={e => setScriptUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-xl border bg-transparent font-mono"
            />
            <button
              onClick={handleSaveScriptUrl}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-md active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              Simpan SCRIPT_URL
            </button>
          </div>

          {/* WhatsApp Owner & Auto Split Configuration */}
          <div className="pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <div>
              <label className="block font-semibold mb-1 opacity-80 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Nomor WhatsApp Owner (Format 628xxx)</span>
              </label>
              <input
                type="text"
                value={noWa}
                onChange={e => setNoWa(e.target.value)}
                placeholder="6281234567890"
                className="w-full px-3 py-2 rounded-xl border bg-transparent"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 opacity-80 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Split Tabungan (%) dari Pemasukan</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={autoSplit}
                onChange={e => setAutoSplit(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-xl border bg-transparent"
              />
            </div>
          </div>

          {settingsMsg && (
            <div className="p-2.5 rounded-xl text-xs bg-emerald-50 text-emerald-800">
              {settingsMsg}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAppParams}
              disabled={savingSettings}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-md active:scale-95"
              style={{ backgroundColor: colors.primary }}
            >
              {savingSettings ? 'Menyimpan...' : 'Simpan Parameter Settings'}
            </button>
          </div>
        </div>

        {/* SECTION 5: ZONA BERBAHAYA — HAPUS SEMUA DATA (KONDISI FRESH) */}
        <div
          className="p-5 theme-card space-y-4 md:col-span-2 border-rose-500/20"
          style={{
            backgroundColor: glassCardBg(0.7),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2 font-bold text-base text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <span>Zona Berbahaya: Reset & Hapus Semua Data</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Permanen
            </span>
          </div>

          <p className="text-xs opacity-75 leading-relaxed">
            Fitur ini akan mengosongkan seluruh riwayat <strong>transaksi, batas anggaran, target tabungan, dan daftar tagihan</strong> menjadi kosong bersih (FRESH) seperti baru diinstal. 
            <span className="block mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
              Catatan: 13 Kategori default dan konfigurasi PIN/Pengaturan tetap aman dipertahankan.
            </span>
          </p>

          {resetMsg && (
            <div
              className={`p-3 rounded-xl text-xs ${
                resetMsg.error
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {resetMsg.text}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setIsResetModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl text-xs font-display font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
              <span>Hapus Semua Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog Konfirmasi 2 Langkah: Reset Semua Data */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!resetLoading) setIsResetModalOpen(false);
            }}
          />

          {/* Modal Container */}
          <div
            className="relative z-10 w-full max-w-md p-6 rounded-2xl shadow-2xl border backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150 space-y-4"
            style={{
              backgroundColor: isDark 
                ? 'rgba(18, 30, 49, 0.96)' 
                : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.95)' : colors.card),
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              color: colors.text,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">Konfirmasi Hapus Semua Data</h3>
                  <p className="text-[11px] opacity-65">Langkah 2 dari 2: Verifikasi teks</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!resetLoading) setIsResetModalOpen(false);
                }}
                disabled={resetLoading}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs opacity-75 leading-relaxed">
              Tindakan ini akan <strong>menghapus permanen</strong> semua data transaksi, anggaran, tabungan, dan tagihan (baik di mode simulasi localStorage maupun database Google Sheets).
            </p>

            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-xs space-y-2">
              <label className="block font-semibold opacity-85">
                Ketik kata <span className="font-mono font-bold text-rose-600 dark:text-rose-400">HAPUS</span> di bawah ini untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Ketik HAPUS di sini..."
                className="w-full px-3 py-2 rounded-xl border bg-transparent font-mono tracking-wider text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                autoFocus
                disabled={resetLoading}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmText.trim() !== 'HAPUS' || resetLoading}
                className="px-4 py-2 rounded-xl text-xs font-display font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{resetLoading ? 'Mengosongkan Data...' : 'Ya, Hapus Semua Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
