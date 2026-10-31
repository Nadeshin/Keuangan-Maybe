/**
 * ============================================================================
 * KONFIGURASI UTAMA FRONTEND
 * ============================================================================
 * 
 * TODO: Tempelkan URL Web App Google Apps Script Anda di bawah ini!
 * Format URL: "https://script.google.com/macros/s/AKfycb.../exec"
 * 
 * Catatan:
 * Jika SCRIPT_URL masih berupa string kosong "", aplikasi akan otomatis berjalan
 * dalam "Mode Simulasi Lokal" sehingga Anda dapat langsung mencoba seluruh fitur,
 * input PIN (default 624426), mencatat transaksi, melihat grafik, dan tema warna di AI Studio.
 */
export const SCRIPT_URL: string = "TODO: Masukkan SCRIPT_URL Anda di sini";

export function getEffectiveScriptUrl(): string {
  // Cek apakah ada custom script URL yang disimpan di browser via menu Pengaturan
  const saved = localStorage.getItem("CUSTOM_SCRIPT_URL");
  if (saved && saved.startsWith("https://script.google.com/")) {
    return saved.trim();
  }

  if (SCRIPT_URL && SCRIPT_URL.startsWith("https://script.google.com/")) {
    return SCRIPT_URL.trim();
  }

  return "";
}

export function setCustomScriptUrl(url: string) {
  if (url && url.startsWith("https://script.google.com/")) {
    localStorage.setItem("CUSTOM_SCRIPT_URL", url.trim());
  } else {
    localStorage.removeItem("CUSTOM_SCRIPT_URL");
  }
}
