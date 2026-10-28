import { PUNTAJE, JEFE, PUNTO_DEBIL, COMPARA } from "./config.js";

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

export const TIPO_TRAZO_JEFE = Object.freeze({ HORIZONTE: "horizonte", FUGANTE: "fugante", FRONTAL: "frontal", DESCARTADO: "descartado" });

export function desvioDeEje(recta) {
  const ang = Math.abs(Math.atan2(recta.uy, recta.ux) * GRADOS) % 180;
  return Math.min(ang, Math.abs(ang - 90), 180 - ang);
}

export function clasificarTrazosJefe(trazos, fuga) {
  return trazos.map((puntos, indice) => {
    if (trazoCorto(puntos)) return { tipo: TIPO_TRAZO_JEFE.DESCARTADO, indice };
    const { recta, pct, largo } = rectitudPct(puntos);
    const repasos = contarRepasos(puntos, recta.ux, recta.uy, largo);
    const seguro = pct <= JEFE.rectitudSeguraPct && repasos === 0 && puntajeSeguridad(velocidad(puntos)) >= 0.5;
    const comun = { indice, rectitud_pct: pct, repasos, seguro };
    if (indice === 0) {
      const ang = Math.abs(Math.atan2(recta.uy, recta.ux) * GRADOS) % 180;
      return { ...comun, tipo: TIPO_TRAZO_JEFE.HORIZONTE, error_deg: Math.min(ang, 180 - ang) };
    }
    const haciaFuga = desvioHaciaFuga(puntos, fuga);
    const deEje = desvioDeEje(recta);
    if (haciaFuga < deEje) return { ...comun, tipo: TIPO_TRAZO_JEFE.FUGANTE, error_deg: haciaFuga };
    return { ...comun, tipo: TIPO_TRAZO_JEFE.FRONTAL, error_deg: deEje };
  });
}

export function metaPuntoDebil(punto, nivel) {
  const n = Math.max(1, Math.floor(nivel) || 1);
  const valor = punto.base + punto.paso * (n - 1);
  return punto.compara === COMPARA.MENOR_O_IGUAL ? Math.max(punto.limite, valor) : Math.min(punto.limite, valor);
}

function promedio(lista) {
  return lista.length ? lista.reduce((s, v) => s + v, 0) / lista.length : NaN;
}

export function faltantesJefe(clasificados) {
  const fugantes = clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.FUGANTE).length;
  const frontales = clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.FRONTAL).length;
  const horizonte = clasificados.some((c) => c.tipo === TIPO_TRAZO_JEFE.HORIZONTE);
  return {
    horizonte: horizonte ? 0 : 1,
    fugantes: Math.max(0, JEFE.minimoFugantes - fugantes),
    frontales: Math.max(0, JEFE.minimoFrontales - frontales),
  };
}

export function evaluarJefe(trazos, fuga, nivel) {
  const clasificados = clasificarTrazosJefe(trazos, fuga);
  const falta = faltantesJefe(clasificados);
  const listo = falta.horizonte === 0 && falta.fugantes === 0 && falta.frontales === 0;
  const medidas = {
    [PUNTO_DEBIL.HORIZONTE]: promedio(clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.HORIZONTE).map((c) => c.error_deg)),
    [PUNTO_DEBIL.FUGANTES]: promedio(clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.FUGANTE).map((c) => c.error_deg)),
    [PUNTO_DEBIL.FRONTALES]: promedio(clasificados.filter((c) => c.tipo === TIPO_TRAZO_JEFE.FRONTAL).map((c) => c.error_deg)),
    [PUNTO_DEBIL.SEGURIDAD]: (() => {
      const validos = clasificados.filter((c) => c.tipo !== TIPO_TRAZO_JEFE.DESCARTADO);
      return validos.length ? (validos.filter((c) => c.seguro).length / validos.length) * 100 : NaN;
    })(),
  };
  const puntos = JEFE.puntosDebiles.map((punto) => {
    const meta = metaPuntoDebil(punto, nivel);
    const valor = medidas[punto.id];
    const roto = Number.isFinite(valor) && (punto.compara === COMPARA.MENOR_O_IGUAL ? valor <= meta : valor >= meta);
    return { id: punto.id, nombre: punto.nombre, texto: punto.texto, media: punto.media, unidad: punto.unidad, compara: punto.compara, valor: Number.isFinite(valor) ? redondear(valor, 1) : null, meta: redondear(meta, 1), roto };
  });
  return { listo, falta, clasificados, puntos, vencido: listo && puntos.every((p) => p.roto) };
}
