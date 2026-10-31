import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Tagihan } from '../types';
import { callApi } from '../api';
import { 
  CalendarClock, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Send, 
  X, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface TagihanPageProps {
  token: string;
  onRefreshData: () => void;
}

export const TagihanPage: React.FC<TagihanPageProps> = ({ token, onRefreshData }) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [nama, setNama] = useState<string>('');
  const [nominal, setNominal] = useState<string>('');
  const [jatuhTempo, setJatuhTempo] = useState<string>('20');
  const [berulang, setBerulang] = useState<'Y' | 'T'>('Y');
  const [saving, setSaving] = useState<boolean>(false);

  // Paying bill state
  const [payingId, setPayingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchTagihan = async () => {
    setLoading(true);
    try {
      const res = await callApi('getTagihan', { token });
      if (res.success) {
        setTagihanList(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, []);

  const handleOpenModal = (item?: Tagihan) => {
    if (item) {
      setEditId(item.id);
      setNama(item.nama);
      setNominal(item.nominal.toLocaleString('id-ID'));
      setJatuhTempo(String(item.tanggal_jatuh_tempo));
      setBerulang(item.berulang);
    } else {
      setEditId('');
      setNama('');
      setNominal('');
      setJatuhTempo('20');
      setBerulang('Y');
    }
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const numNominal = parseFloat(nominal.replace(/\D/g, ''));
    const numJt = parseInt(jatuhTempo, 10);
    if (!nama.trim()) {
      setErrorMsg('Nama tagihan harus diisi.');
      return;
    }
    if (!numNominal || numNominal <= 0) {
      setErrorMsg('Nominal tagihan harus valid.');
      return;
    }
    if (!numJt || numJt < 1 || numJt > 31) {
      setErrorMsg('Tanggal jatuh tempo harus antara tanggal 1 - 31.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await callApi('saveTagihan', {
        token,
        id: editId,
        nama,
        nominal: numNominal,
        tanggal_jatuh_tempo: numJt,
        berulang,
        status: 'belum',
      });

      if (res.success) {
        setIsModalOpen(false);
        fetchTagihan();
        onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan tagihan.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handleBayar = async (id: string) => {
    setPayingId(id);
    try {
      const res = await callApi('bayarTagihan', { token, id });
      if (res.success) {
        fetchTagihan();
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPayingId(null);
    }
  };

  const curDay = new Date().getDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Pengingat Tagihan & WhatsApp
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            Otomasi reminder H-3, H-1, H+0 via WhatsApp jam 07:00 WIB (PRD 5.7)
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tagihan</span>
        </button>
      </div>

      {/* WhatsApp Automation Info Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Integrasi Bot WhatsApp Dua Arah (PRD 5.7)</span>
        </div>
        <p className="leading-relaxed opacity-90">
          Setiap jam <strong>07:00 WIB</strong>, server Google Apps Script mengecek tagihan yang belum lunas. Jika masuk H-3, H-1, atau hari H, notifikasi dikirim otomatis ke nomor WhatsApp pemilik.
        </p>
        <div className="p-2.5 rounded-lg bg-white/80 border border-emerald-200 font-mono text-[11px] space-y-1">
          <div>💡 <strong>Tandai Lunas via WA:</strong> Balas pesan bot dengan format: <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">LUNAS [NAMA TAGIHAN]</code></div>
          <div>Contoh: <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">LUNAS LISTRIK PLN</code> (otomatis tercatat sebagai pengeluaran)</div>
        </div>
      </div>

      {/* Tagihan List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60">Memuat tagihan...</div>
        ) : tagihanList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60 p-6 theme-card" style={{ backgroundColor: glassCardBg(0.7), color: colors.text }}>
            Belum ada tagihan terdaftar. Klik tombol "Tambah Tagihan" di atas.
          </div>
        ) : (
          tagihanList.map(tag => {
            const jt = parseInt(String(tag.tanggal_jatuh_tempo), 10);
            const isLunas = tag.status === 'lunas';
            const selisih = jt - curDay;

            let badgeStatus = null;
            if (isLunas) {
              badgeStatus = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Lunas</span>
                </span>
              );
            } else if (selisih === 0) {
              badgeStatus = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  Jatuh Tempo Hari Ini!
                </span>
              );
            } else if (selisih > 0 && selisih <= 3) {
              badgeStatus = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  H-{selisih} Mendekati
                </span>
              );
            } else {
              badgeStatus = (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                  Belum Lunas
                </span>
              );
            }

            return (
              <div
                key={tag.id}
                className="p-5 theme-card space-y-4"
                style={{
                  backgroundColor: glassCardBg(0.7),
                  color: colors.text,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base">{tag.nama}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                      <span>Jatuh tempo tiap tanggal <strong>{tag.tanggal_jatuh_tempo}</strong></span>
                      <span>•</span>
                      <span>{tag.berulang === 'Y' ? 'Rutin Bulanan' : 'Sekali'}</span>
                    </div>
                  </div>

                  {badgeStatus}
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <div>
                    <div className="text-[11px] opacity-60">Nominal Tagihan</div>
                    <div className="text-lg font-bold">
                      Rp{tag.nominal.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {tag.terakhir_dibayar && (
                    <div className="text-right text-[11px] opacity-60">
                      Dibayar: {tag.terakhir_dibayar}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  <button
                    onClick={() => handleOpenModal(tag)}
                    className="text-xs opacity-70 hover:opacity-100 underline"
                  >
                    Edit Tagihan
                  </button>

                  {!isLunas ? (
                    <button
                      disabled={payingId === tag.id}
                      onClick={() => handleBayar(tag.id)}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{payingId === tag.id ? 'Memproses...' : 'Tandai Lunas'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tercatat di Pengeluaran</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tagihan */}
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
                {editId ? 'Edit Tagihan' : 'Tambah Tagihan Baru'}
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
                <label className="block font-semibold mb-1 opacity-80">Nama Tagihan *</label>
                <input
                  type="text"
                  placeholder="Contoh: Listrik PLN, WiFi Indihome, Kos"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Nominal Tagihan (Rp) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={nominal}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNominal(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Tanggal Jatuh Tempo Tiap Bulan (1 - 31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={jatuhTempo}
                  onChange={e => setJatuhTempo(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Apakah Berulang Tiap Bulan?</label>
                <select
                  value={berulang}
                  onChange={e => setBerulang(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent"
                >
                  <option value="Y">Ya (Rutin Setiap Bulan)</option>
                  <option value="T">Tidak (Hanya Sekali)</option>
                </select>
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
                {saving ? 'Menyimpan...' : 'Simpan Tagihan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
