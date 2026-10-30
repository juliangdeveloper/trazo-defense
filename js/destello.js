import { NIVEL_ATAQUE, DESTELLO } from "./config.js";

const REF = Object.freeze({
  R0: 58,
  RW: 46,
  T: 17,
  RMAX: 242,
  VR: 337,
  VIGNETA: 70,
  BRILLO_CORTE: 0.55,
  BRILLO_RANGO: 0.45,
  GLOW_CERCA: 12,
  GLOW_LEJOS: 55,
  GLOW_CERCA_PESO: 0.4,
  GLOW_LEJOS_PESO: 0.5,
  DENTRO_MARGEN: 10,
  DENTRO_CAIDA: 40,
  HALO_CAIDA: 55,
  HALO_PESO: 0.85,
  RAYO_INICIO: 0.45,
  RAYO_CAIDA: 85,
  RAYO_PESO: 0.9,
  CHISPA_GRANDE: 15,
  CHISPA_CHICA: 10,
  PASO: 2,
  PASO_GRADIENTE: 4,
  SEMILLA: 11,
});

const FONDO = Object.freeze([84, 78, 92]);
const CALIDO = Object.freeze([255, 236, 190]);
const BRASA = Object.freeze([120, 30, 20]);
const BRASA_PESO = 0.1;
const RAYO_COLOR = Object.freeze([255, 240, 205]);
const RAYOS = Object.freeze([
  Object.freeze({ n: 12, fase: 0, peso: 0.55, ancho: 0.068 }),
  Object.freeze({ n: 7, fase: 1.3, peso: 0.45, ancho: 0.096 }),
  Object.freeze({ n: 19, fase: 0.4, peso: 0.3, ancho: 0.031 }),
]);
const CAPAS_RAYO = Object.freeze([2.8, 1.7, 0.8]);

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const COLORES = NIVEL_ATAQUE.COLORES.map(rgb);

function suave(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function mezclar(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function perfilAnillos(valores, r) {
  let c = valores[0];
  for (let i = 0; i < 4; i++) {
    const b = REF.R0 + i * REF.RW;
    const t = suave((r - (b - REF.T)) / (2 * REF.T));
    c = Array.isArray(c) ? mezclar(c, valores[i + 1], t) : c * (1 - t) + valores[i + 1] * t;
  }
  return c;
}

function desenfocar(lista, sigma) {
  const radio = Math.ceil((sigma * 2.5) / REF.PASO);
  const pesos = [];
  for (let k = -radio; k <= radio; k++) pesos.push(Math.exp(-((k * REF.PASO) ** 2) / (2 * sigma * sigma)));
  return lista.map((_, i) => {
    let suma = 0;
    let total = 0;
    for (let k = -radio; k <= radio; k++) {
      const j = Math.abs(i + k);
      const v = j < lista.length ? lista[j] : 0;
      suma += v * pesos[k + radio];
      total += pesos[k + radio];
    }
    return suma / total;
  });
}

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function brilloTotal(niveles) {
  return niveles.reduce((s, n) => s + NIVEL_ATAQUE.CALOR[n], 0) / niveles.length;
}

function perfil(niveles) {
  const colores = niveles.map((n) => COLORES[n]);
  const tot = brilloTotal(niveles);
  const radios = [];
  for (let r = 0; r <= REF.VR; r += REF.PASO) radios.push(r);
  const anillo = radios.map((r) => perfilAnillos(colores, r));
  const debiles = niveles.map((n) => (n === NIVEL_ATAQUE.DEBIL ? 1 : 0));
  const mascara = radios.map((r) => suave((REF.RMAX + REF.T - r) / (2 * REF.T)));
  const brillo = anillo.map((c, i) => Math.min(1, Math.max(0, ((c[0] + c[1] + c[2]) / 765 * mascara[i] - REF.BRILLO_CORTE) / REF.BRILLO_RANGO)));
  const g1 = desenfocar(brillo, REF.GLOW_CERCA);
  const g2 = desenfocar(brillo, REF.GLOW_LEJOS);
  const calorExterior = NIVEL_ATAQUE.CALOR[niveles[4]] ** 2;
  const colorHalo = mezclar(COLORES[niveles[4]], CALIDO, 0.5);
  return radios.map((r, i) => {
    const vig = suave((REF.VR - r) / REF.VIGNETA);
    const fondo = FONDO.map((v) => v * (0.72 + 0.28 * Math.min(1, r / REF.VR)));
    let c = mezclar(fondo, anillo[i], mascara[i]);
    const brasa = perfilAnillos(debiles, r) * mascara[i] * BRASA_PESO;
    c = c.map((v, k) => v + brasa * BRASA[k]);
    const dentro = Math.min(1, Math.max(0, (REF.VR - REF.DENTRO_MARGEN - r) / REF.DENTRO_CAIDA));
    const glow = (g1[i] * REF.GLOW_CERCA_PESO + g2[i] * REF.GLOW_LEJOS_PESO * dentro) * (0.3 + 0.7 * tot);
    c = c.map((v, k) => v + glow * CALIDO[k]);
    let halo = r > REF.RMAX - REF.T ? Math.exp(-Math.max(0, r - REF.RMAX) / REF.HALO_CAIDA) * dentro * calorExterior * REF.HALO_PESO : 0;
    if (r < REF.RMAX) halo *= Math.min(1, Math.max(0, (r - (REF.RMAX - REF.T)) / REF.T));
    c = mezclar(c, colorHalo, halo);
    return { r, c: c.map((v) => Math.round(Math.min(255, Math.max(0, v)))), a: vig };
  });
}

function pintarRayos(ctx, niveles, k) {
  const tot = brilloTotal(niveles);
  const exterior = Math.max(...niveles.map((n, i) => NIVEL_ATAQUE.CALOR[n] * (0.6 + 0.1 * i)));
  const fuerza = tot ** 1.5 * exterior * REF.RAYO_PESO;
  if (!(fuerza > 0.01)) return;
  const inicio = REF.RMAX * REF.RAYO_INICIO * k;
  const fin = (REF.VR - REF.DENTRO_MARGEN) * k;
  const g = ctx.createRadialGradient(0, 0, inicio, 0, 0, fin);
  const pasos = 12;
  for (let i = 0; i <= pasos; i++) {
    const r = inicio + ((fin - inicio) * i) / pasos;
    const rr = r / k;
    const caida = Math.min(1, Math.max(0, (rr - REF.RMAX * REF.RAYO_INICIO) / (REF.RMAX * (1 - REF.RAYO_INICIO)))) * Math.exp(-Math.max(0, rr - REF.RMAX) / REF.RAYO_CAIDA);
    const dentro = Math.min(1, Math.max(0, (REF.VR - REF.DENTRO_MARGEN - rr) / REF.DENTRO_CAIDA));
    g.addColorStop(i / pasos, `rgba(${RAYO_COLOR.join(",")},${(caida * dentro).toFixed(3)})`);
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  for (const rayo of RAYOS) {
    for (let j = 0; j < rayo.n; j++) {
      const centro = (j * 2 * Math.PI - rayo.fase) / rayo.n;
      for (const capa of CAPAS_RAYO) {
        const medio = rayo.ancho * capa;
        ctx.globalAlpha = Math.min(1, (fuerza * rayo.peso) / CAPAS_RAYO.length);
        ctx.beginPath();
        ctx.moveTo(Math.cos(centro) * inicio, Math.sin(centro) * inicio);
        ctx.arc(0, 0, fin, centro - medio, centro + medio);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function pintarChispas(ctx, niveles, k) {
  const rng = azar(REF.SEMILLA);
  niveles.forEach((n, i) => {
    if (n < NIVEL_ATAQUE.FUERTE) return;
    const rm = (i === 0 ? REF.R0 * 0.5 : REF.R0 + (i - 0.5) * REF.RW) * k;
    const veces = n === NIVEL_ATAQUE.PERFECTO ? 3 : 1;
    for (let v = 0; v < veces; v++) {
      const t = rng() * 2 * Math.PI;
      const x = rm * Math.cos(t);
      const y = rm * Math.sin(t);
      const rr = (n === NIVEL_ATAQUE.PERFECTO ? REF.CHISPA_GRANDE : REF.CHISPA_CHICA) * k;
      ctx.fillStyle = n === NIVEL_ATAQUE.PERFECTO ? "rgba(255,255,255,0.9)" : "rgba(255,240,200,0.82)";
      ctx.beginPath();
      for (let q = 0; q < 8; q++) {
        const largo = q % 2 === 0 ? rr : rr * 0.25;
        const a = (q * Math.PI) / 4;
        if (q) ctx.lineTo(x + largo * Math.cos(a), y + largo * Math.sin(a));
        else ctx.moveTo(x + largo * Math.cos(a), y + largo * Math.sin(a));
      }
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function radioVisible(radio) {
  return (radio * REF.VR) / REF.RMAX;
}

export function crearImagenDestello(niveles, radio, dpr = 1) {
  const escala = Math.min(DESTELLO.DPR_MAX, Math.max(1, dpr));
  const visible = radioVisible(radio);
  const lado = Math.ceil(visible * 2 * escala);
  const lienzo = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(lado, lado) : Object.assign(document.createElement("canvas"), { width: lado, height: lado });
  const ctx = lienzo.getContext("2d");
  const k = radio / REF.RMAX;
  ctx.setTransform(escala, 0, 0, escala, lado / 2, lado / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, visible);
  const muestras = perfil(niveles);
  muestras.forEach((m, i) => {
    if (i % (REF.PASO_GRADIENTE / REF.PASO) !== 0 && i !== muestras.length - 1) return;
    g.addColorStop(Math.min(1, m.r / REF.VR), `rgba(${m.c[0]},${m.c[1]},${m.c[2]},${m.a.toFixed(3)})`);
  });
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, visible, 0, Math.PI * 2);
  ctx.fill();
  pintarRayos(ctx, niveles, k);
  pintarChispas(ctx, niveles, k);
  return { lienzo, lado: lado / escala };
}
