import { PUNTAJE, JEFE, PUNTO_DEBIL, COMPARA, ATAQUE, DIMENSION, DIMENSIONES, NIVEL_ATAQUE, ESCENA_JEFE } from "./config.js";

const GRADOS = 180 / Math.PI;

export function clamp01(v) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

export function distancia(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function longitud(puntos) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) total += distancia(puntos[i - 1], puntos[i]);
  return total;
}

export function duracionMs(puntos) {
  if (puntos.length < 2) return 0;
  return Math.max(0, puntos[puntos.length - 1].t - puntos[0].t);
}

export function velocidad(puntos) {
  const ms = duracionMs(puntos);
  return ms > 0 ? longitud(puntos) / ms : Infinity;
}

export function distanciaARecta(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  if (largo === 0) return distancia(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / largo;
}

export function remuestrear(puntos, paso) {
  if (puntos.length < 2 || !(paso > 0)) return puntos.slice();
  const salida = [{ x: puntos[0].x, y: puntos[0].y }];
  let resto = 0;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const tramo = distancia(a, b);
    let recorrido = paso - resto;
    while (recorrido <= tramo) {
      const f = recorrido / tramo;
      salida.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      recorrido += paso;
    }
    resto = tramo - (recorrido - paso);
  }
  const ultimo = puntos[puntos.length - 1];
  if (distancia(salida[salida.length - 1], ultimo) > paso * 0.25) salida.push({ x: ultimo.x, y: ultimo.y });
  return salida;
}

export function ajustarRecta(puntos) {
  const n = puntos.length;
  let cx = 0;
  let cy = 0;
  for (const p of puntos) { cx += p.x; cy += p.y; }
  cx /= n;
  cy /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of puntos) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  const angulo = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ux = Math.cos(angulo);
  let uy = Math.sin(angulo);
  const primero = puntos[0];
  const ultimo = puntos[n - 1];
  if ((ultimo.x - primero.x) * ux + (ultimo.y - primero.y) * uy < 0) { ux = -ux; uy = -uy; }
  return { cx, cy, ux, uy };
}

export function anguloEntre(ax, ay, bx, by) {
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la === 0 || lb === 0) return 180;
  const c = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (la * lb)));
  return Math.acos(c) * GRADOS;
}

export function desviacionMaximaPct(puntos, a, b) {
  const largo = distancia(a, b);
  if (largo === 0) return 100;
  let max = 0;
  for (const p of puntos) max = Math.max(max, distanciaARecta(p, a, b));
  return (max / largo) * 100;
}

export function contarRepasos(puntos, ux, uy, largo) {
  if (puntos.length < 3 || !(largo > 0)) return 0;
  const umbral = (PUNTAJE.REPASO_MIN_PCT / 100) * largo;
  const origen = puntos[0];
  let maximo = 0;
  let repasos = 0;
  let enRetroceso = false;
  for (const p of puntos) {
    const avance = (p.x - origen.x) * ux + (p.y - origen.y) * uy;
    if (avance > maximo) {
      maximo = avance;
      enRetroceso = false;
    } else if (!enRetroceso && maximo - avance > umbral) {
      repasos += 1;
      enRetroceso = true;
    }
  }
  return repasos;
}

export function puntajeSeguridad(v) {
  if (v === Infinity) return 1;
  return clamp01((v - PUNTAJE.VELOCIDAD_LENTA_PX_MS) / (PUNTAJE.VELOCIDAD_SEGURA_PX_MS - PUNTAJE.VELOCIDAD_LENTA_PX_MS));
}

function factorRepasos(repasos) {
  return Math.pow(PUNTAJE.PENALIZACION_REPASO, repasos);
}

function redondear(v, decimales) {
  const f = Math.pow(10, decimales);
  return Math.round(v * f) / f;
}

function trazoCorto(puntos) {
  return puntos.length < 2 || longitud(puntos) < PUNTAJE.TRAZO_MIN_PX;
}

export function evaluarLinea(puntos, a, b) {
  if (trazoCorto(puntos)) return { valido: false, puntaje: 0 };
  const largo = distancia(a, b);
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];
  const directo = distancia(inicio, a) + distancia(fin, b);
  const inverso = distancia(inicio, b) + distancia(fin, a);
  const [desde, hasta] = directo <= inverso ? [a, b] : [b, a];
  const extremosPct = (Math.min(directo, inverso) / 2 / largo) * 100;
  const desviacionPct = desviacionMaximaPct(puntos, a, b);
  const ux = (hasta.x - desde.x) / largo;
  const uy = (hasta.y - desde.y) / largo;
  const repasos = contarRepasos(puntos, ux, uy, largo);
  const v = velocidad(puntos);
  const seguridad = puntajeSeguridad(v);
  const base = 0.5 * clamp01(1 - desviacionPct / PUNTAJE.LINEA_DESVIACION_MAX_PCT)
    + 0.25 * clamp01(1 - extremosPct / PUNTAJE.LINEA_EXTREMOS_MAX_PCT)
    + 0.25 * seguridad;
  return {
    valido: true,
    puntaje: redondear(clamp01(base * factorRepasos(repasos)), 3),
    desviacion_pct: redondear(desviacionPct, 1),
    extremos_pct: redondear(extremosPct, 1),
    seguridad_pct: Math.round(seguridad * 100),
    repasos,
    duracion_ms: Math.round(duracionMs(puntos)),
  };
}

export function radioNormalizado(p, caja) {
  const cx = caja.x + caja.w / 2;
  const cy = caja.y + caja.h / 2;
  const rx = caja.w / 2;
  const ry = caja.h / 2;
  return Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
}

export function barridoAngular(puntos, cx, cy) {
  let total = 0;
  let previo = null;
  for (const p of puntos) {
    const ang = Math.atan2(p.y - cy, p.x - cx);
    if (previo !== null) {
      let d = ang - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      total += d;
    }
    previo = ang;
  }
  return Math.abs(total) * GRADOS;
}

export function temblorAngular(puntos) {
  if (puntos.length < 4) return 0;
  const giros = [];
  for (let i = 2; i < puntos.length; i++) {
    const a1 = Math.atan2(puntos[i - 1].y - puntos[i - 2].y, puntos[i - 1].x - puntos[i - 2].x);
    const a2 = Math.atan2(puntos[i].y - puntos[i - 1].y, puntos[i].x - puntos[i - 1].x);
    let d = a2 - a1;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    giros.push(d);
  }
  let suma = 0;
  for (let i = 1; i < giros.length; i++) suma += Math.abs(giros[i] - giros[i - 1]);
  return (suma / Math.max(1, giros.length - 1)) * GRADOS;
}

export function evaluarElipse(puntos, caja) {
  if (trazoCorto(puntos)) return { valido: false, puntaje: 0 };
  const perimetro = Math.PI * (caja.w + caja.h) / 2;
  const muestras = remuestrear(puntos, perimetro / PUNTAJE.ELIPSE_MUESTRAS);
  let errorTotal = 0;
  for (const p of muestras) errorTotal += Math.abs(radioNormalizado(p, caja) - 1);
  const ajustePct = (errorTotal / muestras.length) * 100;
  const cx = caja.x + caja.w / 2;
  const cy = caja.y + caja.h / 2;
  const cobertura = barridoAngular(muestras, cx, cy);
  const diametro = (caja.w + caja.h) / 2;
  const fin = puntos[puntos.length - 1];
  const inicioTramo = puntos.slice(0, Math.max(2, Math.ceil(puntos.length * 0.15)));
  let hueco = Infinity;
  for (const p of inicioTramo) hueco = Math.min(hueco, distancia(p, fin));
  if (cobertura < 300) hueco = distancia(puntos[0], fin);
  const cierrePct = (hueco / diametro) * 100;
  const temblor = temblorAngular(muestras);
  const factorCobertura = clamp01((cobertura - PUNTAJE.ELIPSE_COBERTURA_MIN_DEG) / (PUNTAJE.ELIPSE_COBERTURA_OK_DEG - PUNTAJE.ELIPSE_COBERTURA_MIN_DEG));
  const base = 0.5 * clamp01(1 - ajustePct / PUNTAJE.ELIPSE_AJUSTE_MAX_PCT)
    + 0.25 * clamp01(1 - cierrePct / PUNTAJE.ELIPSE_CIERRE_MAX_PCT)
    + 0.25 * clamp01(1 - temblor / PUNTAJE.ELIPSE_TEMBLOR_MAX_DEG);
  return {
    valido: true,
    puntaje: redondear(clamp01(base * factorCobertura), 3),
    ajuste_pct: redondear(ajustePct, 1),
    cierre_pct: redondear(cierrePct, 1),
    temblor_deg: redondear(temblor, 1),
    cobertura_deg: Math.round(cobertura),
    duracion_ms: Math.round(duracionMs(puntos)),
  };
}

export function rectitudPct(puntos) {
  const recta = ajustarRecta(puntos);
  let min = Infinity;
  let max = -Infinity;
  let desvio = 0;
  for (const p of puntos) {
    const dx = p.x - recta.cx;
    const dy = p.y - recta.cy;
    const avance = dx * recta.ux + dy * recta.uy;
    min = Math.min(min, avance);
    max = Math.max(max, avance);
    desvio = Math.max(desvio, Math.abs(dx * -recta.uy + dy * recta.ux));
  }
  const largo = max - min;
  return { recta, largo, pct: largo > 0 ? (desvio / largo) * 100 : 100 };
}

export function desvioHaciaFuga(puntos, fuga) {
  const { recta } = rectitudPct(puntos);
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];
  const lejano = distancia(inicio, fuga) >= distancia(fin, fuga) ? inicio : fin;
  const signo = lejano === inicio ? 1 : -1;
  return anguloEntre(recta.ux * signo, recta.uy * signo, fuga.x - lejano.x, fuga.y - lejano.y);
}

function costoArista(puntos, arista) {
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];
  return Math.min(distancia(inicio, arista.desde) + distancia(fin, arista.hasta), distancia(inicio, arista.hasta) + distancia(fin, arista.desde));
}

export function asignarArista(puntos, aristas, usadas = []) {
  let mejor = -1;
  let costo = Infinity;
  aristas.forEach((arista, i) => {
    if (usadas.includes(i)) return;
    const c = costoArista(puntos, arista);
    if (c < costo) { costo = c; mejor = i; }
  });
  return mejor;
}

export function evaluarFugante(puntos, arista, fuga) {
  if (trazoCorto(puntos)) return { valido: false, puntaje: 0 };
  const { recta, pct } = rectitudPct(puntos);
  const desvio = desvioHaciaFuga(puntos, fuga);
  const largo = distancia(arista.desde, arista.hasta) || longitud(puntos);
  const cierrePct = (costoArista(puntos, arista) / 2 / largo) * 100;
  const repasos = contarRepasos(puntos, recta.ux, recta.uy, largo);
  const base = 0.55 * clamp01(1 - desvio / PUNTAJE.PERSPECTIVA_DESVIO_MAX_DEG)
    + 0.25 * clamp01(1 - pct / PUNTAJE.PERSPECTIVA_RECTITUD_MAX_PCT)
    + 0.2 * clamp01(1 - cierrePct / PUNTAJE.PERSPECTIVA_CIERRE_MAX_PCT);
  return {
    valido: true,
    puntaje: redondear(clamp01(base * factorRepasos(repasos)), 3),
    desvio_deg: redondear(desvio, 1),
    rectitud_pct: redondear(pct, 1),
    cierre_pct: redondear(cierrePct, 1),
    repasos,
    duracion_ms: Math.round(duracionMs(puntos)),
  };
}

export function resumenCubo(resultados, total = PUNTAJE.CUBO_LINEAS) {
  const validos = resultados.filter((r) => r && r.valido);
  if (!validos.length) return { valido: false, puntaje: 0 };
  const media = (clave) => validos.reduce((acc, r) => acc + r[clave], 0) / validos.length;
  return {
    valido: true,
    puntaje: redondear(validos.reduce((acc, r) => acc + r.puntaje, 0) / Math.max(total, validos.length), 3),
    desvio_deg: redondear(media("desvio_deg"), 1),
    rectitud_pct: redondear(media("rectitud_pct"), 1),
    cierre_pct: redondear(media("cierre_pct"), 1),
    repasos: validos.reduce((acc, r) => acc + r.repasos, 0),
    lineas: validos.length,
    duracion_ms: validos.reduce((acc, r) => acc + r.duracion_ms, 0),
  };
}

export const TIPO_TRAZO_JEFE = Object.freeze({ HORIZONTE: "horizonte", FUGANTE: "fugante", FRONTAL: "frontal", ELIPSE: "elipse", DESCARTADO: "descartado" });

export function desvioDeEje(recta) {
  const ang = Math.abs(Math.atan2(recta.uy, recta.ux) * GRADOS) % 180;
  return Math.min(ang, Math.abs(ang - 90), 180 - ang);
}

function esVertical(recta) {
  return Math.abs(recta.uy) > Math.abs(recta.ux);
}

export function pareceElipse(puntos) {
  if (trazoCorto(puntos)) return false;
  const { pct } = rectitudPct(puntos);
  if (pct < JEFE.elipseRectitudMinPct) return false;
  let cx = 0;
  let cy = 0;
  for (const p of puntos) { cx += p.x; cy += p.y; }
  return barridoAngular(puntos, cx / puntos.length, cy / puntos.length) >= JEFE.elipseBarridoMinDeg;
}

function clasificarLinea(puntos, indice, fuga, horizonteLibre) {
  const { recta, pct, largo } = rectitudPct(puntos);
  const repasos = contarRepasos(puntos, recta.ux, recta.uy, largo);
  const seguro = pct <= JEFE.rectitudSeguraPct && repasos === 0 && puntajeSeguridad(velocidad(puntos)) >= 0.5;
  const comun = { indice, rectitud_pct: redondear(pct, 1), repasos, seguro };
  if (horizonteLibre) {
    const ang = Math.abs(Math.atan2(recta.uy, recta.ux) * GRADOS) % 180;
    return { ...comun, tipo: TIPO_TRAZO_JEFE.HORIZONTE, error_deg: Math.min(ang, 180 - ang) };
  }
  const haciaFuga = desvioHaciaFuga(puntos, fuga);
  const deEje = desvioDeEje(recta);
  if (haciaFuga < deEje) return { ...comun, tipo: TIPO_TRAZO_JEFE.FUGANTE, error_deg: haciaFuga };
  return { ...comun, tipo: TIPO_TRAZO_JEFE.FRONTAL, error_deg: deEje, vertical: esVertical(recta), cx: recta.cx, cy: recta.cy };
}

export function caraFrontal(clasificados) {
  const frontales = clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.FRONTAL);
  const verticales = frontales.filter((c) => c.vertical).map((c) => c.cx).sort((a, b) => a - b);
  const horizontales = frontales.filter((c) => !c.vertical).map((c) => c.cy).sort((a, b) => a - b);
  if (verticales.length < 2 || horizontales.length < 2) return null;
  const x = verticales[0];
  const y = horizontales[0];
  const w = verticales[verticales.length - 1] - x;
  const h = horizontales[horizontales.length - 1] - y;
  if (w < PUNTAJE.TRAZO_MIN_PX || h < PUNTAJE.TRAZO_MIN_PX) return null;
  return { x, y, w, h };
}

export function clasificarTrazosJefe(trazos, fuga) {
  const salida = [];
  let horizonteLibre = true;
  trazos.forEach((puntos, indice) => {
    if (trazoCorto(puntos)) { salida.push({ tipo: TIPO_TRAZO_JEFE.DESCARTADO, indice }); return; }
    if (pareceElipse(puntos)) { salida.push({ tipo: TIPO_TRAZO_JEFE.ELIPSE, indice, seguro: false }); return; }
    salida.push(clasificarLinea(puntos, indice, fuga, horizonteLibre));
    horizonteLibre = false;
  });
  const cara = caraFrontal(salida);
  for (const c of salida) {
    if (c.tipo !== TIPO_TRAZO_JEFE.ELIPSE) continue;
    const r = cara ? evaluarElipse(trazos[c.indice], cara) : null;
    c.cara = cara;
    c.elipse = r;
  }
  return salida;
}

export function metaPuntoDebil(punto, nivel) {
  const n = Math.max(1, Math.floor(nivel) || 1);
  const valor = punto.base + punto.paso * (n - 1);
  return punto.compara === COMPARA.MENOR_O_IGUAL ? Math.max(punto.limite, valor) : Math.min(punto.limite, valor);
}

function promedio(lista) {
  return lista.length ? lista.reduce((s, v) => s + v, 0) / lista.length : NaN;
}

export function cuentaJefe(clasificados) {
  const cuenta = (tipo) => clasificados.filter((c) => c.tipo === tipo).length;
  return {
    horizonte: cuenta(TIPO_TRAZO_JEFE.HORIZONTE),
    frontales: cuenta(TIPO_TRAZO_JEFE.FRONTAL),
    fugantes: cuenta(TIPO_TRAZO_JEFE.FUGANTE),
    elipses: cuenta(TIPO_TRAZO_JEFE.ELIPSE),
  };
}

export const CUPO_JEFE = Object.freeze({
  [TIPO_TRAZO_JEFE.HORIZONTE]: JEFE.minimoHorizonte,
  [TIPO_TRAZO_JEFE.FRONTAL]: JEFE.minimoFrontales,
  [TIPO_TRAZO_JEFE.FUGANTE]: JEFE.minimoFugantes,
  [TIPO_TRAZO_JEFE.ELIPSE]: JEFE.minimoElipses,
});

export function faltantesJefe(clasificados) {
  const n = cuentaJefe(clasificados);
  return {
    horizonte: Math.max(0, JEFE.minimoHorizonte - n.horizonte),
    frontales: Math.max(0, JEFE.minimoFrontales - n.frontales),
    fugantes: Math.max(0, JEFE.minimoFugantes - n.fugantes),
    elipses: Math.max(0, JEFE.minimoElipses - n.elipses),
  };
}

export function evaluarJefe(trazos, fuga, nivel) {
  const clasificados = clasificarTrazosJefe(trazos, fuga);
  const falta = faltantesJefe(clasificados);
  const listo = Object.values(falta).every((v) => v === 0);
  const deTipo = (tipo) => clasificados.filter((c) => c.tipo === tipo);
  const lineas = clasificados.filter((c) => c.tipo !== TIPO_TRAZO_JEFE.DESCARTADO && c.tipo !== TIPO_TRAZO_JEFE.ELIPSE);
  const elipses = deTipo(TIPO_TRAZO_JEFE.ELIPSE).filter((c) => c.elipse && c.elipse.valido);
  const medidas = {
    [PUNTO_DEBIL.HORIZONTE]: promedio(deTipo(TIPO_TRAZO_JEFE.HORIZONTE).map((c) => c.error_deg)),
    [PUNTO_DEBIL.FUGANTES]: promedio(deTipo(TIPO_TRAZO_JEFE.FUGANTE).map((c) => c.error_deg)),
    [PUNTO_DEBIL.FRONTALES]: promedio(deTipo(TIPO_TRAZO_JEFE.FRONTAL).map((c) => c.error_deg)),
    [PUNTO_DEBIL.SEGURIDAD]: lineas.length ? (lineas.filter((c) => c.seguro).length / lineas.length) * 100 : NaN,
    [PUNTO_DEBIL.ELIPSE]: elipses.length ? Math.max(...elipses.map((c) => c.elipse.puntaje)) * 100 : NaN,
  };
  const puntos = JEFE.puntosDebiles.map((punto) => {
    const meta = metaPuntoDebil(punto, nivel);
    const valor = medidas[punto.id];
    const roto = Number.isFinite(valor) && (punto.compara === COMPARA.MENOR_O_IGUAL ? valor <= meta : valor >= meta);
    return { id: punto.id, nombre: punto.nombre, corto: punto.corto, texto: punto.texto, media: punto.media, unidad: punto.unidad, compara: punto.compara, valor: Number.isFinite(valor) ? redondear(valor, 1) : null, meta: redondear(meta, 1), roto };
  });
  return { listo, falta, clasificados, puntos, vencido: listo && puntos.every((p) => p.roto) };
}

export function nivelAtaque(valor) {
  const v = clamp01(valor);
  let nivel = NIVEL_ATAQUE.DEBIL;
  NIVEL_ATAQUE.CORTES.forEach((corte, i) => { if (v >= corte) nivel = i + 1; });
  return nivel;
}

function recortarExtremos(lista) {
  const n = Math.floor(lista.length * ATAQUE.RECORTE_EXTREMOS);
  const medio = lista.slice(n, lista.length - n);
  return medio.length >= 2 ? medio : lista;
}

function variacion(lista) {
  if (lista.length < 2) return 0;
  const media = promedio(lista);
  if (!(media > 0)) return 0;
  const varianza = lista.reduce((s, v) => s + (v - media) * (v - media), 0) / lista.length;
  return Math.sqrt(varianza) / media;
}

export function velocidadesPorVentana(puntos) {
  const salida = [];
  let inicio = 0;
  for (let i = 1; i < puntos.length; i++) {
    const dt = puntos[i].t - puntos[inicio].t;
    if (!(dt >= ATAQUE.SEGURIDAD_VENTANA_MS)) continue;
    let largo = 0;
    for (let k = inicio + 1; k <= i; k++) largo += distancia(puntos[k - 1], puntos[k]);
    salida.push(largo / dt);
    inicio = i;
  }
  return salida;
}

export function contarPausas(velocidades) {
  let pausas = 0;
  let enPausa = false;
  for (const v of velocidades) {
    const lenta = v < ATAQUE.SEGURIDAD_PAUSA_PX_MS;
    if (lenta && !enPausa) pausas += 1;
    enPausa = lenta;
  }
  return pausas;
}

function valorSeguridad(puntos, repasos) {
  const velocidades = recortarExtremos(velocidadesPorVentana(puntos));
  const constancia = clamp01(1 - variacion(velocidades) / ATAQUE.SEGURIDAD_VARIACION_MAX);
  const ritmo = puntajeSeguridad(velocidad(puntos));
  return Math.min(constancia, ritmo) * factorRepasos(repasos) * Math.pow(ATAQUE.SEGURIDAD_PENALIZACION_PAUSA, contarPausas(velocidades));
}

function valorPresion(puntos, presiones) {
  const conLapiz = Array.isArray(presiones) && presiones.length === puntos.length && presiones.every((v) => Number.isFinite(v));
  const lista = conLapiz
    ? presiones
    : velocidadesPorVentana(puntos).map((v) => 1 - Math.min(1, v / ATAQUE.PRESION_VELOCIDAD_REF_PX_MS) * 0.5);
  return { valor: clamp01(1 - variacion(recortarExtremos(lista)) / ATAQUE.PRESION_VARIACION_MAX), lapiz: conLapiz };
}

function centroide(puntos) {
  let x = 0;
  let y = 0;
  for (const p of puntos) { x += p.x; y += p.y; }
  return { x: x / puntos.length, y: y / puntos.length };
}

function valoresLinea(c, puntos, escena, cara) {
  const { recta, largo } = rectitudPct(puntos);
  const rectitud = clamp01(1 - c.rectitud_pct / ATAQUE.RECTITUD_MAX_PCT);
  const eje = clamp01(1 - c.error_deg / ATAQUE.PROPORCION_EJE_MAX_DEG);
  if (c.tipo === TIPO_TRAZO_JEFE.HORIZONTE) {
    const d = distanciaARecta(escena.fuga, { x: recta.cx, y: recta.cy }, { x: recta.cx + recta.ux, y: recta.cy + recta.uy });
    return { precision: clamp01(1 - d / (escena.lado * ATAQUE.PRECISION_HORIZONTE_MAX)), rectitud, proporcion: eje };
  }
  if (c.tipo === TIPO_TRAZO_JEFE.FUGANTE) {
    const inicio = puntos[0];
    const fin = puntos[puntos.length - 1];
    const cerca = distancia(inicio, escena.fuga) >= distancia(fin, escena.fuga) ? inicio : fin;
    const total = distancia(cerca, escena.fuga);
    const razon = total > 0 ? largo / total : 0;
    const fuera = Math.max(0, Math.abs(razon - ESCENA_JEFE.FONDO) - ATAQUE.PROPORCION_FONDO_BANDA);
    return {
      precision: clamp01(1 - c.error_deg / ATAQUE.PRECISION_FUGA_MAX_DEG),
      rectitud,
      proporcion: clamp01(1 - fuera / ATAQUE.PROPORCION_FONDO_CAIDA),
    };
  }
  const desfase = Math.abs((escena.centro.x - recta.cx) * recta.ux + (escena.centro.y - recta.cy) * recta.uy);
  const precision = largo > 0 ? clamp01(1 - desfase / (largo / 2) / ATAQUE.PRECISION_FRONTAL_MAX) : 0;
  const referencia = cara ? (c.vertical ? cara.h : cara.w) : escena.lado;
  const tamano = referencia > 0 ? clamp01(1 - Math.abs(largo - referencia) / referencia / ATAQUE.PROPORCION_LADO_MAX) : 0;
  return { precision, rectitud, proporcion: (eje + tamano) / 2 };
}

function valoresElipse(c, puntos, escena) {
  const r = c.elipse;
  if (!r || !r.valido) return { precision: 0, rectitud: 0, proporcion: 0 };
  const cara = c.cara;
  const centro = cara ? { x: cara.x + cara.w / 2, y: cara.y + cara.h / 2 } : escena.centro;
  const semieje = cara ? (cara.w + cara.h) / 4 : escena.lado / 2;
  const desfase = distancia(centroide(puntos), centro);
  const cobertura = clamp01((r.cobertura_deg - PUNTAJE.ELIPSE_COBERTURA_MIN_DEG) / (PUNTAJE.ELIPSE_COBERTURA_OK_DEG - PUNTAJE.ELIPSE_COBERTURA_MIN_DEG));
  return {
    precision: semieje > 0 ? clamp01(1 - desfase / semieje / ATAQUE.PRECISION_ELIPSE_MAX) : 0,
    rectitud: clamp01(1 - r.temblor_deg / ATAQUE.RECTITUD_ELIPSE_TEMBLOR_MAX_DEG),
    proporcion: clamp01(1 - r.ajuste_pct / ATAQUE.PROPORCION_ELIPSE_AJUSTE_MAX_PCT) * cobertura,
  };
}

export function calificarAtaque(c, puntos, escena, clasificados = [], presiones = null) {
  if (!c || c.tipo === TIPO_TRAZO_JEFE.DESCARTADO || trazoCorto(puntos)) return null;
  const esElipse = c.tipo === TIPO_TRAZO_JEFE.ELIPSE;
  const base = esElipse ? valoresElipse(c, puntos, escena) : valoresLinea(c, puntos, escena, caraFrontal(clasificados));
  const presion = valorPresion(puntos, presiones);
  const valores = {
    [DIMENSION.PRECISION]: base.precision,
    [DIMENSION.RECTITUD]: base.rectitud,
    [DIMENSION.SEGURIDAD]: valorSeguridad(puntos, esElipse ? 0 : c.repasos || 0),
    [DIMENSION.PROPORCION]: base.proporcion,
    [DIMENSION.PRESION]: presion.valor,
  };
  return armarAtaque(valores, c.tipo, presion.lapiz);
}

function armarAtaque(valores, tipo, lapiz) {
  const limpios = Object.fromEntries(DIMENSIONES.map((d) => [d.id, redondear(clamp01(valores[d.id]), 3)]));
  return { tipo, lapiz, valores: limpios, niveles: DIMENSIONES.map((d) => nivelAtaque(limpios[d.id])) };
}

export function combinarAtaques(ataques) {
  const lista = ataques.filter(Boolean);
  if (!lista.length) return null;
  const valores = Object.fromEntries(DIMENSIONES.map((d) => [d.id, promedio(lista.map((a) => a.valores[d.id]))]));
  return { ...armarAtaque(valores, "final", lista.some((a) => a.lapiz)), final: true, ataques: lista.length };
}
