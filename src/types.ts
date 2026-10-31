export type TransactionType = 'masuk' | 'keluar';
export type BudgetMode = 'peringatan' | 'blokir';
export type BillStatus = 'lunas' | 'belum';
export type ThemeMode = 'Casual' | 'Profesional' | 'Glass';
export type PaletteName = 'Blue-Ocean' | 'Green-Pao' | 'Custom';

export interface Transaksi {
  id: string;
  timestamp: string;
  tanggal: string; // YYYY-MM-DD
  tipe: TransactionType;
  jumlah: number;
  id_kategori: string;
  catatan: string;
  sumber: 'web' | 'wa';
  file_url?: string;
}

export interface Kategori {
  id_kategori: string;
  nama: string;
  tipe: TransactionType;
  warna: string;
  icon: string;
}

export interface Anggaran {
  id: string;
  bulan: string; // YYYY-MM
  id_kategori: string;
  limit: number;
  mode: BudgetMode;
  terpakai?: number;
  persen?: number;
}

export interface Tabungan {
  id: string;
  nama: string;
  target: number;
  terkumpul: number;
  deadline: string; // YYYY-MM-DD
  persen?: number;
}

export interface Tagihan {
  id: string;
  nama: string;
  nominal: number;
  tanggal_jatuh_tempo: number | string; // 1 - 31
  berulang: 'Y' | 'T';
  status: BillStatus;
  terakhir_dibayar?: string;
}

export interface AppSettings {
  no_wa_owner?: string;
  tema_aktif?: ThemeMode;
  palet_aktif?: PaletteName;
  mode_gelap?: string | boolean;
  auto_split_percent?: string | number;
  custom_bg?: string;
  custom_card?: string;
  custom_primary?: string;
  custom_accent?: string;
  custom_text?: string;
  script_url?: string;
}

export interface DashboardSummary {
  totalSaldo: number;
  pemasukanBulan: number;
  pengeluaranBulan: number;
  sisaAnggaran: number;
  totalLimitAnggaran: number;
  totalTargetTabungan: number;
  totalTerkumpulTabungan: number;
}

export interface DashboardResponse {
  success: boolean;
  bulan: string;
  ringkasan: DashboardSummary;
  anggaran: Anggaran[];
  tabungan: Tabungan[];
  kategori: Record<string, Kategori>;
  transaksiTerbaru: Transaksi[];
}
