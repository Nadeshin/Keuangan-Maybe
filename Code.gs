/**
 * ============================================================================
 * PENCATATAN KEUANGAN PRIBADI (v1.5 FINAL MVP)
 * Google Apps Script (Code.gs) — Backend Web App JSON API
 * ============================================================================
 * 
 * PANDUAN PENGGUNAAN:
 * 1. Buka Google Sheets baru -> Ekstensi (Extensions) -> Apps Script.
 * 2. Hapus semua kode default, lalu tempel SELURUH isi file ini ke 'Code.gs'.
 * 3. Buka Project Settings (ikon gerigi) -> Script Properties:
 *    - PIN_HASH: Hash SHA-256 dari PIN default '624426'
 *      (Nilai: "dcbd9266e3b5b0bd17c934413dd2de22a7a5da8f68d2573e2c452b9dfe30309c" atau jalankan fungsi generateDefaultPinHash() di editor)
 *    - SPREADSHEET_ID: [TODO: Masukkan ID Spreadsheet Anda, atau kosongkan jika script terikat langsung (Container-Bound)]
 *    - WA_API_URL: [TODO: https://api.fonnte.com/send]
 *    - WA_TOKEN: [TODO: Token Fonnte / WhatsApp Gateway Anda]
 * 4. Jalankan fungsi 'inisialisasiSpreadsheet()' satu kali untuk membuat 7 sheets otomatis.
 * 5. Jalankan fungsi 'setupTriggers()' untuk mengaktifkan pengingat WA jam 07:00 dan auto-backup jam 23:00.
 * 6. Klik Deploy -> New Deployment -> Pilih Web App:
 *    - Description: "Pencatatan Keuangan API v1.5"
 *    - Execute as: "Me" (email Anda)
 *    - Who has access: "Anyone"
 * 7. Salin URL Web App yang berakhiran '/exec', lalu tempelkan ke SCRIPT_URL di Web App Frontend.
 */

// ============================================================================
// KONFIGURASI & SCRIPT PROPERTIES
// ============================================================================
const DEFAULT_PIN_HASH = "dcbd9266e3b5b0bd17c934413dd2de22a7a5da8f68d2573e2c452b9dfe30309c";

function getProp(key, fallback) {
  var props = PropertiesService.getScriptProperties();
  var val = props.getProperty(key);
  return (val !== null && val !== undefined && val !== "") ? val : (fallback || "");
}

function setProp(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, String(val));
}

function getSpreadsheet() {
  var id = getProp("SPREADSHEET_ID", "");
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// ============================================================================
// HELPER KEAMANAN & PIN GATE (PRD SECTION 3 & 5.1)
// ============================================================================
function computeSHA256(str) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  var txtHash = "";
  for (var i = 0; i < rawHash.length; i++) {
    var byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    var byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    txtHash += byteHex;
  }
  return txtHash;
}

// Fungsi bantu untuk generate PIN Hash default '624426' di Script Properties
function generateDefaultPinHash() {
  var hash = computeSHA256("624426");
  setProp("PIN_HASH", hash);
  Logger.log("PIN_HASH berhasil diset ke: " + hash);
  return hash;
}

function cekRateLimit() {
  var cache = CacheService.getScriptCache();
  var failedCount = parseInt(cache.get("PIN_FAILED_ATTEMPTS") || "0", 10);
  var isLocked = cache.get("PIN_LOCKED") === "true";
  return {
    locked: isLocked,
    failedAttempts: failedCount
  };
}

function rekamPinGagal() {
  var cache = CacheService.getScriptCache();
  var failedCount = parseInt(cache.get("PIN_FAILED_ATTEMPTS") || "0", 10) + 1;
  cache.put("PIN_FAILED_ATTEMPTS", String(failedCount), 600); // 10 menit
  
  if (failedCount >= 5) {
    cache.put("PIN_LOCKED", "true", 300); // Kunci 5 menit (300 detik)
    tulisLog("pin_salah_terkunci", "Gagal input PIN 5x berturut-turut. Akses dikunci 5 menit.");
    return { locked: true, attempts: failedCount, lockSeconds: 300 };
  }
  tulisLog("pin_salah", "Percobaan PIN salah ke-" + failedCount);
  return { locked: false, attempts: failedCount, remainingAttempts: 5 - failedCount };
}

function resetPinRateLimit() {
  var cache = CacheService.getScriptCache();
  cache.remove("PIN_FAILED_ATTEMPTS");
  cache.remove("PIN_LOCKED");
}

function generateToken() {
  var token = Utilities.getUuid();
  var cache = CacheService.getScriptCache();
  // Token valid 12 jam (43200 detik) sesuai PRD 5.1
  cache.put("AUTH_TOKEN_" + token, "active", 43200);
  return token;
}

function validasiToken(token) {
  if (!token) return false;
  var cache = CacheService.getScriptCache();
  var status = cache.get("AUTH_TOKEN_" + token);
  return status === "active";
}

// ============================================================================
// LOG HELPER (PRD SECTION 7 - SHEET LOG)
// ============================================================================
function tulisLog(aksi, detail) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Log");
    if (!sheet) return;
    var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([timestamp, aksi, typeof detail === "object" ? JSON.stringify(detail) : String(detail)]);
  } catch (err) {
    Logger.log("Gagal tulis log: " + err);
  }
}

// ============================================================================
// SHEET INITIALIZATION & SCHEMA (PRD SECTION 7)
// ============================================================================
function inisialisasiSpreadsheet() {
  var ss = getSpreadsheet();
  
  var sheetsDef = {
    "Transaksi": ["id", "timestamp", "tanggal", "tipe", "jumlah", "id_kategori", "catatan", "sumber", "file_url"],
    "Kategori": ["id_kategori", "nama", "tipe", "warna", "icon"],
    "Anggaran": ["id", "bulan", "id_kategori", "limit", "mode"],
    "Tabungan": ["id", "nama", "target", "terkumpul", "deadline"],
    "Tagihan": ["id", "nama", "nominal", "tanggal_jatuh_tempo", "berulang", "status", "terakhir_dibayar"],
    "Settings": ["kunci", "nilai"],
    "Log": ["timestamp", "aksi", "detail"]
  };

  for (var name in sheetsDef) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheetsDef[name]);
      sheet.getRange(1, 1, 1, sheetsDef[name].length).setFontWeight("bold").setBackground("#E3F2FD");
      sheet.setFrozenRows(1);
    }
  }

  // Isi default Kategori jika kosong
  var katSheet = ss.getSheetByName("Kategori");
  if (katSheet.getLastRow() <= 1) {
    var defaultKategori = [
      ["kat_gaji", "Gaji", "masuk", "#2E7D32", "Briefcase"],
      ["kat_bonus", "Bonus", "masuk", "#0288D1", "Award"],
      ["kat_jualan", "Jualan", "masuk", "#ED6C02", "TrendingUp"],
      ["kat_lainnya_masuk", "Lainnya", "masuk", "#757575", "PlusCircle"],
      ["kat_makan", "Makan", "keluar", "#E53935", "Utensils"],
      ["kat_transport", "Transport", "keluar", "#FB8C00", "Car"],
      ["kat_belanja", "Belanja", "keluar", "#8E24AA", "ShoppingBag"],
      ["kat_tagihan", "Tagihan", "keluar", "#D81B60", "CreditCard"],
      ["kat_kesehatan", "Kesehatan", "keluar", "#00897B", "HeartPulse"],
      ["kat_hiburan", "Hiburan", "keluar", "#3949AB", "Film"],
      ["kat_pendidikan", "Pendidikan", "keluar", "#1E88E5", "GraduationCap"],
      ["kat_tabungan", "Tabungan", "keluar", "#43A047", "PiggyBank"],
      ["kat_lainnya_keluar", "Lainnya", "keluar", "#546E7A", "MoreHorizontal"]
    ];
    katSheet.getRange(2, 1, defaultKategori.length, defaultKategori[0].length).setValues(defaultKategori);
  }

  // Isi default Settings jika kosong
  var setSheet = ss.getSheetByName("Settings");
  if (setSheet.getLastRow() <= 1) {
    var defaultHash = computeSHA256("624426");
    setProp("PIN_HASH", defaultHash);
    var defaultSettings = [
      ["no_wa_owner", "6281234567890"],
      ["pin_hash", defaultHash],
      ["tema_aktif", "Casual"],
      ["palet_aktif", "Blue-Ocean"],
      ["mode_gelap", "false"],
      ["auto_split_percent", "10"]
    ];
    setSheet.getRange(2, 1, defaultSettings.length, 2).setValues(defaultSettings);
  }

  tulisLog("init_database", "Spreadsheet 7 tabel berhasil diinisialisasi.");
  Logger.log("Inisialisasi Spreadsheet selesai!");
}

// ============================================================================
// SETTINGS HELPER
// ============================================================================
function bacaSemuaSettings() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  var res = {};
  if (!sheet) return res;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      res[String(rows[i][0])] = String(rows[i][1]);
    }
  }
  return res;
}

function simpanSetting(kunci, nilai) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) return;
  var rows = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(kunci)) {
      sheet.getRange(i + 1, 2).setValue(String(nilai));
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([kunci, String(nilai)]);
  }
}

// ============================================================================
// WHATSAPP GATEWAY (PRD SECTION 2 & 5.7 - DEFAULT FONNTE GENERIK)
// ============================================================================
function kirimWA(nomorTujuan, pesan) {
  var apiUrl = getProp("WA_API_URL", "https://api.fonnte.com/send");
  var token = getProp("WA_TOKEN", "");
  
  if (!token) {
    Logger.log("Kirim WA dilewati: WA_TOKEN belum diset di Script Properties. Pesan: " + pesan);
    return { success: false, message: "WA_TOKEN belum dikonfigurasi" };
  }
  
  try {
    var payload = {
      target: nomorTujuan,
      message: pesan
    };
    
    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": token
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(apiUrl, options);
    var code = response.getResponseCode();
    var respText = response.getContentText();
    Logger.log("Status Kirim WA (" + code + "): " + respText);
    tulisLog("kirim_wa", { nomor: nomorTujuan, status: code, resp: respText });
    return { success: code >= 200 && code < 300, response: respText };
  } catch (err) {
    Logger.log("Error kirim WA: " + err);
    tulisLog("error_wa", String(err));
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// CONTROLLER: VERIFY PIN & CHANGE PIN (PRD 5.1)
// ============================================================================
function handleVerifyPin(body) {
  var rate = cekRateLimit();
  if (rate.locked) {
    return jsonResponse({
      success: false,
      error: "Akses terkunci karena salah PIN 5x beruntun. Silakan coba 5 menit lagi.",
      locked: true
    }, 429);
  }

  var pin = String(body.pin || "").trim();
  if (!pin || pin.length < 4) {
    return jsonResponse({ success: false, error: "Format PIN tidak valid." }, 400);
  }

  var inputHash = computeSHA256(pin);
  var storedHash = getProp("PIN_HASH", "");
  if (!storedHash) {
    var settings = bacaSemuaSettings();
    storedHash = settings["pin_hash"] || DEFAULT_PIN_HASH;
    setProp("PIN_HASH", storedHash);
  }

  // Self-healing: jika stored hash tidak valid (rusak atau bukan 64 hex SHA-256), pulihkan ke default
  if (!/^[0-9a-f]{64}$/i.test(storedHash)) {
    storedHash = DEFAULT_PIN_HASH;
    setProp("PIN_HASH", storedHash);
    simpanSetting("pin_hash", storedHash);
    tulisLog("pin_hash_diperbaiki", "Hash PIN lama tidak valid, berhasil dipulihkan otomatis ke hash default.");
  }

  if (inputHash === storedHash) {
    resetPinRateLimit();
    var token = generateToken();
    tulisLog("pin_berhasil", "Verifikasi PIN sukses.");
    var sets = bacaSemuaSettings();
    delete sets.pin_hash; // Jangan pernah kirim hash ke client
    return jsonResponse({
      success: true,
      token: token,
      settings: sets
    });
  } else {
    var failResult = rekamPinGagal();
    if (failResult.locked) {
      return jsonResponse({
        success: false,
        error: "PIN salah 5x. Akses terkunci selama 5 menit.",
        locked: true
      }, 429);
    }
    return jsonResponse({
      success: false,
      error: "PIN salah. Sisa kesempatan: " + failResult.remainingAttempts + "x.",
      locked: false,
      remainingAttempts: failResult.remainingAttempts
    }, 401);
  }
}

function handleChangePin(body) {
  if (!validasiToken(body.token)) {
    return jsonResponse({ error: 403, message: "Token tidak valid atau telah kedaluwarsa." }, 403);
  }

  var oldPin = String(body.oldPin || "").trim();
  var newPin = String(body.newPin || "").trim();

  if (!newPin || newPin.length < 6) {
    return jsonResponse({ success: false, error: "PIN baru minimal 6 digit." }, 400);
  }

  var oldHash = computeSHA256(oldPin);
  var currentStoredHash = getProp("PIN_HASH", "");
  if (!/^[0-9a-f]{64}$/i.test(currentStoredHash)) {
    currentStoredHash = DEFAULT_PIN_HASH;
    setProp("PIN_HASH", currentStoredHash);
    simpanSetting("pin_hash", currentStoredHash);
    tulisLog("pin_hash_diperbaiki", "Hash PIN lama rusak saat ganti PIN, dipulihkan otomatis ke default.");
  }
  if (oldHash !== currentStoredHash) {
    tulisLog("ganti_pin_gagal", "PIN lama salah saat mencoba mengganti PIN.");
    return jsonResponse({ success: false, error: "PIN lama salah." }, 400);
  }

  var newHash = computeSHA256(newPin);
  setProp("PIN_HASH", newHash);
  simpanSetting("pin_hash", newHash);
  tulisLog("ganti_pin_berhasil", "PIN berhasil diperbarui.");

  return jsonResponse({ success: true, message: "PIN berhasil diubah." });
}

// ============================================================================
// CONTROLLER: DASHBOARD & TRANSAKSI
// ============================================================================
function handleGetDashboard(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  
  var ss = getSpreadsheet();
  var tz = "Asia/Jakarta";
  var now = new Date();
  var curBulan = body.bulan || Utilities.formatDate(now, tz, "yyyy-MM");

  // Transaksi
  var trSheet = ss.getSheetByName("Transaksi");
  var trRows = trSheet ? trSheet.getDataRange().getValues() : [];
  
  var totalSaldo = 0;
  var pemasukanBulan = 0;
  var pengeluaranBulan = 0;
  var pengeluaranPerKategori = {};
  var riwayatTerakhir = [];

  for (var i = 1; i < trRows.length; i++) {
    var r = trRows[i];
    var tTipe = String(r[3]).toLowerCase();
    var tJml = parseFloat(r[4]) || 0;
    var tTgl = String(r[2]);
    var tBulan = tTgl.substring(0, 7);

    if (tTipe === "masuk") {
      totalSaldo += tJml;
      if (tBulan === curBulan) pemasukanBulan += tJml;
    } else if (tTipe === "keluar") {
      totalSaldo -= tJml;
      if (tBulan === curBulan) {
        pengeluaranBulan += tJml;
        var katId = String(r[5]);
        pengeluaranPerKategori[katId] = (pengeluaranPerKategori[katId] || 0) + tJml;
      }
    }

    // Ambil 10 transaksi terakhir
    if (i >= trRows.length - 10) {
      riwayatTerakhir.unshift({
        id: r[0],
        timestamp: r[1],
        tanggal: r[2],
        tipe: r[3],
        jumlah: tJml,
        id_kategori: r[5],
        catatan: r[6],
        sumber: r[7],
        file_url: r[8]
      });
    }
  }

  // Anggaran
  var angSheet = ss.getSheetByName("Anggaran");
  var angRows = angSheet ? angSheet.getDataRange().getValues() : [];
  var totalLimitAnggaran = 0;
  var daftarAnggaran = [];

  for (var j = 1; j < angRows.length; j++) {
    var ar = angRows[j];
    if (String(ar[1]) === curBulan) {
      var kId = String(ar[2]);
      var limit = parseFloat(ar[3]) || 0;
      var mode = String(ar[4]) || "peringatan";
      var terpakai = pengeluaranPerKategori[kId] || 0;
      var persen = limit > 0 ? (terpakai / limit) * 100 : 0;
      totalLimitAnggaran += limit;
      daftarAnggaran.push({
        id: ar[0],
        bulan: ar[1],
        id_kategori: kId,
        limit: limit,
        terpakai: terpakai,
        persen: Math.round(persen),
        mode: mode
      });
    }
  }
  var sisaAnggaran = totalLimitAnggaran > 0 ? Math.max(0, totalLimitAnggaran - pengeluaranBulan) : 0;

  // Tabungan
  var tabSheet = ss.getSheetByName("Tabungan");
  var tabRows = tabSheet ? tabSheet.getDataRange().getValues() : [];
  var daftarTabungan = [];
  var totalTargetTabungan = 0;
  var totalTerkumpulTabungan = 0;

  for (var k = 1; k < tabRows.length; k++) {
    var tb = tabRows[k];
    var target = parseFloat(tb[2]) || 0;
    var terkumpul = parseFloat(tb[3]) || 0;
    totalTargetTabungan += target;
    totalTerkumpulTabungan += terkumpul;
    daftarTabungan.push({
      id: tb[0],
      nama: tb[1],
      target: target,
      terkumpul: terkumpul,
      deadline: tb[4],
      persen: target > 0 ? Math.min(100, Math.round((terkumpul / target) * 100)) : 0
    });
  }

  // Kategori
  var katSheet = ss.getSheetByName("Kategori");
  var katRows = katSheet ? katSheet.getDataRange().getValues() : [];
  var mapKategori = {};
  for (var m = 1; m < katRows.length; m++) {
    mapKategori[String(katRows[m][0])] = {
      id_kategori: katRows[m][0],
      nama: katRows[m][1],
      tipe: katRows[m][2],
      warna: katRows[m][3],
      icon: katRows[m][4]
    };
  }

  return jsonResponse({
    success: true,
    bulan: curBulan,
    ringkasan: {
      totalSaldo: totalSaldo,
      pemasukanBulan: pemasukanBulan,
      pengeluaranBulan: pengeluaranBulan,
      sisaAnggaran: sisaAnggaran,
      totalLimitAnggaran: totalLimitAnggaran,
      totalTargetTabungan: totalTargetTabungan,
      totalTerkumpulTabungan: totalTerkumpulTabungan
    },
    anggaran: daftarAnggaran,
    tabungan: daftarTabungan,
    kategori: mapKategori,
    transaksiTerbaru: riwayatTerakhir
  });
}

function handleAddTransaksi(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);

  var ss = getSpreadsheet();
  var trSheet = ss.getSheetByName("Transaksi");
  var tipe = String(body.tipe || "keluar").toLowerCase();
  var jumlah = parseFloat(body.jumlah) || 0;
  var tanggal = body.tanggal || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  var katId = String(body.id_kategori || "");
  var catatan = String(body.catatan || "");
  var fileUrl = String(body.file_url || "");
  var sumber = String(body.sumber || "web");
  var forceBypass = body.forceBypass === true;

  if (jumlah <= 0) {
    return jsonResponse({ success: false, error: "Nominal harus lebih dari 0." }, 400);
  }

  var bulan = tanggal.substring(0, 7);

  // 1. Cek Anggaran jika pengeluaran (PRD 5.5)
  if (tipe === "keluar") {
    var angSheet = ss.getSheetByName("Anggaran");
    var angRows = angSheet ? angSheet.getDataRange().getValues() : [];
    for (var i = 1; i < angRows.length; i++) {
      var ar = angRows[i];
      if (String(ar[1]) === bulan && String(ar[2]) === katId) {
        var limit = parseFloat(ar[3]) || 0;
        var mode = String(ar[4]) || "peringatan";
        
        // Hitung pengeluaran saat ini untuk kategori ini
        var trRows = trSheet.getDataRange().getValues();
        var currentSpent = 0;
        for (var t = 1; t < trRows.length; t++) {
          if (String(trRows[t][3]).toLowerCase() === "keluar" &&
              String(trRows[t][2]).substring(0, 7) === bulan &&
              String(trRows[t][5]) === katId) {
            currentSpent += parseFloat(trRows[t][4]) || 0;
          }
        }
        
        var totalSetelahIni = currentSpent + jumlah;

        // Mode Blokir (Hard-Limit)
        if (mode === "blokir" && totalSetelahIni > limit && !forceBypass) {
          return jsonResponse({
            success: false,
            blocked: true,
            error: "Transaksi ditolak! Melebihi limit anggaran (Mode Blokir). Limit: Rp" + limit.toLocaleString('id-ID') + ", Pengeluaran saat ini: Rp" + currentSpent.toLocaleString('id-ID')
          }, 400);
        }

        // Mode Peringatan
        if (mode === "peringatan" && totalSetelahIni > limit && !forceBypass) {
          return jsonResponse({
            success: false,
            warning: true,
            error: "Perhatian: Transaksi ini akan melebihi anggaran kategori! Limit: Rp" + limit.toLocaleString('id-ID') + ", Total akan menjadi: Rp" + totalSetelahIni.toLocaleString('id-ID') + ". Tetap lanjutkan?"
          });
        }

        // Notifikasi WA saat 100% anggaran habis
        if (totalSetelahIni >= limit && currentSpent < limit) {
          var settings = bacaSemuaSettings();
          var ownerWa = settings["no_wa_owner"];
          if (ownerWa) {
            kirimWA(ownerWa, "⚠️ Peringatan Anggaran: Anggaran untuk kategori '" + katId + "' pada bulan " + bulan + " telah HABIS 100%! (Total: Rp" + totalSetelahIni.toLocaleString('id-ID') + " / Limit: Rp" + limit.toLocaleString('id-ID') + ")");
          }
        }
        break;
      }
    }
  }

  // 2. Auto-split ke Tabungan jika pemasukan (PRD 5.6)
  var autoSplitNominal = 0;
  if (tipe === "masuk" && body.id_tabungan_split) {
    var sets = bacaSemuaSettings();
    var splitPercent = parseFloat(sets["auto_split_percent"] || "10");
    if (splitPercent > 0) {
      autoSplitNominal = (jumlah * splitPercent) / 100;
      var tabSheet = ss.getSheetByName("Tabungan");
      var tabRows = tabSheet.getDataRange().getValues();
      for (var k = 1; k < tabRows.length; k++) {
        if (String(tabRows[k][0]) === String(body.id_tabungan_split)) {
          var currentTerkumpul = parseFloat(tabRows[k][3]) || 0;
          tabSheet.getRange(k + 1, 4).setValue(currentTerkumpul + autoSplitNominal);
          tulisLog("auto_split_tabungan", "Auto-split " + splitPercent + "% (Rp" + autoSplitNominal + ") ke tabungan " + tabRows[k][1]);
          break;
        }
      }
    }
  }

  // 3. Tambahkan ke Transaksi
  var id = "TRX_" + new Date().getTime();
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  trSheet.appendRow([id, timestamp, tanggal, tipe, jumlah, katId, catatan, sumber, fileUrl]);
  tulisLog("tambah_transaksi", { id: id, tipe: tipe, jumlah: jumlah, kategori: katId });

  return jsonResponse({
    success: true,
    id: id,
    autoSplitNominal: autoSplitNominal
  });
}

function handleUpdateTransaksi(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);

  var ss = getSpreadsheet();
  var trSheet = ss.getSheetByName("Transaksi");
  if (!trSheet) return jsonResponse({ success: false, error: "Sheet Transaksi tidak ditemukan." }, 500);

  var rows = trSheet.getDataRange().getValues();
  var id = String(body.id || "");
  var targetRowIdx = -1;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      targetRowIdx = i + 1;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return jsonResponse({ success: false, error: "Transaksi tidak ditemukan." }, 404);
  }

  var tipe = String(body.tipe || "keluar").toLowerCase();
  var jumlah = parseFloat(body.jumlah) || 0;
  var tanggal = body.tanggal || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  var katId = String(body.id_kategori || "");
  var catatan = String(body.catatan || "");
  var fileUrl = body.file_url !== undefined ? String(body.file_url) : String(rows[targetRowIdx - 1][8] || "");
  var sumber = String(rows[targetRowIdx - 1][7] || "web");
  var forceBypass = body.forceBypass === true;

  if (jumlah <= 0) {
    return jsonResponse({ success: false, error: "Nominal harus lebih dari 0." }, 400);
  }

  var bulan = tanggal.substring(0, 7);

  // Jalankan ulang cek anggaran mode peringatan/blokir jika pengeluaran
  // PENTING: Abaikan transaksi yang sedang diedit dari hitungan currentSpent
  if (tipe === "keluar") {
    var angSheet = ss.getSheetByName("Anggaran");
    var angRows = angSheet ? angSheet.getDataRange().getValues() : [];
    for (var a = 1; a < angRows.length; a++) {
      var ar = angRows[a];
      if (String(ar[1]) === bulan && String(ar[2]) === katId) {
        var limit = parseFloat(ar[3]) || 0;
        var mode = String(ar[4]) || "peringatan";

        var currentSpent = 0;
        for (var t = 1; t < rows.length; t++) {
          if (String(rows[t][0]) === id) continue; // Abaikan transaksi yang sedang diedit

          if (String(rows[t][3]).toLowerCase() === "keluar" &&
              String(rows[t][2]).substring(0, 7) === bulan &&
              String(rows[t][5]) === katId) {
            currentSpent += parseFloat(rows[t][4]) || 0;
          }
        }

        var totalSetelahIni = currentSpent + jumlah;

        if (mode === "blokir" && totalSetelahIni > limit && !forceBypass) {
          return jsonResponse({
            success: false,
            blocked: true,
            error: "Update ditolak! Melebihi limit anggaran (Mode Blokir). Limit: Rp" + limit.toLocaleString('id-ID') + ", Pengeluaran kategori saat ini: Rp" + currentSpent.toLocaleString('id-ID')
          }, 400);
        }

        if (mode === "peringatan" && totalSetelahIni > limit && !forceBypass) {
          return jsonResponse({
            success: false,
            warning: true,
            error: "Perhatian: Update ini akan melebihi anggaran kategori! Limit: Rp" + limit.toLocaleString('id-ID') + ", Total akan menjadi: Rp" + totalSetelahIni.toLocaleString('id-ID') + ". Tetap lanjutkan?"
          });
        }
        break;
      }
    }
  }

  var ts = String(rows[targetRowIdx - 1][1] || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"));
  trSheet.getRange(targetRowIdx, 1, 1, 9).setValues([[id, ts, tanggal, tipe, jumlah, katId, catatan, sumber, fileUrl]]);
  tulisLog("edit_transaksi", { id: id, tipe: tipe, jumlah: jumlah, kategori: katId, catatan: catatan });

  return jsonResponse({ success: true, id: id });
}

function handleGetTransaksi(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Transaksi");
  if (!sheet) return jsonResponse({ success: true, data: [] });

  var rows = sheet.getDataRange().getValues();
  var hasil = [];
  var startDate = body.startDate || "";
  var endDate = body.endDate || "";
  var catId = body.categoryId || "";
  var tipe = body.tipe || "";

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var tgl = String(r[2]);
    var tTipe = String(r[3]);
    var tKat = String(r[5]);

    if (startDate && tgl < startDate) continue;
    if (endDate && tgl > endDate) continue;
    if (catId && tKat !== catId) continue;
    if (tipe && tTipe !== tipe) continue;

    hasil.push({
      id: r[0],
      timestamp: r[1],
      tanggal: r[2],
      tipe: r[3],
      jumlah: parseFloat(r[4]) || 0,
      id_kategori: r[5],
      catatan: r[6],
      sumber: r[7],
      file_url: r[8]
    });
  }

  hasil.sort(function(a, b) {
    return b.tanggal.localeCompare(a.tanggal) || String(b.timestamp).localeCompare(String(a.timestamp));
  });

  return jsonResponse({ success: true, data: hasil, total: hasil.length });
}

function handleDeleteTransaksi(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Transaksi");
  var rows = sheet.getDataRange().getValues();
  var id = String(body.id);

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.deleteRow(i + 1);
      tulisLog("hapus_transaksi", "ID: " + id);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: "Transaksi tidak ditemukan." }, 404);
}

// ============================================================================
// CONTROLLER: KATEGORI & ANGGARAN & TABUNGAN & TAGIHAN
// ============================================================================
function handleGetKategori(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Kategori");
  var rows = sheet.getDataRange().getValues();
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    hasil.push({
      id_kategori: rows[i][0],
      nama: rows[i][1],
      tipe: rows[i][2],
      warna: rows[i][3],
      icon: rows[i][4]
    });
  }
  return jsonResponse({ success: true, data: hasil });
}

function handleSaveKategori(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Kategori");
  var rows = sheet.getDataRange().getValues();
  var id = body.id_kategori || ("kat_" + new Date().getTime());
  var nama = body.nama;
  var tipe = body.tipe;
  var warna = body.warna || "#2196F3";
  var icon = body.icon || "Tag";

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[id, nama, tipe, warna, icon]]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([id, nama, tipe, warna, icon]);
  }
  return jsonResponse({ success: true, id_kategori: id });
}

function handleGetAnggaran(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Anggaran");
  var rows = sheet.getDataRange().getValues();
  var bulan = body.bulan || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM");
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === bulan) {
      hasil.push({
        id: rows[i][0],
        bulan: rows[i][1],
        id_kategori: rows[i][2],
        limit: parseFloat(rows[i][3]) || 0,
        mode: rows[i][4] || "peringatan"
      });
    }
  }
  return jsonResponse({ success: true, data: hasil });
}

function handleSaveAnggaran(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Anggaran");
  var rows = sheet.getDataRange().getValues();
  var id = body.id || ("ANG_" + new Date().getTime());
  var bulan = body.bulan;
  var id_kategori = body.id_kategori;
  var limit = parseFloat(body.limit) || 0;
  var mode = body.mode || "peringatan";

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id) || (String(rows[i][1]) === bulan && String(rows[i][2]) === id_kategori)) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[rows[i][0], bulan, id_kategori, limit, mode]]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([id, bulan, id_kategori, limit, mode]);
  }
  return jsonResponse({ success: true, id: id });
}

function handleGetTabungan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tabungan");
  var rows = sheet.getDataRange().getValues();
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    hasil.push({
      id: rows[i][0],
      nama: rows[i][1],
      target: parseFloat(rows[i][2]) || 0,
      terkumpul: parseFloat(rows[i][3]) || 0,
      deadline: rows[i][4]
    });
  }
  return jsonResponse({ success: true, data: hasil });
}

function handleSaveTabungan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tabungan");
  var rows = sheet.getDataRange().getValues();
  var id = body.id || ("TAB_" + new Date().getTime());
  var nama = body.nama;
  var target = parseFloat(body.target) || 0;
  var terkumpul = parseFloat(body.terkumpul) || 0;
  var deadline = body.deadline || "";

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, 5).setValues([[id, nama, target, terkumpul, deadline]]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([id, nama, target, terkumpul, deadline]);
  }
  return jsonResponse({ success: true, id: id });
}

function handleSetorTarikTabungan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var tabSheet = ss.getSheetByName("Tabungan");
  var trSheet = ss.getSheetByName("Transaksi");
  var rows = tabSheet.getDataRange().getValues();
  var id = String(body.id);
  var aksi = String(body.aksi).toLowerCase(); // 'setor' atau 'tarik'
  var nominal = parseFloat(body.nominal) || 0;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      var current = parseFloat(rows[i][3]) || 0;
      var newTotal = aksi === "setor" ? current + nominal : Math.max(0, current - nominal);
      tabSheet.getRange(i + 1, 4).setValue(newTotal);

      var trId = "TRX_" + new Date().getTime();
      var tgl = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
      var ts = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      var tTipe = aksi === "setor" ? "keluar" : "masuk";
      var tCatatan = (aksi === "setor" ? "Setor ke tabungan: " : "Tarik dari tabungan: ") + rows[i][1];
      trSheet.appendRow([trId, ts, tgl, tTipe, nominal, "kat_tabungan", tCatatan, "web", ""]);

      tulisLog("tabungan_" + aksi, { id: id, nominal: nominal, totalBaru: newTotal });
      return jsonResponse({ success: true, totalBaru: newTotal });
    }
  }
  return jsonResponse({ success: false, error: "Tabungan tidak ditemukan." }, 404);
}

function handleGetTagihan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tagihan");
  var rows = sheet.getDataRange().getValues();
  var hasil = [];
  for (var i = 1; i < rows.length; i++) {
    hasil.push({
      id: rows[i][0],
      nama: rows[i][1],
      nominal: parseFloat(rows[i][2]) || 0,
      tanggal_jatuh_tempo: rows[i][3],
      berulang: rows[i][4],
      status: rows[i][5],
      terakhir_dibayar: rows[i][6]
    });
  }
  return jsonResponse({ success: true, data: hasil });
}

function handleSaveTagihan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tagihan");
  var rows = sheet.getDataRange().getValues();
  var id = body.id || ("TAG_" + new Date().getTime());
  var nama = body.nama;
  var nominal = parseFloat(body.nominal) || 0;
  var tglJatuhTempo = body.tanggal_jatuh_tempo;
  var berulang = body.berulang || "Y";
  var status = body.status || "belum";
  var terakhirDibayar = body.terakhir_dibayar || "";

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[id, nama, nominal, tglJatuhTempo, berulang, status, terakhirDibayar]]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([id, nama, nominal, tglJatuhTempo, berulang, status, terakhirDibayar]);
  }
  return jsonResponse({ success: true, id: id });
}

function handleBayarTagihan(body) {
  if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  var ss = getSpreadsheet();
  var tagSheet = ss.getSheetByName("Tagihan");
  var trSheet = ss.getSheetByName("Transaksi");
  var rows = tagSheet.getDataRange().getValues();
  var id = String(body.id);
  var tgl = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  var ts = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      var nama = rows[i][1];
      var nominal = parseFloat(rows[i][2]) || 0;

      tagSheet.getRange(i + 1, 6).setValue("lunas");
      tagSheet.getRange(i + 1, 7).setValue(tgl);

      var trId = "TRX_" + new Date().getTime();
      trSheet.appendRow([trId, ts, tgl, "keluar", nominal, "kat_tagihan", "Pembayaran tagihan: " + nama, "web", ""]);
      tulisLog("bayar_tagihan", "Tagihan lunas: " + nama + " (Rp" + nominal + ")");

      return jsonResponse({ success: true, message: "Tagihan berhasil dibayar dan dicatat ke pengeluaran." });
    }
  }
  return jsonResponse({ success: false, error: "Tagihan tidak ditemukan." }, 404);
}

// ============================================================================
// CONTROLLER: BACKUP DRIVE (PRD 5.9)
// ============================================================================
function handleBackupDrive(body) {
  if (body && !validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
  
  try {
    var ss = getSpreadsheet();
    var folderName = "Backup Keuangan";
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    var file = DriveApp.getFileById(ss.getId());
    var timeStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd_HH-mm");
    var backupName = "Backup_Keuangan_" + timeStr;
    var copyFile = file.makeCopy(backupName, targetFolder);

    var files = targetFolder.getFiles();
    var fileList = [];
    while (files.hasNext()) {
      fileList.push(files.next());
    }
    fileList.sort(function(a, b) {
      return b.getDateCreated().getTime() - a.getDateCreated().getTime();
    });
    if (fileList.length > 30) {
      for (var f = 30; f < fileList.length; f++) {
        fileList[f].setTrashed(true);
      }
    }

    tulisLog("backup_drive", "Backup berhasil: " + backupName);
    return jsonResponse({
      success: true,
      fileName: backupName,
      fileId: copyFile.getId(),
      folderUrl: targetFolder.getUrl()
    });
  } catch (err) {
    Logger.log("Error backup drive: " + err);
    tulisLog("error_backup", String(err));
    return jsonResponse({ success: false, error: String(err) }, 500);
  }
}

// ============================================================================
// CRON TRIGGERS (JAM 07:00 PENGINGAT WA & JAM 23:00 AUTO BACKUP)
// ============================================================================
function triggerPengingatTagihanHarian() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tagihan");
  if (!sheet) return;

  var settings = bacaSemuaSettings();
  var ownerWa = settings["no_wa_owner"];
  if (!ownerWa) return;

  var rows = sheet.getDataRange().getValues();
  var today = new Date();
  var curDay = today.getDate();

  for (var i = 1; i < rows.length; i++) {
    var status = String(rows[i][5]).toLowerCase();
    if (status === "lunas") continue;

    var nama = rows[i][1];
    var nominal = parseFloat(rows[i][2]) || 0;
    var jt = parseInt(rows[i][3], 10);

    var selisihHari = jt - curDay;
    var pesan = "";

    if (selisihHari === 3) {
      pesan = "🔔 [H-3 Pengingat Tagihan]\nTagihan *" + nama + "* sebesar Rp" + nominal.toLocaleString('id-ID') + " akan jatuh tempo tanggal " + jt + ".\nBalas 'LUNAS " + nama.toUpperCase() + "' jika sudah dibayar.";
    } else if (selisihHari === 1) {
      pesan = "⚠️ [H-1 Pengingat Tagihan Besok]\nTagihan *" + nama + "* sebesar Rp" + nominal.toLocaleString('id-ID') + " jatuh tempo BESOK (tgl " + jt + ").\nBalas 'LUNAS " + nama.toUpperCase() + "' jika sudah dibayar.";
    } else if (selisihHari === 0) {
      pesan = "🚨 [HARI INI JATUH TEMPO]\nTagihan *" + nama + "* sebesar Rp" + nominal.toLocaleString('id-ID') + " jatuh tempo HARI INI.\nBalas 'LUNAS " + nama.toUpperCase() + "' untuk mencatat pembayaran.";
    }

    if (pesan) {
      kirimWA(ownerWa, pesan);
    }
  }
}

function triggerAutoBackupHarian() {
  handleBackupDrive(null);
}

// FIX 2: Reset tagihan berulang tanggal 1 tiap bulan jam 00:05
function triggerResetTagihanBulanan() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Tagihan");
  if (!sheet) return;

  var curBulan = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM");
  var rows = sheet.getDataRange().getValues();
  var resetCount = 0;

  for (var i = 1; i < rows.length; i++) {
    var berulang = String(rows[i][4] || "").toUpperCase();
    var status = String(rows[i][5] || "").toLowerCase();
    var terakhirDibayar = String(rows[i][6] || "");
    var bulanDibayar = terakhirDibayar.substring(0, 7);

    // Jika berulang Y, status lunas, dan bulan terakhir bayar bukan bulan ini -> kembalikan ke belum
    if (berulang === "Y" && status === "lunas" && bulanDibayar !== curBulan) {
      sheet.getRange(i + 1, 6).setValue("belum");
      resetCount++;
    }
  }

  tulisLog("reset_tagihan_bulanan", "Reset tagihan bulanan otomatis selesai. " + resetCount + " tagihan direset ke status belum.");
  Logger.log("Reset tagihan bulanan: " + resetCount + " tagihan direset.");
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // Trigger jam 07:00 pengingat tagihan
  ScriptApp.newTrigger("triggerPengingatTagihanHarian")
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone("Asia/Jakarta")
    .create();

  // Trigger jam 23:00 auto-backup
  ScriptApp.newTrigger("triggerAutoBackupHarian")
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .inTimezone("Asia/Jakarta")
    .create();

  // Trigger tanggal 1 tiap bulan jam 00:05 (FIX 2)
  ScriptApp.newTrigger("triggerResetTagihanBulanan")
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .nearMinute(5)
    .inTimezone("Asia/Jakarta")
    .create();

  tulisLog("setup_triggers", "Trigger jam 07:00, jam 23:00, dan reset bulanan tgl 1 jam 00:05 berhasil dipasang.");
  Logger.log("Trigger harian dan bulanan berhasil diinstal!");
}

// ============================================================================
// WEBHOOK WHATSAPP (CATAT KELUAR/MASUK/LUNAS VIA WA)
// ============================================================================
// FIX 1: Helper normalisasi nomor WA (hapus spasi, +, -, ubah 08 / 8 -> 628)
function normalisasiNomorWA(nomor) {
  if (!nomor) return "";
  var clean = String(nomor).replace(/[^0-9]/g, "");
  if (clean.indexOf("08") === 0) {
    clean = "628" + clean.substring(2);
  } else if (clean.indexOf("8") === 0) {
    clean = "628" + clean.substring(1);
  }
  return clean;
}

function handleWaIncoming(sender, text) {
  // FIX 1 (HIGH) — Amankan webhook WA: Validasi nomor pengirim harus sama dengan no_wa_owner
  var settings = bacaSemuaSettings();
  var ownerWa = settings["no_wa_owner"] || "";
  var cleanSender = normalisasiNomorWA(sender);
  var cleanOwner = normalisasiNomorWA(ownerWa);

  if (!cleanSender || cleanSender !== cleanOwner) {
    tulisLog("wa_ditolak", "Akses WA ditolak dari nomor tidak dikenal: " + sender + " (Owner terdaftar: " + ownerWa + ")");
    return { authorized: false, error: "Akses ditolak. Nomor pengirim tidak terdaftar sebagai owner." };
  }

  var raw = String(text || "").trim();
  var lower = raw.toLowerCase();
  var ss = getSpreadsheet();
  var trSheet = ss.getSheetByName("Transaksi");
  var tgl = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  var ts = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  // Pola 1: LUNAS [NAMA]
  if (lower.startsWith("lunas ")) {
    var namaTagihan = raw.substring(6).trim();
    var tagSheet = ss.getSheetByName("Tagihan");
    var tagRows = tagSheet.getDataRange().getValues();
    for (var i = 1; i < tagRows.length; i++) {
      if (String(tagRows[i][1]).toLowerCase() === namaTagihan.toLowerCase()) {
        tagSheet.getRange(i + 1, 6).setValue("lunas");
        tagSheet.getRange(i + 1, 7).setValue(tgl); // Format YYYY-MM-DD
        var nom = parseFloat(tagRows[i][2]) || 0;
        var trId = "TRX_" + new Date().getTime();
        trSheet.appendRow([trId, ts, tgl, "keluar", nom, "kat_tagihan", "Pelunasan WA: " + tagRows[i][1], "wa", ""]);
        return { authorized: true, reply: "✅ Tagihan *" + tagRows[i][1] + "* sebesar Rp" + nom.toLocaleString('id-ID') + " berhasil ditandai LUNAS dan dicatat ke pengeluaran." };
      }
    }
    return { authorized: true, reply: "❌ Tagihan dengan nama '" + namaTagihan + "' tidak ditemukan di daftar Tagihan." };
  }

  // Pola 2: keluar 25000 makan siang #makan atau masuk 5000000 gaji #gaji
  var match = raw.match(/^(keluar|masuk)\s+(\d+)\s+(.+)$/i);
  if (match) {
    var tipe = match[1].toLowerCase();
    var jumlah = parseFloat(match[2]) || 0;
    var rest = match[3].trim();
    var hashtag = rest.match(/#(\w+)/);
    var kategoriName = hashtag ? hashtag[1] : "Lainnya";
    var catatan = rest.replace(/#\w+/, "").trim();

    var katSheet = ss.getSheetByName("Kategori");
    var katRows = katSheet.getDataRange().getValues();
    var katId = tipe === "masuk" ? "kat_lainnya_masuk" : "kat_lainnya_keluar";

    for (var k = 1; k < katRows.length; k++) {
      if (String(katRows[k][1]).toLowerCase() === kategoriName.toLowerCase() && String(katRows[k][2]).toLowerCase() === tipe) {
        katId = String(katRows[k][0]);
        break;
      }
    }

    var trId2 = "TRX_" + new Date().getTime();
    trSheet.appendRow([trId2, ts, tgl, tipe, jumlah, katId, catatan, "wa", ""]);
    tulisLog("trx_via_wa", { tipe: tipe, jumlah: jumlah, kategori: katId, catatan: catatan });

    return { authorized: true, reply: "✅ Transaksi berhasil dicatat!\nTipe: *" + tipe.toUpperCase() + "*\nNominal: *Rp" + jumlah.toLocaleString('id-ID') + "*\nKategori: *" + kategoriName + "*\nCatatan: " + (catatan || "-") };
  }

  return { authorized: true, reply: "Format tidak dikenali. Contoh perintah:\n- keluar 25000 makan siang #makan\n- masuk 5000000 gaji #gaji\n- LUNAS LISTRIK" };
}

// ============================================================================
// RESET SEMUA DATA (KOSONGKAN TRANSAKSI, ANGGARAN, TABUNGAN, TAGIHAN)
// ============================================================================
function handleResetSemuaData(body) {
  if (!validasiToken(body.token)) {
    return jsonResponse({ error: 403, message: "Sesi tidak valid atau telah kedaluwarsa." }, 403);
  }

  var ss = getSpreadsheet();
  var sheetsToReset = ["Transaksi", "Anggaran", "Tabungan", "Tagihan"];

  for (var i = 0; i < sheetsToReset.length; i++) {
    var sheet = ss.getSheetByName(sheetsToReset[i]);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }

  tulisLog("reset_semua_data", "Pengosongan seluruh data transaksi, anggaran, tabungan, dan tagihan melalui web dashboard.");

  return jsonResponse({
    success: true,
    message: "Semua data transaksi, anggaran, tabungan, dan tagihan berhasil dikosongkan."
  });
}

// ============================================================================
// MAIN ENTRY POINTS: doGet & doPost
// ============================================================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "status";
  return jsonResponse({
    status: "ok",
    app: "Pencatatan Keuangan Pribadi v1.5 API",
    time: new Date().toISOString(),
    action: action
  });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var body = {};
    try {
      body = JSON.parse(raw);
    } catch (parseErr) {
      body = {};
    }

    // Webhook WhatsApp (FIX 1: Tolak nomor tidak dikenal tanpa mengirim balasan WA)
    if (body.sender && body.message) {
      var hasilWa = handleWaIncoming(body.sender, body.message);
      if (hasilWa && hasilWa.authorized === false) {
        return jsonResponse({ success: false, error: hasilWa.error }, 403);
      }
      return jsonResponse({ reply: hasilWa.reply });
    }

    var action = body.action || (e && e.parameter ? e.parameter.action : "");

    switch (action) {
      case "verifyPin":
        return handleVerifyPin(body);
      case "changePin":
        return handleChangePin(body);
      case "getDashboard":
        return handleGetDashboard(body);
      case "getTransaksi":
        return handleGetTransaksi(body);
      case "addTransaksi":
        return handleAddTransaksi(body);
      case "updateTransaksi": // FIX 3: Action updateTransaksi
        return handleUpdateTransaksi(body);
      case "deleteTransaksi":
        return handleDeleteTransaksi(body);
      case "getKategori":
        return handleGetKategori(body);
      case "saveKategori":
        return handleSaveKategori(body);
      case "getAnggaran":
        return handleGetAnggaran(body);
      case "saveAnggaran":
        return handleSaveAnggaran(body);
      case "getTabungan":
        return handleGetTabungan(body);
      case "saveTabungan":
        return handleSaveTabungan(body);
      case "setorTarikTabungan":
        return handleSetorTarikTabungan(body);
      case "getTagihan":
        return handleGetTagihan(body);
      case "saveTagihan":
        return handleSaveTagihan(body);
      case "bayarTagihan":
        return handleBayarTagihan(body);
      case "backupDrive":
        return handleBackupDrive(body);
      case "resetSemuaData":
        return handleResetSemuaData(body);
      case "getSettings":
        if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
        var sets = bacaSemuaSettings();
        delete sets.pin_hash;
        return jsonResponse({ success: true, settings: sets });
      case "updateSettings":
        if (!validasiToken(body.token)) return jsonResponse({ error: 403 }, 403);
        if (body.settings) {
          for (var k in body.settings) {
            if (k !== "pin_hash") simpanSetting(k, body.settings[k]);
          }
        }
        return jsonResponse({ success: true });
      default:
        return jsonResponse({ error: "Action '" + action + "' tidak dikenal." }, 400);
    }
  } catch (globalErr) {
    Logger.log("Global error doPost: " + globalErr);
    tulisLog("error_dopost", String(globalErr));
    return jsonResponse({ success: false, error: String(globalErr) }, 500);
  }
}

function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
