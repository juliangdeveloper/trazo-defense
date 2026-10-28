import { TECNICA } from "./config.js";

const MARGEN = 0.1;
const LINEA_LARGO = Object.freeze([0.5, 0.78]);
const ELIPSE_ANCHO = Object.freeze([0.38, 0.72]);
const ELIPSE_ALTO = Object.freeze([0.32, 0.62]);
const HORIZONTE_ALTO = Object.freeze([0.16, 0.3]);
const FUGA_ANCHO = Object.freeze([0.3, 0.7]);
const PERSPECTIVA_GUIA = 0.6;
const PERSPECTIVA_DISTANCIA_MIN = 0.5;
const JEFE_FUGA = Object.freeze([0.5, 0.34]);
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

export function ejercicioPerspectiva(w, h, rng = Math.random) {
  const fuga = { x: entre(rng, FUGA_ANCHO) * w, y: entre(rng, HORIZONTE_ALTO) * h };
  let origen = null;
  for (let i = 0; i < 20 && !origen; i++) {
    const p = { x: w * MARGEN + rng() * w * (1 - 2 * MARGEN), y: fuga.y + h * 0.25 + rng() * (h * (1 - MARGEN) - fuga.y - h * 0.25) };
    if (Math.hypot(p.x - fuga.x, p.y - fuga.y) >= PERSPECTIVA_DISTANCIA_MIN * Math.min(w, h)) origen = p;
  }
  if (!origen) origen = { x: w * MARGEN, y: h * (1 - MARGEN) };
  const largoGuia = Math.hypot(fuga.x - origen.x, fuga.y - origen.y) * PERSPECTIVA_GUIA;
  return { tecnica: TECNICA.PERSPECTIVA, fuga, origen, largoGuia };
}

function bajar(p, dy) {
  return { ...p, y: p.y + dy };
}

export function desplazarEjercicio(ej, dy) {
  if (!dy) return ej;
  if (ej.tecnica === TECNICA.ELIPSE) return { ...ej, caja: bajar(ej.caja, dy) };
  if (ej.tecnica === TECNICA.PERSPECTIVA) return { ...ej, fuga: bajar(ej.fuga, dy), origen: bajar(ej.origen, dy) };
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

export function escenaJefe(w, h) {
  return { fuga: { x: JEFE_FUGA[0] * w, y: JEFE_FUGA[1] * h } };
}
