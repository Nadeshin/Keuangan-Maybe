import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Kategori, Tabungan, TransactionType, Transaksi } from '../types';
import { callApi } from '../api';
import { X, Check, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

interface TransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kategoriList: Kategori[];
  tabunganList: Tabungan[];
  token: string;
  editItem?: Transaksi | null;
}

export const TransaksiModal: React.FC<TransaksiModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  kategoriList,
  tabunganList,
  token,
  editItem,
}) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [tipe, setTipe] = useState<TransactionType>('keluar');
  const [jumlah, setJumlah] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [idKategori, setIdKategori] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');
  const [idTabunganSplit, setIdTabunganSplit] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Warning/Block confirmation state
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  // Prefill state saat membuka modal atau saat editItem berubah
  useEffect(() => {
    if (!isOpen) return;

    if (editItem) {
      setTipe(editItem.tipe);
      setJumlah(editItem.jumlah ? editItem.jumlah.toLocaleString('id-ID') : '');
      setTanggal(editItem.tanggal);
      setIdKategori(editItem.id_kategori);
      setCatatan(editItem.catatan || '');
      setFileUrl(editItem.file_url || '');
      setIdTabunganSplit('');
    } else {
      setTipe('keluar');
      setJumlah('');
      setTanggal(new Date().toISOString().slice(0, 10));
      const filtered = kategoriList.filter(k => k.tipe === 'keluar');
      setIdKategori(filtered[0]?.id_kategori || '');
      setCatatan('');
      setFileUrl('');
      setIdTabunganSplit(tabunganList[0]?.id || '');
    }
    setErrorMsg('');
    setWarningMsg(null);
    setBlockedMsg(null);
  }, [isOpen, editItem, kategoriList, tabunganList]);

  // Set default category on type change jika bukan edit atau jika kategori saat ini tidak cocok dengan tipe
  useEffect(() => {
    if (editItem && editItem.tipe === tipe && editItem.id_kategori) {
      return;
    }
    const filtered = kategoriList.filter(k => k.tipe === tipe);
    if (filtered.length > 0 && !filtered.some(k => k.id_kategori === idKategori)) {
      setIdKategori(filtered[0].id_kategori);
    }
  }, [tipe, kategoriList, editItem]);

  // Set default tabungan split for income jika mode baru
  useEffect(() => {
    if (!editItem && tipe === 'masuk' && tabunganList.length > 0 && !idTabunganSplit) {
      setIdTabunganSplit(tabunganList[0].id);
    }
  }, [tipe, tabunganList, idTabunganSplit, editItem]);

  if (!isOpen) return null;

  const handleSubmit = async (forceBypass = false) => {
    const numJml = parseFloat(jumlah.replace(/\D/g, ''));
    if (!numJml || numJml <= 0) {
      setErrorMsg('Masukkan nominal transaksi yang valid.');
      return;
    }
    if (!idKategori) {
      setErrorMsg('Pilih kategori transaksi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setWarningMsg(null);
    setBlockedMsg(null);

    try {
      let res;
      if (editItem) {
        // FIX 3: Panggil updateTransaksi jika dalam mode edit
        res = await callApi('updateTransaksi', {
          token,
          id: editItem.id,
          tanggal,
          tipe,
          jumlah: numJml,
          id_kategori: idKategori,
          catatan,
          file_url: fileUrl,
          forceBypass,
        });
      } else {
        res = await callApi('addTransaksi', {
          token,
          tanggal,
          tipe,
          jumlah: numJml,
          id_kategori: idKategori,
          catatan,
          file_url: fileUrl,
          sumber: 'web',
          id_tabungan_split: tipe === 'masuk' ? idTabunganSplit : '',
          forceBypass,
        });
      }

      if (res.blocked) {
        setBlockedMsg(res.error);
        return;
      }

      if (res.warning && !forceBypass) {
        setWarningMsg(res.error);
        return;
      }

      if (res.success) {
        setJumlah('');
        setCatatan('');
        setFileUrl('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan transaksi.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const filteredKategori = kategoriList.filter(k => k.tipe === tipe);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg p-5 sm:p-6 theme-card max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: glassCardBg(0.95),
          color: colors.text,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
          <h2 className="text-lg font-bold">{editItem ? 'Edit Transaksi' : 'Catat Transaksi Baru'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 transition-colors opacity-70 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tipe Selector: Pengeluaran vs Pemasukan */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-black/5">
          <button
            type="button"
            onClick={() => setTipe('keluar')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              tipe === 'keluar' ? 'bg-red-500 text-white shadow' : 'opacity-70 hover:opacity-100'
            }`}
          >
            💸 Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setTipe('masuk')}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              tipe === 'masuk' ? 'bg-emerald-600 text-white shadow' : 'opacity-70 hover:opacity-100'
            }`}
          >
            💰 Pemasukan
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg text-xs bg-red-100 text-red-800 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Blocked Modal Dialog */}
        {blockedMsg && (
          <div className="mb-4 p-4 rounded-xl text-sm bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Transaksi Ditolak (Mode Blokir)</p>
              <p className="text-xs mt-1 leading-relaxed">{blockedMsg}</p>
            </div>
          </div>
        )}

        {/* Warning Over-Budget Dialog */}
        {warningMsg && (
          <div className="mb-4 p-4 rounded-xl text-sm bg-amber-50 border border-amber-300 text-amber-900 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Peringatan Melebihi Anggaran</p>
                <p className="text-xs mt-1 leading-relaxed">{warningMsg}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-200">
              <button
                type="button"
                onClick={() => setWarningMsg(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Tetap Simpan Transaksi
              </button>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Nominal (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold opacity-60">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={jumlah}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setJumlah(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                }}
                className="w-full pl-10 pr-3 py-2 text-lg font-bold rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
                style={{
                  borderColor: 'rgba(0,0,0,0.15)',
                }}
              />
            </div>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Tanggal Transaksi</label>
            <input
              type="date"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Kategori *</label>
            <select
              value={idKategori}
              onChange={e => setIdKategori(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            >
              {filteredKategori.map(k => (
                <option key={k.id_kategori} value={k.id_kategori}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Auto-split Tabungan if Income */}
          {tipe === 'masuk' && tabunganList.length > 0 && (
            <div className="p-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 text-emerald-950">
              <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Auto-Split Tabungan Otomatis (PRD 5.6)</span>
              </div>
              <p className="text-[11px] opacity-75 mb-2">
                10% dari pemasukan ini akan otomatis ditabung ke:
              </p>
              <select
                value={idTabunganSplit}
                onChange={e => setIdTabunganSplit(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white text-slate-800"
              >
                <option value="">-- Tidak Perlu Auto-Split --</option>
                {tabunganList.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nama} (Terkumpul: Rp{t.terkumpul.toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Catatan / Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Makan siang bareng tim"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          {/* File Struk URL (Opsional) */}
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-80">Link Foto Struk Drive (Opsional)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={fileUrl}
              onChange={e => setFileUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-black/5 transition-all opacity-80"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading || !!blockedMsg}
            onClick={() => handleSubmit(false)}
            className="px-5 py-2 text-sm font-semibold rounded-xl text-white shadow-md active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
            style={{ backgroundColor: colors.primary }}
          >
            {loading ? 'Menyimpan...' : (
              <>
                <Check className="w-4 h-4" />
                <span>{editItem ? 'Simpan Perubahan' : 'Simpan Transaksi'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
