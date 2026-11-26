/* Mesin render WebGL minimal (tanpa dependensi). Dunia: Z ke atas, satuan meter. */
(function () {
'use strict';
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const M = {
  id() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  trans(x, y, z) { const m = M.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a), m = M.id(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m;
  },
  lookAt(e, t, up) {
    const z = V.norm(V.sub(e, t)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, e), -V.dot(y, e), -V.dot(z, e), 1]);
  },
  inv(m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
      a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!d) return M.id(); d = 1 / d;
    return new Float32Array([
      (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
      (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
      (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
      (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d]);
  },
  pt(m, p) { // titik (w=1), tanpa pembagian w
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  },
  dir(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]; },
  proj(m, p) { // ke clip → NDC
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [x / w, y / w, z / w, w];
  },
};
function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }

const VS = `attribute vec3 aPos; attribute vec3 aNrm; uniform mat4 uVP; uniform mat4 uM; uniform vec3 uS;
varying vec3 vN; varying vec3 vW;
void main(){ vec4 w=uM*vec4(aPos*uS,1.0); vW=w.xyz; vN=uM[0].xyz*aNrm.x+uM[1].xyz*aNrm.y+uM[2].xyz*aNrm.z; gl_Position=uVP*w; }`;
const FS = `precision mediump float; uniform vec3 uCol; uniform float uAlpha; uniform float uSpec; uniform vec3 uEmis; uniform vec3 uCam;
uniform float uLight; uniform vec3 uTint; uniform float uTintA; varying vec3 vN; varying vec3 vW;
void main(){ vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n; vec3 L=normalize(vec3(0.35,-0.45,0.82)); float d=max(dot(n,L),0.0); float h=n.z*0.5+0.5;
 vec3 amb=mix(vec3(0.46,0.47,0.50),vec3(0.74,0.76,0.79),h); vec3 col=uCol*(amb*uLight+d*0.52*uLight);
 vec3 Vv=normalize(uCam-vW); vec3 H=normalize(L+Vv); col+=vec3(pow(max(dot(n,H),0.0),30.0)*uSpec*0.55);
 col=mix(col,uTint,uTintA); col+=uEmis; gl_FragColor=vec4(col,uAlpha); }`;
const LVS = `attribute vec3 aPos; uniform mat4 uVP; uniform mat4 uM; uniform vec3 uS; void main(){ gl_Position=uVP*(uM*vec4(aPos*uS,1.0)); }`;
const LFS = `precision mediump float; uniform vec4 uLC; void main(){ gl_FragColor=uLC; }`;

function cubeData() {
  const f = [[[1, 0, 0], [[.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [.5, -.5, .5]]], [[-1, 0, 0], [[-.5, .5, -.5], [-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5]]],
    [[0, 1, 0], [[.5, .5, -.5], [-.5, .5, -.5], [-.5, .5, .5], [.5, .5, .5]]], [[0, -1, 0], [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5]]],
    [[0, 0, 1], [[-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]]], [[0, 0, -1], [[-.5, .5, -.5], [.5, .5, -.5], [.5, -.5, -.5], [-.5, -.5, -.5]]]];
  const d = [];
  f.forEach(([n, q]) => { [0, 1, 2, 0, 2, 3].forEach(i => d.push(...q[i], ...n)); });
  return new Float32Array(d);
}
function cylData(seg) {
  const d = [];
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    const p = (c, s, z, nx, ny, nz) => d.push(c * .5, s * .5, z, nx, ny, nz);
    p(c0, s0, -.5, c0, s0, 0); p(c1, s1, -.5, c1, s1, 0); p(c1, s1, .5, c1, s1, 0);
    p(c0, s0, -.5, c0, s0, 0); p(c1, s1, .5, c1, s1, 0); p(c0, s0, .5, c0, s0, 0);
    d.push(0, 0, .5, 0, 0, 1, c0 * .5, s0 * .5, .5, 0, 0, 1, c1 * .5, s1 * .5, .5, 0, 0, 1);
    d.push(0, 0, -.5, 0, 0, -1, c1 * .5, s1 * .5, -.5, 0, 0, -1, c0 * .5, s0 * .5, -.5, 0, 0, -1);
  }
  return new Float32Array(d);
}
const CUBE_EDGES = (() => {
  const c = [[-.5, -.5, -.5], [.5, -.5, -.5], [.5, .5, -.5], [-.5, .5, -.5], [-.5, -.5, .5], [.5, -.5, .5], [.5, .5, .5], [-.5, .5, .5]];
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], d = [];
  e.forEach(([a, b]) => d.push(...c[a], ...c[b])); return new Float32Array(d);
})();

class Renderer {
  constructor(canvas) {
    const gl = this.gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL tidak tersedia');
    this.canvas = canvas;
    const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    this.P = prog(VS, FS); this.L = prog(LVS, LFS);
    const u = (p, names) => { const o = {}; names.forEach(n => o[n] = gl.getUniformLocation(p, n)); return o; };
    this.U = u(this.P, ['uVP', 'uM', 'uS', 'uCol', 'uAlpha', 'uSpec', 'uEmis', 'uCam', 'uLight', 'uTint', 'uTintA']);
    this.UL = u(this.L, ['uVP', 'uM', 'uS', 'uLC']);
    const buf = d => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); return b; };
    const cd = cubeData(), yd = cylData(18);
    this.cube = { b: buf(cd), n: cd.length / 6 }; this.cyl = { b: buf(yd), n: yd.length / 6 }; this.edges = { b: buf(CUBE_EDGES), n: CUBE_EDGES.length / 3 };
    this.IDM = M.id(); this.ONE = [1, 1, 1];
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.bg = [0.87, 0.91, 0.93];
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), c = this.canvas;
    const w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.gl.viewport(0, 0, w, h); return w / h;
  }
  begin(VP, cam, light) {
    const gl = this.gl; this.VP = VP; this.cam = cam; this.light = light;
    gl.clearColor(this.bg[0], this.bg[1], this.bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  }
  useSolid() {
    const gl = this.gl; gl.useProgram(this.P);
    gl.uniformMatrix4fv(this.U.uVP, false, this.VP); gl.uniform3fv(this.U.uCam, this.cam); gl.uniform1f(this.U.uLight, this.light);
  }
  bindMesh(mesh) {
    const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, mesh.b);
    const a = gl.getAttribLocation(this.P, 'aPos'), n = gl.getAttribLocation(this.P, 'aNrm');
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(n); gl.vertexAttribPointer(n, 3, gl.FLOAT, false, 24, 12);
  }
  solid(shape, Mw, S, rgb, alpha, spec, emis, tint, tintA) {
    const gl = this.gl, U = this.U, mesh = shape === 'cyl' ? this.cyl : this.cube;
    if (this._mesh !== mesh) { this.bindMesh(mesh); this._mesh = mesh; }
    gl.uniformMatrix4fv(U.uM, false, Mw); gl.uniform3f(U.uS, S[0], S[1], S[2]);
    gl.uniform3f(U.uCol, rgb[0], rgb[1], rgb[2]); gl.uniform1f(U.uAlpha, alpha); gl.uniform1f(U.uSpec, spec || 0);
    gl.uniform3f(U.uEmis, emis ? emis[0] : 0, emis ? emis[1] : 0, emis ? emis[2] : 0);
    gl.uniform3f(U.uTint, tint ? tint[0] : 0, tint ? tint[1] : 0, tint ? tint[2] : 0); gl.uniform1f(U.uTintA, tintA || 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
  }
  useLine() {
    const gl = this.gl; gl.useProgram(this.L); gl.uniformMatrix4fv(this.UL.uVP, false, this.VP); this._lmesh = null; this._mesh = null;
  }
  edgeBox(Mw, S, rgba) {
    const gl = this.gl; if (this._lmesh !== this.edges) { gl.bindBuffer(gl.ARRAY_BUFFER, this.edges.b); const a = gl.getAttribLocation(this.L, 'aPos'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 12, 0); this._lmesh = this.edges; }
    gl.uniformMatrix4fv(this.UL.uM, false, Mw); gl.uniform3f(this.UL.uS, S[0], S[1], S[2]); gl.uniform4f(this.UL.uLC, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.drawArrays(gl.LINES, 0, this.edges.n);
  }
  makeLines(arr) { const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); return { b, n: arr.length / 3 }; }
  lines(set, rgba) {
    const gl = this.gl; gl.bindBuffer(gl.ARRAY_BUFFER, set.b); const a = gl.getAttribLocation(this.L, 'aPos'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 12, 0); this._lmesh = set;
    gl.uniformMatrix4fv(this.UL.uM, false, this.IDM); gl.uniform3f(this.UL.uS, 1, 1, 1); gl.uniform4f(this.UL.uLC, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.drawArrays(gl.LINES, 0, set.n);
  }
}
window.GL3 = { V, M, hex, Renderer };
})();
