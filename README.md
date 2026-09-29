# Annisa & Iqbal — Undangan Pernikahan

Situs undangan pernikahan digital. Mobile-first, dibangun dari desain Figma.
Fase 1 (**Opening Page**) dan Fase 2 (**Main Invitation**) sudah selesai.

## Tech Stack

- Vite 5 (vanilla JavaScript)
- HTML5
- Tailwind CSS 3 + PostCSS + Autoprefixer
- CSS custom (token desain presisi)
- Tanpa framework UI lain

## Perintah

```bash
npm install      # instalasi dependensi
npm run dev      # dev server http://localhost:5173
npm run build    # build produksi ke dist/
npm run preview  # preview build produksi
```

## Struktur Proyek

```
├── public/
│   └── assets/
│       ├── backgrounds/   # background burgundy (original Figma)
│       ├── headings/      # artwork judul "Annisa & Iqbal"
│       ├── images/        # foto pasangan + bingkai krem
│       └── fonts/         # Space Mono WOFF2 (lokal, self-hosted)
│
├── src/
│   ├── styles/
│   │   ├── fonts.css      # @font-face
│   │   └── variables.css  # design tokens (warna, tipografi, layout)
│   ├── main.js            # entry + semua interaksi (countdown, RSVP, dll)
│   └── style.css          # Tailwind + gaya seluruh halaman
│
├── assets/                # sumber original (jangan dihapus)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Aset

| File | Asal | Pemakaian |
|---|---|---|
| `backgrounds/background-page-awal.png` | Figma export | Latar full-viewport (`background-size: cover`) |
| `images/frame-foto.png` | Figma export | Foto pasangan, rotasi + tepi krem menyatu di aset |
| `headings/heading-ai.png` | Figma export | Judul; teks asli tersedia sebagai `<h1>` tersembunyi untuk SEO/a11y |
| `assets/Page Awal.png` | Referensi | Hanya referensi desain, tidak ikut build |

Aset original di folder `assets/` disimpan utuh. Folder `public/assets/` berisi
salinan siap-pakai untuk web.

## Font

- **Judul**: artwork gambar dari Figma (bukan font).
- **Teks tamu & tombol**: Space Mono 400/700, self-hosted WOFF2 di
  `public/assets/fonts/`. Font asli dari Figma tidak tersedia — Space Mono
  adalah substitusi terdekat (monospace, geometris). Ganti file + `@font-face`
  di `src/styles/fonts.css` bila font asli tersedia.

## Strategi Responsif

- Mobile-first, `min-height: 100dvh`, tanpa `transform: scale()`.
- Lebar foto/judul pakai `clamp()`/`min()` terhadap viewport.
- Kolom konten `max-width: 30rem` diambil dari sisi kiri-tengah agar di desktop
  hierarki visual tetap seperti referensi.
- Background `cover` + `center top` agar bentuk dekoratif tidak terpotong ke bawah.
- Titik uji: 320 / 360 / 375 / 390 / 412 / 430 / 768 / 1024 / 1280 / 1440 px.

## Deployment (Vercel)

1. Push ke GitHub.
2. Import repo di Vercel — framework **Vite**, build `npm run build`, output `dist`.
3. `vite.config.js` memakai `base: './'` sehingga aman untuk static export.

## Roadmap

- [x] Fase 1: Opening Page
- [x] Fase 2: Hero / Couple Introduction / Event / Love Story / Gallery / RSVP / Wishes / Gift / Location / Closing
- [x] Sistem nama tamu dinamis (query param `?nama=`)
- [ ] Tambahkan file musik `public/assets/audio/wedding-music.mp3`
- [ ] Ganti data placeholder (nama, tanggal, lokasi, nomor rekening) dengan data asli
- [ ] Optimasi WebP untuk background (4,6 MB PNG)
- [ ] Backend RSVP & ucapan (saat ini disimpan di `localStorage`)

## Fitur Fase 2

- **Countdown** real-time menuju tanggal akad (atur di `WEDDING_DATE`, `src/main.js`).
- **RSVP** — validasi + simpan ke `localStorage` (`wedding:rsvp`).
- **Ucapan & Doa** — daftar ucapan tersimpan di `localStorage` (`wedding:wishes`),
  output di-escape untuk mencegah XSS.
- **Galeri** — lightbox dengan navigasi keyboard (Esc untuk menutup).
- **Hadiah** — tombol salin nomor rekening (Clipboard API + fallback).
- **Musik** — tombol putar/jeda; otomatis disembunyikan bila file audio tidak ada.
- **Scroll reveal** — animasi masuk saat section terlihat (menghormati
  `prefers-reduced-motion`).
