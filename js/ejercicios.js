import { TECNICA, ESCENA_JEFE } from "./config.js";

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
  return { ...ej, a: bajar(ej.a, dy), b: bajar(ej.b, dy) };
}

export function crearEjercicio(tecnica, w, h, rng = Math.random, arriba = 0) {
  const reserva = Math.max(0, Math.min(arriba, h * RESERVA_MAX));
  const alto = h - reserva;
  let ej;
  if (tecnica === TECNICA.ELIPSE) ej = ejercicioElipse(w, alto, rng);
  else if (tecnica === TECNICA.PERSPECTIVA) ej = ejercicioPerspectiva(w, alto, rng);
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
