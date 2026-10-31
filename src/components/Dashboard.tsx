import React from 'react';
import { useAppTheme } from '../themeContext';
import { DashboardResponse, Transaksi } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  PiggyBank, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  data: DashboardResponse | null;
  loading: boolean;
  onOpenAddModal: () => void;
  onNavigateTab: (tab: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  loading,
  onOpenAddModal,
  onNavigateTab,
  selectedMonth,
  setSelectedMonth,
}) => {
  const { colors, theme, isDark } = useAppTheme();

  // Skeleton loading (semi AI-slop replacement for coarse spinner)
  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 rounded-2xl skeleton-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="col-span-2 lg:col-span-1 h-36 rounded-2xl skeleton-shimmer" />
          <div className="h-36 rounded-2xl skeleton-shimmer" />
          <div className="h-36 rounded-2xl skeleton-shimmer" />
          <div className="h-36 rounded-2xl skeleton-shimmer" />
          <div className="col-span-2 lg:col-span-1 h-36 rounded-2xl skeleton-shimmer" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl skeleton-shimmer" />
          <div className="h-72 rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const ringkasan = data?.ringkasan || {
    totalSaldo: 0,
    pemasukanBulan: 0,
    pengeluaranBulan: 0,
    sisaAnggaran: 0,
    totalLimitAnggaran: 0,
    totalTargetTabungan: 0,
    totalTerkumpulTabungan: 0,
  };

  const anggaranWarning = (data?.anggaran || []).filter(a => (a.persen || 0) >= 80);
  const tabunganList = data?.tabungan || [];
  const totalTabunganPersen = ringkasan.totalTargetTabungan > 0 
    ? Math.min(100, Math.round((ringkasan.totalTerkumpulTabungan / ringkasan.totalTargetTabungan) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Month Selector & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight" style={{ color: colors.text }}>
              Ringkasan Keuangan
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Personal
            </span>
          </div>
          <p className="text-xs sm:text-sm opacity-70 mt-0.5 font-medium">
            Arus kas, batas anggaran, dan progres tabungan Anda
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Glass Month Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all shadow-sm"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.75)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              color: colors.text,
            }}
          >
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium"
            />
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold text-white btn-glow active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* 5 Financial Metric Cards (Modern Semi AI-Slop) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Hero Total Saldo (col-span-2 on mobile) */}
        <div
          className="col-span-2 lg:col-span-1 p-5 theme-card relative overflow-hidden group"
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          {/* Subtle ambient light bloom */}
          <div
            className="w-24 h-24 rounded-full absolute -top-8 -right-8 filter blur-2xl opacity-20 pointer-events-none"
            style={{ backgroundColor: colors.primary }}
          />

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-65">Total Saldo</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(33, 150, 243, 0.1)',
                color: colors.primary,
              }}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="text-2xl sm:text-[26px] font-display font-extrabold tracking-tight num-tabular text-gradient-hero mt-1">
            Rp{ringkasan.totalSaldo.toLocaleString('id-ID')}
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] opacity-65 font-medium">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Akumulasi saldo bersih</span>
          </div>
        </div>

        {/* Card 2: Pemasukan Bulan Ini */}
        <div
          className="p-5 theme-card relative overflow-hidden"
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
              Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-display font-extrabold tracking-tight num-tabular text-emerald-600 dark:text-emerald-400 mt-1">
            +Rp{ringkasan.pemasukanBulan.toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 text-[11px] opacity-60 font-medium">
            Bulan {selectedMonth}
          </div>
        </div>

        {/* Card 3: Pengeluaran Bulan Ini */}
        <div
          className="p-5 theme-card relative overflow-hidden"
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase text-rose-600 dark:text-rose-400">
              Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-display font-extrabold tracking-tight num-tabular text-rose-600 dark:text-rose-400 mt-1">
            -Rp{ringkasan.pengeluaranBulan.toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 text-[11px] opacity-60 font-medium">
            Bulan {selectedMonth}
          </div>
        </div>

        {/* Card 4: Sisa Anggaran */}
        <div
          className="p-5 theme-card cursor-pointer hover:border-black/20 dark:hover:border-white/25 transition-all btn-press"
          onClick={() => onNavigateTab('anggaran')}
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-65">Sisa Anggaran</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(33, 150, 243, 0.1)',
                color: colors.primary,
              }}
            >
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-display font-extrabold tracking-tight num-tabular mt-1">
            Rp{ringkasan.sisaAnggaran.toLocaleString('id-ID')}
          </div>
          <div className="mt-2.5 text-[11px] opacity-60 truncate font-medium">
            Limit: Rp{ringkasan.totalLimitAnggaran.toLocaleString('id-ID')}
          </div>
        </div>

        {/* Card 5: Progres Tabungan */}
        <div
          className="col-span-2 lg:col-span-1 p-5 theme-card cursor-pointer hover:border-black/20 dark:hover:border-white/25 transition-all btn-press"
          onClick={() => onNavigateTab('tabungan')}
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase opacity-65">Progres Tabungan</span>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(33, 150, 243, 0.1)',
                color: colors.primary,
              }}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-display font-extrabold tracking-tight num-tabular mt-1 flex items-baseline gap-1.5">
            <span>{totalTabunganPersen}%</span>
            <span className="text-[11px] font-normal opacity-60">terkumpul</span>
          </div>
          <div className="mt-2.5 w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalTabunganPersen}%`,
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Warning Anggaran Alert Banner (PRD 5.5) */}
      {anggaranWarning.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2 font-display font-bold text-sm mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Peringatan Limit Anggaran Mendekati / Melebihi Batas!</span>
          </div>
          <div className="space-y-1.5 mt-2.5">
            {anggaranWarning.map(a => {
              const kat = data?.kategori[a.id_kategori];
              const isOver = (a.persen || 0) >= 100;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-xs p-2.5 rounded-xl border backdrop-blur-sm"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{kat?.nama || a.id_kategori}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOver 
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {a.persen}% Terpakai
                    </span>
                    <span className="text-[10px] opacity-70">
                      ({a.mode === 'blokir' ? 'Hard Blokir' : 'Peringatan'})
                    </span>
                  </div>
                  <span className="font-display font-bold num-tabular">
                    Rp{(a.terpakai || 0).toLocaleString('id-ID')} / Rp{a.limit.toLocaleString('id-ID')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Transaksi Terbaru & Target Tabungan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Transaksi Terbaru */}
        <div
          className="lg:col-span-2 p-5 sm:p-6 theme-card"
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div className="flex items-center justify-between pb-3.5 border-b mb-3" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
            <div>
              <h2 className="font-display font-bold text-base">Transaksi Terbaru</h2>
              <p className="text-xs opacity-60">10 aktivitas pencatatan terakhir</p>
            </div>
            <button
              onClick={() => onNavigateTab('transaksi')}
              className="text-xs font-semibold flex items-center gap-1 hover:underline transition-all"
              style={{ color: colors.primary }}
            >
              <span>Semua Riwayat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
            {(!data?.transaksiTerbaru || data.transaksiTerbaru.length === 0) ? (
              <div className="py-10 text-center text-xs opacity-60">
                Belum ada transaksi pada bulan {selectedMonth}.
              </div>
            ) : (
              data.transaksiTerbaru.map((t: Transaksi) => {
                const kat = data?.kategori[t.id_kategori];
                const isMasuk = t.tipe === 'masuk';
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isMasuk 
                            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isMasuk ? <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <span>{kat?.nama || t.id_kategori}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 opacity-75 uppercase font-mono font-medium">
                            {t.sumber}
                          </span>
                        </div>
                        <div className="text-xs opacity-60 truncate mt-0.5">
                          {t.catatan || 'Tanpa catatan'} • {t.tanggal}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-display font-bold num-tabular ${
                          isMasuk 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isMasuk ? '+' : '-'}Rp{t.jumlah.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom 3: Target Tabungan Glass Widget */}
        <div
          className="p-5 sm:p-6 theme-card flex flex-col justify-between"
          style={{
            backgroundColor: isDark 
              ? 'rgba(18, 30, 49, 0.75)' 
              : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.85)'),
            color: colors.text,
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b mb-3" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
              <div>
                <h2 className="font-display font-bold text-base">Target Tabungan</h2>
                <p className="text-xs opacity-60">Progres pencapaian impian</p>
              </div>
              <button
                onClick={() => onNavigateTab('tabungan')}
                className="text-xs font-semibold flex items-center gap-1 hover:underline"
                style={{ color: colors.primary }}
              >
                <span>Kelola</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {tabunganList.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-60">Belum ada target tabungan.</div>
              ) : (
                tabunganList.slice(0, 3).map(tab => (
                  <div key={tab.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="truncate pr-2">{tab.nama}</span>
                      <span className="font-display num-tabular">{tab.persen}%</span>
                    </div>
                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${tab.persen}%`,
                          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] opacity-60 font-display num-tabular">
                      <span>Rp{tab.terkumpul.toLocaleString('id-ID')}</span>
                      <span>Target Rp{tab.target.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t mt-5" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
            <button
              onClick={() => onNavigateTab('grafik')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-2 border hover:bg-black/5 dark:hover:bg-white/5 transition-all btn-press"
              style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' }}
            >
              <span>📊 Buka Visualisasi Grafik Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
