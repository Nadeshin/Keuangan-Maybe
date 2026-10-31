/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, useAppTheme } from './themeContext';
import { PinGate } from './components/PinGate';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TransaksiPage } from './components/TransaksiPage';
import { AnggaranPage } from './components/AnggaranPage';
import { TabunganPage } from './components/TabunganPage';
import { TagihanPage } from './components/TagihanPage';
import { GrafikPage } from './components/GrafikPage';
import { LaporanPage } from './components/LaporanPage';
import { PengaturanPage } from './components/PengaturanPage';
import { TransaksiModal } from './components/TransaksiModal';
import { callApi } from './api';
import { DashboardResponse, Kategori, Tabungan, Transaksi } from './types';

function MainApp() {
  const { colors, theme } = useAppTheme();
  const [token, setToken] = useState<string | null>(() => {
    return sessionStorage.getItem('AUTH_TOKEN');
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaksi, setEditingTransaksi] = useState<Transaksi | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [allTransaksi, setAllTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleOpenAdd = () => {
    setEditingTransaksi(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: Transaksi) => {
    setEditingTransaksi(item);
    setIsAddModalOpen(true);
  };

  // Idle timer ref for 5-minute auto-lock (PRD 5.1)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AUTO-LOCK 5 MENIT IDLE (PRD 5.1)
  const handleUserActivity = useCallback(() => {
    if (!token) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // 5 menit = 300.000 ms
    idleTimerRef.current = setTimeout(() => {
      console.log('Auto-lock triggered after 5 minutes of inactivity');
      handleLogout();
    }, 5 * 60 * 1000);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));
    handleUserActivity(); // start initial timer

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [token, handleUserActivity]);

  const handleLogout = () => {
    sessionStorage.removeItem('AUTH_TOKEN');
    setToken(null);
    setDashboardData(null);
  };

  // Listen to 403 auth expired events
  useEffect(() => {
    const onAuthExpired = () => {
      setToken(null);
    };
    window.addEventListener('auth_expired', onAuthExpired);
    return () => window.removeEventListener('auth_expired', onAuthExpired);
  }, []);

  // Fetch Dashboard & All Data
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [dashRes, trxRes] = await Promise.all([
        callApi('getDashboard', { token, bulan: selectedMonth }),
        callApi('getTransaksi', { token }),
      ]);

      if (dashRes && dashRes.success) {
        setDashboardData(dashRes);
      }
      if (trxRes && trxRes.success) {
        setAllTransaksi(trxRes.data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, selectedMonth, fetchData]);

  // Jika belum ada token autentikasi, tampilkan PIN Gate
  if (!token) {
    return <PinGate onSuccess={(tok) => setToken(tok)} />;
  }

  const kategoriMap: Record<string, Kategori> = dashboardData?.kategori || {};
  const kategoriList: Kategori[] = Object.values(kategoriMap);
  const tabunganList: Tabungan[] = dashboardData?.tabungan || [];

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-6 transition-colors">
      {/* Navigation Header & Bottom Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAdd}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            data={dashboardData}
            loading={loading}
            onOpenAddModal={handleOpenAdd}
            onNavigateTab={setActiveTab}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {activeTab === 'transaksi' && (
          <TransaksiPage
            token={token}
            kategoriMap={kategoriMap}
            onOpenAddModal={handleOpenAdd}
            onOpenEditModal={handleOpenEdit}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'anggaran' && (
          <AnggaranPage
            token={token}
            kategoriMap={kategoriMap}
            onRefreshData={fetchData}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {activeTab === 'tabungan' && (
          <TabunganPage
            token={token}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'tagihan' && (
          <TagihanPage
            token={token}
            onRefreshData={fetchData}
          />
        )}

        {activeTab === 'grafik' && (
          <GrafikPage
            transaksi={allTransaksi}
            kategoriMap={kategoriMap}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanPage
            token={token}
            kategoriMap={kategoriMap}
          />
        )}

        {activeTab === 'pengaturan' && (
          <PengaturanPage
            token={token}
            onLogout={handleLogout}
            onRefreshData={fetchData}
          />
        )}
      </main>

      {/* Modal Catat / Edit Transaksi */}
      <TransaksiModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaksi(null);
        }}
        onSuccess={fetchData}
        kategoriList={kategoriList}
        tabunganList={tabunganList}
        token={token}
        editItem={editingTransaksi}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
