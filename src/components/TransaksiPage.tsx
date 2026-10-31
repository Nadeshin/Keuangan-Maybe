import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Transaksi, Kategori } from '../types';
import { callApi } from '../api';
import { 
  Search, 
  Filter, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  ExternalLink, 
  Calendar, 
  AlertCircle,
  Pencil
} from 'lucide-react';

interface TransaksiPageProps {
  token: string;
  kategoriMap: Record<string, Kategori>;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: Transaksi) => void;
  onRefreshData: () => void;
}

export const TransaksiPage: React.FC<TransaksiPageProps> = ({
  token,
  kategoriMap,
  onOpenAddModal,
  onOpenEditModal,
  onRefreshData,
}) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [selectedTipe, setSelectedTipe] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchTransaksi = async () => {
    setLoading(true);
    try {
      const res = await callApi('getTransaksi', {
        token,
        startDate,
        endDate,
        categoryId: selectedCat,
        tipe: selectedTipe,
      });
      if (res.success) {
        setTransaksiList(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaksi();
  }, [startDate, endDate, selectedCat, selectedTipe]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await callApi('deleteTransaksi', { token, id: deleteId });
      if (res.success) {
        setDeleteId(null);
        fetchTransaksi();
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const filteredList = transaksiList.filter(t => {
    if (!search) return true;
    const catName = kategoriMap[t.id_kategori]?.nama || '';
    return (
      t.catatan.toLowerCase().includes(search.toLowerCase()) ||
      catName.toLowerCase().includes(search.toLowerCase()) ||
      String(t.jumlah).includes(search)
    );
  });

  const totalFilteredMasuk = filteredList
    .filter(t => t.tipe === 'masuk')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalFilteredKeluar = filteredList
    .filter(t => t.tipe === 'keluar')
    .reduce((sum, t) => sum + t.jumlah, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Daftar Transaksi
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            Pencatatan pemasukan dan pengeluaran dari Web dan WhatsApp
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          style={{ backgroundColor: colors.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="p-4 theme-card space-y-3"
        style={{
          backgroundColor: glassCardBg(0.7),
          color: colors.text,
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 opacity-50" />
            <input
              type="text"
              placeholder="Cari catatan, kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          {/* Kategori Filter */}
          <div>
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            >
              <option value="">Semua Kategori</option>
              {Object.values(kategoriMap).map(k => (
                <option key={k.id_kategori} value={k.id_kategori}>
                  {k.nama} ({k.tipe})
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Filter */}
          <div>
            <select
              value={selectedTipe}
              onChange={e => setSelectedTipe(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none focus:ring-1"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            >
              <option value="">Semua Tipe</option>
              <option value="keluar">Hanya Pengeluaran</option>
              <option value="masuk">Hanya Pemasukan</option>
            </select>
          </div>

          {/* Reset filter button */}
          <button
            onClick={() => {
              setSearch('');
              setStartDate('');
              setEndDate('');
              setSelectedCat('');
              setSelectedTipe('');
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl border hover:bg-black/5 transition-all text-center"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          >
            Reset Filter
          </button>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          <Calendar className="w-3.5 h-3.5 opacity-60" />
          <span className="opacity-70 font-semibold">Rentang Tanggal:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2 py-1 rounded-lg border bg-transparent"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          />
          <span>s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2 py-1 rounded-lg border bg-transparent"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          />
        </div>
      </div>

      {/* Summary of Filtered Items */}
      <div className="flex flex-wrap items-center justify-between text-xs font-semibold px-2 opacity-80">
        <span>Menampilkan {filteredList.length} transaksi</span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-700">Masuk: +Rp{totalFilteredMasuk.toLocaleString('id-ID')}</span>
          <span className="text-rose-700">Keluar: -Rp{totalFilteredKeluar.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Transactions List */}
      <div
        className="p-4 sm:p-5 theme-card"
        style={{
          backgroundColor: glassCardBg(0.7),
          color: colors.text,
        }}
      >
        {loading ? (
          <div className="py-12 text-center text-xs opacity-60">Memuat transaksi...</div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs opacity-60">
            {transaksiList.length === 0
              ? 'Belum ada transaksi tercatat. Klik tombol "+ Catat Baru" untuk mencatat transaksi pertama Anda.'
              : 'Tidak ada transaksi yang cocok dengan filter yang dipilih.'}
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {filteredList.map(trx => {
              const kat = kategoriMap[trx.id_kategori];
              const isMasuk = trx.tipe === 'masuk';

              return (
                <div key={trx.id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isMasuk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isMasuk ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">
                          {kat?.nama || trx.id_kategori}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-black/5 uppercase">
                          {trx.sumber}
                        </span>
                      </div>
                      <div className="text-xs opacity-65 truncate">
                        {trx.tanggal} • {trx.catatan || 'Tanpa catatan'}
                      </div>
                      {trx.file_url && (
                        <a
                          href={trx.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Lihat Struk</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-bold ${
                          isMasuk ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isMasuk ? '+' : '-'}Rp{trx.jumlah.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenEditModal(trx)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 opacity-60 group-hover:opacity-100 transition-all"
                      title="Edit Transaksi"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteId(trx.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 opacity-60 group-hover:opacity-100 transition-all"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base">Hapus Transaksi?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data transaksi ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
