# Lab RPL SMKN 3 Metro – Layout 3D interaktif (konseptual)

Model 3D yang berjalan langsung di browser (WebGL, tanpa library eksternal, tanpa server).
Dibuat otomatis dari `source/KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx` dan `source/KE1235_Drawio_KANONIS_V2.drawio`.

> **Bukan gambar konstruksi.** Dimensi furnitur, pintu/jendela, dan seluruh status HOLD masih perlu survei lapangan.
> Objek berstatus `U` (usulan) / `V` (verifikasi) adalah asumsi yang ditandai di model.

## Fitur
- 146 objek: 134 aset baseline + pintu, 2 jendela, APAR, monitor CCTV, panel DB, 6 lampu LED (ilustrasi)
- **Koordinat per perangkat** (X, Y, Z dasar, Z atas, rotasi, dimensi) – klik objek atau buka tab *Koordinat*; unduh CSV/JSON
- **Material** per komponen dengan penanda sumber: `B` (disebut di dokumen), `U` (usulan), `B+U` – tab *Material*
- **Animasi**: tur kamera, animasi pembangunan bertahap, buka/tutup pintu, kursi ditarik/didorong, ilustrasi evakuasi, lampu on/off
- Pandangan siswa / guru / dari pintu, peta clearance antar-baris, kabel jaringan skematik, grid koordinat 1 m
- Tab **Audit data**: konflik drawio vs Excel, data yang belum ada, status HOLD, pemeriksaan tabrakan

## Sistem koordinat
Asal (0,0,0) di tengah lantai · +X ke kanan (menghadap papan) · +Y ke papan (depan) · +Z ke atas · satuan meter.
`X/Y` = pusat tapak objek, `Z dasar` = elevasi bawah objek.

## Publikasi di GitHub Pages
1. Buat repositori baru di GitHub (mis. `lab-rpl-3d`), lalu upload **seluruh isi folder ini** (termasuk `.nojekyll`).
   - Lewat web: *Add file → Upload files*, seret semua file/folder, lalu *Commit changes*.
   - Atau lewat git: `git init && git add . && git commit -m "Layout 3D Lab RPL" && git branch -M main && git remote add origin <URL> && git push -u origin main`
2. Di repositori: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
3. Tunggu 1–2 menit; alamatnya `https://<username>.github.io/<nama-repo>/`.

Bisa juga dibuka lokal: klik dua kali `index.html` (tidak perlu server).

## Memperbarui data
Ubah Excel, lalu jalankan (butuh Python + `openpyxl`):

    python3 tools/build_data.py source/KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx

Perintah ini membuat ulang `js/data.js`, `data/lab.json`, `data/koordinat_perangkat.csv`, dan `data/material.csv`.
Asumsi dimensi/material (kursi, AIO, tinggi pasang, warna) ada di `tools/build_data.py`.

## Struktur
    index.html            halaman utama
    css/style.css
    js/engine.js          mesin render WebGL
    js/scene.js           geometri tiap perangkat
    js/app.js             kamera, UI, animasi
    js/data.js            data hasil build (jangan edit manual)
    data/                 CSV & JSON koordinat/material
    source/               file asal (xlsx, drawio)
    tools/build_data.py   generator data

## Kontrol
Seret = putar · Shift/klik-kanan + seret = geser · Roda/pinch = zoom · W A S D / panah = bergerak · Q/E = turun/naik · Esc = batal pilih.
