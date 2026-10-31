import React, { useState, useRef, useEffect } from 'react';
import { useAppTheme } from '../themeContext';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  PiggyBank, 
  CalendarClock, 
  BarChart3, 
  FileText, 
  Settings, 
  Plus, 
  LogOut,
  MoreHorizontal,
  X,
  Wallet,
  Sun,
  Moon,
  ChevronDown,
  Check
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onLogout,
}) => {
  const { colors, theme, isDark, setIsDark } = useAppTheme();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'finance' | 'report' | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Kategori Modul Keuangan (Transaksi, Anggaran, Tabungan, Tagihan)
  const financeTabs = [
    { id: 'transaksi', label: 'Transaksi', icon: Receipt, desc: 'Catatan Kas & Mutasi' },
    { id: 'anggaran', label: 'Anggaran', icon: PieChart, desc: 'Batas Peringatan & Blokir' },
    { id: 'tabungan', label: 'Tabungan', icon: PiggyBank, desc: 'Target & Auto-Split' },
    { id: 'tagihan', label: 'Tagihan', icon: CalendarClock, desc: 'Jatuh Tempo & WA' },
  ];

  // Kategori Modul Laporan & Analitik (Grafik, Laporan)
  const reportTabs = [
    { id: 'grafik', label: 'Grafik Visual', icon: BarChart3, desc: '5 Analisis Visual & Tren' },
    { id: 'laporan', label: 'Laporan Keuangan', icon: FileText, desc: 'Ekspor PDF, Excel & Cetak' },
  ];

  const isFinanceActive = financeTabs.some(t => t.id === activeTab);
  const activeFinance = financeTabs.find(t => t.id === activeTab);

  const isReportActive = reportTabs.some(t => t.id === activeTab);
  const activeReport = reportTabs.find(t => t.id === activeTab);

  // Daftar lengkap semua 8 tab aplikasi (untuk mobile bottom sheet)
  const allTabs = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard, desc: 'Dashboard & Saldo' },
    { id: 'transaksi', label: 'Transaksi', icon: Receipt, desc: 'Catatan Kas & Mutasi' },
    { id: 'anggaran', label: 'Anggaran', icon: PieChart, desc: 'Batas Peringatan/Blokir' },
    { id: 'tabungan', label: 'Tabungan', icon: PiggyBank, desc: 'Target & Auto-Split' },
    { id: 'tagihan', label: 'Tagihan', icon: CalendarClock, desc: 'Jatuh Tempo & WA' },
    { id: 'grafik', label: 'Grafik', icon: BarChart3, desc: '5 Analisis Visual' },
    { id: 'laporan', label: 'Laporan', icon: FileText, desc: 'Ekspor PDF & Excel' },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, desc: 'PIN, Tema & Backup' },
  ];

  // 5 tab utama di bottom pill mobile
  const primaryMobileTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transaksi', label: 'Transaksi', icon: Receipt },
    { id: 'anggaran', label: 'Anggaran', icon: PieChart },
    { id: 'grafik', label: 'Grafik', icon: BarChart3 },
    { id: 'tagihan', label: 'Tagihan', icon: CalendarClock },
  ];

  const isMoreActive = !primaryMobileTabs.some(t => t.id === activeTab);

  return (
    <>
      {/* Desktop / Tablet Header */}
      <header
        className="hidden md:block sticky top-0 z-40 transition-colors backdrop-blur-xl border-b"
        style={{
          backgroundColor: isDark 
            ? 'rgba(11, 25, 44, 0.82)' 
            : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.9)'),
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3 overflow-visible">
          {/* Brand Zone */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-white shadow-sm ring-1 ring-white/20 shrink-0 transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              }}
            >
              <Wallet className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-[15px] tracking-tight leading-none whitespace-nowrap" style={{ color: colors.text }}>
                KoNotes
              </span>
              <span className="text-[10px] font-medium tracking-tight opacity-65 mt-0.5 whitespace-nowrap" style={{ color: colors.text }}>
                Financial Recorder
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Dikategorikan ke Dropdown — Ringkas & Bebas Out-of-View) */}
          <nav
            ref={navRef}
            className="flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-2xl border border-black/[0.05] dark:border-white/[0.08] backdrop-blur-md relative"
          >
            {/* 1. Direct Button: Ringkasan */}
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setOpenDropdown(null);
              }}
              title="Ringkasan & Dashboard"
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-150 flex items-center gap-1.5 relative shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'shadow-sm text-white font-bold'
                  : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              style={{
                backgroundColor: activeTab === 'dashboard' ? colors.primary : 'transparent',
                color: activeTab === 'dashboard' ? '#FFFFFF' : colors.text,
              }}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>Ringkasan</span>
            </button>

            {/* 2. Dropdown: Keuangan */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'finance' ? null : 'finance')}
                title={activeFinance ? `Keuangan (${activeFinance.label})` : 'Kelola Keuangan'}
                className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-150 flex items-center gap-1.5 relative shrink-0 cursor-pointer ${
                  isFinanceActive
                    ? 'shadow-sm text-white font-bold'
                    : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isFinanceActive ? colors.primary : 'transparent',
                  color: isFinanceActive ? '#FFFFFF' : colors.text,
                }}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>Keuangan</span>
                {isFinanceActive && activeFinance && (
                  <span className="opacity-90 font-medium text-[11px] hidden xl:inline">
                    · {activeFinance.label}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    openDropdown === 'finance' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'finance' && (
                <div
                  className="absolute top-full mt-2.5 left-0 w-72 p-2 rounded-2xl shadow-2xl border z-50 backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150"
                  style={{
                    backgroundColor: isDark 
                      ? 'rgba(18, 30, 49, 0.96)' 
                      : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.95)' : colors.card),
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    color: colors.text,
                    boxShadow: isDark ? '0 20px 40px -15px rgba(0,0,0,0.8)' : '0 20px 40px -15px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="px-3 pt-1.5 pb-2 text-[10px] font-bold tracking-wider uppercase opacity-50 border-b mb-1" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
                    Kelola Keuangan
                  </div>
                  <div className="space-y-1">
                    {financeTabs.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-black/5 dark:bg-white/10 font-bold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                              style={{
                                backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                color: isActive ? '#FFFFFF' : colors.primary,
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-display truncate ${isActive ? 'font-bold' : 'font-semibold'}`} style={{ color: isActive ? colors.primary : colors.text }}>
                                {item.label}
                              </div>
                              <div className="text-[10px] opacity-55 truncate">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: colors.primary }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Dropdown: Laporan & Analitik */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'report' ? null : 'report')}
                title={activeReport ? `Laporan (${activeReport.label})` : 'Laporan & Analisis'}
                className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-150 flex items-center gap-1.5 relative shrink-0 cursor-pointer ${
                  isReportActive
                    ? 'shadow-sm text-white font-bold'
                    : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isReportActive ? colors.primary : 'transparent',
                  color: isReportActive ? '#FFFFFF' : colors.text,
                }}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Laporan</span>
                {isReportActive && activeReport && (
                  <span className="opacity-90 font-medium text-[11px] hidden xl:inline">
                    · {activeReport.label}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    openDropdown === 'report' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'report' && (
                <div
                  className="absolute top-full mt-2.5 left-0 w-72 p-2 rounded-2xl shadow-2xl border z-50 backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150"
                  style={{
                    backgroundColor: isDark 
                      ? 'rgba(18, 30, 49, 0.96)' 
                      : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.95)' : colors.card),
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    color: colors.text,
                    boxShadow: isDark ? '0 20px 40px -15px rgba(0,0,0,0.8)' : '0 20px 40px -15px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="px-3 pt-1.5 pb-2 text-[10px] font-bold tracking-wider uppercase opacity-50 border-b mb-1" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
                    Analisis & Pelaporan
                  </div>
                  <div className="space-y-1">
                    {reportTabs.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-black/5 dark:bg-white/10 font-bold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                              style={{
                                backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                color: isActive ? '#FFFFFF' : colors.primary,
                              }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-display truncate ${isActive ? 'font-bold' : 'font-semibold'}`} style={{ color: isActive ? colors.primary : colors.text }}>
                                {item.label}
                              </div>
                              <div className="text-[10px] opacity-55 truncate">
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: colors.primary }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Direct Button: Pengaturan */}
            <button
              onClick={() => {
                setActiveTab('pengaturan');
                setOpenDropdown(null);
              }}
              title="Pengaturan Aplikasi"
              className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold transition-all duration-150 flex items-center gap-1.5 relative shrink-0 cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'shadow-sm text-white font-bold'
                  : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              style={{
                backgroundColor: activeTab === 'pengaturan' ? colors.primary : 'transparent',
                color: activeTab === 'pengaturan' ? '#FFFFFF' : colors.text,
              }}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Pengaturan</span>
            </button>
          </nav>

          {/* Desktop Header Actions (Catat Transaksi + Dark Mode Switch + Logout) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAddModal}
              title="Catat Transaksi Baru"
              className="h-9 px-3.5 rounded-xl text-xs font-display font-bold flex items-center gap-1.5 text-white shadow-sm hover:shadow-md btn-glow active:scale-95 transition-all cursor-pointer shrink-0"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              }}
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Catat Transaksi</span>
            </button>

            {/* Quick Dark Mode Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
              className="w-9 h-9 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/15 transition-all cursor-pointer shrink-0"
              style={{ color: colors.text }}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 stroke-[2.2]" />
              ) : (
                <Moon className="w-4 h-4 stroke-[2]" />
              )}
            </button>

            {/* Logout / Kunci */}
            <button
              onClick={onLogout}
              title="Kunci Aplikasi"
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-100 opacity-60 hover:bg-black/5 dark:hover:bg-white/10 transition-all border border-black/10 dark:border-white/15 cursor-pointer shrink-0"
              style={{ color: colors.text }}
            >
              <LogOut className="w-4 h-4 shrink-0 stroke-[2]" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header
        className="md:hidden sticky top-0 z-40 px-4 h-14 border-b flex items-center justify-between backdrop-blur-xl"
        style={{
          backgroundColor: isDark 
            ? 'rgba(11, 25, 44, 0.85)' 
            : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.9)'),
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm ring-1 ring-white/20 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            }}
          >
            <Wallet className="w-4 h-4 text-white stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-sm tracking-tight leading-none whitespace-nowrap" style={{ color: colors.text }}>
              KoNotes
            </span>
            <span className="text-[9px] font-medium tracking-tight opacity-65 mt-0.5 whitespace-nowrap" style={{ color: colors.text }}>
              Financial Recorder
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsDark(!isDark)}
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            className="w-8 h-8 rounded-xl flex items-center justify-center opacity-70 hover:opacity-100 border border-black/10 dark:border-white/15 transition-all"
            style={{ color: colors.text }}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 stroke-[2.2]" />
            ) : (
              <Moon className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </button>
          <button
            onClick={onOpenAddModal}
            className="w-8 h-8 rounded-xl text-white shadow-sm btn-glow active:scale-90 transition-all flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            }}
            title="Catat Baru"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={onLogout}
            title="Kunci Aplikasi"
            className="w-8 h-8 rounded-xl opacity-60 hover:opacity-100 border border-black/10 dark:border-white/15 flex items-center justify-center transition-all"
            style={{ color: colors.text }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Mobile Floating Pill Bottom Bar (6 Slots: Home, Transaksi, Anggaran, Grafik, Tagihan, Lainnya) */}
      <nav
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full floating-nav-pill px-2 py-1.5 flex items-center justify-around shadow-2xl transition-all"
        style={{
          backgroundColor: isDark ? 'rgba(18, 30, 49, 0.88)' : 'rgba(255, 255, 255, 0.88)',
        }}
      >
        {primaryMobileTabs.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center py-1 px-1.5 sm:px-2.5 rounded-full transition-all duration-200 relative btn-press shrink-0"
              style={{
                color: isActive ? colors.primary : colors.text,
                opacity: isActive ? 1 : 0.6,
              }}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[9.5px] mt-0.5 font-display ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full absolute -bottom-0.5"
                  style={{ backgroundColor: colors.primary }}
                />
              )}
            </button>
          );
        })}

        {/* Slot ke-6: Tombol "Lainnya" yang membuka bottom sheet SEMUA 8 tab */}
        <button
          onClick={() => setIsMoreOpen(prev => !prev)}
          className="flex flex-col items-center justify-center py-1 px-1.5 sm:px-2.5 rounded-full transition-all duration-200 relative btn-press shrink-0"
          style={{
            color: (isMoreActive || isMoreOpen) ? colors.primary : colors.text,
            opacity: (isMoreActive || isMoreOpen) ? 1 : 0.6,
          }}
        >
          <MoreHorizontal className={`w-4 h-4 ${(isMoreActive || isMoreOpen) ? 'stroke-[2.5]' : ''}`} />
          <span className={`text-[9.5px] mt-0.5 font-display ${(isMoreActive || isMoreOpen) ? 'font-bold' : 'font-medium'}`}>
            Lainnya
          </span>
          {isMoreActive && (
            <span
              className="w-1 h-1 rounded-full absolute -bottom-0.5"
              style={{ backgroundColor: colors.primary }}
            />
          )}
        </button>
      </nav>

      {/* Mobile "Lainnya" Bottom Sheet Modal (md:hidden) */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop blur with tap-outside dismiss */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Sliding Bottom Sheet */}
          <div
            className="relative z-10 rounded-t-[28px] border-t p-5 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250"
            style={{
              backgroundColor: isDark 
                ? 'rgba(18, 30, 49, 0.96)' 
                : (theme === 'Glass' ? 'rgba(255, 255, 255, 0.95)' : colors.card),
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              color: colors.text,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Sheet Handle */}
            <div 
              className="w-12 h-1.5 rounded-full mx-auto mb-4 bg-black/20 dark:bg-white/25 cursor-pointer" 
              onClick={() => setIsMoreOpen(false)} 
            />

            <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
              <div>
                <h3 className="font-display font-extrabold text-base">Semua Menu & Fitur</h3>
                <p className="text-[11px] opacity-65">Akses lengkap ke seluruh 8 modul keuangan</p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid SEMUA 8 Tab (2 kolom, nyaman di HP 360px) */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {allTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMoreOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all btn-press"
                    style={{
                      backgroundColor: isActive 
                        ? (isDark ? 'rgba(33, 150, 243, 0.18)' : 'rgba(33, 150, 243, 0.1)') 
                        : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
                      borderColor: isActive 
                        ? colors.primary 
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                      color: isActive ? colors.primary : colors.text,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform"
                      style={{
                        backgroundColor: isActive ? colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                        color: isActive ? '#FFFFFF' : colors.primary,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-display truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>
                        {tab.label}
                      </div>
                      <div className="text-[10px] opacity-55 truncate">
                        {tab.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick action buttons di dalam sheet */}
            <div className="pt-3 border-t flex items-center gap-2" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
              <button
                onClick={() => {
                  onOpenAddModal();
                  setIsMoreOpen(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-display font-bold flex items-center justify-center gap-2 text-white shadow-md btn-glow"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Catat Transaksi</span>
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setIsMoreOpen(false);
                }}
                className="p-2.5 rounded-xl border opacity-70 hover:opacity-100 flex items-center justify-center"
                style={{
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  color: colors.text,
                }}
                title="Kunci Aplikasi"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
