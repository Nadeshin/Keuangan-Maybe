import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Tabungan } from '../types';
import { callApi } from '../api';
import { 
  PiggyBank, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Target, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';

interface TabunganPageProps {
  token: string;
  onRefreshData: () => void;
}

export const TabunganPage: React.FC<TabunganPageProps> = ({ token, onRefreshData }) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [tabunganList, setTabunganList] = useState<Tabungan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal Create/Edit Goal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<string>('');
  const [namaGoal, setNamaGoal] = useState<string>('');
  const [targetGoal, setTargetGoal] = useState<string>('');
  const [terkumpulGoal, setTerkumpulGoal] = useState<string>('');
  const [deadlineGoal, setDeadlineGoal] = useState<string>('');
  const [savingGoal, setSavingGoal] = useState<boolean>(false);

  // Modal Setor / Tarik Manual
  const [actionTabungan, setActionTabungan] = useState<{ id: string; nama: string; aksi: 'setor' | 'tarik' } | null>(null);
  const [nominalAction, setNominalAction] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchTabungan = async () => {
    setLoading(true);
    try {
      const res = await callApi('getTabungan', { token });
      if (res.success) {
        setTabunganList(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabungan();
  }, []);

  const handleOpenGoalModal = (item?: Tabungan) => {
    if (item) {
      setEditId(item.id);
      setNamaGoal(item.nama);
      setTargetGoal(item.target.toLocaleString('id-ID'));
      setTerkumpulGoal(item.terkumpul.toLocaleString('id-ID'));
      setDeadlineGoal(item.deadline || '');
    } else {
      setEditId('');
      setNamaGoal('');
      setTargetGoal('');
      setTerkumpulGoal('0');
      setDeadlineGoal('');
    }
    setErrorMsg('');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async () => {
    const numTarget = parseFloat(targetGoal.replace(/\D/g, ''));
    const numTerkumpul = parseFloat(terkumpulGoal.replace(/\D/g, '')) || 0;
    if (!namaGoal.trim()) {
      setErrorMsg('Nama target tabungan tidak boleh kosong.');
      return;
    }
    if (!numTarget || numTarget <= 0) {
      setErrorMsg('Masukkan nominal target yang valid.');
      return;
    }

    setSavingGoal(true);
    setErrorMsg('');
    try {
      const res = await callApi('saveTabungan', {
        token,
        id: editId,
        nama: namaGoal,
        target: numTarget,
        terkumpul: numTerkumpul,
        deadline: deadlineGoal,
      });

      if (res.success) {
        setIsGoalModalOpen(false);
        fetchTabungan();
        onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan target.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleSetorTarik = async () => {
    if (!actionTabungan) return;
    const num = parseFloat(nominalAction.replace(/\D/g, ''));
    if (!num || num <= 0) {
      setErrorMsg('Masukkan nominal yang valid.');
      return;
    }

    setProcessingAction(true);
    setErrorMsg('');
    try {
      const res = await callApi('setorTarikTabungan', {
        token,
        id: actionTabungan.id,
        aksi: actionTabungan.aksi,
        nominal: num,
      });

      if (res.success) {
        setActionTabungan(null);
        setNominalAction('');
        fetchTabungan();
        onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal memproses transaksi.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Terjadi kesalahan sistem.');
    } finally {
      setProcessingAction(false);
    }
  };

  const getSisaHari = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadlineStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Tabungan & Target Impian
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            Fitur menabung disiplin dengan target, batas waktu, dan auto-split pemasukan (PRD 5.6)
          </p>
        </div>

        <button
          onClick={() => handleOpenGoalModal()}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Buat Target Baru</span>
        </button>
      </div>

      {/* Auto Split Info Banner */}
      <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Auto-Split Aktif (10%):</strong> Setiap Anda mencatat pemasukan baru, sistem otomatis menyisihkan 10% ke tabungan yang Anda pilih.
          </span>
        </div>
      </div>

      {/* Grid Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60">Memuat tabungan...</div>
        ) : tabunganList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs opacity-60 p-6 theme-card" style={{ backgroundColor: glassCardBg(0.7), color: colors.text }}>
            Belum ada target tabungan. Klik "Buat Target Baru" untuk mulai menabung!
          </div>
        ) : (
          tabunganList.map(tab => {
            const pct = tab.target > 0 ? Math.min(100, Math.round((tab.terkumpul / tab.target) * 100)) : 0;
            const sisaHari = getSisaHari(tab.deadline);
            const isCompleted = tab.terkumpul >= tab.target;

            return (
              <div
                key={tab.id}
                className="p-5 theme-card space-y-4"
                style={{
                  backgroundColor: glassCardBg(0.7),
                  color: colors.text,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: colors.primary }} />
                      <span>{tab.nama}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                      {tab.deadline ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Deadline: {tab.deadline}</span>
                          {sisaHari !== null && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              sisaHari <= 7 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {sisaHari > 0 ? `${sisaHari} hari lagi` : 'Jatuh tempo'}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Tanpa batas waktu</span>
                      )}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isCompleted ? 'Tercapai! 🎉' : `${pct}%`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Terkumpul: Rp{tab.terkumpul.toLocaleString('id-ID')}</span>
                    <span>Target: Rp{tab.target.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="w-full bg-black/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isCompleted ? '#2E7D32' : colors.primary,
                      }}
                    />
                  </div>
                  <div className="text-[11px] opacity-65 text-right">
                    Kekurangan: Rp{Math.max(0, tab.target - tab.terkumpul).toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Action Buttons: Setor & Tarik */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                  <button
                    onClick={() => handleOpenGoalModal(tab)}
                    className="text-xs opacity-70 hover:opacity-100 underline"
                  >
                    Edit Target
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActionTabungan({ id: tab.id, nama: tab.nama, aksi: 'tarik' })}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-black/5 flex items-center gap-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tarik</span>
                    </button>
                    <button
                      onClick={() => setActionTabungan({ id: tab.id, nama: tab.nama, aksi: 'setor' })}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm flex items-center gap-1 active:scale-95"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Setor</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Target Tabungan (Create/Edit) */}
      {isGoalModalOpen && (
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
                {editId ? 'Edit Target Tabungan' : 'Target Tabungan Baru'}
              </h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="opacity-60 hover:opacity-100">
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
                <label className="block font-semibold mb-1 opacity-80">Nama Target *</label>
                <input
                  type="text"
                  placeholder="Contoh: Dana Darurat, Beli Laptop"
                  value={namaGoal}
                  onChange={e => setNamaGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Target Nominal (Rp) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={targetGoal}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTargetGoal(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Saldo Terkumpul Awal (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={terkumpulGoal}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTerkumpulGoal(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                  }}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border bg-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 opacity-80">Batas Waktu / Deadline (Opsional)</label>
                <input
                  type="date"
                  value={deadlineGoal}
                  onChange={e => setDeadlineGoal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border hover:bg-black/5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingGoal}
                onClick={handleSaveGoal}
                className="px-4 py-1.5 rounded-lg text-white font-semibold shadow-md active:scale-95"
                style={{ backgroundColor: colors.primary }}
              >
                {savingGoal ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Setor / Tarik Manual */}
      {actionTabungan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm p-6 theme-card space-y-4"
            style={{
              backgroundColor: glassCardBg(0.95),
              color: colors.text,
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }}>
              <h3 className="font-bold text-base capitalize">
                {actionTabungan.aksi} Tabungan: {actionTabungan.nama}
              </h3>
              <button onClick={() => setActionTabungan(null)} className="opacity-60 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg text-xs bg-red-100 text-red-800">
                {errorMsg}
              </div>
            )}

            <p className="text-xs opacity-75">
              Nominal yang di-{actionTabungan.aksi} akan otomatis tercatat ke riwayat transaksi keuangan utama Anda.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1 opacity-80">Nominal (Rp) *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={nominalAction}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNominalAction(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                }}
                className="w-full px-3 py-2 text-base font-bold rounded-xl border bg-transparent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
              <button
                type="button"
                onClick={() => setActionTabungan(null)}
                className="px-3 py-1.5 text-xs rounded-lg border hover:bg-black/5"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSetorTarik}
                className="px-4 py-1.5 text-xs rounded-lg text-white font-semibold shadow-md active:scale-95"
                style={{ backgroundColor: colors.primary }}
              >
                {processingAction ? 'Memproses...' : `Konfirmasi ${actionTabungan.aksi}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
