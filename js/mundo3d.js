const DEG = Math.PI / 180;

export const PRIMITIVA = Object.freeze({
  CAJA: "caja",
  CILINDRO: "cilindro",
  CONO: "cono",
  ESFERA: "esfera",
  PIRAMIDE: "piramide",
  SALCHICHA: "salchicha",
});

export const PRIMITIVAS_FORMAS = Object.freeze([
  PRIMITIVA.CAJA, PRIMITIVA.CILINDRO, PRIMITIVA.CONO, PRIMITIVA.ESFERA, PRIMITIVA.PIRAMIDE,
]);

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function v3(x, y, z) { return { x, y, z }; }
function add(a, b) { return v3(a.x + b.x, a.y + b.y, a.z + b.z); }
function sub(a, b) { return v3(a.x - b.x, a.y - b.y, a.z - b.z); }
function mul(a, s) { return v3(a.x * s, a.y * s, a.z * s); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) { return v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
function len(a) { return Math.hypot(a.x, a.y, a.z); }
function norm(a) { const L = len(a) || 1; return mul(a, 1 / L); }
function mix(a, b, t) { return add(mul(a, 1 - t), mul(b, t)); }
function entre(rng, a, b) { return a + (b - a) * rng(); }
function elegir(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

function rotY(p, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return v3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
}

function basisFromAxis(axis) {
  const f = norm(axis);
  const auxiliar = Math.abs(f.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  const r = norm(cross(auxiliar, f));
  const u = cross(f, r);
  return { f, r, u };
}

export function crearCamara(w, h, rng = Math.random) {
  const yaw = entre(rng, -14, 14) * DEG;
  const pitch = entre(rng, -8, -3) * DEG;
  const dist = entre(rng, 3.2, 3.8);
  const sceneYaw = entre(rng, -32, 32) * DEG;
  const eye = add(v3(0, 1.2, 0), rotY(v3(0, 0, dist), yaw));
  eye.y = 1.2 + Math.sin(pitch) * 0.35;
  const target = v3(0, 0.45, 0);
  const fov = 42 * DEG;
  const forward = norm(sub(target, eye));
  const right = norm(cross(forward, v3(0, 1, 0)));
  const up = cross(right, forward);
  const foc = (h * 0.5) / Math.tan(fov * 0.5);
  return { eye, target, forward, right, up, foc, w, h, yaw, pitch, sceneYaw };
}

export function proyectar(cam, p) {
  const d = sub(p, cam.eye);
  const z = dot(d, cam.forward);
  if (!(z > 0.05)) return { x: cam.w * 0.5, y: cam.h * 0.5, z, visible: false };
  const x = dot(d, cam.right);
  const y = dot(d, cam.up);
  return {
    x: cam.w * 0.5 + (x / z) * cam.foc,
    y: cam.h * 0.5 - (y / z) * cam.foc,
    z,
    visible: true,
  };
}

function proyectarPoly(cam, pts) {
  return pts.map((p) => {
    const s = proyectar(cam, p);
    return { x: s.x, y: s.y, z: s.z };
  });
}

function enCampo(pts, w, h, margen = 0.06) {
  const mx = w * margen, my = h * margen;
  return pts.every((p) => p.x >= mx && p.x <= w - mx && p.y >= my && p.y <= h - my);
}

function bboxSpan(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
}

function horizonteDeCamara(cam) {
  const far = add(cam.eye, mul(cam.forward, 80));
  const left = add(far, mul(cam.right, -40));
  const right = add(far, mul(cam.right, 40));
  const a = proyectar(cam, left);
  const b = proyectar(cam, right);
  const y = (a.y + b.y) * 0.5;
  return { y, a: { x: a.x, y }, b: { x: b.x, y } };
}

function vanishingPoints(cam) {
  const yaw = cam.sceneYaw || 0;
  const dirX = rotY(v3(1, 0, 0), yaw);
  const dirZ = rotY(v3(0, 0, 1), yaw);
  function vpFromDir(dir) {
    const d = norm(dir);
    const z = dot(d, cam.forward);
    if (Math.abs(z) < 1e-6) return { x: cam.w * (d.x > 0 ? 2 : -1), y: cam.h * 0.5 };
    const x = dot(d, cam.right);
    const y = dot(d, cam.up);
    return {
      x: cam.w * 0.5 + (x / z) * cam.foc,
      y: cam.h * 0.5 - (y / z) * cam.foc,
    };
  }
  const vp1 = vpFromDir(dirX);
  const vp2 = vpFromDir(dirZ);
  const horizonte = (vp1.y + vp2.y) * 0.5;
  vp1.y = horizonte;
  vp2.y = horizonte;
  return { vp1, vp2, horizonte };
}

function boxCorners(c, sx, sy, sz, yaw) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const local = [
    v3(-hx, -hy, -hz), v3(hx, -hy, -hz), v3(hx, -hy, hz), v3(-hx, -hy, hz),
    v3(-hx, hy, -hz), v3(hx, hy, -hz), v3(hx, hy, hz), v3(-hx, hy, hz),
  ];
  return local.map((p) => add(c, rotY(p, yaw)));
}

function boxEdges() {
  return [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
}

function circle3(center, axis, radius, n = 48) {
  const { r, u } = basisFromAxis(axis);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(add(center, add(mul(r, Math.cos(a) * radius), mul(u, Math.sin(a) * radius))));
  }
  return out;
}

function distPointSegment(p, a, b) {
  const ab = sub(b, a);
  const t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1);
  const q = add(a, mul(ab, t));
  return { d: len(sub(p, q)), q, t };
}

function distPointCapsule(p, a, b, radius) {
  return distPointSegment(p, a, b).d - radius;
}

function distPointBox(p, c, sx, sy, sz, yaw) {
  const q = rotY(sub(p, c), -yaw);
  const dx = Math.max(Math.abs(q.x) - sx / 2, 0);
  const dy = Math.max(Math.abs(q.y) - sy / 2, 0);
  const dz = Math.max(Math.abs(q.z) - sz / 2, 0);
  const outside = Math.hypot(dx, dy, dz);
  if (outside > 0) return outside;
  const inside = Math.min(sx / 2 - Math.abs(q.x), sy / 2 - Math.abs(q.y), sz / 2 - Math.abs(q.z));
  return -inside;
}

function distPointSphere(p, c, r) { return len(sub(p, c)) - r; }

function distPointCylinder(p, c, axis, r, h) {
  const { f } = basisFromAxis(axis);
  const d = sub(p, c);
  const t = clamp(dot(d, f), -h / 2, h / 2);
  const axisPt = add(c, mul(f, t));
  const radial = len(sub(p, axisPt)) - r;
  const axial = Math.abs(dot(d, f)) - h / 2;
  if (axial > 0 && radial > 0) return Math.hypot(radial, axial);
  if (axial > 0) return axial;
  return radial;
}

function distPointCone(p, apex, axis, rBase, h) {
  const { f } = basisFromAxis(axis);
  const base = add(apex, mul(f, h));
  const d = sub(p, apex);
  const t = clamp(dot(d, f), 0, h);
  const along = add(apex, mul(f, t));
  const rad = rBase * (t / (h || 1));
  return len(sub(p, along)) - rad;
}

function distPointPyramid(p, c, sx, sy, sz, yaw) {
  const apex = add(c, rotY(v3(0, sy / 2, 0), yaw));
  const base = [
    add(c, rotY(v3(-sx / 2, -sy / 2, -sz / 2), yaw)),
    add(c, rotY(v3(sx / 2, -sy / 2, -sz / 2), yaw)),
    add(c, rotY(v3(sx / 2, -sy / 2, sz / 2), yaw)),
    add(c, rotY(v3(-sx / 2, -sy / 2, sz / 2), yaw)),
  ];
  let best = Infinity;
  for (const b of base) best = Math.min(best, len(sub(p, mix(apex, b, 0.5))) - Math.min(sx, sz) * 0.15);
  return best;
}

function distToForm(p, form) {
  if (form.tipo === PRIMITIVA.CAJA) return distPointBox(p, form.c, form.sx, form.sy, form.sz, form.yaw);
  if (form.tipo === PRIMITIVA.ESFERA) return distPointSphere(p, form.c, form.r);
  if (form.tipo === PRIMITIVA.CILINDRO) return distPointCylinder(p, form.c, form.axis, form.r, form.h);
  if (form.tipo === PRIMITIVA.CONO) return distPointCone(p, form.apex, form.axis, form.r, form.h);
  if (form.tipo === PRIMITIVA.SALCHICHA) return distPointCapsule(p, form.a, form.b, form.r);
  if (form.tipo === PRIMITIVA.PIRAMIDE) return distPointPyramid(p, form.c, form.sx, form.sy, form.sz, form.yaw);
  return 99;
}

function sampleSurface(form, n = 900) {
  const pts = [];
  if (form.tipo === PRIMITIVA.CAJA) {
    const corners = boxCorners(form.c, form.sx, form.sy, form.sz, form.yaw);
    for (const [i, j] of boxEdges()) {
      for (let k = 0; k <= 12; k++) pts.push(mix(corners[i], corners[j], k / 12));
    }
    for (let i = 0; i < 120; i++) {
      const u = Math.random(), v = Math.random();
      const face = i % 6;
      let local;
      if (face === 0) local = v3((u - 0.5) * form.sx, (v - 0.5) * form.sy, form.sz / 2);
      else if (face === 1) local = v3((u - 0.5) * form.sx, (v - 0.5) * form.sy, -form.sz / 2);
      else if (face === 2) local = v3(form.sx / 2, (u - 0.5) * form.sy, (v - 0.5) * form.sz);
      else if (face === 3) local = v3(-form.sx / 2, (u - 0.5) * form.sy, (v - 0.5) * form.sz);
      else if (face === 4) local = v3((u - 0.5) * form.sx, form.sy / 2, (v - 0.5) * form.sz);
      else local = v3((u - 0.5) * form.sx, -form.sy / 2, (v - 0.5) * form.sz);
      pts.push(add(form.c, rotY(local, form.yaw)));
    }
  } else if (form.tipo === PRIMITIVA.ESFERA) {
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      pts.push(add(form.c, v3(
        form.r * Math.sin(phi) * Math.cos(theta),
        form.r * Math.cos(phi),
        form.r * Math.sin(phi) * Math.sin(theta),
      )));
    }
  } else if (form.tipo === PRIMITIVA.CILINDRO) {
    const { f } = basisFromAxis(form.axis);
    for (let i = 0; i < n; i++) {
      const t = (i / n) * form.h - form.h / 2;
      const a = Math.random() * Math.PI * 2;
      const ring = circle3(add(form.c, mul(f, t)), form.axis, form.r, 1);
      const b = basisFromAxis(form.axis);
      pts.push(add(add(form.c, mul(f, t)), add(mul(b.r, Math.cos(a) * form.r), mul(b.u, Math.sin(a) * form.r))));
    }
    pts.push(...circle3(add(form.c, mul(f, -form.h / 2)), form.axis, form.r, 36));
    pts.push(...circle3(add(form.c, mul(f, form.h / 2)), form.axis, form.r, 36));
  } else if (form.tipo === PRIMITIVA.CONO) {
    const { f } = basisFromAxis(form.axis);
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const rad = form.r * t;
      const along = add(form.apex, mul(f, t * form.h));
      const b = basisFromAxis(form.axis);
      pts.push(add(along, add(mul(b.r, Math.cos(a) * rad), mul(b.u, Math.sin(a) * rad))));
    }
  } else if (form.tipo === PRIMITIVA.SALCHICHA) {
    for (let i = 0; i < n; i++) {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const c = mix(form.a, form.b, t);
      const axis = sub(form.b, form.a);
      const b = basisFromAxis(axis);
      pts.push(add(c, add(mul(b.r, Math.cos(a) * form.r), mul(b.u, Math.sin(a) * form.r))));
    }
    for (let i = 0; i < 120; i++) {
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const d = v3(form.r * Math.sin(phi) * Math.cos(theta), form.r * Math.cos(phi), form.r * Math.sin(phi) * Math.sin(theta));
      pts.push(add(form.a, d));
      pts.push(add(form.b, d));
    }
  } else if (form.tipo === PRIMITIVA.PIRAMIDE) {
    const apex = add(form.c, rotY(v3(0, form.sy / 2, 0), form.yaw));
    const base = [
      add(form.c, rotY(v3(-form.sx / 2, -form.sy / 2, -form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(form.sx / 2, -form.sy / 2, -form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(form.sx / 2, -form.sy / 2, form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(-form.sx / 2, -form.sy / 2, form.sz / 2), form.yaw)),
    ];
    for (let i = 0; i < 4; i++) {
      for (let k = 0; k <= 10; k++) {
        pts.push(mix(apex, base[i], k / 10));
        pts.push(mix(base[i], base[(i + 1) % 4], k / 10));
      }
    }
    for (let i = 0; i < 200; i++) {
      const face = i % 4;
      const u = Math.random(), v = Math.random() * (1 - u);
      const p = add(add(mul(apex, 1 - u - v), mul(base[face], u)), mul(base[(face + 1) % 4], v));
      pts.push(p);
    }
  }
  return pts;
}

function orderPolyline(pts) {
  if (pts.length < 2) return pts.slice();
  let start = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].x < pts[start].x) start = i;
  const left = pts.slice();
  const out = [left.splice(start, 1)[0]];
  while (left.length) {
    let best = 0, bestD = Infinity;
    const last = out[out.length - 1];
    for (let i = 0; i < left.length; i++) {
      const d = Math.hypot(left[i].x - last.x, left[i].y - last.y, (left[i].z || 0) - (last.z || 0));
      if (d < bestD) { bestD = d; best = i; }
    }
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

function chainScreen(pts, maxGap = 28) {
  if (pts.length < 2) return pts.slice();
  let start = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i].x < pts[start].x) start = i;
  const left = pts.slice();
  const out = [left.splice(start, 1)[0]];
  while (left.length) {
    const last = out[out.length - 1];
    let best = 0, bestD = Infinity;
    for (let i = 0; i < left.length; i++) {
      const d = Math.hypot(left[i].x - last.x, left[i].y - last.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (bestD > maxGap && out.length >= 8) break;
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

function suavizarCadena(pts, pasadas = 2) {
  if (pts.length < 5) return pts.slice();
  let cur = pts.slice();
  for (let n = 0; n < pasadas; n++) {
    const next = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      next.push({
        x: (cur[i - 1].x + cur[i].x * 2 + cur[i + 1].x) * 0.25,
        y: (cur[i - 1].y + cur[i].y * 2 + cur[i + 1].y) * 0.25,
        z: cur[i].z,
      });
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

function quitarOutliers(pts) {
  if (pts.length < 6) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(c.x - b.x, c.y - b.y);
    const ac = Math.hypot(c.x - a.x, c.y - a.y);
    if (ab + bc > ac * 1.85 && ab > 14) continue;
    out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function densificarSpline(pts, porSegmento = 4) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < porSegmento; k++) {
      const t = k / porSegmento;
      const t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: p1.z,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function interseccionFormas(formA, formB, cam, eps = 0.055) {
  const hits = [];
  for (const p of sampleSurface(formA, 2400)) {
    if (Math.abs(distToForm(p, formB)) <= eps) hits.push(p);
  }
  for (const p of sampleSurface(formB, 2400)) {
    if (Math.abs(distToForm(p, formA)) <= eps) hits.push(p);
  }
  if (hits.length < 12) return [];
  const kept = [];
  for (const p of hits) {
    if (kept.every((q) => len(sub(p, q)) > 0.03)) kept.push(p);
    if (kept.length > 100) break;
  }
  const proj = proyectarPoly(cam, kept);
  if (proj.length < 8) return [];
  let chain = chainScreen(proj, Math.max(18, cam.w * 0.065));
  if (chain.length < 8) return [];
  chain = quitarOutliers(chain);
  chain = suavizarCadena(chain, 4);
  chain = densificarSpline(chain, 3);
  chain = suavizarCadena(chain, 2);
  const a = chain[0], b = chain[chain.length - 1];
  if (Math.hypot(a.x - b.x, a.y - b.y) < 24) chain.push({ x: a.x, y: a.y, z: a.z });
  return chain;
}

function formsIntersect(a, b) {
  const samples = sampleSurface(a, 400);
  let min = Infinity;
  for (const p of samples) min = Math.min(min, Math.abs(distToForm(p, b)));
  return min < 0.06;
}

function randomAxis(rng) {
  const yaw = entre(rng, 0, Math.PI * 2);
  const pitch = entre(rng, -0.5, 0.5);
  return norm(v3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)));
}

function slotCentro(slot, total, rng) {
  if (total <= 2) {
    const x = slot === 0 ? entre(rng, -0.35, -0.05) : entre(rng, 0.05, 0.35);
    return v3(x, entre(rng, 0.35, 0.7), entre(rng, -0.2, 0.2));
  }
  const arc = [
    v3(-0.55, 0.42, 0.05),
    v3(-0.12, 0.72, -0.08),
    v3(0.42, 0.55, 0.1),
    v3(0.08, 0.28, -0.05),
  ];
  const base = arc[slot % arc.length];
  return v3(base.x + entre(rng, -0.06, 0.06), base.y + entre(rng, -0.05, 0.05), base.z + entre(rng, -0.06, 0.06));
}

function crearForma(tipo, rng, slot = 0, sceneYaw = 0, total = 2) {
  const base = slotCentro(slot, total, rng);
  if (tipo === PRIMITIVA.CAJA) {
    const s = entre(rng, 0.7, 1.05);
    return { tipo, c: base, sx: s, sy: s * entre(rng, 0.75, 1.05), sz: s * entre(rng, 0.75, 1.05), yaw: sceneYaw, slot };
  }
  if (tipo === PRIMITIVA.ESFERA) {
    return { tipo, c: base, r: entre(rng, 0.38, 0.55), slot };
  }
  if (tipo === PRIMITIVA.CILINDRO) {
    const axis = randomAxis(rng);
    return { tipo, c: base, axis, r: entre(rng, 0.22, 0.34), h: entre(rng, 0.85, 1.25), slot };
  }
  if (tipo === PRIMITIVA.CONO) {
    const axis = randomAxis(rng);
    const h = entre(rng, 0.9, 1.3);
    const apex = add(base, mul(axis, -h * 0.35));
    return { tipo, apex, axis, r: entre(rng, 0.28, 0.42), h, c: base, slot };
  }
  if (tipo === PRIMITIVA.PIRAMIDE) {
    const s = entre(rng, 0.7, 1.05);
    return { tipo, c: base, sx: s, sy: s * entre(rng, 0.85, 1.15), sz: s, yaw: sceneYaw, slot };
  }
  const flat = norm(rotY(v3(entre(rng, 0.6, 1), 0, entre(rng, -0.5, 0.5)), sceneYaw + entre(rng, -0.35, 0.35)));
  const flat2 = norm(v3(flat.x, entre(rng, -0.12, 0.22), flat.z));
  const largo = entre(rng, 1.1, 1.55);
  const r = entre(rng, 0.2, 0.3);
  return { tipo: PRIMITIVA.SALCHICHA, a: add(base, mul(flat2, -largo / 2)), b: add(base, mul(flat2, largo / 2)), r, c: base, slot };
}

function nudgeTogether(a, b) {
  const ca = a.c || mix(a.a || a.apex, a.b || a.apex, 0.5);
  const cb = b.c || mix(b.a || b.apex, b.b || b.apex, 0.5);
  const mid = mix(ca, cb, 0.5);
  function shiftForm(f, target) {
    const cur = f.c || mix(f.a || f.apex, f.b || f.apex, 0.5);
    const d = sub(target, cur);
    if (f.c) f.c = add(f.c, d);
    if (f.a && f.b) { f.a = add(f.a, d); f.b = add(f.b, d); f.c = mix(f.a, f.b, 0.5); }
    if (f.apex) f.apex = add(f.apex, d);
  }
  shiftForm(a, mix(ca, mid, 0.7));
  shiftForm(b, mix(cb, mid, 0.7));
}

function strokesForForm(form, cam, formaIdx = 0) {
  const strokes = [];
  const hintNombre = {
    [PRIMITIVA.CAJA]: "Traza la caja",
    [PRIMITIVA.CILINDRO]: "Traza el cilindro",
    [PRIMITIVA.CONO]: "Traza el cono",
    [PRIMITIVA.ESFERA]: "Traza la esfera",
    [PRIMITIVA.PIRAMIDE]: "Traza la pirámide",
    [PRIMITIVA.SALCHICHA]: "Traza la salchicha",
  };
  if (form.tipo === PRIMITIVA.CAJA) {
    const c = boxCorners(form.c, form.sx, form.sy, form.sz, form.yaw);
    const edges = boxEdges();
    const order = boxEdges();
    let first = true;
    for (const [i, j] of order) {
      const pts = proyectarPoly(cam, [c[i], c[j]]);
      strokes.push({
        tipo: "arista",
        cerrado: false,
        puntos: pts,
        hint: first ? hintNombre[form.tipo] : "Sigue esta arista",
        forma: form.tipo,
      });
      first = false;
    }
  } else if (form.tipo === PRIMITIVA.CILINDRO) {
    const { f } = basisFromAxis(form.axis);
    const a = add(form.c, mul(f, -form.h / 2));
    const b = add(form.c, mul(f, form.h / 2));
    const e0 = proyectarPoly(cam, circle3(a, form.axis, form.r, 48));
    const e1 = proyectarPoly(cam, circle3(b, form.axis, form.r, 48));
    strokes.push({ tipo: "elipse", cerrado: true, puntos: e0, hint: "Elipse cercana del cilindro", forma: form.tipo });
    strokes.push({ tipo: "elipse", cerrado: true, puntos: e1, hint: "Elipse lejana del cilindro", forma: form.tipo });
    const toCam = norm(sub(cam.eye, form.c));
    const side = norm(cross(f, toCam));
    for (const sign of [-1, 1]) {
      const p0 = add(a, mul(side, form.r * sign));
      const p1 = add(b, mul(side, form.r * sign));
      strokes.push({ tipo: "arista", cerrado: false, puntos: proyectarPoly(cam, [p0, p1]), hint: "Une los extremos del cilindro", forma: form.tipo });
    }
  } else if (form.tipo === PRIMITIVA.CONO) {
    const { f } = basisFromAxis(form.axis);
    const base = add(form.apex, mul(f, form.h));
    const el = proyectarPoly(cam, circle3(base, form.axis, form.r, 48));
    strokes.push({ tipo: "elipse", cerrado: true, puntos: el, hint: "Base del cono", forma: form.tipo });
    const toCam = norm(sub(cam.eye, mix(form.apex, base, 0.5)));
    const side = norm(cross(f, toCam));
    for (const sign of [-1, 1]) {
      const p = add(base, mul(side, form.r * sign));
      strokes.push({ tipo: "arista", cerrado: false, puntos: proyectarPoly(cam, [form.apex, p]), hint: "Borde hasta la punta", forma: form.tipo });
    }
  } else if (form.tipo === PRIMITIVA.ESFERA) {
    const toCam = norm(sub(cam.eye, form.c));
    const sil = proyectarPoly(cam, circle3(form.c, toCam, form.r, 56));
    strokes.push({ tipo: "elipse", cerrado: true, puntos: sil, hint: "Contorno de la esfera", forma: form.tipo });
    const eqAxis = Math.abs(toCam.y) < 0.8 ? v3(0, 1, 0) : v3(1, 0, 0);
    const eq = proyectarPoly(cam, circle3(form.c, eqAxis, form.r * 0.92, 48));
    strokes.push({ tipo: "elipse", cerrado: true, puntos: eq, hint: "Ecuador de contorno", forma: form.tipo });
  } else if (form.tipo === PRIMITIVA.PIRAMIDE) {
    const apex = add(form.c, rotY(v3(0, form.sy / 2, 0), form.yaw));
    const base = [
      add(form.c, rotY(v3(-form.sx / 2, -form.sy / 2, -form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(form.sx / 2, -form.sy / 2, -form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(form.sx / 2, -form.sy / 2, form.sz / 2), form.yaw)),
      add(form.c, rotY(v3(-form.sx / 2, -form.sy / 2, form.sz / 2), form.yaw)),
    ];
    let first = true;
    for (let i = 0; i < 4; i++) {
      strokes.push({ tipo: "arista", cerrado: false, puntos: proyectarPoly(cam, [base[i], base[(i + 1) % 4]]), hint: first ? hintNombre[form.tipo] : "Cierra la base", forma: form.tipo });
      first = false;
      strokes.push({ tipo: "arista", cerrado: false, puntos: proyectarPoly(cam, [apex, base[i]]), hint: "Sube a la cúspide", forma: form.tipo });
    }
  } else if (form.tipo === PRIMITIVA.SALCHICHA) {
    const axis = sub(form.b, form.a);
    const bsis = basisFromAxis(axis);
    const toCam = norm(sub(cam.eye, mix(form.a, form.b, 0.5)));
    const side = norm(cross(norm(axis), toCam));
    const upS = norm(cross(side, norm(axis)));
    const n = 24;
    const outline = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      outline.push(add(mix(form.a, form.b, t), mul(side, form.r)));
    }
    for (let i = 0; i <= 16; i++) {
      const a = -Math.PI / 2 + (i / 16) * Math.PI;
      outline.push(add(form.b, add(mul(side, Math.cos(a) * form.r), mul(upS, Math.sin(a) * form.r))));
    }
    for (let i = 0; i <= n; i++) {
      const t = 1 - i / n;
      outline.push(add(mix(form.a, form.b, t), mul(side, -form.r)));
    }
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI / 2 + (i / 16) * Math.PI;
      outline.push(add(form.a, add(mul(side, Math.cos(a) * form.r), mul(upS, Math.sin(a) * form.r))));
    }
    outline.push(outline[0]);
    strokes.push({ tipo: "silueta", cerrado: true, puntos: proyectarPoly(cam, outline), hint: hintNombre[form.tipo], forma: form.tipo });
    for (const t of [0.33, 0.67]) {
      const c = mix(form.a, form.b, t);
      const el = proyectarPoly(cam, circle3(c, axis, form.r, 40));
      strokes.push({ tipo: "contorno", cerrado: true, puntos: el, hint: "Contorno sobre la salchicha", forma: form.tipo });
    }
  }
  return strokes;
}

function allProjectedPoints(strokes) {
  const pts = [];
  for (const s of strokes) for (const p of s.puntos) pts.push(p);
  return pts;
}

function escenaValida(cam, formas, strokes) {
  const pts = allProjectedPoints(strokes);
  if (pts.length < 8) return false;
  if (!enCampo(pts, cam.w, cam.h, 0.04)) return false;
  const box = bboxSpan(pts);
  if (box.w < cam.w * 0.55 || box.h < cam.h * 0.4) return false;
  if (box.w > cam.w * 0.94 || box.h > cam.h * 0.9) return false;
  if (formas.length <= 2) {
    if (formas.length === 2 && !formsIntersect(formas[0], formas[1])) return false;
    return true;
  }
  const linked = new Array(formas.length).fill(false);
  linked[0] = true;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < formas.length; i++) {
      if (!linked[i]) continue;
      for (let j = 0; j < formas.length; j++) {
        if (linked[j]) continue;
        if (formsIntersect(formas[i], formas[j])) { linked[j] = true; changed = true; }
      }
    }
  }
  return linked.every(Boolean);
}

function emparejar(formas, rng) {
  if (formas.length <= 2) {
    if (formas.length === 2 && !formsIntersect(formas[0], formas[1])) nudgeTogether(formas[0], formas[1]);
    return;
  }
  for (let i = 0; i < formas.length - 1; i++) {
    if (!formsIntersect(formas[i], formas[i + 1])) nudgeTogether(formas[i], formas[i + 1]);
  }
}

function encuadrarStrokes(strokes, cam, fill = 0.78) {
  const pts = allProjectedPoints(strokes);
  if (pts.length < 2) return null;
  const box = bboxSpan(pts);
  if (!(box.w > 1 && box.h > 1)) return null;
  const cx = (box.minX + box.maxX) * 0.5;
  const cy = (box.minY + box.maxY) * 0.5;
  const sx = (cam.w * fill) / box.w;
  const sy = (cam.h * fill) / box.h;
  const s = Math.min(sx, sy);
  const tx = cam.w * 0.5;
  const ty = cam.h * 0.52;
  for (const st of strokes) {
    for (const p of st.puntos) {
      p.x = (p.x - cx) * s + tx;
      p.y = (p.y - cy) * s + ty;
    }
  }
  return { cx, cy, s, tx, ty };
}

function aplicarEncuadre(p, xf) {
  if (!p || !xf) return p;
  return { x: (p.x - xf.cx) * xf.s + xf.tx, y: (p.y - xf.cy) * xf.s + xf.ty };
}

function tagStroke(st, formaIdx) {
  st.formaIdx = formaIdx;
  st.necesitaPerspectiva = st.forma === "caja" || st.forma === "piramide";
  return st;
}

export function generarEscena(cam, tipos, rng = Math.random, intentos = 70) {
  for (let n = 0; n < intentos; n++) {
    const formas = tipos.map((t, i) => crearForma(t, rng, i, cam.sceneYaw || 0, tipos.length));
    emparejar(formas, rng);
    let strokes = [];
    for (let i = 0; i < formas.length; i++) {
      for (const s of strokesForForm(formas[i], cam, i)) strokes.push(tagStroke(s, i));
    }
    if (formas.length >= 3 && strokes.length > 16) {
      const keep = [];
      const porForma = {};
      for (const s of strokes) {
        if (s.forma === "caja" && s.tipo === "arista") {
          porForma[s.formaIdx] = (porForma[s.formaIdx] || 0) + 1;
          if (porForma[s.formaIdx] > 8) continue;
        }
        keep.push(s);
      }
      strokes = keep;
    }
    const cortes = [];
    const pares = formas.length <= 2
      ? [[0, 1]]
      : Array.from({ length: formas.length - 1 }, (_, i) => [i, i + 1]);
    for (const [i, j] of pares) {
      if (j >= formas.length) continue;
      const poly = interseccionFormas(formas[i], formas[j], cam);
      if (poly.length >= 8) {
        cortes.push(tagStroke({
          tipo: "interseccion",
          cerrado: false,
          puntos: poly,
          hint: "Línea donde se cruzan",
          forma: "interseccion",
          a: i,
          b: j,
        }, Math.max(i, j)));
      }
    }
    if (!cortes.length) continue;
    const todos = [...strokes, ...cortes];
    const xf = encuadrarStrokes(todos, cam, formas.length >= 3 ? 0.76 : 0.8);
    if (!escenaValida(cam, formas, todos)) continue;
    const vps = vanishingPoints(cam);
    if (xf) {
      vps.vp1 = aplicarEncuadre(vps.vp1, xf);
      vps.vp2 = aplicarEncuadre(vps.vp2, xf);
      vps.horizonte = (vps.vp1.y + vps.vp2.y) * 0.5;
      vps.vp1.y = vps.horizonte;
      vps.vp2.y = vps.horizonte;
    }
    return { formas, strokes: todos, ...vps, cam };
  }
  return null;
}

export function tipificarTorre(modo, rng = Math.random) {
  if (modo === "salchichas") return [PRIMITIVA.SALCHICHA, PRIMITIVA.SALCHICHA];
  if (modo === "formas") {
    let a = elegir(rng, PRIMITIVAS_FORMAS);
    let b = elegir(rng, PRIMITIVAS_FORMAS);
    let guard = 0;
    while (b === a && guard++ < 8) b = elegir(rng, PRIMITIVAS_FORMAS);
    return [a, b];
  }
  if (modo === "mixta") return [PRIMITIVA.SALCHICHA, elegir(rng, PRIMITIVAS_FORMAS)];
  const out = [PRIMITIVA.SALCHICHA, elegir(rng, PRIMITIVAS_FORMAS), elegir(rng, PRIMITIVAS_FORMAS), elegir(rng, [...PRIMITIVAS_FORMAS, PRIMITIVA.SALCHICHA])];
  let guard = 0;
  while (out[1] === out[2] && guard++ < 8) out[2] = elegir(rng, PRIMITIVAS_FORMAS);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

export function seedRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
