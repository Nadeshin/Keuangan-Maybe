import React, { useState, useMemo } from 'react';
import { useAppTheme } from '../themeContext';
import { Transaksi, Kategori } from '../types';
import { BarChart3, PieChart as PieIcon, TrendingUp, Calendar } from 'lucide-react';

interface GrafikPageProps {
  transaksi: Transaksi[];
  kategoriMap: Record<string, Kategori>;
}

export const GrafikPage: React.FC<GrafikPageProps> = ({ transaksi, kategoriMap }) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [activeChartTab, setActiveChartTab] = useState<'semua' | 'harian' | 'mingguan' | 'bulanan' | 'kategori' | 'aruskas'>('semua');

  // 1. DATA HARIAN (30 HARI TERAKHIR)
  const dataHarian = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const mapKeluar: Record<string, number> = {};
    const mapMasuk: Record<string, number> = {};
    for (const t of transaksi) {
      if (t.tipe === 'keluar') {
        mapKeluar[t.tanggal] = (mapKeluar[t.tanggal] || 0) + t.jumlah;
      } else {
        mapMasuk[t.tanggal] = (mapMasuk[t.tanggal] || 0) + t.jumlah;
      }
    }

    return dates.map(date => ({
      date,
      label: date.slice(8, 10) + '/' + date.slice(5, 7),
      keluar: mapKeluar[date] || 0,
      masuk: mapMasuk[date] || 0,
    }));
  }, [transaksi]);

  // 2. DATA MINGGUAN (8 MINGGU TERAKHIR)
  const dataMingguan = useMemo(() => {
    const weeks: { label: string; start: string; end: string; keluar: number; masuk: number }[] = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const endD = new Date(now);
      endD.setDate(endD.getDate() - w * 7);
      const startD = new Date(endD);
      startD.setDate(startD.getDate() - 6);

      const sStr = startD.toISOString().slice(0, 10);
      const eStr = endD.toISOString().slice(0, 10);

      let keluar = 0;
      let masuk = 0;
      for (const t of transaksi) {
        if (t.tanggal >= sStr && t.tanggal <= eStr) {
          if (t.tipe === 'keluar') keluar += t.jumlah;
          else masuk += t.jumlah;
        }
      }

      weeks.push({
        label: `M-${8 - w} (${sStr.slice(5)})`,
        start: sStr,
        end: eStr,
        keluar,
        masuk,
      });
    }
    return weeks;
  }, [transaksi]);

  // 3. DATA BULANAN (12 BULAN TERAKHIR)
  const dataBulanan = useMemo(() => {
    const months: { bulan: string; label: string; keluar: number; masuk: number }[] = [];
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    for (let m = 11; m >= 0; m--) {
      const d = new Date(curYear, curMonth - m, 1);
      const bStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const label = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;

      let keluar = 0;
      let masuk = 0;
      for (const t of transaksi) {
        if (t.tanggal.startsWith(bStr)) {
          if (t.tipe === 'keluar') keluar += t.jumlah;
          else masuk += t.jumlah;
        }
      }

      months.push({
        bulan: bStr,
        label,
        keluar,
        masuk,
      });
    }
    return months;
  }, [transaksi]);

  // 4. DATA PENGELUARAN PER KATEGORI (DONUT)
  const dataKategori = useMemo(() => {
    const catMap: Record<string, number> = {};
    let total = 0;
    for (const t of transaksi) {
      if (t.tipe === 'keluar') {
        catMap[t.id_kategori] = (catMap[t.id_kategori] || 0) + t.jumlah;
        total += t.jumlah;
      }
    }

    const paletteColors = [colors.primary, colors.accent, '#FB8C00', '#E53935', '#8E24AA', '#00897B', '#3949AB', '#FDD835'];
    return Object.entries(catMap)
      .map(([id, amount], idx) => {
        const cat = kategoriMap[id];
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return {
          id,
          nama: cat?.nama || id,
          amount,
          persen: Math.round(pct * 10) / 10,
          color: cat?.warna || paletteColors[idx % paletteColors.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transaksi, kategoriMap, colors]);

  // 5. ARUS KAS TOTAL (PEMASUKAN VS PENGELUARAN)
  const dataArusKas = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    for (const t of transaksi) {
      if (t.tipe === 'masuk') masuk += t.jumlah;
      else keluar += t.jumlah;
    }
    return { masuk, keluar, selisih: masuk - keluar };
  }, [transaksi]);

  // Max values for scale
  const maxHarian = Math.max(...dataHarian.map(d => d.keluar), 100000);
  const maxMingguan = Math.max(...dataMingguan.map(d => Math.max(d.keluar, d.masuk)), 100000);
  const maxBulanan = Math.max(...dataBulanan.map(d => Math.max(d.keluar, d.masuk)), 500000);

  return (
    <div className="space-y-6">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Visualisasi & Grafik Analisis
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            5 analisis grafis lengkap sesuai PRD Section 5.4
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-black/5 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'semua', label: 'Semua Grafik' },
            { id: 'harian', label: '30 Hari' },
            { id: 'mingguan', label: '8 Minggu' },
            { id: 'bulanan', label: '12 Bulan' },
            { id: 'kategori', label: 'Kategori' },
            { id: 'aruskas', label: 'Arus Kas' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChartTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === tab.id ? 'bg-white shadow text-slate-800' : 'opacity-70 hover:opacity-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Grafik */}
      {transaksi.length === 0 && (
        <div
          className="p-5 rounded-2xl border text-center text-xs opacity-75 backdrop-blur-md"
          style={{
            backgroundColor: glassCardBg(0.7),
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            color: colors.text,
          }}
        >
          Belum ada transaksi tercatat. Grafik visual akan otomatis terisi setelah Anda mulai mencatat transaksi baru.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAFIK 1: HARIAN (30 HARI TERAKHIR) */}
        {(activeChartTab === 'semua' || activeChartTab === 'harian') && (
          <div
            className="p-5 theme-card lg:col-span-2"
            style={{
              backgroundColor: glassCardBg(0.7),
              color: colors.text,
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: colors.primary }} />
                  <span>1. Pengeluaran Harian (30 Hari Terakhir)</span>
                </h3>
                <p className="text-xs opacity-60">Pola belanja harian untuk kontrol overspending</p>
              </div>
            </div>

            <div className="h-56 flex items-end gap-1.5 pt-6 pb-2 overflow-x-auto">
              {dataHarian.map((item, idx) => {
                const heightPct = Math.min(100, Math.round((item.keluar / maxHarian) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {item.date}: Rp{item.keluar.toLocaleString('id-ID')}
                    </div>

                    <div className="w-full bg-black/5 rounded-t h-40 flex items-end">
                      <div
                        className="w-full rounded-t transition-all duration-300 group-hover:brightness-110"
                        style={{
                          height: `${Math.max(4, heightPct)}%`,
                          backgroundColor: item.keluar > 0 ? colors.primary : 'transparent',
                        }}
                      />
                    </div>
                    <span className="text-[9px] mt-1.5 opacity-60 rotate-45 sm:rotate-0 origin-left">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRAFIK 2: MINGGUAN (8 MINGGU) */}
        {(activeChartTab === 'semua' || activeChartTab === 'mingguan') && (
          <div
            className="p-5 theme-card"
            style={{
              backgroundColor: glassCardBg(0.7),
              color: colors.text,
            }}
          >
            <div className="pb-3 border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: colors.primary }} />
                <span>2. Tren Mingguan (8 Minggu Terakhir)</span>
              </h3>
              <p className="text-xs opacity-60">Bandingkan ritme pengeluaran vs pemasukan per minggu</p>
            </div>

            <div className="h-52 flex items-end justify-between gap-2 pt-6 pb-2">
              {dataMingguan.map((w, idx) => {
                const kHeight = Math.min(100, Math.round((w.keluar / maxMingguan) * 100));
                const mHeight = Math.min(100, Math.round((w.masuk / maxMingguan) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-1.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      Masuk: Rp{w.masuk.toLocaleString('id-ID')}<br />
                      Keluar: Rp{w.keluar.toLocaleString('id-ID')}
                    </div>

                    <div className="w-full h-36 flex items-end justify-center gap-1">
                      <div
                        className="w-2.5 rounded-t bg-emerald-500"
                        style={{ height: `${Math.max(4, mHeight)}%` }}
                        title="Masuk"
                      />
                      <div
                        className="w-2.5 rounded-t"
                        style={{
                          height: `${Math.max(4, kHeight)}%`,
                          backgroundColor: colors.primary,
                        }}
                        title="Keluar"
                      />
                    </div>
                    <span className="text-[10px] mt-2 opacity-65 truncate w-full text-center">
                      {w.label.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 text-xs font-semibold pt-2">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Masuk
              </span>
              <span className="flex items-center gap-1" style={{ color: colors.primary }}>
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: colors.primary }}></span> Keluar
              </span>
            </div>
          </div>
        )}

        {/* GRAFIK 3: BULANAN (12 BULAN) */}
        {(activeChartTab === 'semua' || activeChartTab === 'bulanan') && (
          <div
            className="p-5 theme-card"
            style={{
              backgroundColor: glassCardBg(0.7),
              color: colors.text,
            }}
          >
            <div className="pb-3 border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: colors.primary }} />
                <span>3. Rekap Bulanan (12 Bulan Terakhir)</span>
              </h3>
              <p className="text-xs opacity-60">Histori pertumbuhan keuangan sepanjang tahun</p>
            </div>

            <div className="h-52 flex items-end justify-between gap-1.5 pt-6 pb-2">
              {dataBulanan.map((m, idx) => {
                const kHeight = Math.min(100, Math.round((m.keluar / maxBulanan) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-20">
                      {m.label}: Rp{m.keluar.toLocaleString('id-ID')}
                    </div>

                    <div className="w-full bg-black/5 rounded-t h-36 flex items-end">
                      <div
                        className="w-full rounded-t transition-all group-hover:brightness-110"
                        style={{
                          height: `${Math.max(4, kHeight)}%`,
                          backgroundColor: colors.primary,
                        }}
                      />
                    </div>
                    <span className="text-[10px] mt-2 opacity-65">{m.label.slice(0, 3)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRAFIK 4: DONUT PER KATEGORI PENGELUARAN */}
        {(activeChartTab === 'semua' || activeChartTab === 'kategori') && (
          <div
            className="p-5 theme-card"
            style={{
              backgroundColor: glassCardBg(0.7),
              color: colors.text,
            }}
          >
            <div className="pb-3 border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <PieIcon className="w-4 h-4" style={{ color: colors.primary }} />
                <span>4. Pengeluaran per Kategori</span>
              </h3>
              <p className="text-xs opacity-60">Porsi pengeluaran berdasarkan alokasi kebutuhan</p>
            </div>

            <div className="space-y-3 pt-2">
              {dataKategori.length === 0 ? (
                <div className="py-8 text-center text-xs opacity-60">Belum ada pengeluaran tercatat.</div>
              ) : (
                dataKategori.map(cat => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        {cat.nama}
                      </span>
                      <span>
                        Rp{cat.amount.toLocaleString('id-ID')} ({cat.persen}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.persen}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GRAFIK 5: PEMASUKAN VS PENGELUARAN (ARUS KAS) */}
        {(activeChartTab === 'semua' || activeChartTab === 'aruskas') && (
          <div
            className="p-5 theme-card"
            style={{
              backgroundColor: glassCardBg(0.7),
              color: colors.text,
            }}
          >
            <div className="pb-3 border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
              <h3 className="font-bold text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>5. Analisis Arus Kas (Masuk vs Keluar)</span>
              </h3>
              <p className="text-xs opacity-60">Kesehatan cash flow dan akumulasi surplus</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                <div className="text-xs font-semibold">Total Pemasukan</div>
                <div className="text-xl font-bold mt-1 text-emerald-700">
                  +Rp{dataArusKas.masuk.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 text-rose-900 border border-rose-200">
                <div className="text-xs font-semibold">Total Pengeluaran</div>
                <div className="text-xl font-bold mt-1 text-rose-700">
                  -Rp{dataArusKas.keluar.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="p-4 rounded-xl border flex items-center justify-between" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <div>
                  <div className="text-xs font-semibold opacity-70">Arus Kas Bersih (Net Flow)</div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      dataArusKas.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {dataArusKas.selisih >= 0 ? '+' : ''}Rp{dataArusKas.selisih.toLocaleString('id-ID')}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  dataArusKas.selisih >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {dataArusKas.selisih >= 0 ? 'Surplus' : 'Defisit'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
