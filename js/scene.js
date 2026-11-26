/* Pembentuk geometri: tiap item = daftar "part" (kotak/silinder) dalam koordinat lokal item.
   Asal lokal = (x, y, Z dasar) item; +X lokal ke kanan, "depan" perangkat = -Y lokal; item diputar rot° terhadap sumbu Z. */
(function () {
'use strict';
const D = window.LAB_DATA, R = D.room;
const box = (p, s, mat, o) => Object.assign({ sh: 'box', p, s, mat, edge: false }, o || {});
const cyl = (p, s, mat, o) => Object.assign({ sh: 'cyl', p, s, mat, edge: false }, o || {});

const B = {};
B.MEJA = it => {
  const w = it.w, d = it.d, g = it.blok === 'G', out = [];
  out.push(box([0, 0, 0.7375], [w, d, 0.025], 'meja_top', { edge: true }));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => out.push(box([a * (w / 2 - 0.045), b * (d / 2 - 0.045), 0.35], [0.04, 0.04, 0.70], 'meja_rangka')));
  [-1, 1].forEach(a => out.push(box([a * (w / 2 - 0.045), 0, 0.62], [0.03, d - 0.09, 0.03], 'meja_rangka')));
  out.push(box([0, d / 2 - 0.045, 0.62], [w - 0.09, 0.03, 0.03], 'meja_rangka'));
  if (g) out.push(box([0, d / 2 - 0.05, 0.42], [w - 0.12, 0.02, 0.30], 'meja_rangka'));
  return out;
};
B.AIO = it => [
  box([0, 0.02, 0.005], [0.26, 0.17, 0.01], 'aio_body'),
  box([0, 0.035, 0.11], [0.05, 0.02, 0.2], 'aio_body'),
  box([0, 0, 0.255], [0.54, 0.025, 0.33], 'aio_body', { edge: true }),
  box([0, -0.0135, 0.255], [0.50, 0.003, 0.29], 'aio_layar'),
];
B.KM = it => [box([-0.05, 0, 0.01], [0.44, 0.14, 0.02], 'km'), box([0.235, 0, 0.014], [0.06, 0.10, 0.028], 'km')];
B.KURSI = it => {
  const o = [box([0, 0, 0.44], [0.45, 0.45, 0.06], 'kursi_dudukan'), box([0, -0.225, 0.72], [0.42, 0.05, 0.46], 'kursi_dudukan'),
    cyl([0, 0, 0.22], [0.05, 0.05, 0.38], 'kursi_rangka')];
  for (let k = 0; k < 5; k++) {
    const a = k * 72 * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    o.push(box([c * 0.15, s * 0.15, 0.045], [0.30, 0.04, 0.03], 'kursi_rangka', { rz: a }));
    o.push(box([c * 0.29, s * 0.29, 0.025], [0.05, 0.05, 0.05], 'kursi_rangka'));
  }
  return o;
};
B.GLASSBOARD = it => {
  const w = it.w, h = it.h, o = [box([0, 0, h / 2], [w - 0.05, 0.012, h - 0.05], 'papan_kaca', { alpha: 0.62 })];
  o.push(box([0, 0, 0.0125], [w, 0.05, 0.025], 'jendela_rangka'), box([0, 0, h - 0.0125], [w, 0.05, 0.025], 'jendela_rangka'));
  [-1, 1].forEach(a => o.push(box([a * (w / 2 - 0.0125), 0, h / 2], [0.025, 0.05, h], 'jendela_rangka')));
  [[-1, 0.12], [1, 0.12], [-1, h - 0.12], [1, h - 0.12]].forEach(([a, z]) => o.push(box([a * (w / 2 - 0.1), 0.0825, z], [0.03, 0.115, 0.03], 'bracket')));
  return o;
};
B.PROYEKTOR = it => [box([0, 0, 0.075], [0.40, 0.30, 0.15], 'proyektor', { edge: true }), box([0, 0.16, 0.075], [0.10, 0.03, 0.10], 'aio_layar'),
  box([0, 0, 0.3375], [0.04, 0.04, 0.375], 'bracket'), box([0, 0, 0.52], [0.22, 0.22, 0.01], 'bracket')];
B.AC = it => [box([0, 0, 0.15], [it.w, it.d, it.h], 'ac', { edge: true }), box([0, -it.d / 2 + 0.03, 0.045], [it.w - 0.12, 0.05, 0.03], 'aio_layar'),
  box([it.w / 2 - 0.1, -it.d / 2 - 0.001, 0.2], [0.03, 0.004, 0.012], 'led', { emis: [0.2, 0.6, 0.3] })];
B.APAR = it => [
  box([0, 0.115, 0.3], [0.4, 0.02, 0.6], 'apar'), box([-0.19, 0, 0.3], [0.02, 0.25, 0.6], 'apar'), box([0.19, 0, 0.3], [0.02, 0.25, 0.6], 'apar'),
  box([0, 0, 0.01], [0.4, 0.25, 0.02], 'apar'), box([0, 0, 0.59], [0.4, 0.25, 0.02], 'apar'),
  cyl([0, 0.03, 0.27], [0.15, 0.15, 0.44], 'apar'), cyl([0, 0.03, 0.52], [0.05, 0.05, 0.06], 'bracket'),
  box([0, -0.115, 0.3], [0.36, 0.01, 0.56], 'jendela_kaca', { alpha: 0.28 }),
];
B.SERVER = it => [box([0, 0, 0.345], [0.55, 0.60, 0.69], 'server', { edge: true }), box([0, -0.302, 0.42], [0.40, 0.004, 0.40], 'aio_layar'),
  box([0.2, -0.302, 0.62], [0.03, 0.004, 0.02], 'led', { emis: [0.2, 0.9, 0.3] })];
B.SWITCH = it => [box([0, 0, 0.045], [0.79, 0.25, 0.09], 'switch', { edge: true }), box([0, -0.126, 0.045], [0.70, 0.004, 0.045], 'aio_layar'),
  box([0, 0.14, 0.045], [0.82, 0.03, 0.12], 'bracket')];
B.AP = it => [cyl([0, 0, 0.02], [0.30, 0.30, 0.04], 'ap'), box([0, 0, 0.08], [0.04, 0.04, 0.08], 'bracket')];
B.CCTV = it => [cyl([0, 0, 0.06], [0.09, 0.09, 0.12], 'cctv'), box([0, -0.045, 0.045], [0.04, 0.02, 0.04], 'aio_layar'), box([0, 0, 0.41], [0.02, 0.02, 0.58], 'bracket')];
B.MONITOR_CCTV = it => [box([0, 0, 0.165], [0.55, 0.04, 0.33], 'monitor_cctv', { edge: true }), box([0, -0.021, 0.165], [0.51, 0.003, 0.29], 'aio_layar', { emis: [0.03, 0.05, 0.07] }),
  box([0, 0.04, 0.165], [0.10, 0.04, 0.10], 'bracket')];
B.PANEL_DB = it => [box([0, 0, 0.35], [0.5, 0.15, 0.7], 'db', { edge: true }), box([0, -0.076, 0.35], [0.44, 0.004, 0.62], 'dinding'), box([0.15, -0.079, 0.55], [0.03, 0.004, 0.03], 'led', { emis: [0.9, 0.3, 0.2] })];
B.LED = it => [box([0, 0, 0.015], [0.6, 0.6, 0.03], 'led', { edge: true, led: true }), box([0, 0, 0.012], [0.64, 0.64, 0.01], 'jendela_rangka')];
B.PINTU = it => {
  const o = [], hw = 0.9;
  [-1, 1].forEach(a => o.push(box([a * 0.935, 0, 1.05], [0.07, 0.16, 2.1], 'pintu', { edge: true })));
  o.push(box([0, 0, 2.135], [1.94, 0.16, 0.07], 'pintu', { edge: true }));
  [-1, 1].forEach(a => {
    const pv = [a * hw, 0, 0];
    o.push(box([a * 0.45, 0, 1.025], [0.88, 0.04, 2.05], 'pintu', { edge: true, pivot: pv, anim: a < 0 ? 'leafL' : 'leafR' }));
    o.push(box([a * 0.45, 0, 1.55], [0.64, 0.045, 0.7], 'pintu', { pivot: pv, anim: a < 0 ? 'leafL' : 'leafR', dark: 0.82 }));
    o.push(box([a * 0.45, 0, 0.5], [0.64, 0.045, 0.7], 'pintu', { pivot: pv, anim: a < 0 ? 'leafL' : 'leafR', dark: 0.82 }));
    o.push(box([a * 0.06, -0.035, 1.0], [0.025, 0.03, 0.14], 'bracket', { pivot: pv, anim: a < 0 ? 'leafL' : 'leafR' }));
  });
  return o;
};
B.JENDELA = it => {
  const w = it.w, h = it.h, o = [];
  o.push(box([0, 0, 0.025], [w, 0.12, 0.05], 'jendela_rangka', { edge: true }), box([0, 0, h - 0.025], [w, 0.12, 0.05], 'jendela_rangka', { edge: true }));
  [-1, 1].forEach(a => o.push(box([a * (w / 2 - 0.025), 0, h / 2], [0.05, 0.12, h - 0.1], 'jendela_rangka')));
  o.push(box([0, 0, h / 2], [0.04, 0.10, h - 0.1], 'jendela_rangka'));
  o.push(box([0, 0, h / 2], [w - 0.1, 0.01, h - 0.1], 'jendela_kaca', { alpha: 0.30 }));
  o.push(box([0, -0.11, -0.005], [w + 0.1, 0.10, 0.03], 'jendela_rangka'));
  return o;
};

/* -------- figur manusia (skala) -------- */
function figureParts(col) {
  const c = { col }, sk = { col: '#E2B994' };
  return [
    // berdiri
    box([-0.09, 0, 0.42], [0.12, 0.14, 0.84], 'orang', Object.assign({ pose: 'stand', dark: 0.7 }, c)), box([0.09, 0, 0.42], [0.12, 0.14, 0.84], 'orang', Object.assign({ pose: 'stand', dark: 0.7 }, c)),
    box([0, 0, 1.18], [0.38, 0.20, 0.55], 'orang', Object.assign({ pose: 'stand' }, c)), cyl([0, 0, 1.56], [0.2, 0.2, 0.22], 'orang', Object.assign({ pose: 'stand' }, sk)),
    box([0, 0.12, 1.57], [0.05, 0.05, 0.04], 'orang', Object.assign({ pose: 'stand' }, sk)),
    // duduk (pinggul di atas dudukan)
    box([-0.09, 0.22, 0.52], [0.12, 0.44, 0.12], 'orang', Object.assign({ pose: 'sit', dark: 0.7 }, c)), box([0.09, 0.22, 0.52], [0.12, 0.44, 0.12], 'orang', Object.assign({ pose: 'sit', dark: 0.7 }, c)),
    box([-0.09, 0.41, 0.26], [0.10, 0.12, 0.52], 'orang', Object.assign({ pose: 'sit', dark: 0.7 }, c)), box([0.09, 0.41, 0.26], [0.10, 0.12, 0.52], 'orang', Object.assign({ pose: 'sit', dark: 0.7 }, c)),
    box([0, -0.05, 0.84], [0.38, 0.20, 0.58], 'orang', Object.assign({ pose: 'sit' }, c)), cyl([0, -0.03, 1.2], [0.2, 0.2, 0.22], 'orang', Object.assign({ pose: 'sit' }, sk)),
    box([0, 0.08, 1.21], [0.05, 0.05, 0.04], 'orang', Object.assign({ pose: 'sit' }, sk)),
  ];
}

/* -------- bangun scene -------- */
const scene = { items: [], byId: {}, extras: [], figures: [], sets: {} };
const GROUP_ORDER = { lantai: 0, dinding: 1, pintu: 2, jendela: 2, A: 3, B: 4, C: 5, G: 6, kursi: 7, aio: 8, km: 8, jar: 9, plafon: 10, listrik: 11, k3: 12, papan: 6 };
function mkItem(d, parts, extra) {
  const it = Object.assign({ d, id: d.id, parts, layer: d.layer, x: d.x, y: d.y, z: d.zb, rot: (d.rot || 0) * Math.PI / 180, offY: 0, scaleZ: 1, offZ: 0, visible: true, build: 0, hidden: false }, extra || {});
  return it;
}
D.items.forEach(d => {
  const fn = B[d.kat]; if (!fn) return;
  const it = mkItem(d, fn(d));
  let g = 'plafon';
  if (d.kat === 'MEJA') g = d.blok; else if (d.kat === 'KURSI') g = 'kursi'; else if (d.kat === 'AIO') g = 'aio'; else if (d.kat === 'KM') g = 'km';
  else if (d.kat === 'PINTU') g = 'pintu'; else if (d.kat === 'JENDELA') g = 'jendela'; else if (d.kat === 'GLASSBOARD') g = 'papan';
  else if (['SERVER', 'SWITCH', 'AP'].includes(d.kat)) g = 'jar'; else if (['AC', 'LED', 'PANEL_DB', 'PROYEKTOR'].includes(d.kat)) g = 'listrik'; else g = 'k3';
  it.group = g; it.order = d.baris ? d.baris + (d.sisi === 'Kanan' ? 0.5 : 0) : 0;
  if (d.kat === 'KURSI') it.chairDir = d.blok === 'G' ? 1 : -1;
  scene.items.push(it); scene.byId[d.id] = it;
  if (d.blok) {
    const key = d.blok === 'G' ? 'GURU' : d.blok + d.baris + d.sisi; (scene.sets[key] = scene.sets[key] || {})[d.kat] = it; it.setKey = key;
  }
});

// lantai
const fl = mkItem({ id: 'LANTAI', kat: 'LANTAI' }, [box([0, 0, -0.05], [R.W + 2 * R.wall, R.D + 2 * R.wall, 0.1], 'lantai', { edge: true, nopick: true })], { layer: 'struktur', group: 'lantai', order: 0, x: 0, y: 0, z: 0, rot: 0, extra: 'lantai' });
scene.extras.push(fl); scene.floor = fl;

// dinding (dengan bukaan pintu & jendela)
function wallPart(x0, x1, y0, y1, z0, z1) { return box([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [x1 - x0, y1 - y0, z1 - z0], 'dinding', { edge: true, nopick: true }); }
const hx = R.W / 2, hy = R.D / 2, t = R.wall, H = R.H, dr = R.door;
const walls = {
  kiri: { parts: [wallPart(-hx - t, -hx, -hy - t, dr.y0, 0, H), wallPart(-hx - t, -hx, dr.y1, hy + t, 0, H), wallPart(-hx - t, -hx, dr.y0, dr.y1, dr.h, H)], out: [-1, 0] },
  kanan: { parts: [wallPart(hx, hx + t, -hy - t, hy + t, 0, H)], out: [1, 0] },
  depan: { parts: [wallPart(-hx, hx, hy, hy + t, 0, H)], out: [0, 1] },
  belakang: { parts: [], out: [0, -1] },
};
(function () {
  const ws = R.windows.map(w => [w.x - w.w / 2, w.x + w.w / 2, w.z0, w.z1]).sort((a, b) => a[0] - b[0]);
  let cur = -hx; const P = walls.belakang.parts;
  ws.forEach(([a, b, z0, z1]) => { P.push(wallPart(cur, a, -hy - t, -hy, 0, H)); P.push(wallPart(a, b, -hy - t, -hy, 0, z0)); P.push(wallPart(a, b, -hy - t, -hy, z1, H)); cur = b; });
  P.push(wallPart(cur, hx, -hy - t, -hy, 0, H));
})();
Object.keys(walls).forEach(k => {
  const w = walls[k], it = mkItem({ id: 'DINDING-' + k.toUpperCase(), kat: 'DINDING' }, w.parts, { layer: 'struktur', group: 'dinding', order: 0, x: 0, y: 0, z: 0, rot: 0, wall: k, out: w.out });
  scene.extras.push(it);
});
// plafon
scene.extras.push(mkItem({ id: 'PLAFON', kat: 'PLAFON' }, [box([0, 0, H + 0.025], [R.W + 2 * t, R.D + 2 * t, 0.05], 'plafon', { nopick: true })], { layer: 'plafon', group: 'plafon', order: 0, x: 0, y: 0, z: 0, rot: 0, ceiling: true }));

// ghost (posisi menurut drawio – hanya garis)
scene.ghosts = D.ghosts.map(g => ({ g, rot: g.rot * Math.PI / 180 }));

// figur manusia: 30 siswa + guru
Object.keys(scene.sets).forEach(k => {
  const s = scene.sets[k], seat = s.KURSI, desk = s.MEJA; if (!seat) return;
  const col = k === 'GURU' ? '#8E6CC9' : (k[0] === 'A' ? '#2F8F9D' : k[0] === 'B' ? '#3F77C9' : '#D88A2E');
  const f = mkItem({ id: 'FIGUR-' + k, kat: 'FIGUR', layer: 'orang' }, figureParts(col), { layer: 'orang', group: 'orang', order: 0, x: seat.x, y: seat.y, z: 0, rot: seat.chairDir === 1 ? Math.PI : 0, pose: 'sit', seat, setKey: k, nopickItem: true, hidden: false });
  f.visible = false; scene.figures.push(f); scene.extras.push(f);
});
window.SCENE = scene;
})();
