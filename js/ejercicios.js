import { TECNICA, ESCENA_JEFE, ESCENA_JEFE2 } from "./config.js";

const MARGEN = 0.1;
const LINEA_LARGO = Object.freeze([0.5, 0.78]);
const ELIPSE_ANCHO = Object.freeze([0.38, 0.72]);
const ELIPSE_ALTO = Object.freeze([0.32, 0.62]);
const HORIZONTE_ALTO = Object.freeze([0.05, 0.14]);
const FUGA_ANCHO = Object.freeze([0.38, 0.62]);
const CUBO_LADO = Object.freeze([0.3, 0.4]);
const CUBO_FONDO = Object.freeze([0.42, 0.56]);
const CUBO_SEPARACION = 0.12;
const CUBO_BAJO_HORIZONTE = 0.2;
const CUBO_ARISTA_MIN = 0.2;
const CUBO_INTENTOS = 30;
const RESERVA_MAX = 0.4;

function entre(rng, [lo, hi]) {
  return lo + (hi - lo) * rng();
}

export function ejercicioLinea(w, h, rng = Math.random) {
  const corto = Math.min(w, h);
  const largo = entre(rng, LINEA_LARGO) * corto;
  const ang = rng() * Math.PI;
  const dx = (Math.cos(ang) * largo) / 2;
  const dy = (Math.sin(ang) * largo) / 2;
  const mx = w * MARGEN + Math.abs(dx);
  const my = h * MARGEN + Math.abs(dy);
  const cx = mx < w - mx ? mx + rng() * (w - 2 * mx) : w / 2;
  const cy = my < h - my ? my + rng() * (h - 2 * my) : h / 2;
  return { tecnica: TECNICA.LINEA, a: { x: cx - dx, y: cy - dy }, b: { x: cx + dx, y: cy + dy } };
}

export function ejercicioElipse(w, h, rng = Math.random) {
  const cw = entre(rng, ELIPSE_ANCHO) * w;
  const ch = Math.min(entre(rng, ELIPSE_ALTO) * h, cw * 1.4);
  const libreX = w - cw - 2 * w * MARGEN;
  const libreY = h - ch - 2 * h * MARGEN;
  const x = w * MARGEN + Math.max(0, libreX) * rng();
  const y = h * MARGEN + Math.max(0, libreY) * rng();
  return { tecnica: TECNICA.ELIPSE, caja: { x, y, w: cw, h: ch } };
}

function hacia(p, q, f) {
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
}

export function aristasCubo(ej) {
  return ej.visibles.map((i) => ({ esquina: i, desde: ej.frente[i], hasta: ej.fondo[i] }));
}

function cuboAlAzar(w, h, rng) {
  const horizonte = h * entre(rng, HORIZONTE_ALTO);
  const fuga = { x: w * entre(rng, FUGA_ANCHO), y: horizonte };
  const altoLibre = h * (1 - MARGEN) - horizonte - h * CUBO_BAJO_HORIZONTE;
  const sep = w * CUBO_SEPARACION;
  const lado = Math.max(24, Math.min(Math.min(w, h) * entre(rng, CUBO_LADO), altoLibre, Math.max(fuga.x, w - fuga.x) - sep - w * MARGEN));
  const libreIzq = fuga.x - sep - lado - w * MARGEN;
  const libreDer = w * (1 - MARGEN) - lado - fuga.x - sep;
  let izquierda = rng() < 0.5;
  if (izquierda && libreIzq < 0) izquierda = false;
  else if (!izquierda && libreDer < 0) izquierda = true;
  const x = izquierda ? w * MARGEN + Math.max(0, libreIzq) * rng() : fuga.x + sep + Math.max(0, libreDer) * rng();
  const yMin = horizonte + h * CUBO_BAJO_HORIZONTE;
  const yMax = h * (1 - MARGEN) - lado;
  const y = yMax > yMin ? yMin + rng() * (yMax - yMin) : Math.max(horizonte + 12, yMax);
  const frente = [{ x, y }, { x: x + lado, y }, { x: x + lado, y: y + lado }, { x, y: y + lado }];
  const fondoF = entre(rng, CUBO_FONDO);
  const fondo = frente.map((p) => hacia(p, fuga, fondoF));
  const oculta = izquierda ? 3 : 2;
  const visibles = [0, 1, 2, 3].filter((i) => i !== oculta);
  return { tecnica: TECNICA.PERSPECTIVA, fuga, frente, fondo, visibles, hechos: [] };
}

function aristaMinima(ej) {
  return Math.min(...aristasCubo(ej).map((a) => Math.hypot(a.hasta.x - a.desde.x, a.hasta.y - a.desde.y)));
}

export function ejercicioPerspectiva(w, h, rng = Math.random) {
  let mejor = cuboAlAzar(w, h, rng);
  for (let i = 0; i < CUBO_INTENTOS && aristaMinima(mejor) < CUBO_ARISTA_MIN * Math.min(w, h); i++) {
    const otro = cuboAlAzar(w, h, rng);
    if (aristaMinima(otro) > aristaMinima(mejor)) mejor = otro;
  }
  return mejor;
}

function bajar(p, dy) {
  return { ...p, y: p.y + dy };
}

export function desplazarEjercicio(ej, dy) {
  if (!dy) return ej;
  if (ej.tecnica === TECNICA.ELIPSE) return { ...ej, caja: bajar(ej.caja, dy) };
  if (ej.tecnica === TECNICA.PERSPECTIVA) return { ...ej, fuga: bajar(ej.fuga, dy), frente: ej.frente.map((p) => bajar(p, dy)), fondo: ej.fondo.map((p) => bajar(p, dy)) };
  if (ej.tecnica === TECNICA.FLECHA) return { ...ej, centro: ej.centro.map((p) => bajar(p, dy)), bordes: ej.bordes.map((b) => b.map((p) => bajar(p, dy))) };
  if (ej.tecnica === TECNICA.SALCHICHA) return { ...ej, a: bajar(ej.a, dy), b: bajar(ej.b, dy), contornos: ej.contornos.map((c) => ({ ...c, cy: c.cy + dy })) };
  if (ej.tecnica === TECNICA.CAJA2P) return {
    ...ej,
    horizonte: ej.horizonte + dy,
    vp1: bajar(ej.vp1, dy),
    vp2: bajar(ej.vp2, dy),
    vertical: ej.vertical.map((p) => bajar(p, dy)),
    fondo: Object.fromEntries(Object.entries(ej.fondo).map(([k, p]) => [k, bajar(p, dy)])),
    aristas: ej.aristas.map((a) => ({ ...a, desde: bajar(a.desde, dy), hasta: bajar(a.hasta, dy) })),
  };
  return { ...ej, a: bajar(ej.a, dy), b: bajar(ej.b, dy) };
}

export function crearEjercicio(tecnica, w, h, rng = Math.random, arriba = 0) {
  const reserva = Math.max(0, Math.min(arriba, h * RESERVA_MAX));
  const alto = h - reserva;
  let ej;
  if (tecnica === TECNICA.ELIPSE) ej = ejercicioElipse(w, alto, rng);
  else if (tecnica === TECNICA.PERSPECTIVA) ej = ejercicioPerspectiva(w, alto, rng);
  else if (tecnica === TECNICA.FLECHA) ej = ejercicioFlecha(w, alto, rng);
  else if (tecnica === TECNICA.SALCHICHA) ej = ejercicioSalchicha(w, alto, rng);
  else if (tecnica === TECNICA.CAJA2P) ej = ejercicioCaja2p(w, alto, rng);
  else ej = ejercicioLinea(w, alto, rng);
  return desplazarEjercicio(ej, reserva);
}

export function azarJefe(rng = Math.random) {
  return { centroX: rng(), centroY: rng(), fugaY: rng(), lado: rng(), fugaX: rng() };
}

function posicionesAzar(azar, w, alto, lado) {
  const m = lado / 2;
  const borde = ESCENA_JEFE.AZAR_BORDE * w;
  const cx = m + borde + (w - 2 * (m + borde)) * azar.centroX;
  const separacion = m + ESCENA_JEFE.AZAR_SEPARACION * w;
  const [fxMin, fxMax] = ESCENA_JEFE.AZAR_FUGA_X.map((f) => f * w);
  const derecha = [Math.max(fxMin, cx + separacion), fxMax];
  const izquierda = [fxMin, Math.min(fxMax, cx - separacion)];
  const caben = [derecha, izquierda].filter(([a, b]) => b >= a);
  const rango = caben.length > 1 ? caben[azar.lado < 0.5 ? 0 : 1] : caben[0] || [fxMin, fxMax];
  const fx = rango[0] + (rango[1] - rango[0]) * azar.fugaX;
  const fy = ESCENA_JEFE.AZAR_FUGA_Y[0] + (ESCENA_JEFE.AZAR_FUGA_Y[1] - ESCENA_JEFE.AZAR_FUGA_Y[0]) * azar.fugaY;
  const cy = ESCENA_JEFE.AZAR_CENTRO_Y[0] + (ESCENA_JEFE.AZAR_CENTRO_Y[1] - ESCENA_JEFE.AZAR_CENTRO_Y[0]) * azar.centroY;
  return { fuga: { x: fx, y: fy * alto }, centro: { x: cx, y: cy * alto } };
}

export function escenaJefe(w, h, arriba = 0, azar = null) {
  const reserva = Math.max(0, Math.min(arriba, h * ESCENA_JEFE.RESERVA_MAX));
  const alto = h - reserva;
  const lado = ESCENA_JEFE.LADO * Math.min(w, alto);
  if (azar) {
    const p = posicionesAzar(azar, w, alto, lado);
    return { fuga: { x: p.fuga.x, y: reserva + p.fuga.y }, centro: { x: p.centro.x, y: reserva + p.centro.y }, lado, w, h };
  }
  const fuga = { x: ESCENA_JEFE.FUGA[0] * w, y: reserva + ESCENA_JEFE.FUGA[1] * alto };
  const centro = { x: ESCENA_JEFE.CENTRO[0] * w, y: reserva + ESCENA_JEFE.CENTRO[1] * alto };
  return { fuga, centro, lado, w, h };
}

export function trazosDemoJefe(escena, muestras = 48) {
  const { fuga, centro, lado, w } = escena;
  const m = lado / 2;
  const esquinas = [
    { x: centro.x - m, y: centro.y - m },
    { x: centro.x + m, y: centro.y - m },
    { x: centro.x + m, y: centro.y + m },
    { x: centro.x - m, y: centro.y + m },
  ];
  const borde = Math.min(12, w * 0.03);
  const horizonte = { paso: "horizonte", puntos: [{ x: borde, y: fuga.y }, { x: w - borde, y: fuga.y }] };
  const cara = esquinas.map((p, i) => ({ paso: "cara", puntos: [p, esquinas[(i + 1) % 4]] }));
  const fugantes = esquinas.map((p) => ({ paso: "fuga", puntos: [p, hacia(p, fuga, ESCENA_JEFE.FONDO)] }));
  const elipse = {
    paso: "elipse",
    puntos: Array.from({ length: muestras + 1 }, (_, i) => {
      const a = -Math.PI / 2 + (i / muestras) * Math.PI * 2;
      return { x: centro.x + Math.cos(a) * m, y: centro.y + Math.sin(a) * m };
    }),
  };
  return [horizonte, ...cara, ...fugantes, elipse];
}


const FLECHA_LARGO = Object.freeze([0.55, 0.8]);
const FLECHA_ANCHO_CERCA = Object.freeze([0.08, 0.12]);
const FLECHA_ANCHO_LEJOS = Object.freeze([0.02, 0.045]);
const FLECHA_MUESTRAS = 28;
const SALCHICHA_LARGO = Object.freeze([0.42, 0.62]);
const SALCHICHA_RADIO = Object.freeze([0.07, 0.1]);
const CAJA2P_LADO = Object.freeze([0.28, 0.38]);
const CAJA2P_FONDO = Object.freeze([0.38, 0.52]);
const CAJA2P_HORIZONTE = Object.freeze([0.08, 0.16]);

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function polilineaBezier(p0, p1, p2, p3, n) {
  return Array.from({ length: n }, (_, i) => bezier(p0, p1, p2, p3, i / (n - 1)));
}

function desplazarPoly(poly, nx, ny, d) {
  return poly.map((p) => ({ x: p.x + nx * d, y: p.y + ny * d }));
}

export function ejercicioFlecha(w, h, rng = Math.random) {
  const corto = Math.min(w, h);
  const margen = w * MARGEN;
  const p0 = { x: margen + rng() * (w * 0.25), y: h * (0.55 + rng() * 0.25) };
  const p3 = { x: w - margen - rng() * (w * 0.15), y: h * (0.18 + rng() * 0.2) };
  if (rng() < 0.5) { const t = p0.x; p0.x = w - p0.x; p3.x = w - p3.x; }
  const p1 = { x: p0.x + (p3.x - p0.x) * 0.25, y: p0.y - corto * (0.18 + rng() * 0.15) };
  const p2 = { x: p0.x + (p3.x - p0.x) * 0.7, y: p3.y + corto * (0.12 + rng() * 0.12) };
  const centro = polilineaBezier(p0, p1, p2, p3, FLECHA_MUESTRAS);
  const anchoCerca = corto * entre(rng, FLECHA_ANCHO_CERCA);
  const anchoLejos = corto * entre(rng, FLECHA_ANCHO_LEJOS);
  const izq = [];
  const der = [];
  for (let i = 0; i < centro.length; i++) {
    const t = i / (centro.length - 1);
    const a = centro[Math.max(0, i - 1)];
    const b = centro[Math.min(centro.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const ancho = anchoCerca + (anchoLejos - anchoCerca) * t;
    izq.push({ x: centro[i].x + nx * ancho, y: centro[i].y + ny * ancho });
    der.push({ x: centro[i].x - nx * ancho, y: centro[i].y - ny * ancho });
  }
  return {
    tecnica: TECNICA.FLECHA,
    centro,
    bordes: [izq, der],
    anchoCerca,
    anchoLejos,
    hechos: [],
  };
}

export function ejercicioSalchicha(w, h, rng = Math.random) {
  const corto = Math.min(w, h);
  const largo = corto * entre(rng, SALCHICHA_LARGO);
  const radio = corto * entre(rng, SALCHICHA_RADIO);
  const ang = (rng() * 0.7 - 0.35) * Math.PI;
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const mx = w * MARGEN + radio + Math.abs(ux) * largo / 2;
  const my = h * MARGEN + radio + Math.abs(uy) * largo / 2;
  const cx = mx < w - mx ? mx + rng() * (w - 2 * mx) : w / 2;
  const cy = my < h - my ? my + rng() * (h - 2 * my) : h / 2;
  const a = { x: cx - ux * largo / 2, y: cy - uy * largo / 2 };
  const b = { x: cx + ux * largo / 2, y: cy + uy * largo / 2 };
  const contornos = [0.35, 0.65].map((t) => {
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const menor = radio * (0.4 + 0.15 * Math.abs(Math.sin(ang + t * 3)));
    return { cx: p.x, cy: p.y, rx: menor, ry: radio, eje: { x: ux, y: uy }, t };
  });
  return {
    tecnica: TECNICA.SALCHICHA,
    a,
    b,
    radio,
    eje: { x: ux, y: uy },
    contornos,
    hechos: [],
  };
}

function haciaVp(p, vp, f) {
  return { x: p.x + (vp.x - p.x) * f, y: p.y + (vp.y - p.y) * f };
}

export function ejercicioCaja2p(w, h, rng = Math.random) {
  const horizonte = h * entre(rng, CAJA2P_HORIZONTE);
  const sep = w * 0.5;
  const vp1 = { x: w * (0.08 + rng() * 0.12), y: horizonte };
  const vp2 = { x: w * (0.8 + rng() * 0.12), y: horizonte };
  const lado = Math.min(w, h) * entre(rng, CAJA2P_LADO);
  const x = w * 0.35 + rng() * w * 0.2;
  const yMin = horizonte + h * 0.18;
  const yMax = h * (1 - MARGEN) - lado;
  const y = yMax > yMin ? yMin + rng() * (yMax - yMin) : Math.max(horizonte + 20, yMax);
  const arriba = { x, y };
  const abajo = { x, y: y + lado };
  const fondo = entre(rng, CAJA2P_FONDO);
  const a1 = haciaVp(arriba, vp1, fondo);
  const a2 = haciaVp(arriba, vp2, fondo);
  const b1 = haciaVp(abajo, vp1, fondo);
  const b2 = haciaVp(abajo, vp2, fondo);
  const aristas = [
    { desde: arriba, hasta: a1, vp: 1 },
    { desde: abajo, hasta: b1, vp: 1 },
    { desde: arriba, hasta: a2, vp: 2 },
    { desde: abajo, hasta: b2, vp: 2 },
  ];
  return {
    tecnica: TECNICA.CAJA2P,
    horizonte,
    vp1,
    vp2,
    vertical: [arriba, abajo],
    fondo: { a1, a2, b1, b2 },
    aristas,
    hechos: [],
  };
}

export function azarJefe2(rng = Math.random) {
  return { horizonte: rng(), centroX: rng(), centroY: rng(), eje: rng(), lado: rng() };
}

export function escenaJefe2(w, h, arriba = 0, azar = null) {
  const reserva = Math.max(0, Math.min(arriba, h * ESCENA_JEFE2.RESERVA_MAX));
  const alto = h - reserva;
  const az = azar || { horizonte: 0.4, centroX: 0.5, centroY: 0.5, eje: 0.5, lado: 0.5 };
  const horizonte = ESCENA_JEFE2.AZAR_HORIZONTE[0] + (ESCENA_JEFE2.AZAR_HORIZONTE[1] - ESCENA_JEFE2.AZAR_HORIZONTE[0]) * az.horizonte;
  const hy = reserva + horizonte * alto;
  const vp1 = { x: w * ESCENA_JEFE2.VP_MARGEN, y: hy };
  const vp2 = { x: w * (1 - ESCENA_JEFE2.VP_MARGEN), y: hy };
  const cx = ESCENA_JEFE2.AZAR_CENTRO_X[0] + (ESCENA_JEFE2.AZAR_CENTRO_X[1] - ESCENA_JEFE2.AZAR_CENTRO_X[0]) * az.centroX;
  const cy = ESCENA_JEFE2.AZAR_CENTRO_Y[0] + (ESCENA_JEFE2.AZAR_CENTRO_Y[1] - ESCENA_JEFE2.AZAR_CENTRO_Y[0]) * az.centroY;
  const centro = { x: cx * w, y: reserva + cy * alto };
  const lado = ESCENA_JEFE2.LADO * Math.min(w, alto) * (0.9 + 0.2 * az.lado);
  const ang = ESCENA_JEFE2.AZAR_EJE[0] + (ESCENA_JEFE2.AZAR_EJE[1] - ESCENA_JEFE2.AZAR_EJE[0]) * az.eje;
  const eje = { x: Math.cos(ang), y: Math.sin(ang) };
  const cilRadio = ESCENA_JEFE2.CIL_RADIO * Math.min(w, alto);
  const fondo = ESCENA_JEFE2.FONDO;
  const arribaV = { x: centro.x, y: centro.y - lado / 2 };
  const abajoV = { x: centro.x, y: centro.y + lado / 2 };
  const a1 = haciaVp(arribaV, vp1, fondo);
  const a2 = haciaVp(arribaV, vp2, fondo);
  const b1 = haciaVp(abajoV, vp1, fondo);
  const b2 = haciaVp(abajoV, vp2, fondo);
  const cilA = { x: centro.x - eje.x * lado * 0.55, y: centro.y - eje.y * lado * 0.55 };
  const cilB = { x: centro.x + eje.x * lado * 0.55, y: centro.y + eje.y * lado * 0.55 };
  const interseccion = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const angulo = t * Math.PI * 2;
    const px = -eje.y;
    const py = eje.x;
    return {
      x: centro.x + Math.cos(angulo) * cilRadio * px * 0.9 + Math.sin(angulo) * cilRadio * 0.35 * eje.x,
      y: centro.y + Math.cos(angulo) * cilRadio * py * 0.9 + Math.sin(angulo) * cilRadio * 0.35 * eje.y,
    };
  });
  return {
    vp1, vp2, horizonte: hy, centro, lado, eje, cilRadio, cilA, cilB,
    vertical: [arribaV, abajoV],
    fondoPts: { a1, a2, b1, b2 },
    interseccion,
    w, h,
  };
}

export function trazosDemoJefe2(escena, muestras = 40) {
  const { vp1, vp2, vertical, fondoPts, cilA, cilB, cilRadio, eje, interseccion } = escena;
  const [arriba, abajo] = vertical;
  const elipse = (c) => Array.from({ length: muestras + 1 }, (_, i) => {
    const a = -Math.PI / 2 + (i / muestras) * Math.PI * 2;
    const px = -eje.y;
    const py = eje.x;
    return { x: c.x + Math.cos(a) * cilRadio * px, y: c.y + Math.cos(a) * cilRadio * py + Math.sin(a) * cilRadio * 0.55 };
  });
  return [
    { paso: "vertical", puntos: [arriba, abajo] },
    { paso: "vertical", puntos: [fondoPts.a1, fondoPts.b1] },
    { paso: "fuga", puntos: [arriba, fondoPts.a1] },
    { paso: "fuga", puntos: [abajo, fondoPts.b1] },
    { paso: "fuga", puntos: [arriba, fondoPts.a2] },
    { paso: "fuga", puntos: [abajo, fondoPts.b2] },
    { paso: "cilindro", puntos: elipse(cilA) },
    { paso: "cilindro", puntos: elipse(cilB) },
    { paso: "interseccion", puntos: interseccion },
  ];
}
