/* Aplikasi: kamera, UI, animasi, picking. */
(function () {
'use strict';
const { V, M, hex, Renderer } = window.GL3, D = window.LAB_DATA, S = window.SCENE, R = D.room;
const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
const f2 = n => { const v = Math.round(n * 100) / 100; return (Object.is(v, -0) ? 0 : v).toFixed(2).replace('.', ','); };
const ease = t => t * t * (3 - 2 * t), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let ren;
const canvas = $('#gl');
try { ren = new Renderer(canvas); } catch (e) { $('#nogl').style.display = 'flex'; $('#nogl small').textContent = String(e.message || e); throw e; }

/* ---------------------------------------------------------------- state */
const state = {
  layers: { struktur: true, plafon: false, furnitur: true, perangkat: true, jaringan: true, listrik: true, k3: true, orang: false, kabel: false, grid: false, label: false, dim: true, ghost: false, clear: false, evacline: false },
  colorMode: 'material', lamp: true, door: { a: 0, target: 0 }, push: { v: 0, target: 0 }, thr: 0.60,
  sel: null, hover: null, anim: null, tour: null, build: null, evac: null, keys: {},
};
const MC = {}; Object.entries(D.materials).forEach(([k, m]) => MC[k] = { rgb: hex(m.hex), spec: m.spec, alpha: m.alpha });
const ALL = S.items.concat(S.extras);
ALL.forEach(it => it.parts.forEach(p => { p._L = M.mul(M.trans(p.p[0], p.p[1], p.p[2]), M.rotZ(p.rz || 0)); }));
const STATUS = { base: { rgb: hex('#3CA66B'), t: 'Baseline' }, ver: { rgb: hex('#E3A02B'), t: 'Model – perlu verifikasi' }, usul: { rgb: hex('#8E6CC9'), t: 'Usulan / asumsi' } };
const stKey = st => (st || '').includes('U') ? 'usul' : (st || '').includes('V') ? 'ver' : 'base';

/* --------------------------------------------------------------- kamera */
const cam = { eye: [-14, -15, 12], target: [0, 0, 0.8], fov: 42, look: false };
const PRESETS = {
  iso: { eye: [-13.5, -15.5, 11.5], target: [0, 0.3, 0.8], fov: 42, look: false },
  atas: { eye: [0, -0.9, 19.5], target: [0, 0, 0], fov: 42, look: false },
  depan: { eye: [0, 17, 4.2], target: [0, 0, 1.4], fov: 42, look: false },
  belakang: { eye: [0, -17, 4.4], target: [0, 0, 1.4], fov: 42, look: false },
  kiri: { eye: [-17, 0.5, 4.6], target: [0, 0.5, 1.4], fov: 42, look: false },
  kanan: { eye: [17, 0, 4.6], target: [0, 0, 1.4], fov: 42, look: false },
  siswa: { eye: [4.45, -4.15, 1.2], target: [0, 4.86, 1.7], fov: 62, look: true },
  guru: { eye: [4.02, 4.62, 1.3], target: [0, -4.5, 1.0], fov: 62, look: true },
  pintu: { eye: [-2.4, 0.8, 1.7], target: [-6, 3.65, 1.0], fov: 62, look: true },
};
let tween = null;
function tweenTo(v, dur, onEnd) {
  tween = { t0: performance.now(), dur: (dur || 1.4) * 1000, from: { eye: cam.eye.slice(), target: cam.target.slice(), fov: cam.fov }, to: v, onEnd };
  cam.look = v.look;
}
function setView(name) { stopTour(); tweenTo(PRESETS[name], 1.3); $$('#views button').forEach(b => b.classList.toggle('on', b.dataset.v === name)); }
function orbitOf() { const o = V.sub(cam.eye, cam.target), r = V.len(o); return { r, az: Math.atan2(o[1], o[0]), el: Math.asin(clamp(o[2] / r, -1, 1)) }; }
function setOrbit(r, az, el) { cam.eye = V.add(cam.target, [r * Math.cos(el) * Math.cos(az), r * Math.cos(el) * Math.sin(az), r * Math.sin(el)]); }
function userRotate(dx, dy) {
  tween = null; stopTour(true);
  if (cam.look) {
    const d = V.sub(cam.target, cam.eye), L = V.len(d); let yaw = Math.atan2(d[1], d[0]), pit = Math.asin(clamp(d[2] / L, -1, 1));
    yaw -= dx * 0.0045; pit = clamp(pit - dy * 0.0045, -1.4, 1.4);
    cam.target = V.add(cam.eye, [L * Math.cos(pit) * Math.cos(yaw), L * Math.cos(pit) * Math.sin(yaw), L * Math.sin(pit)]);
  } else { const o = orbitOf(); setOrbit(o.r, o.az - dx * 0.0055, clamp(o.el + dy * 0.0055, 0.02, 1.54)); }
}
function userPan(dx, dy) {
  tween = null; stopTour(true);
  const f = V.norm(V.sub(cam.target, cam.eye)), right = V.norm(V.cross(f, [0, 0, 1])), up = V.cross(right, f), r = Math.max(V.len(V.sub(cam.eye, cam.target)), 2) * 0.0016;
  const dv = V.add(V.mul(right, -dx * r), V.mul(up, dy * r)); cam.eye = V.add(cam.eye, dv); cam.target = V.add(cam.target, dv);
}
function userZoom(dy) {
  tween = null; stopTour(true);
  if (cam.look) cam.fov = clamp(cam.fov + dy * 0.03, 24, 90);
  else { const o = orbitOf(); setOrbit(clamp(o.r * Math.exp(dy * 0.0012), 1.5, 45), o.az, o.el); }
}
function flyTo(it) {
  stopTour(true); const c = itemCenter(it); const d = it.d || {}, sz = Math.max(d.w || 0.5, d.d || 0.5, d.h || 0.5);
  let dir = V.norm(V.sub(cam.eye, cam.target)); if (cam.look) dir = V.norm([-0.5, -0.7, 0.5]);
  const dist = clamp(sz * 2.6 + 1.8, 2.6, 7);
  tweenTo({ eye: V.add(c, V.mul(dir, dist)), target: c, fov: 42, look: false }, 1.1);
}

/* ------------------------------------------------------------- utilitas */
function itemCenter(it) { const d = it.d; return [it.x, it.y + it.offY, it.z + (d && d.h ? d.h / 2 : 0.4)]; }
function itemM(it) { return M.mul(M.trans(it.x, it.y + it.offY, it.z + it.offZ), M.rotZ(it.rot)); }
function layerOn(it) { return state.layers[it.layer] && !it.hidden && it.visible !== false && it.build !== -1; }
function gapInfo(setKey) {
  const s = S.sets[setKey]; if (!s || !s.KURSI || !s.MEJA || setKey === 'GURU') return null;
  const dk = s.MEJA, ch = s.KURSI, nextKey = ch.d.blok + (ch.d.baris + 1) + ch.d.sisi, nx = S.sets[nextKey];
  const nextFront = nx ? nx.MEJA.y + 0.35 : -R.D / 2, deskBack = dk.y - 0.35;
  const f = off => (ch.y + off) - 0.25 - nextFront;
  return { pulled: f(0), pushed: f(0.20), cur: f(ch.offY * 1), nextFront, deskBack, row: ch.d.baris, last: !nx, deskGap: dk.y - 0.35 - nextFront };
}

/* ---------------------------------------------------- garis (dibuat sekali) */
const hx = R.W / 2, hy = R.D / 2;
function mkLines(segs) { const a = []; segs.forEach(s => a.push(...s[0], ...s[1])); return ren.makeLines(a); }
const L = {};
(function () {
  const t = [], g = [], ax = [];
  for (let x = -hx; x <= hx + 1e-6; x += 0.6) t.push([[x, -hy, 0.004], [x, hy, 0.004]]);
  for (let y = -hy; y <= hy + 1e-6; y += 0.6) t.push([[-hx, y, 0.004], [hx, y, 0.004]]);
  L.tile = mkLines(t);
  for (let x = -hx; x <= hx; x++) g.push([[x, -hy, 0.012], [x, hy, 0.012]]);
  for (let y = -hy; y <= hy; y++) g.push([[-hx, y, 0.012], [hx, y, 0.012]]);
  L.grid = mkLines(g);
  L.axx = mkLines([[[-hx, 0, 0.015], [hx, 0, 0.015]]]); L.axy = mkLines([[[0, -hy, 0.015], [0, hy, 0.015]]]);
  // dimensi
  const dm = [], yy = -hy - 0.9, xx = -hx - 1.0;
  dm.push([[-hx, yy, 0.01], [hx, yy, 0.01]], [[-hx, yy - 0.15, 0.01], [-hx, yy + 0.15, 0.01]], [[hx, yy - 0.15, 0.01], [hx, yy + 0.15, 0.01]], [[-hx, -hy - 0.1, 0.01], [-hx, yy - 0.2, 0.01]], [[hx, -hy - 0.1, 0.01], [hx, yy - 0.2, 0.01]]);
  dm.push([[xx, -hy, 0.01], [xx, hy, 0.01]], [[xx - 0.15, -hy, 0.01], [xx + 0.15, -hy, 0.01]], [[xx - 0.15, hy, 0.01], [xx + 0.15, hy, 0.01]], [[-hx - 0.1, -hy, 0.01], [xx - 0.2, -hy, 0.01]], [[-hx - 0.1, hy, 0.01], [xx - 0.2, hy, 0.01]]);
  dm.push([[hx + 0.9, -hy - 0.9, 0], [hx + 0.9, -hy - 0.9, R.H]], [[hx + 0.75, -hy - 0.9, 0], [hx + 1.05, -hy - 0.9, 0]], [[hx + 0.75, -hy - 0.9, R.H], [hx + 1.05, -hy - 0.9, R.H]]);
  L.dim = mkLines(dm);
  // kabel jaringan skematik (di atas lantai, tanpa depth test)
  const cable = { A: [], B: [], C: [], T: [] }, back = -hy + 0.18, sw = S.byId['RPL-SW-01'];
  const lane = { 'AKiri': -5.3, 'AKanan': -1.9, 'BKiri': -1.9, 'BKanan': 1.9, 'CKiri': 1.9, 'CKanan': 5.45 };
  Object.keys(S.sets).forEach(k => {
    if (k === 'GURU') return; const s = S.sets[k], desk = s.MEJA, bl = k[0], sd = desk.d.sisi, lx = lane[bl + sd], gy = desk.y - 0.725, z = 0.04;
    const pts = [[desk.x, desk.y, z], [desk.x, gy, z], [lx, gy, z]];
    if (bl === 'C' && sd === 'Kanan') pts.push([lx, -3.8, z], [sw.x - 0.2, -3.8, z]);
    else pts.push([lx, back, z], [5.1, back, z], [5.1, -3.8, z], [sw.x - 0.2, -3.8, z]);
    for (let i = 0; i < pts.length - 1; i++) cable[bl].push([pts[i], pts[i + 1]]);
  });
  const g0 = S.sets.GURU.MEJA; [[g0.x, g0.y, 0.04], [g0.x, 2.92, 0.04], [5.9, 2.92, 0.04], [5.9, -3.8, 0.04], [sw.x, -3.8, 0.04]].forEach((p, i, a) => { if (i) cable.C.push([a[i - 1], p]); });
  const srv = S.byId['RPL-SERVER-01'], ap = S.byId['RPL-AP-01'];
  cable.T.push([[sw.x - 0.2, -3.8, 1.3], [srv.x, srv.y, 0.7]], [[sw.x, -3.8, 1.45], [sw.x, -3.8, 3.97]], [[sw.x, -3.8, 3.97], [0, -3.8, 3.97]], [[0, -3.8, 3.97], [0, -0.2, 3.97]], [[0, -0.2, 3.97], [0, -0.2, 3.92]]);
  L.cA = mkLines(cable.A); L.cB = mkLines(cable.B); L.cC = mkLines(cable.C); L.cT = mkLines(cable.T);
})();

/* ---------------------------------------------------------- jalur evakuasi */
const LANE_E = { 'AKiri': -5.3, 'AKanan': -1.9, 'BKiri': -1.9, 'BKanan': 1.9, 'CKiri': 1.9, 'CKanan': 5.5 };
function evacPath(key) {
  const s = S.sets[key], ch = s.KURSI, dir = ch.chairDir;
  if (key === 'GURU') {
    const sx = ch.x, sy = ch.y - dir * 0.20; return [[sx, sy], [sx, 4.38], [-5.0, 4.38], [-5.5, 3.95], [-6.8, 3.95]];
  }
  const sx = ch.x, sy = ch.y + 0.20, cyc = sy - 0.28, bl = key[0], sd = ch.d.sisi, row = ch.d.baris;
  let lx = LANE_E[bl + sd]; if (bl === 'C' && sd === 'Kanan' && row === 5) lx = 1.9; // server menutup lajur kanan baris 5
  const p = [[sx, sy], [sx, cyc], [lx, cyc]];
  if (lx <= -5.2) p.push([lx, 3.65]); else p.push([lx, 2.92], [-5.0, 2.92], [-5.3, 3.65]);
  p.push([-6.8, 3.65]); return p;
}
function pathLen(p) { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l; }
(function () {
  const a = []; Object.keys(S.sets).forEach(k => { const p = evacPath(k); for (let i = 1; i < p.length; i++) a.push([[p[i - 1][0], p[i - 1][1], 0.03], [p[i][0], p[i][1], 0.03]]); });
  L.evac = mkLines(a);
})();

/* --------------------------------------------------------- label overlay */
const labelBox = $('#labels'), labelPool = []; let frameLabels = [];
function pushLabel(text, p, cls) { frameLabels.push({ text, p, cls: cls || '' }); }
function flushLabels(VP, w, h) {
  let n = 0;
  frameLabels.forEach(l => {
    const q = M.proj(VP, l.p); if (q[3] <= 0.1 || Math.abs(q[0]) > 1.1 || Math.abs(q[1]) > 1.1) return;
    let el = labelPool[n]; if (!el) { el = document.createElement('div'); labelBox.appendChild(el); labelPool.push(el); }
    el.className = 'lb ' + l.cls; if (el._t !== l.text) { el.textContent = l.text; el._t = l.text; }
    el.style.display = 'block'; el.style.transform = `translate(${((q[0] * 0.5 + 0.5) * w).toFixed(1)}px,${((1 - (q[1] * 0.5 + 0.5)) * h).toFixed(1)}px) translate(-50%,-50%)`; n++;
  });
  for (let i = n; i < labelPool.length; i++) labelPool[i].style.display = 'none';
  frameLabels = [];
}

/* ------------------------------------------------------------- render */
const EDGE = [0.07, 0.15, 0.2, 0.30], YEL = [1.0, 0.78, 0.1, 1];
let drawList = [], lastVP = null, lastInv = null;
function render(now) {
  const asp = ren.resize(), cw = canvas.clientWidth, ch = canvas.clientHeight;
  const fvy = asp < 1.25 ? Math.min(2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * 1.25 / asp), 2.4) : cam.fov * Math.PI / 180, proj = M.persp(fvy, asp, 0.05, 140), view = M.lookAt(cam.eye, cam.target, [0, 0, 1]), VP = M.mul(proj, view);
  lastVP = VP; lastInv = M.inv(VP);
  ren.begin(VP, cam.eye, state.lamp ? 1.0 : 0.72); ren.useSolid();
  drawList = []; const trans = [], edges = [];
  const eye = cam.eye, selId = state.sel && state.sel.id, hovId = state.hover && state.hover.id;
  ALL.forEach(it => {
    if (!layerOn(it)) return;
    if (it.ceiling && !(eye[2] < R.H - 0.02)) return;
    if (eye[2] > R.H && it.d && /^(LED|PROYEKTOR|AP|CCTV)$/.test(it.d.kat) && it !== state.sel) return; // benda gantung disembunyikan di tampilan atas
    if (it.group === 'orang' && cam.look && eye[2] < 1.9 && Math.hypot(it.x - eye[0], it.y + it.offY - eye[1]) < 0.5) return; // figur milik kamera sendiri
    let wallAlpha = 1; if (it.wall) { const o = it.out, ex = eye[0] * o[0] + eye[1] * o[1]; const lim = (o[0] ? hx : hy); if (ex > lim - 0.02) wallAlpha = 0.09; }
    const IM = itemM(it), sz = it.scaleZ, isSel = it.id === selId, isHov = it.id === hovId, stMode = state.colorMode === 'status' && it.d && it.d.status;
    it.parts.forEach(p => {
      if (p.pose && p.pose !== it.pose) return;
      let L0 = p._L, Sv = p.s;
      if (p.pivot) { const pv = p.pivot, ang = p.anim === 'leafL' ? -state.door.a : state.door.a; L0 = M.mul(M.mul(M.trans(pv[0], pv[1], pv[2]), M.rotZ(ang)), M.mul(M.trans(-pv[0], -pv[1], -pv[2]), L0)); }
      if (sz !== 1) { L0 = M.mul(M.trans(p.p[0], p.p[1], p.p[2] * sz), M.rotZ(p.rz || 0)); Sv = [p.s[0], p.s[1], p.s[2] * sz]; }
      const Mw = M.mul(IM, L0), mc = MC[p.mat] || MC.dinding;
      let rgb = p.col ? hex(p.col) : mc.rgb; if (stMode && !p.alpha && p.mat !== 'aio_layar') rgb = STATUS[stKey(it.d.status)].rgb;
      if (p.dark) rgb = [rgb[0] * p.dark, rgb[1] * p.dark, rgb[2] * p.dark];
      let alpha = (p.alpha != null ? p.alpha : mc.alpha) * wallAlpha;
      let emis = p.emis || null; if (p.led && state.lamp) emis = [0.95, 0.9, 0.7]; else if (p.led) emis = [0.12, 0.11, 0.08];
      const rec = { it, p, Mw, Sv, rgb, alpha, spec: mc.spec, emis, tintA: isSel ? 0.30 : isHov ? 0.16 : 0 };
      if (!p.nopick && wallAlpha === 1 && !it.nopickItem) drawList.push(rec);
      if (alpha < 0.999) trans.push(rec); else { ren.solid(p.sh, Mw, Sv, rgb, alpha, mc.spec, emis, YEL, rec.tintA); if (p.edge && wallAlpha === 1) edges.push([Mw, Sv, isSel ? YEL : EDGE]); }
    });
  });
  // peta clearance (kotak tipis)
  if (state.layers.clear) {
    let bad = 0;
    Object.keys(S.sets).forEach(k => {
      const g = gapInfo(k); if (!g) return; const dk = S.sets[k].MEJA, ch = S.sets[k].KURSI, gap = g.cur_ = (ch.y + ch.offY) - 0.25 - g.nextFront;
      const col = gap >= state.thr ? [0.2, 0.7, 0.4] : gap >= state.thr * 0.7 ? [0.95, 0.65, 0.15] : [0.85, 0.2, 0.2];
      const y0 = g.nextFront, y1 = (ch.y + ch.offY) - 0.25; if (y1 <= y0) return;
      const Mw = M.trans(dk.x, (y0 + y1) / 2, 0.012);
      trans.push({ it: null, p: {}, Mw, Sv: [dk.d.w, y1 - y0, 0.01], rgb: col, alpha: 0.7, spec: 0, emis: [col[0] * 0.15, col[1] * 0.15, col[2] * 0.15], tintA: 0, sh: 'box' });
    });
  }
  // transparan: urut jauh → dekat
  const gl = ren.gl; gl.depthMask(false);
  trans.forEach(r => { r.d2 = (r.Mw[12] - eye[0]) ** 2 + (r.Mw[13] - eye[1]) ** 2 + (r.Mw[14] - eye[2]) ** 2; });
  trans.sort((a, b) => b.d2 - a.d2);
  trans.forEach(r => ren.solid(r.p.sh || r.sh, r.Mw, r.Sv, r.rgb, r.alpha, r.spec, r.emis, YEL, r.tintA));
  gl.depthMask(true);
  // garis
  ren.useLine();
  edges.forEach(e => ren.edgeBox(e[0], e[1], e[2]));
  if (state.sel) state.sel.parts.forEach(p => { if (p.pose && p.pose !== state.sel.pose) return; ren.edgeBox(M.mul(itemM(state.sel), p._L), p.s, YEL); });
  gl.depthMask(false);
  if (state.layers.struktur) ren.lines(L.tile, [0.45, 0.5, 0.54, 0.30]);
  if (state.layers.grid) { ren.lines(L.grid, [0.09, 0.48, 0.52, 0.45]); ren.lines(L.axx, [0.85, 0.25, 0.25, 0.9]); ren.lines(L.axy, [0.25, 0.65, 0.3, 0.9]); }
  if (state.layers.dim) ren.lines(L.dim, [0.08, 0.18, 0.25, 0.9]);
  if (state.layers.evacline || state.evac) { gl.disable(gl.DEPTH_TEST); ren.lines(L.evac, [0.85, 0.3, 0.15, 0.55]); gl.enable(gl.DEPTH_TEST); }
  if (state.layers.kabel) {
    gl.disable(gl.DEPTH_TEST);
    ren.lines(L.cA, [0.1, 0.6, 0.65, 0.85]); ren.lines(L.cB, [0.2, 0.45, 0.85, 0.85]); ren.lines(L.cC, [0.9, 0.55, 0.1, 0.85]); ren.lines(L.cT, [0.55, 0.3, 0.8, 0.9]);
    gl.enable(gl.DEPTH_TEST);
  }
  if (state.layers.ghost) S.ghosts.forEach(g => { const d = g.g; ren.edgeBox(M.mul(M.trans(d.x, d.y, d.zb + d.h / 2), M.rotZ(g.rot)), [d.w, d.d, d.h], [0.85, 0.1, 0.6, 1]); });
  // titik koordinat terpilih
  if (state.sel && state.sel.d && state.sel.d.zb != null) {
    const c = itemCenter(state.sel), d = state.sel.d, x = state.sel.x, y = state.sel.y + state.sel.offY, gl2 = ren.gl;
    const ln = ren.makeLines([x, y, 0, x, y, c[2], x - 0.3, y, 0.01, x + 0.3, y, 0.01, x, y - 0.3, 0.01, x, y + 0.3, 0.01]);
    gl2.disable(gl2.DEPTH_TEST); ren.lines(ln, [0.9, 0.35, 0.05, 1]); gl2.enable(gl2.DEPTH_TEST); gl2.deleteBuffer(ln.b);
  }
  gl.depthMask(true);
  // label
  const inside = Math.abs(eye[0]) < hx && Math.abs(eye[1]) < hy && eye[2] < R.H;
  if (state.layers.dim && !inside) {
    pushLabel('12,00 m', [0, -hy - 0.9, 0.2], 'dim'); pushLabel('10,00 m', [-hx - 1.0, 0, 0.2], 'dim'); pushLabel('4,00 m', [hx + 0.9, -hy - 0.9, R.H / 2], 'dim');
  }
  pushLabel('DEPAN (papan) +Y', [0, hy + 0.5, 0.3], 'zone'); pushLabel('BELAKANG −Y', [0, -hy - 0.5, 0.3], 'zone');
  pushLabel('BLOK A', [-3.8, 3.15, 0.05], 'zone b'); pushLabel('BLOK B', [0, 3.15, 0.05], 'zone b'); pushLabel('BLOK C', [3.8, 3.15, 0.05], 'zone b');
  if (state.layers.grid) { for (let x = -6; x <= 6; x += 2) pushLabel(String(x), [x, -hy - 0.25, 0.01], 'tick'); for (let y = -4; y <= 4; y += 2) pushLabel(String(y), [-hx - 0.3, y, 0.01], 'tick'); pushLabel('0,0,0', [0, 0, 0.05], 'tick o'); }
  if (state.layers.label) S.items.forEach(it => { if (layerOn(it) && it.d && /^(AIO|PROYEKTOR|AC|CCTV|SERVER|SWITCH|AP|MONITOR_CCTV|PANEL_DB|APAR|PINTU|JENDELA|GLASSBOARD)$/.test(it.d.kat)) pushLabel(it.id.replace('RPL-', ''), [it.x, it.y, it.z + (it.d.h || 0) + 0.15], 'id'); });
  if (state.sel && state.sel.d) { const it = state.sel, c = itemCenter(it); pushLabel(it.id, [c[0], c[1], c[2] + (it.d.h || 0.5) / 2 + 0.25], 'sel'); pushLabel(`X ${f2(it.x)} · Y ${f2(it.y + it.offY)} · Z ${f2(it.z)}`, [it.x, it.y + it.offY, 0.04], 'coord'); }
  else if (state.hover && state.hover.d) { const c = itemCenter(state.hover); pushLabel(state.hover.id, [c[0], c[1], c[2] + (state.hover.d.h || 0.5) / 2 + 0.2], 'hov'); }
  frameLabels = frameLabels.filter(l => l.p);
  flushLabels(VP, cw, ch);
}

/* -------------------------------------------------------------- picking */
function rayAt(mx, my) {
  const nx = mx / canvas.clientWidth * 2 - 1, ny = 1 - my / canvas.clientHeight * 2;
  const a = M.proj(lastInv, [nx, ny, -1]), b = M.proj(lastInv, [nx, ny, 1]);
  return { o: [a[0], a[1], a[2]], d: V.norm(V.sub([b[0], b[1], b[2]], [a[0], a[1], a[2]])) };
}
function pick(mx, my) {
  const r = rayAt(mx, my); let best = null, bt = 1e9;
  drawList.forEach(rec => {
    const inv = M.inv(rec.Mw), o = M.pt(inv, r.o), d = M.dir(inv, r.d), S3 = rec.Sv;
    let tmin = -1e9, tmax = 1e9, ok = true;
    for (let i = 0; i < 3; i++) {
      const oi = o[i] / S3[i], di = d[i] / S3[i];
      if (Math.abs(di) < 1e-9) { if (oi < -0.5 || oi > 0.5) { ok = false; break; } } else {
        let t1 = (-0.5 - oi) / di, t2 = (0.5 - oi) / di; if (t1 > t2) { const q = t1; t1 = t2; t2 = q; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) { ok = false; break; }
      }
    }
    if (ok && tmax > 0 && tmin < bt) { bt = tmin > 0 ? tmin : tmax; best = rec.it; }
  });
  return best;
}

/* ------------------------------------------------------------- animasi */
const BUILD_STEP = { lantai: 0, dinding: 1, pintu: 2, jendela: 2, A: 3, B: 4, C: 5, G: 6, papan: 6, kursi: 7, aio: 8, km: 8, jar: 9, plafon: 10, listrik: 10, k3: 11 };
function startBuild() {
  stopAll(); setLayersAll(true); state.layers.orang = false; state.layers.clear = false; state.layers.kabel = false; setLayersUI(); syncFigures(); setDoor(false); state.push.target = 0; $('#btnChair').textContent = 'Dorong kursi ke meja'; state.build = { t: 0, total: 0 };
  ALL.forEach(it => { if (it.group === 'orang') return; it.delay = 0.2 + (BUILD_STEP[it.group] != null ? BUILD_STEP[it.group] : 0) * 0.95 + (it.order || 0) * 0.14; state.build.total = Math.max(state.build.total, it.delay + 0.9); });
  setView('iso'); status('Animasi pembangunan: lantai → dinding → pintu/jendela → blok A/B/C → kursi → perangkat → jaringan → listrik & K3');
}
function updateBuild(dt) {
  const b = state.build; if (!b) return; b.t += dt;
  ALL.forEach(it => {
    if (it.group === 'orang') return; const p = clamp((b.t - it.delay) / 0.8, 0, 1), e = ease(p);
    it.build = p > 0 ? 1 : -1;
    if (it.wall) { it.scaleZ = Math.max(e, 0.001); it.offZ = 0; } else if (it.group === 'lantai') { it.scaleZ = 1; it.offZ = 0; } else { it.scaleZ = 1; it.offZ = (1 - e) * 1.8; }
  });
  if (b.t > b.total + 0.3) { stopBuild(); status('Animasi selesai.'); }
}
function stopBuild() { state.build = null; ALL.forEach(it => { it.build = 0; it.scaleZ = 1; it.offZ = 0; }); }
function toggleDoor() { state.door.target = state.door.target > 0 ? 0 : Math.PI / 2; $('#btnDoor').textContent = state.door.target > 0 ? 'Tutup pintu' : 'Buka pintu'; }
function setDoor(open) { state.door.target = open ? Math.PI / 2 : 0; $('#btnDoor').textContent = open ? 'Tutup pintu' : 'Buka pintu'; }
function toggleChairs() { state.push.target = state.push.target > 0.5 ? 0 : 1; $('#btnChair').textContent = state.push.target > 0.5 ? 'Tarik kursi keluar' : 'Dorong kursi ke meja'; }
function startEvac() {
  stopAll(); state.layers.orang = true; setLayersUI(); setDoor(true); state.push.target = 1; $('#btnChair').textContent = 'Tarik kursi keluar';
  const people = S.figures.map((f, i) => { const path = evacPath(f.setKey); return { f, path, len: pathLen(path), react: 1.2 + ((i * 0.6180339) % 1) * 1.6, done: false }; });
  const mx = Math.max(...people.map(p => p.len));
  state.evac = { t: 0, people, mx, speed: 1.2, sim: parseFloat($('#evSpeed').value), fin: null };
  S.figures.forEach(f => { f.visible = true; f.pose = 'sit'; });
  setView('atas'); $('#hud').style.display = 'block';
}
function updateEvac(dt) {
  const e = state.evac; if (!e) return; e.t += dt * e.sim; let out = 0;
  e.people.forEach(p => {
    const f = p.f, d = (e.t - p.react) * e.speed;
    if (d <= 0) { f.pose = 'sit'; return; }
    f.pose = 'stand';
    if (d >= p.len) { f.visible = false; p.done = true; out++; return; }
    let acc = 0; for (let i = 1; i < p.path.length; i++) {
      const a = p.path[i - 1], b = p.path[i], sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= acc + sl) { const u = (d - acc) / sl; f.x = a[0] + (b[0] - a[0]) * u; f.y = a[1] + (b[1] - a[1]) * u; f.rot = Math.atan2(-(b[0] - a[0]), b[1] - a[1]); break; } acc += sl;
    }
    f.offY = 0; f.z = 0;
  });
  out = e.people.filter(p => p.done).length;
  const tfin = e.mx / e.speed + 2.8;
  $('#hud').innerHTML = `<b>Ilustrasi evakuasi</b> (bukan simulasi kepadatan/teknik)<br>Waktu <b>${e.t.toFixed(1)} s</b> · Keluar <b>${out}/${e.people.length}</b><br>Jalur terpanjang <b>${f2(e.mx)} m</b> · kecepatan jalan 1,2 m/s · tanpa antrean ≈ <b>${f2(tfin)} s</b><br><span>Pintu 1 buah (bukaan 1,80 m); ruang antar-baris dengan kursi: lihat Peta clearance.</span>`;
  if (out === e.people.length && !e.fin) { e.fin = e.t; status(`Semua keluar pada ${e.t.toFixed(1)} s (tanpa antrean).`); }
}
function stopEvac() {
  if (!state.evac) return; state.evac = null; $('#hud').style.display = 'none';
  S.figures.forEach(f => { f.pose = 'sit'; f.x = f.seat.x; f.y = f.seat.y; f.z = 0; f.rot = f.seat.chairDir === 1 ? Math.PI : 0; f.visible = state.layers.orang; });
}
function syncFigures() { if (state.evac) return; S.figures.forEach(f => { f.x = f.seat.x; f.y = f.seat.y; f.offY = f.seat.offY; f.visible = state.layers.orang; }); }
const TOUR = [
  { v: { eye: [-13.5, -15.5, 11.5], target: [0, 0.3, 0.8], fov: 42, look: false }, dur: 2.2, hold: 2.4, cap: 'Gambaran umum: ruang 12 × 10 × 4 m, 3 blok (A/B/C) × 5 baris × 2 sisi + meja guru.' },
  { v: { eye: [0, -1.2, 19.5], target: [0, 0, 0], fov: 42, look: false }, dur: 2, hold: 2.4, cap: 'Denah atas: lorong antar blok 1,38 m; jarak bersih meja ke meja antar baris 0,75 m.' },
  { v: { eye: [-2.6, 0.6, 1.7], target: [-6, 3.65, 1.0], fov: 62, look: true }, dur: 2.4, hold: 2.8, cap: 'Pintu dua daun (bukaan 1,80 m) di dinding kiri-depan – satu-satunya jalur keluar. APAR di sampingnya.', act: () => setDoor(true) },
  { v: { eye: [3.4, -0.5, 1.9], target: [0, 4.86, 1.8], fov: 62, look: true }, dur: 2.4, hold: 2.8, cap: 'Papan kaca 2,40 × 1,20 m dan proyektor plafon (y = 2,10 m menurut Excel).', act: () => setDoor(false) },
  { v: { eye: [-0.2, -4.6, 2.3], target: [-3.8, 1.0, 0.8], fov: 60, look: true }, dur: 2.4, hold: 2.8, cap: 'Blok A: meja HPL 1,12 × 0,70 m + AIO + keyboard/mouse + kursi (ditarik).' },
  { v: { eye: [2.6, -1.4, 2.2], target: [5.6, -4.3, 1.0], fov: 60, look: true }, dur: 2.4, hold: 2.8, cap: 'Sudut teknis kanan-belakang: server, switch 1+2, panel DB, monitor CCTV – padat dan dekat meja C-05-R.' },
  { v: { eye: [-1.8, 0.2, 2.5], target: [-5.8, 2.2, 2.9], fov: 60, look: true }, dur: 2.4, hold: 2.8, cap: 'Dinding kiri: AC-01 tepat di atas kabinet APAR – perlu ditinjau (drain/risiko).' },
  { v: { eye: [-13.5, -15.5, 11.5], target: [0, 0.3, 0.8], fov: 42, look: false }, dur: 2.2, hold: 1.5, cap: 'Selesai. Klik objek mana pun untuk melihat koordinat, dimensi, dan materialnya.' },
];
function startTour() { stopAll(); state.tour = { i: -1, phase: 'idle', t: 0 }; nextTour(); }
function nextTour() {
  const T = state.tour; if (!T) return; T.i++; if (T.i >= TOUR.length) { stopTour(); return; }
  const w = TOUR[T.i]; if (w.act) w.act(); tweenTo(w.v, w.dur); T.phase = 'move'; T.t = 0; $('#caption').textContent = w.cap; $('#caption').style.display = 'block';
}
function updateTour(dt) { const T = state.tour; if (!T) return; T.t += dt; const w = TOUR[T.i]; if (T.phase === 'move' && !tween) { T.phase = 'hold'; T.t = 0; } else if (T.phase === 'hold' && T.t > w.hold) nextTour(); }
function stopTour(keepCap) { if (!state.tour) return; state.tour = null; $('#caption').style.display = 'none'; }
function stopAll() { stopTour(); stopBuild(); stopEvac(); }
function status(t) { const e = $('#status'); e.textContent = t; e.style.opacity = 1; clearTimeout(status._t); status._t = setTimeout(() => e.style.opacity = 0, 6000); }

/* ---------------------------------------------------------- loop & input */
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1); last = now;
  if (tween) { const p = clamp((now - tween.t0) / tween.dur, 0, 1), e = ease(p); cam.eye = V.lerp(tween.from.eye, tween.to.eye, e); cam.target = V.lerp(tween.from.target, tween.to.target, e); cam.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e; if (p >= 1) { const cb = tween.onEnd; tween = null; if (cb) cb(); } }
  const dd = state.door.target - state.door.a; state.door.a += Math.sign(dd) * Math.min(Math.abs(dd), dt * 1.6);
  const pd = state.push.target - state.push.v; state.push.v += Math.sign(pd) * Math.min(Math.abs(pd), dt * 0.9);
  S.items.forEach(it => { if (it.chairDir) it.offY = -it.chairDir * 0.20 * state.push.v; });
  updateBuild(dt); updateTour(dt); syncFigures(); updateEvac(dt);
  S.figures.forEach(f => { if (!state.evac) { f.offY = f.seat.offY; f.rot = f.seat.chairDir === 1 ? Math.PI : 0; } });
  // keyboard
  const k = state.keys, mv = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0), st = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), ud = (k.e ? 1 : 0) - (k.q ? 1 : 0);
  if (mv || st || ud) {
    tween = null; const f = V.norm([cam.target[0] - cam.eye[0], cam.target[1] - cam.eye[1], 0]), rt = [f[1], -f[0], 0], sp = 3 * dt;
    const dv = [(f[0] * mv + rt[0] * st) * sp, (f[1] * mv + rt[1] * st) * sp, ud * sp]; cam.eye = V.add(cam.eye, dv); cam.target = V.add(cam.target, dv);
  }
  updateSelInfo();
  render(now); requestAnimationFrame(loop);
}
let drag = null, moved = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, btn: e.button, pan: e.button === 2 || e.button === 1 || e.shiftKey }; moved = 0; pointers.set(e.pointerId, e); });
const pointers = new Map(); let pinch = null;
canvas.addEventListener('pointermove', e => {
  const rect = canvas.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
  if (pointers.size === 2) {
    const [a, b] = Array.from(pointers.values()), dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx = (a.clientX + b.clientX) / 2, cy = (a.clientY + b.clientY) / 2;
    if (pinch) { userZoom((pinch.d - dist) * 2.2); userPan(cx - pinch.cx, cy - pinch.cy); } pinch = { d: dist, cx, cy }; moved = 99; return;
  }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    if (moved > 4) { if (drag.pan) userPan(dx, dy); else userRotate(dx, dy); }
  } else { const h = pick(mx, my); if (h !== state.hover) { state.hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; } }
});
canvas.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
  if (drag && moved <= 4) { const rect = canvas.getBoundingClientRect(); select(pick(e.clientX - rect.left, e.clientY - rect.top)); }
  drag = null;
});
canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); userZoom(e.deltaY); }, { passive: false });
window.addEventListener('keydown', e => { if (/input|select|textarea/i.test(e.target.tagName)) return; state.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape') { select(null); closeModal(); } });
window.addEventListener('keyup', e => { state.keys[e.key.toLowerCase()] = false; });

/* ------------------------------------------------------------------ UI */
function setLayersAll(v) { ['struktur', 'furnitur', 'perangkat', 'jaringan', 'listrik', 'k3'].forEach(k => state.layers[k] = v); setLayersUI(); }
function setLayersUI() { $$('#layers input').forEach(i => i.checked = !!state.layers[i.dataset.l]); }
const LAYERS = [['struktur', 'Dinding, lantai, pintu, jendela'], ['plafon', 'Plafon (tampil bila kamera di dalam)'], ['furnitur', 'Meja & kursi'], ['perangkat', 'AIO, keyboard/mouse, papan, proyektor'], ['jaringan', 'Server, switch, access point'],
  ['listrik', 'AC, lampu LED (ilustrasi), panel DB'], ['k3', 'APAR, CCTV, monitor CCTV'], ['orang', 'Figur skala manusia'], ['kabel', 'Kabel jaringan (skematik)'], ['grid', 'Grid & sumbu koordinat (1 m)'], ['dim', 'Dimensi ruang'], ['label', 'Label ID perangkat'],
  ['ghost', 'Posisi menurut drawio (konflik)'], ['clear', 'Peta clearance antar-baris'], ['evacline', 'Jalur evakuasi (ilustrasi)']];
$('#layers').innerHTML = LAYERS.map(([k, t]) => `<label><input type="checkbox" data-l="${k}" ${state.layers[k] ? 'checked' : ''}><span>${t}</span></label>`).join('');
$('#layers').addEventListener('change', e => { const l = e.target.dataset.l; if (!l) return; state.layers[l] = e.target.checked; if (l === 'orang') syncFigures(); });
$$('#views button').forEach(b => b.onclick = () => setView(b.dataset.v));
$$('#cmode button').forEach(b => b.onclick = () => { state.colorMode = b.dataset.m; $$('#cmode button').forEach(x => x.classList.toggle('on', x === b)); $('#legend').style.display = b.dataset.m === 'status' ? 'block' : 'none'; });
$('#btnTour').onclick = startTour; $('#btnBuild').onclick = startBuild; $('#btnDoor').onclick = toggleDoor; $('#btnChair').onclick = toggleChairs; $('#btnEvac').onclick = startEvac;
$('#btnStop').onclick = () => { stopAll(); status('Animasi dihentikan.'); };
$('#btnLamp').onclick = () => { state.lamp = !state.lamp; $('#btnLamp').textContent = state.lamp ? 'Matikan lampu' : 'Nyalakan lampu'; };
$('#thr').oninput = e => { state.thr = parseFloat(e.target.value); $('#thrv').textContent = f2(state.thr) + ' m'; updateClearSummary(); };
$('#evSpeed').onchange = () => { if (state.evac) state.evac.sim = parseFloat($('#evSpeed').value); };
$('#toggleSide').onclick = () => $('#side').classList.toggle('open');
$('#legend').innerHTML = Object.values(STATUS).map(s => `<div><i style="background:rgb(${s.rgb.map(v => Math.round(v * 255))})"></i>${s.t}</div>`).join('');

function updateClearSummary() {
  let n = 0, a = 0, b = 0, tot = 0;
  Object.keys(S.sets).forEach(k => { const g = gapInfo(k); if (!g) return; tot++; if (g.pulled < state.thr) a++; if (g.pushed < state.thr) b++; });
  $('#clearSum').innerHTML = `Dari <b>${tot}</b> koridor baris-sisi: <b class="${a ? 'bad' : ''}">${a}</b> di bawah ambang saat kursi ditarik, <b class="${b ? 'bad' : ''}">${b}</b> saat kursi didorong. Jarak bersih meja ke meja = <b>0,75 m</b> (sebelum kursi).`;
}
updateClearSummary();

/* ----------------------------------------------------------- panel info */
function select(it) { state.sel = it && it.d && it.d.kat !== 'DINDING' && it.kat !== 'LANTAI' && it.d.id !== 'LANTAI' ? it : null; renderInfo(); }
function renderInfo() {
  const el = $('#info'), it = state.sel;
  if (!it || !it.d) { el.innerHTML = '<div class="hint"><b>Klik objek</b> di model atau baris di tabel untuk melihat koordinat, dimensi, material, dan status verifikasinya.<br><br>Seret = putar · Shift/klik-kanan + seret = geser · Roda = zoom · WASD = jalan.</div>'; el.classList.remove('has'); return; }
  const d = it.d, m = D.materials, mats = [...new Set(it.parts.map(p => p.mat))].filter(k => m[k] && !['bracket', 'orang'].includes(k) || k === 'bracket').slice(0, 8);
  const st = STATUS[stKey(d.status)];
  const sw = k => `<div class="mrow"><i style="background:${m[k].hex}"></i><span><b>${esc(m[k].komponen)}</b> – ${esc(m[k].bahan)}${m[k].finishing !== '-' ? ', ' + esc(m[k].finishing) : ''} <em class="${m[k].sumber.includes('U') && !m[k].sumber.includes('B') ? 'u' : ''}">[${esc(m[k].sumber)}]</em></span></div>`;
  let sibl = '';
  if (it.setKey && S.sets[it.setKey]) sibl = '<div class="chips">' + ['MEJA', 'AIO', 'KM', 'KURSI'].map(k => S.sets[it.setKey][k]).filter(Boolean).map(x => `<button data-id="${x.id}" class="${x === it ? 'on' : ''}">${x.d.kat}</button>`).join('') + '</div>';
  let gap = ''; if (it.setKey) { const g = gapInfo(it.setKey); if (g) gap = `<h4>Clearance koridor belakang kursi</h4><div class="kv"><span>Kursi ditarik</span><b class="${g.pulled < state.thr ? 'bad' : 'ok'}">${f2(g.pulled)} m</b><span>Kursi didorong</span><b class="${g.pushed < state.thr ? 'bad' : 'ok'}">${f2(g.pushed)} m</b><span>Meja ke meja</span><b>${f2(g.deskGap)} m</b><span>Ambang (asumsi)</span><b>${f2(state.thr)} m</b></div><p class="note">${g.last ? 'Baris terakhir: dihitung ke dinding belakang. ' : ''}Dimensi kursi adalah asumsi (HOLD-01).</p>`; }
  el.classList.add('has');
  el.innerHTML = `<div class="ihead"><div><small>${esc(d.kat)}${d.blok ? ' · Blok ' + esc(d.blok) : ''}${d.baris ? ' · Baris ' + d.baris : ''}${d.sisi ? ' · ' + esc(d.sisi) : ''}</small><h3>${esc(d.id)}</h3></div><button id="closeInfo" title="Tutup">×</button></div>
  <div class="badge" style="background:rgb(${st.rgb.map(v => Math.round(v * 255))})">${esc(st.t)} · ${esc(d.status)}</div>${sibl}
  <h4>Koordinat model (m)</h4><div class="kv"><span>X</span><b>${f2(it.x)}</b><span>Y</span><b>${f2(it.y + it.offY)}</b><span>Z dasar</span><b>${f2(d.zb)}</b><span>Z atas</span><b>${f2(d.zt)}</b><span>Rotasi</span><b>${Math.round(d.rot)}°</b><span>L × D × T</span><b>${f2(d.w)} × ${f2(d.d)} × ${f2(d.h)}</b></div>
  ${d.x_excel != null ? `<p class="note">Titik Excel: X ${f2(d.x_excel)}, Y ${f2(d.y_excel)}</p>` : ''}
  <h4>Material</h4>${esc(d.material || '')}${mats.map(sw).join('')}
  ${d.spec ? `<h4>Spesifikasi</h4><p>${esc(d.spec)}</p>` : ''}
  <h4>Sumber & catatan</h4><p><b>XY:</b> ${esc(d.src_xy || '-')}<br><b>Dimensi:</b> ${esc(d.src_dim || '-')}</p>${d.catatan ? `<p class="note">${esc(d.catatan)}</p>` : ''}${gap}
  <div class="row"><button id="infoFly">Fokus kamera</button></div>`;
  $('#closeInfo').onclick = () => select(null); $('#infoFly').onclick = () => flyTo(it);
  el.querySelectorAll('.chips button').forEach(b => b.onclick = () => { select(S.byId[b.dataset.id]); });
}
function updateSelInfo() { /* nilai kursi berubah saat animasi: refresh ringan */ if (state.sel && state.sel.chairDir && (state.push.v > 0 && state.push.v < 1)) { const i = $('#info .kv'); if (i) { const y = [...$('#info').querySelectorAll('.kv b')][1]; if (y) y.textContent = f2(state.sel.y + state.sel.offY); } } }
renderInfo();

/* ---------------------------------------------------------------- modal */
const modal = $('#modal');
function openModal(tab) { modal.style.display = 'flex'; $$('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab)); renderModal(tab); }
function closeModal() { modal.style.display = 'none'; }
$('#mclose').onclick = closeModal; modal.addEventListener('pointerdown', e => { if (e.target === modal) closeModal(); });
$$('#mtabs button').forEach(b => b.onclick = () => openModal(b.dataset.t)); $$('[data-open]').forEach(b => b.onclick = () => openModal(b.dataset.open));
let tblFilter = { q: '', k: '' };
function renderModal(t) {
  const c = $('#mbody');
  if (t === 'koor') {
    const cats = [...new Set(D.items.map(i => i.kat))];
    c.innerHTML = `<div class="tools"><input id="tq" placeholder="Cari ID / blok / lokasi…" value="${esc(tblFilter.q)}"><select id="tk"><option value="">Semua kategori</option>${cats.map(k => `<option ${tblFilter.k === k ? 'selected' : ''}>${k}</option>`).join('')}</select><button id="csv">Unduh CSV</button><button id="json">Unduh JSON</button></div>
    <p class="note">Sistem: asal (0,0,0) di tengah lantai · +X kanan · +Y ke papan · +Z atas · satuan meter. X/Y = pusat tapak; Z dasar = elevasi bawah objek. Klik baris untuk fokus kamera.</p><div class="tw"><table><thead><tr><th>ID</th><th>Kategori</th><th>Lokasi</th><th>X</th><th>Y</th><th>Z dasar</th><th>Z atas</th><th>L×D×T</th><th>Status</th></tr></thead><tbody id="tb"></tbody></table></div><div id="tcount" class="note"></div>`;
    const fill = () => {
      const q = tblFilter.q.toLowerCase(), rows = D.items.filter(i => (!tblFilter.k || i.kat === tblFilter.k) && (!q || (i.id + ' ' + i.kat + ' ' + (i.lokasi || '') + ' ' + (i.blok || '')).toLowerCase().includes(q)));
      $('#tb').innerHTML = rows.map(i => `<tr data-id="${i.id}"><td>${esc(i.id)}</td><td>${i.kat}</td><td>${esc(i.lokasi || '')}</td><td>${f2(i.x)}</td><td>${f2(i.y)}</td><td>${f2(i.zb)}</td><td>${f2(i.zt)}</td><td>${f2(i.w)}×${f2(i.d)}×${f2(i.h)}</td><td><i class="dot" style="background:rgb(${STATUS[stKey(i.status)].rgb.map(v => Math.round(v * 255))})"></i>${i.status}</td></tr>`).join('');
      $('#tcount').textContent = rows.length + ' dari ' + D.items.length + ' baris (134 aset baseline + 12 elemen ruang/tambahan).';
      $('#tb').querySelectorAll('tr').forEach(r => r.onclick = () => { closeModal(); const it = S.byId[r.dataset.id]; select(it); flyTo(it); });
    };
    fill(); $('#tq').oninput = e => { tblFilter.q = e.target.value; fill(); }; $('#tk').onchange = e => { tblFilter.k = e.target.value; fill(); };
    $('#csv').onclick = () => download('koordinat_perangkat.csv', toCSV(), 'text/csv'); $('#json').onclick = () => download('lab.json', JSON.stringify(D, null, 1), 'application/json');
  } else if (t === 'mat') {
    c.innerHTML = `<p class="note"><b>[B]</b> = disebut di dokumen sumber (Excel/drawio) · <b>[U]</b> = usulan saya, belum ditetapkan sekolah/vendor · <b>[B+U]</b> = jenis dari sumber, spesifikasi/warna usulan.</p><div class="tw"><table><thead><tr><th>Warna</th><th>Komponen</th><th>Bahan</th><th>Finishing</th><th>Status</th><th>Dasar</th></tr></thead><tbody>${Object.entries(D.materials).map(([k, m]) => `<tr><td><i class="sw" style="background:${m.hex}"></i></td><td>${esc(m.komponen)}</td><td>${esc(m.bahan)}</td><td>${esc(m.finishing)}</td><td><span class="tag ${m.sumber === 'U' ? 'u' : m.sumber === 'B' ? 'b' : 'bu'}">${esc(m.sumber)}</span></td><td>${esc(m.dasar)}</td></tr>`).join('')}</tbody></table></div><div class="tools"><button id="mcsv">Unduh material.csv</button></div>`;
    $('#mcsv').onclick = () => download('material.csv', matCSV(), 'text/csv');
  } else if (t === 'audit') {
    c.innerHTML = `<h4>Konflik antara drawio dan Excel</h4><div class="tw"><table><thead><tr><th>Item</th><th>Excel</th><th>Drawio</th><th>Dampak</th></tr></thead><tbody>${D.conflicts.map(x => `<tr><td>${esc(x.item)}</td><td>${esc(x.excel)}</td><td>${esc(x.drawio)}</td><td>${esc(x.dampak)}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">Aktifkan layer "Posisi menurut drawio" untuk melihat kotak magenta posisi versi drawio. Model memakai Excel sebagai acuan.</p>
    <h4>Pemeriksaan geometri otomatis</h4><p>Tabrakan 3D antar objek (kotak pembatas): <b>${D.collisions.length}</b>. Jarak terdekat yang perlu diperhatikan:</p><ul>${D.checks.map(x => `<li>${esc(x.teks)}: <b>${f2(x.jarak)} m</b></li>`).join('')}</ul>
    <p class="note">Kursi dihitung ditarik 0,60 m dari pusat meja (asumsi). Pemeriksaan memakai dimensi Excel + asumsi di tab Koordinat, bukan hasil ukur lapangan.</p>
    <h4>Data yang belum ada (diisi asumsi di model)</h4><ul>${D.missing.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Engineering hold (dari Register_Keputusan)</h4><div class="tw"><table><thead><tr><th>ID</th><th>Isu</th><th>Bukti penutupan</th><th>Status</th></tr></thead><tbody>${D.holds.map(x => `<tr><td>${esc(x.id)}</td><td>${esc(x.isu)}</td><td>${esc(x.bukti)}</td><td>${esc(x.status)}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    c.innerHTML = `<h4>Tentang model</h4><p>Model 3D konseptual Laboratorium RPL SMKN 3 Metro, dibangun otomatis dari <code>KE6_Manajemen_Lab_RPL_KANONIS_V2.xlsx</code> (sheet Device, Koordinat_3D, BoQ, Register_Keputusan) dan <code>KE1235_Drawio_KANONIS_V2.drawio</code>.</p>
    <p><b>Bukan gambar konstruksi.</b> Sesuai dokumen sumber, dimensi furnitur, pintu/jendela, dan semua status HOLD masih perlu survei lapangan. Objek bertanda U/V adalah asumsi.</p>
    <h4>Kontrol</h4><ul><li>Seret: putar · Shift atau klik-kanan + seret: geser · Roda/pinch: zoom</li><li>W A S D / panah: bergerak · Q/E: turun/naik · Esc: batal pilih</li><li>Preset "Pandangan siswa/guru/pintu": mode lihat-sekeliling (seret untuk menoleh, roda untuk zoom)</li></ul>
    <h4>Memperbarui data</h4><p>Ubah Excel, lalu jalankan <code>python3 tools/build_data.py file.xlsx</code> untuk membuat ulang <code>js/data.js</code> dan CSV.</p>`;
  }
}
function toCSV() {
  const cols = ['id', 'kat', 'blok', 'baris', 'sisi', 'x_excel', 'y_excel', 'x', 'y', 'zb', 'zt', 'rot', 'w', 'd', 'h', 'material', 'status', 'src_xy', 'src_dim', 'catatan'];
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿ID,Kategori,Blok,Baris,Sisi,X_titik_Excel_m,Y_titik_Excel_m,X_model_m,Y_model_m,Z_dasar_m,Z_atas_m,Rotasi_deg,Lebar_m,Dalam_m,Tinggi_m,Material,Status,Sumber_XY,Sumber_dimensi,Catatan\n' + D.items.map(i => cols.map(c => q(i[c])).join(',')).join('\n');
}
function matCSV() { const q = v => '"' + String(v).replace(/"/g, '""') + '"'; return '﻿Kode,Komponen,Bahan,Finishing,Warna_hex,Status,Dasar\n' + Object.entries(D.materials).map(([k, m]) => [k, m.komponen, m.bahan, m.finishing, m.hex, m.sumber, m.dasar].map(q).join(',')).join('\n'); }
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

/* ----------------------------------------------------------------- start */
window.LAB3D = { state, cam, setView, select, startTour, startBuild, startEvac, toggleDoor, toggleChairs, stopAll, S, D, flyTo, tweenTo, PRESETS, openModal, gapInfo, TOUR, nextTour };
$('#loading').style.display = 'none'; canvas.style.cursor = 'grab';
requestAnimationFrame(t => { last = t; loop(t); });
})();
