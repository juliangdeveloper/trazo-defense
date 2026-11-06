import { TECNICA, TECNICAS, TECNICAS_CAPITULO, METRICA_PRINCIPAL, NIVEL, MINIMOS_CAPITULO, SESION, SAVE_VERSION, MEJORA, CAPITULO, TORRE } from "./config.js";
import { TIPO_STAT } from "./meta.js";

export const STATS = Object.freeze({
  trazos_total: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "trazos medidos" },
  oleadas_jugadas: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "oleadas jugadas" },
  oleadas_ganadas: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "oleadas ganadas" },
  monstruos_vencidos: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "monstruos vencidos" },
  jefes_vencidos: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "victorias contra jefes del capítulo 1" },
  jefes_cap2: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "victorias contra jefes del capítulo 2" },
  dias_practica: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "días con al menos una oleada terminada, no seguidos" },
  mejor_puntaje_linea_pct: { tipo: TIPO_STAT.MEJOR_MARCA, unidad: "mejor puntaje de una línea, en porcentaje" },
  nivel_linea: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de líneas, 1 a 5" },
  nivel_elipse: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de elipses, 1 a 5" },
  nivel_perspectiva: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de perspectiva, 1 a 5" },
  nivel_salchichas: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de salchichas, 1 a 5" },
  nivel_formas: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de formas, 1 a 5" },
  nivel_mixta: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de mixtas, 1 a 5" },
  tinta: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "tinta disponible" },
  tutorial_completado: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "tutorial completado: 1 sí, 0 no" },
});

export const LOGROS = Object.freeze([
  Object.freeze({ id: "primer_trazo", cumple: (s) => s.trazos_total >= 1 }),
  Object.freeze({ id: "primera_oleada", cumple: (s) => s.oleadas_ganadas >= 1 }),
  Object.freeze({ id: "trazos_100", cumple: (s) => s.trazos_total >= 100 }),
  Object.freeze({ id: "linea_nivel_3", cumple: (s) => s.nivel_linea >= 3 }),
  Object.freeze({ id: "elipse_nivel_3", cumple: (s) => s.nivel_elipse >= 3 }),
  Object.freeze({ id: "perspectiva_nivel_3", cumple: (s) => s.nivel_perspectiva >= 3 }),
  Object.freeze({ id: "jefe_punto_fuga", cumple: (s) => s.jefes_vencidos >= 1 }),
  Object.freeze({ id: "salchichas_nivel_3", cumple: (s) => s.nivel_salchichas >= 3 }),
  Object.freeze({ id: "jefe_intersecciones", cumple: (s) => s.jefes_cap2 >= 1 }),
  Object.freeze({ id: "dias_practica_7", cumple: (s) => s.dias_practica >= 7 }),
]);

function mapaTecnicas(crear) {
  const salida = {};
  for (const t of TECNICAS) salida[t] = crear(t);
  return salida;
}

export function estadoInicial() {
  return {
    v: SAVE_VERSION,
    tinta: 0,
    mejoras: mapaTecnicas(() => 0),
    recientes: mapaTecnicas(() => []),
    intentos: mapaTecnicas(() => 0),
    historial: mapaTecnicas(() => ({})),
    contadores: { trazos: 0, oleadasJugadas: 0, oleadasGanadas: 0, monstruos: 0, jefes: 0, jefesCap2: 0, mejorLinea: 0, diasPractica: 0 },
    capitulo: CAPITULO.UNO,
    ultimoBonus: "",
    tutorialVisto: false,
  };
}

function numero(v, defecto) {
  return typeof v === "number" && Number.isFinite(v) ? v : defecto;
}

function esObjeto(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function migrarV1(raw) {
  const base = estadoInicial();
  base.tinta = Math.max(0, numero(raw.tinta, 0));
  for (const t of [TECNICA.LINEA, TECNICA.ELIPSE, TECNICA.PERSPECTIVA]) {
    base.mejoras[t] = Math.min(MEJORA.MAX, Math.max(0, Math.floor(numero(esObjeto(raw.mejoras) ? raw.mejoras[t] : 0, 0))));
    const lista = esObjeto(raw.recientes) && Array.isArray(raw.recientes[t]) ? raw.recientes[t] : [];
    base.recientes[t] = lista.filter((r) => esObjeto(r) && Number.isFinite(r.p) && Number.isFinite(r.m)).slice(-NIVEL.VENTANA);
    base.intentos[t] = Math.max(0, numero(esObjeto(raw.intentos) ? raw.intentos[t] : 0, 0));
    const hist = esObjeto(raw.historial) && esObjeto(raw.historial[t]) ? raw.historial[t] : {};
    for (const dia of Object.keys(hist)) {
      const d = hist[dia];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && esObjeto(d) && Number.isFinite(d.n) && Number.isFinite(d.suma) && d.n > 0) base.historial[t][dia] = { n: d.n, suma: d.suma };
    }
  }
  if (esObjeto(raw.contadores)) {
    for (const k of Object.keys(base.contadores)) {
      if (k === "jefesCap2") continue;
      base.contadores[k] = Math.max(0, numero(raw.contadores[k], 0));
    }
  }
  base.ultimoBonus = typeof raw.ultimoBonus === "string" ? raw.ultimoBonus : "";
  base.tutorialVisto = raw.tutorialVisto === true;
  base.capitulo = CAPITULO.UNO;
  if (capitulo2Desbloqueado(base)) base.capitulo = CAPITULO.DOS;
  return base;
}

function migrarV2(raw) {
  const base = estadoInicial();
  base.tinta = Math.max(0, numero(raw.tinta, 0));
  const mapa = { flecha: "salchichas", salchicha: "formas", caja2p: "mixta", linea: "linea", elipse: "elipse", perspectiva: "perspectiva" };
  for (const t of TECNICAS) {
    const origen = Object.keys(mapa).find((k) => mapa[k] === t) || t;
    const claveOld = origen;
    base.mejoras[t] = Math.min(MEJORA.MAX, Math.max(0, Math.floor(numero(esObjeto(raw.mejoras) ? raw.mejoras[claveOld] : 0, 0))));
    const lista = esObjeto(raw.recientes) && Array.isArray(raw.recientes[claveOld]) ? raw.recientes[claveOld] : [];
    base.recientes[t] = lista.filter((r) => esObjeto(r) && Number.isFinite(r.p) && Number.isFinite(r.m)).slice(-NIVEL.VENTANA);
    base.intentos[t] = Math.max(0, numero(esObjeto(raw.intentos) ? raw.intentos[claveOld] : 0, 0));
    const hist = esObjeto(raw.historial) && esObjeto(raw.historial[claveOld]) ? raw.historial[claveOld] : {};
    for (const dia of Object.keys(hist)) {
      const d = hist[dia];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && esObjeto(d) && Number.isFinite(d.n) && Number.isFinite(d.suma) && d.n > 0) base.historial[t][dia] = { n: d.n, suma: d.suma };
    }
  }
  if (esObjeto(raw.contadores)) {
    for (const k of Object.keys(base.contadores)) base.contadores[k] = Math.max(0, numero(raw.contadores[k], 0));
  }
  base.ultimoBonus = typeof raw.ultimoBonus === "string" ? raw.ultimoBonus : "";
  base.tutorialVisto = raw.tutorialVisto === true;
  const cap = numero(raw.capitulo, CAPITULO.UNO);
  base.capitulo = cap === CAPITULO.DOS ? CAPITULO.DOS : CAPITULO.UNO;
  return base;
}

export function normalizarEstado(raw) {
  if (!esObjeto(raw)) return estadoInicial();
  if (raw.v === 1) return migrarV1(raw);
  if (raw.v === 2) return migrarV2(raw);
  if (raw.v !== SAVE_VERSION) return estadoInicial();
  const base = estadoInicial();
  base.tinta = Math.max(0, numero(raw.tinta, 0));
  for (const t of TECNICAS) {
    base.mejoras[t] = Math.min(MEJORA.MAX, Math.max(0, Math.floor(numero(esObjeto(raw.mejoras) ? raw.mejoras[t] : 0, 0))));
    const lista = esObjeto(raw.recientes) && Array.isArray(raw.recientes[t]) ? raw.recientes[t] : [];
    base.recientes[t] = lista.filter((r) => esObjeto(r) && Number.isFinite(r.p) && Number.isFinite(r.m)).slice(-NIVEL.VENTANA);
    base.intentos[t] = Math.max(0, numero(esObjeto(raw.intentos) ? raw.intentos[t] : 0, 0));
    const hist = esObjeto(raw.historial) && esObjeto(raw.historial[t]) ? raw.historial[t] : {};
    for (const dia of Object.keys(hist)) {
      const d = hist[dia];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && esObjeto(d) && Number.isFinite(d.n) && Number.isFinite(d.suma) && d.n > 0) base.historial[t][dia] = { n: d.n, suma: d.suma };
    }
  }
  if (esObjeto(raw.contadores)) {
    for (const k of Object.keys(base.contadores)) base.contadores[k] = Math.max(0, numero(raw.contadores[k], 0));
  }
  base.ultimoBonus = typeof raw.ultimoBonus === "string" ? raw.ultimoBonus : "";
  base.tutorialVisto = raw.tutorialVisto === true;
  const cap = numero(raw.capitulo, CAPITULO.UNO);
  base.capitulo = cap === CAPITULO.DOS ? CAPITULO.DOS : CAPITULO.UNO;
  return base;
}

export function cargar(storage, clave) {
  try {
    const raw = storage.getItem(clave);
    const parsed = raw ? JSON.parse(raw) : null;
    const estado = normalizarEstado(parsed);
    if (parsed && typeof parsed === "object" && parsed.v !== estado.v) {
      try { storage.setItem(clave, JSON.stringify(estado)); } catch (e) {}
    }
    return estado;
  } catch (e) {
    return estadoInicial();
  }
}

export function guardar(storage, clave, estado) {
  try {
    storage.setItem(clave, JSON.stringify(estado));
    return true;
  } catch (e) {
    return false;
  }
}

export function diaLocal(fecha) {
  const f = fecha instanceof Date ? fecha : new Date(fecha);
  const dos = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
}

function recortarHistorial(hist) {
  const dias = Object.keys(hist).sort();
  while (dias.length > NIVEL.DIAS_HISTORIAL) delete hist[dias.shift()];
}

export function tecnicasDe(capitulo) {
  return TECNICAS_CAPITULO[capitulo] || TECNICAS_CAPITULO[CAPITULO.UNO];
}

export function registrarTrazo(estado, tecnica, resultado, fecha) {
  if (!resultado || !resultado.valido || !TECNICAS.includes(tecnica)) return estado;
  const metrica = resultado[METRICA_PRINCIPAL[tecnica].clave];
  if (!Number.isFinite(metrica)) return estado;
  const lista = estado.recientes[tecnica];
  lista.push({ p: resultado.puntaje, m: metrica });
  while (lista.length > NIVEL.VENTANA) lista.shift();
  estado.intentos[tecnica] += 1;
  const dia = diaLocal(fecha || new Date());
  const hist = estado.historial[tecnica];
  const actual = hist[dia] || { n: 0, suma: 0 };
  hist[dia] = { n: actual.n + 1, suma: Math.round((actual.suma + metrica) * 1000) / 1000 };
  recortarHistorial(hist);
  estado.contadores.trazos += 1;
  if (tecnica === TECNICA.LINEA) estado.contadores.mejorLinea = Math.max(estado.contadores.mejorLinea, Math.round(resultado.puntaje * 100));
  return estado;
}

export function promedioMovil(estado, tecnica) {
  const lista = estado.recientes[tecnica] || [];
  if (!lista.length) return { puntaje: NaN, metrica: NaN, muestras: 0 };
  let p = 0;
  let m = 0;
  for (const r of lista) { p += r.p; m += r.m; }
  return { puntaje: p / lista.length, metrica: m / lista.length, muestras: lista.length };
}

export function nivelDesdePuntaje(puntaje, muestras) {
  if (muestras < NIVEL.MUESTRAS_MIN || !Number.isFinite(puntaje)) return 1;
  let nivel = 1;
  for (const corte of NIVEL.CORTES) if (puntaje >= corte) nivel += 1;
  return Math.min(NIVEL.MAX, nivel);
}

export function nivelTecnica(estado, tecnica) {
  const prom = promedioMovil(estado, tecnica);
  return nivelDesdePuntaje(prom.puntaje, prom.muestras);
}

export function nivelJugador(estado, capitulo = estado.capitulo) {
  const lista = tecnicasDe(capitulo);
  const niveles = lista.map((t) => nivelTecnica(estado, t));
  return Math.max(1, Math.floor(niveles.reduce((s, n) => s + n, 0) / niveles.length));
}

export function minimosCapitulo(estado, capitulo = estado.capitulo) {
  const reqs = MINIMOS_CAPITULO[capitulo] || MINIMOS_CAPITULO[CAPITULO.UNO];
  return tecnicasDe(capitulo).map((t) => {
    const req = reqs[t];
    const prom = promedioMovil(estado, t);
    const trazos = estado.intentos[t];
    const cumple = trazos >= req.trazos && Number.isFinite(prom.metrica) && prom.metrica <= req.maximo;
    return { tecnica: t, trazos, requeridos: req.trazos, metrica: prom.metrica, maximo: req.maximo, unidad: METRICA_PRINCIPAL[t].unidad, cumple };
  });
}

export function jefeDesbloqueado(estado, capitulo = estado.capitulo) {
  return minimosCapitulo(estado, capitulo).every((m) => m.cumple);
}

export function capitulo2Desbloqueado(estado) {
  return estado.contadores.jefes >= 1 && jefeDesbloqueado(estado, CAPITULO.UNO);
}

export function elegirCapitulo(estado, capitulo) {
  if (capitulo !== CAPITULO.UNO && capitulo !== CAPITULO.DOS) return false;
  estado.capitulo = capitulo;
  return true;
}

export function tecnicaMasDebil(estado, capitulo = estado.capitulo) {
  const lista = tecnicasDe(capitulo);
  let peor = lista[0];
  let peorValor = Infinity;
  for (const t of lista) {
    const prom = promedioMovil(estado, t);
    const valor = prom.muestras < NIVEL.MUESTRAS_MIN ? -1 + prom.muestras / 100 : prom.puntaje;
    if (valor < peorValor) { peorValor = valor; peor = t; }
  }
  return peor;
}

export function siguienteMejora(estado, capitulo = estado.capitulo) {
  let elegida = null;
  for (const t of tecnicasDe(capitulo)) {
    const nivel = estado.mejoras[t] || 0;
    if (nivel >= MEJORA.MAX) continue;
    if (elegida === null || nivel < estado.mejoras[elegida]) elegida = t;
  }
  return elegida;
}

export function progresoTinta(estado, capitulo = estado.capitulo) {
  if (siguienteMejora(estado, capitulo) === null) return null;
  return Math.min(MEJORA.TINTA_POR_NIVEL - 1, Math.floor(estado.tinta));
}

export function subirConTinta(estado, capitulo = estado.capitulo) {
  const subidas = [];
  let t = siguienteMejora(estado, capitulo);
  while (t !== null && estado.tinta >= MEJORA.TINTA_POR_NIVEL) {
    estado.tinta -= MEJORA.TINTA_POR_NIVEL;
    estado.mejoras[t] += 1;
    subidas.push({ tecnica: t, nivel: estado.mejoras[t] });
    t = siguienteMejora(estado, capitulo);
  }
  return subidas;
}

export function bonusDisponible(estado, fecha) {
  return estado.ultimoBonus !== diaLocal(fecha || new Date());
}

export function completarSesion(estado, fecha) {
  const dia = diaLocal(fecha || new Date());
  if (estado.ultimoBonus === dia) return 0;
  estado.ultimoBonus = dia;
  estado.contadores.diasPractica += 1;
  estado.tinta += SESION.BONUS_TINTA;
  return SESION.BONUS_TINTA;
}

export function registrarOleada(estado, { ganada, monstruos, tinta }) {
  estado.contadores.oleadasJugadas += 1;
  if (ganada) estado.contadores.oleadasGanadas += 1;
  estado.contadores.monstruos += Math.max(0, monstruos || 0);
  estado.tinta += Math.max(0, tinta || 0);
  return estado;
}

export function registrarJefe(estado, vencido, recompensa, capitulo = CAPITULO.UNO) {
  if (!vencido) return estado;
  if (capitulo === CAPITULO.DOS) estado.contadores.jefesCap2 += 1;
  else estado.contadores.jefes += 1;
  estado.tinta += Math.max(0, recompensa || 0);
  return estado;
}

export function curva(estado, tecnica) {
  const hist = estado.historial[tecnica] || {};
  return Object.keys(hist).sort().map((dia) => ({ dia, valor: hist[dia].suma / hist[dia].n, n: hist[dia].n }));
}

export function statsMeta(estado) {
  return {
    trazos_total: estado.contadores.trazos,
    oleadas_jugadas: estado.contadores.oleadasJugadas,
    oleadas_ganadas: estado.contadores.oleadasGanadas,
    monstruos_vencidos: estado.contadores.monstruos,
    jefes_vencidos: estado.contadores.jefes,
    jefes_cap2: estado.contadores.jefesCap2,
    dias_practica: estado.contadores.diasPractica,
    mejor_puntaje_linea_pct: estado.contadores.mejorLinea,
    nivel_linea: nivelTecnica(estado, TECNICA.LINEA),
    nivel_elipse: nivelTecnica(estado, TECNICA.ELIPSE),
    nivel_perspectiva: nivelTecnica(estado, TECNICA.PERSPECTIVA),
    nivel_salchichas: nivelTecnica(estado, TECNICA.SALCHICHAS),
    nivel_formas: nivelTecnica(estado, TECNICA.FORMAS),
    nivel_mixta: nivelTecnica(estado, TECNICA.MIXTA),
    tinta: estado.tinta,
    tutorial_completado: estado.tutorialVisto ? 1 : 0,
  };
}

export function logrosDe(stats) {
  return LOGROS.filter((l) => l.cumple(stats)).map((l) => l.id);
}

export function nombreTorre(tecnica) {
  return TORRE[tecnica] ? TORRE[tecnica].corto : tecnica;
}
