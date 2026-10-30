import { TECNICA, TECNICAS, METRICA_PRINCIPAL, NIVEL, MINIMOS_CAPITULO, SESION, SAVE_VERSION, MEJORA } from "./config.js";
import { TIPO_STAT } from "./meta.js";

export const STATS = Object.freeze({
  trazos_total: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "trazos medidos" },
  oleadas_jugadas: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "oleadas jugadas" },
  oleadas_ganadas: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "oleadas ganadas" },
  monstruos_vencidos: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "monstruos vencidos" },
  jefes_vencidos: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "victorias contra jefes" },
  dias_practica: { tipo: TIPO_STAT.TOTAL_ACUMULADO, unidad: "días con al menos una oleada terminada, no seguidos" },
  mejor_puntaje_linea_pct: { tipo: TIPO_STAT.MEJOR_MARCA, unidad: "mejor puntaje de una línea, en porcentaje" },
  nivel_linea: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de líneas, 1 a 5" },
  nivel_elipse: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de elipses, 1 a 5" },
  nivel_perspectiva: { tipo: TIPO_STAT.VALOR_ACTUAL, unidad: "nivel actual de perspectiva, 1 a 5" },
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
    contadores: { trazos: 0, oleadasJugadas: 0, oleadasGanadas: 0, monstruos: 0, jefes: 0, mejorLinea: 0, diasPractica: 0 },
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

export function normalizarEstado(raw) {
  const base = estadoInicial();
  if (!esObjeto(raw) || raw.v !== SAVE_VERSION) return base;
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
  return base;
}

export function cargar(storage, clave) {
  try {
    const raw = storage.getItem(clave);
    return normalizarEstado(raw ? JSON.parse(raw) : null);
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

export function nivelJugador(estado) {
  const niveles = TECNICAS.map((t) => nivelTecnica(estado, t));
  return Math.max(1, Math.floor(niveles.reduce((s, n) => s + n, 0) / niveles.length));
}

export function minimosCapitulo(estado) {
  return TECNICAS.map((t) => {
    const req = MINIMOS_CAPITULO[t];
    const prom = promedioMovil(estado, t);
    const trazos = estado.intentos[t];
    const cumple = trazos >= req.trazos && Number.isFinite(prom.metrica) && prom.metrica <= req.maximo;
    return { tecnica: t, trazos, requeridos: req.trazos, metrica: prom.metrica, maximo: req.maximo, unidad: METRICA_PRINCIPAL[t].unidad, cumple };
  });
}

export function jefeDesbloqueado(estado) {
  return minimosCapitulo(estado).every((m) => m.cumple);
}

export function tecnicaMasDebil(estado) {
  let peor = TECNICA.LINEA;
  let peorValor = Infinity;
  for (const t of TECNICAS) {
    const prom = promedioMovil(estado, t);
    const valor = prom.muestras < NIVEL.MUESTRAS_MIN ? -1 + prom.muestras / 100 : prom.puntaje;
    if (valor < peorValor) { peorValor = valor; peor = t; }
  }
  return peor;
}

export function siguienteMejora(estado) {
  let elegida = null;
  for (const t of TECNICAS) {
    const nivel = estado.mejoras[t] || 0;
    if (nivel >= MEJORA.MAX) continue;
    if (elegida === null || nivel < estado.mejoras[elegida]) elegida = t;
  }
  return elegida;
}

export function progresoTinta(estado) {
  if (siguienteMejora(estado) === null) return null;
  return Math.min(MEJORA.TINTA_POR_NIVEL - 1, Math.floor(estado.tinta));
}

export function subirConTinta(estado) {
  const subidas = [];
  let t = siguienteMejora(estado);
  while (t !== null && estado.tinta >= MEJORA.TINTA_POR_NIVEL) {
    estado.tinta -= MEJORA.TINTA_POR_NIVEL;
    estado.mejoras[t] += 1;
    subidas.push({ tecnica: t, nivel: estado.mejoras[t] });
    t = siguienteMejora(estado);
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

export function registrarJefe(estado, vencido, recompensa) {
  if (!vencido) return estado;
  estado.contadores.jefes += 1;
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
    dias_practica: estado.contadores.diasPractica,
    mejor_puntaje_linea_pct: estado.contadores.mejorLinea,
    nivel_linea: nivelTecnica(estado, TECNICA.LINEA),
    nivel_elipse: nivelTecnica(estado, TECNICA.ELIPSE),
    nivel_perspectiva: nivelTecnica(estado, TECNICA.PERSPECTIVA),
    tinta: estado.tinta,
    tutorial_completado: estado.tutorialVisto ? 1 : 0,
  };
}

export function logrosDe(stats) {
  return LOGROS.filter((l) => l.cumple(stats)).map((l) => l.id);
}
