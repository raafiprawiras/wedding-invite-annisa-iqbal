/**
 * Ucapan & Do'a — backend Google Sheets untuk undangan Annisa & Iqbal.
 *
 * CARA PAKAI (ringkas):
 *  1. Buat Google Sheet baru (sheets.new).
 *  2. Menu Ekstensi → Apps Script, tempel seluruh isi file ini.
 *  3. Ganti nilai SECRET di bawah dengan kata rahasia bebas Anda,
 *     lalu simpan (Ctrl+S).
 *  4. Deploy → Deployment baru → jenis "Aplikasi web":
 *       - Execute as (Jalankan sebagai): Me (Saya)
 *       - Who has access (Siapa yang memiliki akses): Anyone (Siapa saja)
 *     → Deploy → izinkan akses akun Google bila diminta.
 *  5. Salin "Web app URL" (berakhiran /exec).
 *
 * Lalu di project undangan, file .env:
 *   VITE_GUESTBOOK_URL=<Web app URL tadi>
 *   VITE_GUESTBOOK_KEY=<nilai SECRET>
 *
 * CATATAN: setiap kali mengubah kode ini, lakukan
 * Deploy → Kelola deployment → ikon pensil → Version: New version → Deploy,
 * supaya perubahan aktif pada URL /exec yang sama.
 */

// Kata rahasia bersama — WAJIB diganti agar hanya situs undangan yang bisa menulis.
const SECRET = 'GANTI-KATA-RAHASIA-ANDA';

// Nama tab sheet tempat ucapan disimpan (dibuat otomatis bila belum ada).
const SHEET_NAME = 'Ucapan';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp', 'name', 'message', 'attendance']);
  }
  return sheet;
}

function reply_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET  → daftar seluruh ucapan (terbaru dulu). */
function doGet(e) {
  try {
    if (SECRET && e.parameter.secret !== SECRET) {
      return reply_({ ok: false, error: 'unauthorized' });
    }
    const rows = getSheet_().getDataRange().getValues();
    rows.shift(); // buang baris header
    const entries = rows
      .map((r) => ({
        created_at: new Date(r[0]).toISOString(),
        name: String(r[1]),
        message: String(r[2]),
        attendance: String(r[3]) === 'tidak' ? 'tidak' : 'hadir',
      }))
      .reverse();
    return reply_({ ok: true, entries: entries });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

/** POST → simpan satu ucapan. Body JSON: {secret, name, message, attendance}. */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (SECRET && body.secret !== SECRET) {
      return reply_({ ok: false, error: 'unauthorized' });
    }
    const name = String(body.name || 'Tamu').slice(0, 50);
    const message = String(body.message || '').slice(0, 500);
    const attendance = body.attendance === 'tidak' ? 'tidak' : 'hadir';
    if (!message) {
      return reply_({ ok: false, error: 'empty message' });
    }
    getSheet_().appendRow([new Date(), name, message, attendance]);
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}
