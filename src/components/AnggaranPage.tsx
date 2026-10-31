import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Anggaran, Kategori } from '../types';
import { callApi } from '../api';
import { 
  PieChart, 
  Plus, 
  AlertTriangle, 
  ShieldAlert, 
  Check, 
  X, 
  Settings2,
  Calendar
} from 'lucide-react';

interface AnggaranPageProps {
  token: string;
  kategoriMap: Record<string, Kategori>;
  onRefreshData: () => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
}

export const AnggaranPage: React.FC<AnggaranPageProps> = ({
  token,
  kategoriMap,
  onRefreshData,
  selectedMonth,
  setSelectedMonth,
}) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [anggaranList, setAnggaranList] = useState<Anggaran[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [selectedKategori, setSelectedKategori] = useState<string>('');
  const [limitInput, setLimitInput] = useState<string>('');
  const [modeInput, setModeInput] = useState<'peringatan' | 'blokir'>('peringatan');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchAnggaran = async () => {
    setLoading(true);
    try {
      const res = await callApi('getDashboard', { token, bulan: selectedMonth });
      if (res.success) {
        setAnggaranList(res.anggaran || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnggaran();
  }, [selectedMonth]);

  const handleOpenModal = (item?: Anggaran) => {
    if (item) {
      setEditId(item.id);
      setSelectedKategori(item.id_kategori);
      setLimitInput(item.limit.toLocaleString('id-ID'));
      setModeInput(item.mode);
    } else {
      setEditId('');
      const expenseCats = Object.values(kategoriMap).filter(k => k.tipe === 'keluar');
      setSelectedKategori(expenseCats[0]?.id_kategori || '');
      setLimitInput('');
      setModeInput('peringatan');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const numLimit = parseFloat(limitInput.replace(/\D/g, ''));
    if (!numLimit || numLimit <= 0) {
      setErrorMsg('Masukkan limit anggaran yang valid.');
      return;
    }
    if (!selectedKategori) {
      setErrorMsg('Pilih kategori.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await callApi('saveAnggaran', {
        token,
        id: editId,
        bulan: selectedMonth,
        id_kategori: selectedKategori,
        limit: numLimit,
        mode: modeInput,
      });

      if (res.success) {
        setIsModalOpen(false);
        fetchAnggaran();
        onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan anggaran.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  // Filter only categories of type 'keluar'
  const expenseCategories = Object.values(kategoriMap).filter(k => k.tipe === 'keluar');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Anggaran & Pembatasan
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            Kontrol pengeluaran bulanan dengan mode Peringatan atau Blokir (PRD 5.5)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white/70 shadow-sm" style={{ color: colors.text }}>
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            style={{ backgroundColor: colors.primary }}
          >
            <Plus className="w-4 h-4" />
            <span>Set Anggaran</span>
          </button>
        </div>
      </div>

      {/* Mode Explanation Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-amber-50/60 border-amber-200 text-amber-950 text-xs">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Mode Peringatan (Soft Limit)</span>
          </div>
          <p className="opacity-80 leading-relaxed">
            Jika transaksi melebihi limit, sistem akan memunculkan dialog konfirmasi untuk melanjutkan penyimpanan atau membatalkannya.
          </p>
        </div>

        <div className="p-4 rounded-xl border bg-rose-50/60 border-rose-200 text-rose-950 text-xs">
          <div className="flex items-center gap-2 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Mode Blokir (Hard Limit)</span>
          </div>
          <p className="opacity-80 leading-relaxed">
            Jika transaksi melebihi limit, sistem secara tegas menolak dan membatalkan pencatatan sampai limit dinaikkan.
          </p>
        </div>
      </div>

      {/* List of Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60">Memuat anggaran...</div>
        ) : anggaranList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60 p-6 theme-card" style={{ backgroundColor: glassCardBg(0.7), color: colors.text }}>
            Belum ada anggaran yang disetel untuk bulan {selectedMonth}. Klik tombol "Set Anggaran" di atas.
          </div>
        ) : (
          anggaranList.map(item => {
            const kat = kategoriMap[item.id_kategori];
            const terpakai = item.terpakai || 0;
            const persen = item.persen || 0;
            const sisa = Math.max(0, item.limit - terpakai);
            const isWarning = persen >= 80 && persen < 100;
            const isExceeded = persen >= 100;

            let barColor = colors.primary;
            if (isExceeded) barColor = '#E53935'; // Red
            else if (isWarning) barColor = '#F59E0B'; // Yellow/Amber

            return (
              <div
                key={item.id}
                className="p-5 theme-card space-y-4"
                style={{
                  backgroundColor: glassCardBg(0.7),
                  color: colors.text,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <span>{kat?.nama || item.id_kategori}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.mode === 'blokir'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        Mode: {item.mode === 'blokir' ? 'Blokir' : 'Peringatan'}
                      </span>
                      {isExceeded && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          100% Habis!
                        </span>
                      )}
                      {isWarning && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          80% Waspada
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-1.5 rounded-lg border hover:bg-black/5 opacity-70 hover:opacity-100 transition-all"
                    title="Ubah Anggaran"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Terpakai: Rp{terpakai.toLocaleString('id-ID')}</span>
                    <span>{persen}%</span>
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, persen)}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] opacity-65">
                    <span>Sisa: Rp{sisa.toLocaleString('id-ID')}</span>
                    <span>Limit: Rp{item.limit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Set Anggaran Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm p-6 theme-card space-y-4"
            style={{
              backgroundColor: glassCardBg(0.95),
              color: colors.text,
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
              <h3 className="font-bold text-base">
                {editId ? 'Ubah Anggaran' : 'Set Anggaran Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg text-xs bg-red-100 text-red-800">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 opacity-80">Kategori Pengeluaran</label>
                <select
                  disabled={!!editId}
                  value={selectedKategori}
                  onChange={e => setSelectedKategori(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent"
                >
                  {expenseCategories.map(k => (
                    <option key={k.id_kategori} value={k.id_kategori}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Limit Anggaran Bulanan (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 1.500.000"
                  value={limitInput}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setLimitInput(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Mode Pembatasan (PRD 5.5)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setModeInput('peringatan')}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                      modeInput === 'peringatan' ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm' : 'opacity-70'
                    }`}
                  >
                    ⚠️ Peringatan
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeInput('blokir')}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                      modeInput === 'blokir' ? 'bg-rose-100 border-rose-400 text-rose-900 shadow-sm' : 'opacity-70'
                    }`}
                  >
                    🛡️ Blokir
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border hover:bg-black/5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg text-white font-semibold shadow-md active:scale-95"
                style={{ backgroundColor: colors.primary }}
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
