#!/usr/bin/env python3
"""Bangun data/ dan js/data.js dari workbook KANONIS V2.
Pemakaian:  python3 tools/build_data.py  path/ke/KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx
Butuh: openpyxl.  Semua koordinat dalam meter; asal (0,0,0) di tengah lantai, +X kanan, +Y ke papan, +Z atas.
"""
import sys, os, json, csv, math
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'source', 'KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx')
wb = openpyxl.load_workbook(XLSX, data_only=True)

def table(ws, header_row):
    hdr = [c.value for c in ws[header_row]]
    out = []
    for r in ws.iter_rows(min_row=header_row + 1, values_only=True):
        if r[0] is None: continue
        out.append(dict(zip(hdr, r)))
    return out

device = table(wb['Device'], 4)
koord = {r['Objek']: r for r in table(wb['Koordinat_3D'], 4)}
holds = [r for r in table(wb['Register_Keputusan'], 4) if str(r['ID']).startswith('HOLD')]

# ---------------------------------------------------------------- material
MAT = {
 'lantai':   dict(komponen='Lantai', bahan='Keramik/porselen 60×60 cm, doff', finishing='Abu terang, nat abu tua', hex='#C9CDD0', spec=0.25, alpha=1,
                  sumber='B+U', dasar='BoQ A-03 "lantai keramik/porselen 120 m²" (jenis = sumber; ukuran & warna = usulan)'),
 'dinding':  dict(komponen='Dinding', bahan='Pasangan bata + plester, cat tembok interior emulsi', finishing='Putih tulang', hex='#EEEBE3', spec=0.0, alpha=1,
                  sumber='B+U', dasar='BoQ A-04 "pengecatan dinding 176 m²" (cat = sumber; warna = usulan)'),
 'plafon':   dict(komponen='Plafon', bahan='Gypsum board 9 mm, rangka hollow galvanis', finishing='Cat putih', hex='#F7F7F3', spec=0.0, alpha=1,
                  sumber='U', dasar='Tidak ada di sumber (tinggi ruang 4 m saja). Perlu keputusan: plafon gantung atau struktur terbuka'),
 'meja_top': dict(komponen='Meja – permukaan', bahan='HPL/melamin ±25 mm', finishing='Motif kayu maple terang', hex='#D9BF99', spec=0.15, alpha=1,
                  sumber='B+U', dasar='Device: "Meja AIO HPL/melamin ±25mm + metal" (bahan = sumber; motif = usulan)'),
 'meja_rangka': dict(komponen='Meja – rangka', bahan='Besi hollow 40×40, powder coat', finishing='Hitam doff', hex='#2B2F33', spec=0.35, alpha=1,
                  sumber='B+U', dasar='Device: "... + metal" (profil & finishing = usulan)'),
 'kursi_dudukan': dict(komponen='Kursi – dudukan & sandaran', bahan='Busa berlapis kain/mesh', finishing='Hitam-abu', hex='#3A3F45', spec=0.05, alpha=1,
                  sumber='B+U', dasar='Device: "Kursi kerja adjustable, sandaran dan roda" (lapisan = usulan)'),
 'kursi_rangka': dict(komponen='Kursi – kaki/dasar', bahan='Dasar 5 kaki nylon + roda, gas lift', finishing='Hitam / krom', hex='#1F2226', spec=0.5, alpha=1,
                  sumber='B+U', dasar='Device: "adjustable ... roda" (bahan = usulan)'),
 'aio_body': dict(komponen='AIO – bodi', bahan='Plastik ABS', finishing='Putih-abu', hex='#E6E8EA', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: Lenovo IdeaCentre AIO 3 (model awal belum diverifikasi)'),
 'aio_layar': dict(komponen='AIO – layar', bahan='Panel IPS berlapis kaca', finishing='Hitam gloss', hex='#0B0F14', spec=0.8, alpha=1,
                  sumber='B', dasar='Device: Lenovo IdeaCentre AIO 3'),
 'km':       dict(komponen='Keyboard + mouse', bahan='Plastik ABS, kabel USB', finishing='Hitam', hex='#1E2125', spec=0.2, alpha=1,
                  sumber='B', dasar='Device: Logitech MK120 (K120 + B100)'),
 'papan_kaca': dict(komponen='Papan tulis kaca', bahan='Kaca tempered ±8 mm, bingkai aluminium', finishing='Putih/frosted', hex='#E9F0F3', spec=0.85, alpha=0.62,
                  sumber='B+U', dasar='Device/BoQ I-08: "Glassboard 2,40×1,20" (ketebalan & bingkai = usulan)'),
 'pintu':    dict(komponen='Pintu 2 daun', bahan='Rangka kayu + panel (daun 0,90 m)', finishing='Cat/HPL walnut', hex='#7B5A3C', spec=0.15, alpha=1,
                  sumber='U', dasar='BoQ A-06 hanya menyebut "pintu dua daun"; bahan belum ditetapkan'),
 'jendela_rangka': dict(komponen='Jendela – rangka', bahan='Aluminium', finishing='Powder coat abu tua', hex='#5C6670', spec=0.4, alpha=1,
                  sumber='U', dasar='BoQ A-05 "jendela belakang" tanpa bahan; usulan'),
 'jendela_kaca': dict(komponen='Jendela – kaca', bahan='Kaca bening 5 mm', finishing='Bening', hex='#A9D4E6', spec=0.9, alpha=0.30,
                  sumber='U', dasar='BoQ A-05; usulan'),
 'ac':       dict(komponen='AC split', bahan='Plastik ABS', finishing='Putih', hex='#F3F5F6', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: Daikin split ±1–1,5 PK (kapasitas HOLD-03)'),
 'apar':     dict(komponen='APAR & kabinet', bahan='Tabung baja + kabinet baja berkaca', finishing='Merah', hex='#C0392B', spec=0.4, alpha=1,
                  sumber='U', dasar='BoQ S-01 / DB-06: APAR + kabinet dinding; jenis final oleh K3 (HOLD-08)'),
 'server':   dict(komponen='Server tower', bahan='Baja', finishing='Hitam', hex='#24272C', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: Tower Xeon E-2436'),
 'switch':   dict(komponen='Switch', bahan='Baja/aluminium', finishing='Abu perak', hex='#8F989F', spec=0.5, alpha=1,
                  sumber='B', dasar='Device: TP-Link ES220GMP (audit port HOLD-05)'),
 'ap':       dict(komponen='Access point', bahan='Plastik ABS', finishing='Putih', hex='#F2F4F5', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: TP-Link EAP110 Omada'),
 'proyektor': dict(komponen='Proyektor', bahan='Plastik ABS', finishing='Putih', hex='#F1F2F0', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: Epson CO-FH01'),
 'cctv':     dict(komponen='CCTV', bahan='Plastik ABS', finishing='Putih', hex='#F2F3F5', spec=0.3, alpha=1,
                  sumber='B', dasar='Device: EZVIZ C6N pan/tilt Wi-Fi'),
 'monitor_cctv': dict(komponen='Monitor CCTV', bahan='Panel LCD', finishing='Hitam', hex='#101317', spec=0.7, alpha=1,
                  sumber='U', dasar='Register DB-08 / BoQ I-07: usulan di luar 134 baseline'),
 'led':      dict(komponen='Lampu panel LED', bahan='Rangka aluminium + difuser opal', finishing='Putih hangat', hex='#FFF4D2', spec=0.0, alpha=1,
                  sumber='U', dasar='BoQ M-02: jumlah TBD; 6 titik = ilustrasi render (HOLD-04)'),
 'db':       dict(komponen='Panel DB', bahan='Boks besi', finishing='Abu muda', hex='#9AA3AA', spec=0.3, alpha=1,
                  sumber='U', dasar='BoQ M-03 / label "DB-LAB?" di drawio'),
 'bracket':  dict(komponen='Braket & penggantung', bahan='Baja hollow', finishing='Hitam', hex='#2B2F33', spec=0.35, alpha=1,
                  sumber='U', dasar='Proyektor/CCTV/glassboard perlu pemasangan; kekuatan HOLD-06'),
 'kabel':    dict(komponen='Kabel jaringan (skematik)', bahan='UTP CAT6 dalam duct/cable tray', finishing='-', hex='#187B85', spec=0.0, alpha=1,
                  sumber='B+U', dasar='BoQ M-04 (CAT6); rute di model hanya skematik'),
 'orang':    dict(komponen='Figur skala manusia', bahan='-', finishing='-', hex='#4C9AA5', spec=0.0, alpha=1,
                  sumber='-', dasar='Pembantu skala, bukan bagian inventaris'),
}
mat_text = {
 'MEJA': 'Top HPL/melamin 25 mm (maple) + rangka besi hollow powder coat hitam',
 'AIO': 'Bodi plastik ABS putih-abu + layar IPS kaca hitam',
 'KM': 'Plastik ABS hitam (kabel USB)',
 'KURSI': 'Dudukan busa+kain/mesh hitam-abu; dasar nylon 5 kaki + roda; gas lift krom',
 'GLASSBOARD': 'Kaca tempered ±8 mm putih/frosted; bingkai aluminium; standoff baja',
 'PROYEKTOR': 'Bodi plastik putih; braket plafon baja hitam',
 'AC': 'Bodi plastik ABS putih',
 'CCTV': 'Plastik putih; braket plafon baja',
 'SERVER': 'Baja hitam',
 'SWITCH': 'Baja/aluminium abu perak; braket dinding',
 'AP': 'Plastik putih; braket plafon',
 'PINTU': 'Kayu panel/HPL walnut 2 daun (0,90 m/daun); kusen aluminium/kayu',
 'JENDELA': 'Rangka aluminium abu tua + kaca bening 5 mm',
 'APAR': 'Tabung baja merah + kabinet baja berkaca',
 'MONITOR_CCTV': 'Panel LCD hitam; braket dinding',
 'PANEL_DB': 'Boks besi abu muda',
 'LED': 'Panel LED rangka aluminium + difuser opal',
}

items = []
def add(**k):
    k.setdefault('baris', None); k.setdefault('sisi', None); k.setdefault('blok', None)
    k.setdefault('catatan', ''); k.setdefault('x_excel', None); k.setdefault('y_excel', None)
    k['x'] = round(k['x'], 3); k['y'] = round(k['y'], 3); k['zb'] = round(k['zb'], 3)
    k['zt'] = round(k['zb'] + k['h'], 3)
    k['material'] = mat_text.get(k['kat'], '')
    items.append(k)

# ------------------------------------------------------------ workstation
for r in device:
    cat = r['Kategori']
    if cat not in ('MEJA', 'AIO', 'KM', 'KURSI'): continue
    guru = (r['Blok'] == 'G')
    x, y = float(r['X (m)']), float(r['Y (m)'])
    loc = r['Lokasi']
    common = dict(id=r['ID Aset / Usulan'], kat=cat, blok=r['Blok'], baris=r['Baris'], sisi=r['Sisi'],
                  x_excel=x, y_excel=y, lokasi=loc, spec=r['Model / Spesifikasi Usulan'])
    if cat == 'MEJA':
        w, d = (1.53, 0.78) if guru else (1.12, 0.70)
        add(**common, x=x, y=y, zb=0, rot=0, w=w, d=d, h=0.75, status='M+V', layer='furnitur',
            src_xy='Excel Device/Koordinat_3D (titik tengah meja)', src_dim='Excel Koordinat_3D (lebar×dalam×tinggi 0,75)',
            catatan='Z 0,75 = tinggi permukaan meja')
    elif cat == 'AIO':
        add(**common, x=x, y=y + (-0.15 if guru else 0.15), zb=0.75, rot=180 if guru else 0, w=0.54, d=0.18, h=0.42, status='M+V', layer='perangkat',
            src_xy='Titik meja + offset model 0,15 m (asumsi)', src_dim='Asumsi AIO 24″ tipikal; verifikasi datasheet',
            catatan='Layar menghadap pengguna')
    elif cat == 'KM':
        add(**common, x=x, y=y + (0.15 if guru else -0.15), zb=0.75, rot=180 if guru else 0, w=0.55, d=0.15, h=0.02, status='M+V', layer='perangkat',
            src_xy='Titik meja + offset model 0,15 m (asumsi)', src_dim='Asumsi keyboard 0,44 m + mouse')
    else:
        add(**common, x=x, y=y + (0.97 if guru else -0.60), zb=0, rot=180 if guru else 0, w=0.50, d=0.50, h=0.95, status='U+V', layer='furnitur',
            src_xy='Titik meja + offset kursi ditarik 0,60 m (setara simbol "K" di drawio)', src_dim='ASUMSI: dimensi kursi belum ada di sumber (HOLD-01)',
            catatan='Posisi = kursi ditarik; animasi kursi didorong ke meja tersedia')

# ------------------------------------------------ perangkat non-workstation
dev = {r['ID Aset / Usulan']: r for r in device}
def dv(i): r = dev[i]; return float(r['X (m)']), float(r['Y (m)']), r
def sp(r): return r['Model / Spesifikasi Usulan']

x, y, r = dv('RPL-PROY-01')
add(id='RPL-PROY-01', kat='PROYEKTOR', x=x, y=y, zb=3.475, rot=0, w=0.40, d=0.30, h=0.15, status='M+V', layer='perangkat', lokasi=r['Lokasi'], spec=sp(r),
    x_excel=x, y_excel=y, src_xy='Excel Device & Koordinat_3D', src_dim='Excel (0,40×0,30); tinggi asumsi', catatan='Z 3,55 = titik tengah. KONFLIK: drawio menggambar y≈1,60. Uji throw distance')
for i, yy in (('RPL-AC-01', 2.25), ('RPL-AC-02', -2.25)):
    x, y, r = dv(i)
    add(id=i, kat='AC', x=x, y=y, zb=3.20, rot=90, w=1.15, d=0.33, h=0.30, status='M+V', layer='listrik', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
        src_xy='Excel Device & Koordinat_3D', src_dim='Excel (1,15×0,33); tinggi asumsi',
        catatan='Z 3,35 = titik tengah. Kapasitas HOLD-03. Drawio: lebar 0,72 & y ' + ('2,20' if i.endswith('1') else '-2,45'))
x, y, r = dv('RPL-BOARD-01')
add(id='RPL-BOARD-01', kat='GLASSBOARD', x=x, y=y, zb=1.5, rot=0, w=2.40, d=0.05, h=1.2, status='B+M', layer='perangkat', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
    src_xy='Excel Device & Koordinat_3D', src_dim='Excel + BoQ I-08 (2,40×1,20)', catatan='Z 2,10 = titik tengah → bawah 1,50 m. Celah ke dinding 0,115 m (diisi standoff di model)')
for i, (cx, cy) in (('RPL-CCTV-01', (-5.5, 4.55)), ('RPL-CCTV-02', (5.5, -4.55))):
    x, y, r = dv(i)
    add(id=i, kat='CCTV', x=x, y=y, zb=3.3, rot=round(math.degrees(math.atan2(-x, y)), 1), w=0.09, d=0.09, h=0.12, status='U+V', layer='k3', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
        src_xy='Excel Device (tidak ada di Koordinat_3D)', src_dim='ASUMSI dimensi & tinggi pasang 3,3 m',
        catatan='KONFLIK: drawio tidak menggambar kamera sudut. Metode pasang belum ditetapkan (model: braket plafon)')
x, y, r = dv('RPL-SERVER-01')
add(id='RPL-SERVER-01', kat='SERVER', x=x, y=y, zb=0, rot=180, w=0.55, d=0.60, h=0.69, status='M+V', layer='jaringan', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
    src_xy='Excel Device & Koordinat_3D', src_dim='Excel (0,55×0,60)', catatan='Z 0,69 ditafsirkan sebagai TINGGI atas (berdiri di lantai); jika titik tengah maka tinggi 1,38 m. Drawio: y≈-4,30')
for i, zz in (('RPL-SW-01', 1.30), ('RPL-SW-02', 1.40)):
    x, y, r = dv(i)
    add(id=i, kat='SWITCH', x=x, y=y, zb=zz, rot=-90, w=0.79, d=0.25, h=0.09, status='M+V', layer='jaringan', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
        src_xy='Excel (kedua switch pada titik yang sama)', src_dim='Excel (0,79×0,25); tinggi asumsi',
        catatan='Dua unit di koordinat sama → ditumpuk di model (asumsi). Lebar 0,79 m perlu verifikasi (switch 19″ umumnya ±0,44 m). Drawio menggambar "SW 1+2" di (5,81; -4,02)')
x, y, r = dv('RPL-AP-01')
add(id='RPL-AP-01', kat='AP', x=x, y=y, zb=3.88, rot=0, w=0.30, d=0.30, h=0.04, status='M+V', layer='jaringan', lokasi=r['Lokasi'], spec=sp(r), x_excel=x, y_excel=y,
    src_xy='Excel Device & Koordinat_3D', src_dim='Excel (0,30×0,30); tebal asumsi', catatan='Z 3,90 = titik tengah')

# ----------------------------------------------- elemen ruang (di luar 134)
k = koord['PINTU-01']
add(id='PINTU-01', kat='PINTU', x=k['X (m)'], y=k['Y (m)'], zb=0, rot=90, w=1.8, d=0.10, h=2.1, status=k['Status'], layer='struktur', lokasi='Dinding kiri, y 2,75–4,55',
    spec='Pintu dua daun, bukaan 1,80 m', src_xy='Excel Koordinat_3D', src_dim='Excel (1,80×0,10); tinggi 2,10 dari Z tengah 1,05',
    catatan='Di luar 134 aset. Drawio menggambar daun terbuka 35° ke dalam. Arah ayun & bahan perlu verifikasi (HOLD-01)')
for n in ('WINDOW-01', 'WINDOW-02'):
    k = koord[n]
    add(id=n, kat='JENDELA', x=k['X (m)'], y=k['Y (m)'], zb=1.06, rot=180, w=1.62, d=0.12, h=1.45, status=k['Status'], layer='struktur', lokasi='Dinding belakang',
        spec='Jendela 1,62×1,45 m', src_xy='Excel Koordinat_3D', src_dim='Excel lebar 1,62 + BoQ A-05 tinggi 1,45; Z 1,785 = titik tengah',
        catatan='Di luar 134 aset. x = -1,60 / +1,65 (tidak simetris) – konfirmasi')
k = koord['APAR-01']
add(id='APAR-01', kat='APAR', x=k['X (m)'], y=k['Y (m)'], zb=1.09, rot=90, w=0.40, d=0.25, h=0.60, status=k['Status'], layer='k3', lokasi='Dinding kiri dekat pintu',
    spec='Kabinet APAR (jenis final oleh K3)', src_xy='Excel Koordinat_3D', src_dim='Excel (0,40×0,25); tinggi asumsi',
    catatan='Z 1,39 = titik tengah. x=-5,73 → melayang 0,145 m dari dinding; tepat di bawah AC-01 (HIRA: AC bocor). HOLD-08')

# ------------------------------------------------------ tambahan (usulan)
add(id='MON-CCTV-01', kat='MONITOR_CCTV', x=5.95, y=-3.02, zb=1.335, rot=-90, w=0.55, d=0.04, h=0.33, status='U+V', layer='k3', lokasi='Dinding kanan',
    spec='Monitor CCTV tambahan (DB-08)', src_xy='Drawio: simbol berlabel "CCTV" di dinding kanan (5,87; -3,02) – ditafsirkan sebagai monitor', src_dim='ASUMSI',
    catatan='TAMBAHAN di luar 134. Tidak ada di Koordinat_3D')
add(id='DB-LAB-01', kat='PANEL_DB', x=5.52, y=-4.925, zb=1.15, rot=180, w=0.50, d=0.15, h=0.70, status='U+V', layer='listrik', lokasi='Dinding belakang, kanan',
    spec='Panel listrik lab (label drawio "DB-LAB?")', src_xy='Drawio (5,52; -4,75) digeser ke dinding', src_dim='ASUMSI', catatan='TAMBAHAN. Kapasitas/proteksi HOLD-02')
n = 0
for yy in (1.55, -2.45):
    for xx in (-3.8, 0.0, 3.8):
        n += 1
        add(id=f'LED-{n:02d}', kat='LED', x=xx, y=yy, zb=3.97, rot=0, w=0.60, d=0.60, h=0.03, status='U+V', layer='listrik', lokasi='Plafon',
            spec='Panel LED 40 W (ilustrasi)', src_xy='Drawio (label "LED?")', src_dim='ASUMSI 0,6×0,6 m',
            catatan='TAMBAHAN. Jumlah/posisi belum ditetapkan sebelum desain lux (HOLD-04)')

# -------------------------------------------------------------- konflik
conflicts = [
 dict(item='CCTV', excel='Device: 2 unit di (-5,5; 4,55) & (5,5; -4,55); Koordinat_3D: tidak ada', drawio='1 simbol "CCTV" di dinding kanan (5,87; -3,02) – model menafsirkannya sebagai monitor CCTV', dampak='Jumlah dan posisi kamera tidak pasti'),
 dict(item='Proyektor', excel='y = 2,10', drawio='y ≈ 1,60', dampak='Selisih 0,5 m → throw distance'),
 dict(item='Switch 1 & 2', excel='Keduanya di (5,7; -3,8), lebar 0,79 m', drawio='Satu kotak "SW 1+2" di (5,81; -4,02) menimpa server', dampak='Cara pasang (rak/braket/tumpuk) belum jelas'),
 dict(item='AC', excel='Lebar 1,15 m; AC-01 y=2,25; AC-02 y=-2,25', drawio='Lebar 0,72 m; y = 2,20 / -2,45', dampak='Dimensi dan posisi berbeda'),
 dict(item='Server', excel='y = -4,43', drawio='y ≈ -4,30', dampak='Selisih kecil'),
 dict(item='Jendela', excel='x = -1,60 / +1,65', drawio='sama', dampak='Tidak simetris – disengaja?'),
 dict(item='ID meja guru', excel='Device: RPL-GURU-*', drawio='Register DB-05: "GR-01"', dampak='Penamaan tidak seragam'),
 dict(item='Simbol "K"', excel='-', drawio='Tidak ada di legenda (kursi atau keyboard)', dampak='Model memakai tafsiran kursi (ditarik 0,60 m)'),
]
ghosts = [
 dict(label='Proyektor (drawio)', x=0.0, y=1.60, zb=3.475, w=0.53, d=0.29, h=0.15, rot=0),
 dict(label='AC-01 (drawio)', x=-5.85, y=2.20, zb=3.20, w=0.72, d=0.19, h=0.30, rot=90),
 dict(label='AC-02 (drawio)', x=-5.85, y=-2.45, zb=3.20, w=0.72, d=0.19, h=0.30, rot=90),
 dict(label='Server (drawio)', x=5.50, y=-4.30, zb=0, w=0.60, d=0.54, h=0.69, rot=0),
 dict(label='Switch (drawio)', x=5.81, y=-4.02, zb=1.30, w=0.45, d=0.63, h=0.18, rot=-90),
]
missing = [
 'Tebal dinding & apakah 12×10 m ukuran dalam atau luar (model: dalam, dinding 0,15 m ke luar)',
 'Jenis plafon (ruang 4 m) – model: gypsum putih',
 'Detail pintu (arah ayun, bahan, tinggi) – model: ayun ke dalam 90°, tinggi 2,10 m',
 'Tinggi/sill jendela – model: sill 1,06 m, tinggi 1,45 m',
 'Tinggi (H) hampir semua objek dan acuan Z yang konsisten (tengah vs atas)',
 'Dimensi kursi (inti HOLD-01) – model: 0,50×0,50 m, ditarik 0,60 m dari pusat meja',
 'Dimensi AIO, keyboard/mouse, server (tinggi), switch (lebar 0,79 m meragukan)',
 'Stopkontak, outlet data, cable tray/duct, rak & patch panel – belum punya koordinat (kabel di model = skematik)',
 'Tanda/rambu evakuasi, jalur evakuasi kedua; outdoor AC & drain; layar proyektor (papan kaca memantul)',
 'Warna/material final lantai, dinding, plafon, pintu, jendela – lihat tab Material (usulan ditandai U)',
]
hold_out = [dict(id=h['ID'], isu=h['Keputusan / Isu'], bukti=h['Bukti Penutupan'], status=h['Status']) for h in holds]

# ------------------------------------------------ pemeriksaan geometri
import itertools
def _box(i):
    r = int(round(i['rot'])) % 180
    w, dd = (i['d'], i['w']) if r == 90 else (i['w'], i['d'])
    if i['kat'] == 'CCTV': w = dd = 0.12
    return (i['x'] - w / 2, i['x'] + w / 2, i['y'] - dd / 2, i['y'] + dd / 2, i['zb'], i['zt'])
def _gap(a, b):
    A, B = _box(a), _box(b)
    return math.hypot(max(A[0] - B[1], B[0] - A[1], 0), max(A[2] - B[3], B[2] - A[3], 0))
collisions = []
for a, b in itertools.combinations(items, 2):
    if a['kat'] in ('PINTU', 'JENDELA') or b['kat'] in ('PINTU', 'JENDELA'): continue
    A, B = _box(a), _box(b)
    ov = [min(A[2*k+1], B[2*k+1]) - max(A[2*k], B[2*k]) for k in range(3)]
    if all(o > 0.005 for o in ov): collisions.append(dict(a=a['id'], b=b['id'], overlap=[round(o, 3) for o in ov]))
byid = {i['id']: i for i in items}
checks = [dict(teks=t, jarak=round(_gap(byid[x], byid[y]), 2)) for t, x, y in [
    ('Meja C-05-R ke server (jarak terdekat, diagonal)', 'RPL-C-05-R-MEJA', 'RPL-SERVER-01'),
    ('Kursi C-05-R ke server', 'RPL-C-05-R-KURSI', 'RPL-SERVER-01'),
    ('Meja guru ke meja C-01-R', 'RPL-GURU-MEJA', 'RPL-C-01-R-MEJA'),
    ('Meja A-01-L ke kabinet APAR', 'RPL-A-01-L-MEJA', 'APAR-01'),
    ('Meja C-05-R ke monitor CCTV (dinding kanan)', 'RPL-C-05-R-MEJA', 'MON-CCTV-01')]]
room = dict(W=12.0, D=10.0, H=4.0, wall=0.15, door=dict(y0=2.75, y1=4.55, h=2.1), windows=[dict(x=-1.6, w=1.62, z0=1.06, z1=2.51), dict(x=1.65, w=1.62, z0=1.06, z1=2.51)],
            pitch=1.45, desk_d=0.70, source='KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx + KE1235_Drawio_KANONIS_V2.drawio', generated='2026-11-25')
out = dict(room=room, materials=MAT, items=items, collisions=collisions, checks=checks, conflicts=conflicts, ghosts=ghosts, missing=missing, holds=hold_out)

os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'js'), exist_ok=True)
with open(os.path.join(ROOT, 'js', 'data.js'), 'w', encoding='utf-8') as f:
    f.write('/* dibuat oleh tools/build_data.py – jangan edit manual */\nwindow.LAB_DATA = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
with open(os.path.join(ROOT, 'data', 'lab.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

cols = ['id','kat','blok','baris','sisi','x_excel','y_excel','x','y','zb','zt','rot','w','d','h','material','status','src_xy','src_dim','catatan']
hdr = ['ID','Kategori','Blok','Baris','Sisi','X_titik_Excel_m','Y_titik_Excel_m','X_model_m','Y_model_m','Z_dasar_m','Z_atas_m','Rotasi_deg','Lebar_m','Dalam_m','Tinggi_m','Material','Status','Sumber_XY','Sumber_dimensi','Catatan']
with open(os.path.join(ROOT, 'data', 'koordinat_perangkat.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(hdr)
    for it in items: w.writerow([it.get(c, '') if it.get(c) is not None else '' for c in cols])
with open(os.path.join(ROOT, 'data', 'material.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['Kode','Komponen','Bahan','Finishing/warna','Warna_hex','Status (B=sumber, U=usulan)','Dasar'])
    for kd, m in MAT.items(): w.writerow([kd, m['komponen'], m['bahan'], m['finishing'], m['hex'], m['sumber'], m['dasar']])
print('tabrakan 3D:', len(collisions), '| cek:', checks)
print('items', len(items), '| baseline 134 ->', sum(1 for i in items if i['id'].startswith('RPL-')), '| tambahan/elemen ->', sum(1 for i in items if not i['id'].startswith('RPL-')))
