import React, { useState, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { Transaksi, Kategori } from '../types';
import { callApi } from '../api';
import { FileText, Download, Calendar, Filter, FileSpreadsheet, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface LaporanPageProps {
  token: string;
  kategoriMap: Record<string, Kategori>;
}

export const LaporanPage: React.FC<LaporanPageProps> = ({ token, kategoriMap }) => {
  const { colors, theme, isDark, glassCardBg } = useAppTheme();
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchLaporan = async () => {
    setLoading(true);
    try {
      const res = await callApi('getTransaksi', {
        token,
        startDate,
        endDate,
        categoryId: selectedCat,
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
    fetchLaporan();
  }, [startDate, endDate, selectedCat]);

  const totalMasuk = transaksiList
    .filter(t => t.tipe === 'masuk')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const totalKeluar = transaksiList
    .filter(t => t.tipe === 'keluar')
    .reduce((sum, t) => sum + t.jumlah, 0);

  const selisihBersih = totalMasuk - totalKeluar;

  // EXPORT PDF DENGAN WARNA TEMA AKTIF (PRD 5.8 & 12.1)
  const handleExportPdf = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner dengan warna primer tema
      doc.setFillColor(colors.primary);
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN KEUANGAN PRIBADI', 14, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'} | Filter Kategori: ${selectedCat ? kategoriMap[selectedCat]?.nama : 'Semua'}`, 14, 21);

      // Box Ringkasan
      let y = 36;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, y, 182, 22, 2, 2, 'F');

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9);
      doc.text('TOTAL PEMASUKAN', 20, y + 8);
      doc.text('TOTAL PENGELUARAN', 80, y + 8);
      doc.text('SELISIH BERSIH', 145, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(46, 125, 50);
      doc.text(`Rp ${totalMasuk.toLocaleString('id-ID')}`, 20, y + 16);

      doc.setTextColor(211, 47, 47);
      doc.text(`Rp ${totalKeluar.toLocaleString('id-ID')}`, 80, y + 16);

      doc.setTextColor(selisihBersih >= 0 ? 46 : 211, selisihBersih >= 0 ? 125 : 47, selisihBersih >= 0 ? 50 : 47);
      doc.text(`Rp ${selisihBersih.toLocaleString('id-ID')}`, 145, y + 16);

      // Tabel Transaksi
      y += 32;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Daftar Transaksi (${transaksiList.length} baris)`, 14, y);

      y += 6;
      // Header Table
      doc.setFillColor(colors.accent);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFontSize(8);
      doc.setTextColor(20, 20, 20);
      doc.text('Tanggal', 16, y + 5);
      doc.text('Kategori', 42, y + 5);
      doc.text('Tipe', 78, y + 5);
      doc.text('Catatan', 98, y + 5);
      doc.text('Sumber', 150, y + 5);
      doc.text('Nominal (Rp)', 170, y + 5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      for (let i = 0; i < transaksiList.length; i++) {
        if (y > 275) {
          doc.addPage();
          y = 20;
          // repeat table header on new page
          doc.setFillColor(colors.accent);
          doc.rect(14, y, 182, 7, 'F');
          doc.text('Tanggal', 16, y + 5);
          doc.text('Kategori', 42, y + 5);
          doc.text('Tipe', 78, y + 5);
          doc.text('Catatan', 98, y + 5);
          doc.text('Sumber', 150, y + 5);
          doc.text('Nominal (Rp)', 170, y + 5);
          y += 8;
        }

        const t = transaksiList[i];
        const katName = kategoriMap[t.id_kategori]?.nama || t.id_kategori;
        
        if (i % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(14, y - 4, 182, 6, 'F');
        }

        doc.setTextColor(60, 60, 60);
        doc.text(t.tanggal, 16, y);
        doc.text(katName.slice(0, 18), 42, y);
        doc.text(t.tipe === 'masuk' ? 'Masuk' : 'Keluar', 78, y);
        doc.text((t.catatan || '-').slice(0, 28), 98, y);
        doc.text(t.sumber, 150, y);

        if (t.tipe === 'masuk') {
          doc.setTextColor(46, 125, 50);
          doc.text(`+${t.jumlah.toLocaleString('id-ID')}`, 170, y);
        } else {
          doc.setTextColor(211, 47, 47);
          doc.text(`-${t.jumlah.toLocaleString('id-ID')}`, 170, y);
        }

        y += 6;
      }

      // Footer
      const todayStr = new Date().toISOString().slice(0, 10);
      doc.save(`Keuangan_${todayStr}.pdf`);
      setSuccessMsg(`PDF berhasil diunduh: Keuangan_${todayStr}.pdf`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  // EXPORT EXCEL (.XLSX) MENGGUNAKAN SHEETJS (PRD 5.8)
  const handleExportExcel = () => {
    setExportingExcel(true);
    try {
      const dataRows = transaksiList.map(t => ({
        ID: t.id,
        Tanggal: t.tanggal,
        Tipe: t.tipe.toUpperCase(),
        Kategori: kategoriMap[t.id_kategori]?.nama || t.id_kategori,
        Jumlah: t.jumlah,
        Catatan: t.catatan || '',
        Sumber: t.sumber,
        Timestamp: t.timestamp,
        Link_Struk: t.file_url || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');

      const todayStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `Keuangan_${todayStr}.xlsx`);
      setSuccessMsg(`Excel berhasil diunduh: Keuangan_${todayStr}.xlsx`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
            Laporan & Ekspor Data
          </h1>
          <p className="text-xs sm:text-sm opacity-75">
            Ekspor rekap transaksi ke PDF (dengan tema aktif) dan Excel .xlsx (PRD 5.8)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={exportingPdf || loading || transaksiList.length === 0}
            onClick={handleExportPdf}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border flex items-center gap-1.5 hover:bg-black/5 active:scale-95 disabled:opacity-40 transition-all"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>{exportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          <button
            disabled={exportingExcel || loading || transaksiList.length === 0}
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-40 transition-all"
            style={{ backgroundColor: colors.primary }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Controls */}
      <div
        className="p-4 theme-card space-y-3"
        style={{
          backgroundColor: glassCardBg(0.7),
          color: colors.text,
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1 opacity-70">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-70">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-70">Filter Kategori</label>
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border bg-transparent"
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 theme-card bg-emerald-50 text-emerald-950 border border-emerald-200">
          <div className="text-xs font-semibold">Total Pemasukan Periode Ini</div>
          <div className="text-lg font-bold mt-1 text-emerald-700">
            +Rp{totalMasuk.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-4 theme-card bg-rose-50 text-rose-950 border border-rose-200">
          <div className="text-xs font-semibold">Total Pengeluaran Periode Ini</div>
          <div className="text-lg font-bold mt-1 text-rose-700">
            -Rp{totalKeluar.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-4 theme-card bg-blue-50 text-blue-950 border border-blue-200">
          <div className="text-xs font-semibold">Arus Kas Bersih (Net)</div>
          <div className={`text-lg font-bold mt-1 ${selisihBersih >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {selisihBersih >= 0 ? '+' : ''}Rp{selisihBersih.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div
        className="p-4 sm:p-5 theme-card overflow-x-auto"
        style={{
          backgroundColor: glassCardBg(0.7),
          color: colors.text,
        }}
      >
        <div className="text-xs font-bold mb-3 flex items-center justify-between">
          <span>Pratinjau Data Transaksi ({transaksiList.length} data)</span>
          <span className="opacity-60 text-[11px]">Nama File: Keuangan_{new Date().toISOString().slice(0, 10)}.pdf / .xlsx</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs opacity-60">Memuat laporan...</div>
        ) : transaksiList.length === 0 ? (
          <div className="py-12 text-center text-xs opacity-60">
            Belum ada data transaksi yang dapat dicetak atau diekspor dalam rentang tanggal ini.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                <th className="py-2.5 px-2">Tanggal</th>
                <th className="py-2.5 px-2">Kategori</th>
                <th className="py-2.5 px-2">Tipe</th>
                <th className="py-2.5 px-2">Catatan</th>
                <th className="py-2.5 px-2">Sumber</th>
                <th className="py-2.5 px-2 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {transaksiList.map(item => {
                const kat = kategoriMap[item.id_kategori];
                const isMasuk = item.tipe === 'masuk';
                return (
                  <tr key={item.id} className="hover:bg-black/5 transition-colors">
                    <td className="py-2.5 px-2 font-mono">{item.tanggal}</td>
                    <td className="py-2.5 px-2 font-medium">{kat?.nama || item.id_kategori}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isMasuk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.tipe.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 max-w-xs truncate">{item.catatan || '-'}</td>
                    <td className="py-2.5 px-2 uppercase font-mono text-[10px] opacity-70">{item.sumber}</td>
                    <td className={`py-2.5 px-2 text-right font-bold ${
                      isMasuk ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isMasuk ? '+' : '-'}Rp{item.jumlah.toLocaleString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
