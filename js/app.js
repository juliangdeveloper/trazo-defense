import {
  APP_ID, APP_VERSION, SAVE_KEY, TECNICA, TECNICAS, TORRE, METRICA_PRINCIPAL, CAMINO, PUNTAJE,
  JEFE, COMPARA, PANTALLA, MODO, FASE_PUNTOS, PUNTO_FASE, FASES_NOMBRE, ESTADOS_NOMBRE, TIPOS_NOMBRE, TOTAL_FASES, OLEADA, MEJORA, CAMARA_LENTA, ZONA_DIBUJO, COLA,
  DEMO_JEFE, BATALLA_JEFE,
} from "./config.js";
import { PROYECTO, FASE, metaProyecto, metaUpdate, metaRead, crearEscritor } from "./meta.js";
import { evaluarLinea, evaluarElipse, evaluarFugante, asignarArista, resumenCubo, evaluarJefe, clasificarTrazosJefe, faltantesJefe, cuentaJefe, puntajeTrazoJefe, CUPO_JEFE, TIPO_TRAZO_JEFE } from "./geometry.js";
import {
  STATS, cargar, guardar, registrarTrazo, promedioMovil, nivelTecnica, nivelJugador, minimosCapitulo, jefeDesbloqueado,
  tecnicaMasDebil, siguienteMejora, progresoTinta, subirConTinta, completarSesion, registrarOleada, registrarJefe, curva, statsMeta, logrosDe,
} from "./progress.js";
import { crearOleada, actualizarOleada, objetivoPrincipal, elegirObjetivo, puntoEnCamino, danoDeTrazo, atacar, tipoMonstruo, efectoMejora, proximasTecnicas, danoTrazoJefe, danoPuntosDebiles, golpearJefe, cobrarTinta } from "./game.js";
import { crearEjercicio, escenaJefe, trazosDemoJefe, aristasCubo } from "./ejercicios.js";
import { crearTutorial, ACCION_TUTORIAL } from "./tutorial.js";

const COLOR = Object.freeze({
  TINTA: "#1f1d2b",
  TENUE: "#b9b3a6",
  GUIA: "#9aa3e8",
  ACENTO: "#4b5bd6",
  BIEN: "#2f8f5b",
  MAL: "#c0453a",
  CAMINO: "#e2d8c3",
  CAMINO_BORDE: "#d3c7ad",
  PAPEL: "#fffdf8",
});
const FEEDBACK_MS = 650;
const TRANSICION_MS = 300;
const MARCA_MS = 1200;
const MARCA_MARGEN = 8;
const MARCA_SEPARACION = 14;
const MARCA_EVITA_FUGA = 16;
const MARCA_PESO_FUGA = 1000;
const ETIQUETA_HORIZONTE = Object.freeze({ TEXTO: "horizonte", FUENTE: "11px -apple-system, system-ui, sans-serif", MARGEN: 8, ALTO: 18 });
const MARGEN_PISTA = 10;
const PROYECTIL_MS = 420;
const TEXTO_FLOTANTE_MS = 900;
const TOAST_MS = 3200;
const DT_MAX_MS = 50;
const CURVA_DIAS = 30;
const CAMPO_BASE = Object.freeze({ W: 350, H: 480, ESCALA_MAX: 1.8 });
const AVISO_MEJORA_MS = 1600;

function escalaCampo() {
  return Math.min(CAMPO_BASE.ESCALA_MAX, Math.max(1, Math.min(tamCampo.w / CAMPO_BASE.W, tamCampo.h / CAMPO_BASE.H)));
}

const $ = (sel) => document.querySelector(sel);

function almacen() {
  try {
    return globalThis.localStorage || null;
  } catch (e) {
    return null;
  }
}

const storage = almacen();
const estado = storage ? cargar(storage, SAVE_KEY) : cargar({ getItem: () => null }, SAVE_KEY);

const escritorMeta = crearEscritor(() => {
  const stats = statsMeta(estado);
  metaUpdate(APP_ID, APP_VERSION, { stats, logros: logrosDe(stats) }, { declare: STATS });
});

function persistir() {
  if (storage) guardar(storage, SAVE_KEY, estado);
  escritorMeta.pedir();
  pintarTinta();
}

const ui = {
  pantalla: PANTALLA.JUGAR,
  tecnica: TECNICA.LINEA,
  modo: MODO.LIBRE,
  ejercicio: null,
  trazo: null,
  feedback: null,
  bloqueoHasta: 0,
  oleada: null,
  numeroOleada: 1,
  proyectiles: [],
  textos: [],
  avisoMejora: null,
  objetivoBloqueado: null,
  redimPendiente: false,
  marca: null,
  avisos: {},
  demo: null,
  jefe: jefeVacio(),
};

function jefeVacio() {
  return { activo: false, trazos: [], nivel: 1, escena: null, resultado: null, bloqueoHasta: 0, vencido: false, rondaTimer: 0 };
}

function toast(texto) {
  const el = $("#toast");
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, TOAST_MS);
}

function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "text") el.textContent = v;
    else if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const hijo of hijos.flat()) if (hijo !== null && hijo !== undefined && hijo !== false) el.append(hijo);
  return el;
}

function fmt(v, dec = 1) {
  return Number.isFinite(v) ? v.toLocaleString("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : "–";
}

function ajustarCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width));
  const hh = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hh };
}

const campo = $("#campo");
const campoWrap = $("#campo-wrap");
const zonaDibujo = $("#pad-wrap");
zonaDibujo.style.top = `${ZONA_DIBUJO.ARRIBA * 100}%`;
zonaDibujo.style.height = `${(ZONA_DIBUJO.ABAJO - ZONA_DIBUJO.ARRIBA) * 100}%`;
const torresEl = $("#torres");
torresEl.style.top = `${ZONA_DIBUJO.ABAJO * 100}%`;
const pad = $("#pad");
let tamCampo = ajustarCanvas(campo);
let tamPad = ajustarCanvas(pad);

function pintarTinta() {
  $("#tinta-valor").textContent = String(Math.round(estado.tinta));
  pintarTorres();
}

function aplicarSubidas() {
  const subidas = subirConTinta(estado);
  if (!subidas.length) return subidas;
  const ultimas = {};
  for (const s of subidas) ultimas[s.tecnica] = s.nivel;
  const inicio = performance.now();
  for (const [t, nivel] of Object.entries(ultimas)) ui.avisos[t] = { texto: `M${nivel}: ${textoEfecto(nivel)}`, inicio };
  clearTimeout(aplicarSubidas.timer);
  aplicarSubidas.timer = setTimeout(() => { ui.avisos = {}; pintarTorres(); }, AVISO_MEJORA_MS);
  return subidas;
}

function abonarTinta(cantidad) {
  if (!(cantidad > 0)) return;
  estado.tinta += cantidad;
  aplicarSubidas();
  persistir();
}

function cuboEnCurso() {
  const ej = ui.ejercicio;
  return Boolean(ej && ej.tecnica === TECNICA.PERSPECTIVA && ej.hechos.length > 0 && ej.hechos.length < PUNTAJE.CUBO_LINEAS);
}

function tecnicaPedida() {
  if (ui.modo !== MODO.OLEADA || !ui.oleada) return null;
  const objetivo = objetivoPrincipal(ui.oleada);
  if (objetivo) return objetivo.tecnica;
  return ui.oleada.cola.length ? ui.oleada.cola[0].tecnica : null;
}

function seguirMonstruo() {
  const t = tecnicaPedida();
  if (!t || t === ui.tecnica) return;
  ui.tecnica = t;
  pintarTorres();
}

function nuevoEjercicio(forzar = false) {
  if (ui.jefe.activo) return;
  if (ui.trazo || (!forzar && cuboEnCurso())) return;
  seguirMonstruo();
  ui.ejercicio = null;
  pintarPista();
  pintarCola();
  const cabeza = $("#zona-cabeza");
  const arriba = cabeza.offsetTop + cabeza.offsetHeight + MARGEN_PISTA;
  ui.ejercicio = crearEjercicio(ui.tecnica, tamPad.w, tamPad.h, Math.random, arriba);
  pad.dataset.ejercicio = JSON.stringify(ui.ejercicio);
  pintarPista();
  pintarPad();
}

function textoPasoJefe() {
  const clas = clasificarTrazosJefe(ui.jefe.trazos, ui.jefe.escena.fuga);
  const falta = faltantesJefe(clas);
  const n = cuentaJefe(clas);
  if (falta.horizonte) return "Jefe · 1. Horizonte: una recta horizontal por el punto de fuga rojo.";
  if (falta.frontales) return `Jefe · 2. Cara frontal alrededor del punto azul: 2 horizontales y 2 verticales (${n.frontales}/${JEFE.minimoFrontales}).`;
  if (falta.fugantes) return `Jefe · 3. De cada esquina, una recta hacia el punto de fuga (${n.fugantes}/${JEFE.minimoFugantes}).`;
  if (falta.elipses) return "Jefe · 4. Elipse dentro de la cara frontal que toque sus 4 lados.";
  return "Jefe · Caja completa: mira los puntos débiles.";
}

const PASO_DEMO = Object.freeze({ horizonte: "1. horizonte", cara: "2. cara frontal", fuga: "3. líneas de fuga", elipse: "4. elipse en la cara" });

function pintarPista() {
  const pista = $("#pad-hint");
  if (ui.jefe.activo) {
    const demo = estadoDemo();
    pista.textContent = demo && demo.trazo ? `Demo · ${PASO_DEMO[demo.trazo.paso]}` : textoPasoJefe();
    return;
  }
  const textos = {
    [TECNICA.LINEA]: "Une los dos puntos en un solo trazo seguro.",
    [TECNICA.ELIPSE]: "Elipse que toque los 4 lados de la caja y cierre.",
    [TECNICA.PERSPECTIVA]: "Cierra el cubo: 3 rectas de las esquinas negras hacia el punto de fuga.",
  };
  let texto = textos[ui.tecnica];
  if (ui.tecnica === TECNICA.PERSPECTIVA) texto += ` ${ui.ejercicio && ui.ejercicio.tecnica === TECNICA.PERSPECTIVA ? ui.ejercicio.hechos.length : 0}/${PUNTAJE.CUBO_LINEAS}.`;
  if (ui.modo === MODO.LIBRE && !tutorial.activo()) texto += " Sin oleada: práctica.";
  pista.textContent = texto;
}

const ICONO_TECNICA = Object.freeze({
  [TECNICA.LINEA]: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18L19 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  [TECNICA.ELIPSE]: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="8.5" ry="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  [TECNICA.PERSPECTIVA]: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h9v9H4zM4 10l5-5h9l-5 5M13 19l5-5V5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
});

function colaActual() {
  if (ui.jefe.activo) return [];
  if (ui.modo === MODO.OLEADA && ui.oleada) return proximasTecnicas(ui.oleada, COLA.CANTIDAD);
  return Array.from({ length: COLA.CANTIDAD }, () => ui.tecnica);
}

function pintarCola() {
  const el = $("#cola");
  const lista = colaActual();
  const clave = lista.join(",");
  el.hidden = ui.jefe.activo;
  if (el.dataset.cola === clave) return;
  el.dataset.cola = clave;
  el.replaceChildren(h("span", { class: "cola-tit", text: "Luego" }), ...lista.map((t) => {
    const item = h("span", { class: "cola-item", "data-tecnica": t, title: TORRE[t].corto, "aria-label": TORRE[t].corto });
    item.innerHTML = ICONO_TECNICA[t];
    return item;
  }));
  el.setAttribute("aria-label", lista.length ? `Luego: ${lista.map((t) => TORRE[t].corto.toLowerCase()).join(", ")}` : "No vienen más ejercicios");
}

function punto(ctx, p, radio, color, lleno = true) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, radio, 0, Math.PI * 2);
  if (lleno) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
}

function trazar(ctx, puntos, color, ancho) {
  if (!puntos || puntos.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = ancho;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(puntos[0].x, puntos[0].y);
  for (let i = 1; i < puntos.length; i++) ctx.lineTo(puntos[i].x, puntos[i].y);
  ctx.stroke();
}

function pintarEjercicio(ctx, ej, mostrarIdeal) {
  if (!ej) return;
  if (ej.tecnica === TECNICA.LINEA) {
    if (mostrarIdeal) {
      ctx.setLineDash([6, 6]);
      trazar(ctx, [ej.a, ej.b], COLOR.GUIA, 2);
      ctx.setLineDash([]);
    }
    for (const p of [ej.a, ej.b]) { punto(ctx, p, 11, "rgba(75,91,214,0.14)"); punto(ctx, p, 5, COLOR.ACENTO); }
  } else if (ej.tecnica === TECNICA.ELIPSE) {
    const c = ej.caja;
    ctx.strokeStyle = COLOR.TENUE;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.setLineDash([]);
    if (mostrarIdeal) {
      ctx.strokeStyle = COLOR.GUIA;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (ej.tecnica === TECNICA.PERSPECTIVA) {
    pintarCubo(ctx, ej, mostrarIdeal);
  }
}

function colorPuntaje(p) {
  return p >= 0.7 ? COLOR.BIEN : p < 0.4 ? COLOR.MAL : COLOR.TINTA;
}

function pintarCubo(ctx, ej, mostrarIdeal) {
  ctx.strokeStyle = COLOR.TENUE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, ej.fuga.y);
  ctx.lineTo(tamPad.w, ej.fuga.y);
  ctx.stroke();
  ctx.fillStyle = COLOR.TENUE;
  ctx.font = ETIQUETA_HORIZONTE.FUENTE;
  ctx.textAlign = ej.fuga.x > tamPad.w / 2 ? "left" : "right";
  ctx.textBaseline = "top";
  ctx.fillText(ETIQUETA_HORIZONTE.TEXTO, ej.fuga.x > tamPad.w / 2 ? ETIQUETA_HORIZONTE.MARGEN : tamPad.w - ETIQUETA_HORIZONTE.MARGEN, ej.fuga.y + 4);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  const aristas = aristasCubo(ej);
  if (mostrarIdeal) {
    ctx.setLineDash([5, 6]);
    for (const a of aristas) trazar(ctx, [a.desde, ej.fuga], COLOR.GUIA, 1.5);
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = COLOR.TINTA;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ej.frente.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    if (ej.visibles.includes(i) && ej.visibles.includes(j)) trazar(ctx, [ej.fondo[i], ej.fondo[j]], COLOR.TINTA, 2);
  }
  const hechas = ej.hechos.map((x) => x.arista);
  aristas.forEach((a, i) => {
    if (hechas.includes(i)) return;
    punto(ctx, a.desde, 4.5, COLOR.TINTA);
    punto(ctx, a.hasta, 4, COLOR.TINTA, false);
  });
  for (const x of ej.hechos) trazar(ctx, x.puntos, colorPuntaje(x.r.puntaje), 3);
  punto(ctx, ej.fuga, 12, "rgba(192,69,58,0.14)");
  punto(ctx, ej.fuga, 5, COLOR.MAL);
}

function pintarPad() {
  const { ctx, w, h: alto } = tamPad;
  ctx.clearRect(0, 0, w, alto);
  ctx.fillStyle = "rgba(255,253,248,0.56)";
  ctx.fillRect(0, 0, w, alto);
  ctx.fillStyle = "rgba(31,29,43,0.12)";
  for (let x = 16; x < w; x += 24) for (let y = 16; y < alto; y += 24) ctx.fillRect(x, y, 1.2, 1.2);
  const fb = ui.feedback;
  if (ui.jefe.activo) {
    pintarEscenaJefe(ctx);
  } else if (fb) {
    pintarEjercicio(ctx, fb.ejercicio, true);
    trazar(ctx, fb.trazo, fb.color, 3);
  } else {
    pintarEjercicio(ctx, ui.ejercicio, false);
    if (ui.trazo) trazar(ctx, ui.trazo, COLOR.TINTA, 3);
  }
  pintarMarca(ctx, w, alto);
}

function pintarMarca(ctx, w, alto) {
  const m = ui.marca;
  if (!m) return;
  const pasado = performance.now() - m.inicio;
  if (pasado >= MARCA_MS) { ui.marca = null; delete pad.dataset.marca; return; }
  ctx.save();
  ctx.globalAlpha = pasado < MARCA_MS * 0.6 ? 1 : 1 - (pasado - MARCA_MS * 0.6) / (MARCA_MS * 0.4);
  ctx.font = "800 30px -apple-system, system-ui, sans-serif";
  const anchoGrande = ctx.measureText(m.grande).width;
  ctx.font = "800 18px -apple-system, system-ui, sans-serif";
  const anchoExtra = m.extra ? ctx.measureText(m.extra).width + 6 : 0;
  ctx.font = "600 13px -apple-system, system-ui, sans-serif";
  const anchoChico = ctx.measureText(m.chico).width;
  const caja = { w: Math.max(anchoGrande + anchoExtra, anchoChico) + 20, h: 60 };
  const { x, y } = posicionMarca(ctx, m, caja, w, alto);
  ctx.fillStyle = "rgba(255,253,248,0.92)";
  ctx.strokeStyle = m.color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, caja.w, caja.h, 12);
  else ctx.rect(x, y, caja.w, caja.h);
  ctx.fill();
  ctx.stroke();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = m.color;
  ctx.font = "800 30px -apple-system, system-ui, sans-serif";
  const inicioX = x + (caja.w - anchoGrande - anchoExtra) / 2;
  ctx.fillText(m.grande, inicioX, y + 32);
  if (m.extra) { ctx.font = "800 18px -apple-system, system-ui, sans-serif"; ctx.fillText(m.extra, inicioX + anchoGrande + 6, y + 31); }
  ctx.fillStyle = COLOR.TINTA;
  ctx.font = "600 13px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(m.chico, x + caja.w / 2, y + 51);
  ctx.restore();
  pad.dataset.marca = JSON.stringify({ x: Math.round(x), y: Math.round(y), w: Math.round(caja.w), h: caja.h, grande: m.grande, extra: m.extra, chico: m.chico, cw: w, ch: alto });
}

function zonasLibres(ctx, w) {
  if (ui.jefe.activo && ui.jefe.escena) {
    const { fuga, centro } = ui.jefe.escena;
    const r = MARCA_EVITA_FUGA;
    return [fuga, centro].map((p) => ({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2, peso: MARCA_PESO_FUGA }));
  }
  const ej = ui.feedback ? ui.feedback.ejercicio : ui.ejercicio;
  if (!ej || ej.tecnica !== TECNICA.PERSPECTIVA) return [];
  ctx.font = ETIQUETA_HORIZONTE.FUENTE;
  const ancho = ctx.measureText(ETIQUETA_HORIZONTE.TEXTO).width;
  const izq = ej.fuga.x > w / 2;
  const lx = izq ? ETIQUETA_HORIZONTE.MARGEN : w - ETIQUETA_HORIZONTE.MARGEN - ancho;
  const r = MARCA_EVITA_FUGA;
  const esquinas = [...ej.frente, ...ej.fondo];
  const xs = esquinas.map((p) => p.x);
  const ys = esquinas.map((p) => p.y);
  const cubo = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), peso: 1 };
  return [
    { x: ej.fuga.x - r, y: ej.fuga.y - r, w: r * 2, h: r * 2, peso: MARCA_PESO_FUGA },
    { x: lx, y: ej.fuga.y, w: ancho, h: ETIQUETA_HORIZONTE.ALTO, peso: MARCA_PESO_FUGA },
    cubo,
  ];
}

function posicionMarca(ctx, m, caja, w, alto) {
  const fijar = (x, y) => ({ x: Math.min(w - caja.w - MARCA_MARGEN, Math.max(MARCA_MARGEN, x)), y: Math.min(alto - caja.h - MARCA_MARGEN, Math.max(MARCA_MARGEN, y)) });
  const opciones = [
    fijar(m.x - caja.w / 2, m.y - caja.h - MARCA_SEPARACION),
    fijar(m.x - caja.w / 2, m.y + MARCA_SEPARACION),
    fijar(m.x - caja.w - MARCA_SEPARACION, m.y - caja.h / 2),
    fijar(m.x + MARCA_SEPARACION, m.y - caja.h / 2),
  ];
  const zonas = zonasLibres(ctx, w);
  const cruce = (o, z) => Math.max(0, Math.min(o.x + caja.w, z.x + z.w) - Math.max(o.x, z.x)) * Math.max(0, Math.min(o.y + caja.h, z.y + z.h) - Math.max(o.y, z.y)) * z.peso;
  const costo = (o) => zonas.reduce((t, z) => t + cruce(o, z), 0);
  return opciones.reduce((mejor, o) => (costo(o) < costo(mejor) ? o : mejor), opciones[0]);
}

function crearMarca(r, dano, golpes, fin, tecnica) {
  const color = !r.valido || dano === 0 ? COLOR.MAL : r.puntaje >= 0.7 ? COLOR.BIEN : COLOR.TINTA;
  let grande;
  if (!r.valido) grande = "muy corto";
  else if (dano === null) grande = `${Math.round(r.puntaje * 100)}%`;
  else grande = dano > 0 ? `−${dano}` : "fallo";
  const met = r.valido ? METRICA_PRINCIPAL[tecnica] : null;
  let chico = r.valido ? `Puntaje ${Math.round(r.puntaje * 100)}%` : "Traza más largo";
  if (met && Number.isFinite(r[met.clave])) chico += ` · ${met.etiqueta.split(" ")[0]} ${fmt(r[met.clave])}${met.unidad}`;
  ui.marca = { x: fin.x, y: fin.y, grande, extra: golpes > 1 ? `×${golpes}` : "", chico, color, inicio: performance.now() };
}

function evaluar(ej, puntos) {
  if (ej.tecnica === TECNICA.LINEA) return evaluarLinea(puntos, ej.a, ej.b);
  return evaluarElipse(puntos, ej.caja);
}

function chip(etiqueta, valor, clase) {
  return h("span", { class: "dato" + (clase ? " " + clase : "") }, `${etiqueta} `, h("b", { text: valor }));
}

function pintarLectura(r, dano) {
  const el = $("#lectura");
  el.replaceChildren();
  if (!r) return;
  if (!r.valido) { el.append(chip("Trazo", "muy corto", "mal")); return; }
  const clase = r.puntaje >= 0.7 ? "bien" : r.puntaje < 0.4 ? "mal" : "";
  el.append(chip("Puntaje", `${Math.round(r.puntaje * 100)}%`, clase));
  if (r.desviacion_pct !== undefined) {
    el.append(chip("Desviación", `${fmt(r.desviacion_pct)}%`), chip("Extremos", `${fmt(r.extremos_pct)}%`), chip("Seguridad", `${r.seguridad_pct}%`), chip("Repasos", String(r.repasos), r.repasos ? "mal" : ""));
  } else if (r.ajuste_pct !== undefined) {
    el.append(chip("Ajuste", `${fmt(r.ajuste_pct)}%`), chip("Cierre", `${fmt(r.cierre_pct)}%`), chip("Temblor", `${fmt(r.temblor_deg)}°`), chip("Vuelta", `${r.cobertura_deg}°`, r.cobertura_deg < 330 ? "mal" : ""));
  } else {
    if (r.linea) el.append(chip("Línea", `${r.linea}/${PUNTAJE.CUBO_LINEAS}`));
    el.append(chip("Convergencia", `${fmt(r.desvio_deg)}°`, r.desvio_deg > PUNTAJE.PERSPECTIVA_DESVIO_MAX_DEG / 2 ? "mal" : ""), chip("Rectitud", `${fmt(r.rectitud_pct)}%`), chip("Cierre", `${fmt(r.cierre_pct)}%`), chip("Repasos", String(r.repasos), r.repasos ? "mal" : ""));
  }
  if (dano !== null) el.append(chip(dano > 0 ? "Daño" : "Sin", dano > 0 ? String(dano) : "daño", dano > 0 ? "dano" : "mal"));
}

function posTorre(t) {
  const el = torresEl.querySelector(`.torre-btn[data-tecnica="${t}"] svg`);
  if (!el) return { x: tamCampo.w / 2, y: tamCampo.h };
  const base = campo.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
}

function posMonstruo(m) {
  const [x, y] = puntoEnCamino(m.avance);
  return { x: x * tamCampo.w, y: y * tamCampo.h };
}

function golpear(tecnica, puntaje) {
  const mejora = estado.mejoras[tecnica];
  const dano = danoDeTrazo(tecnica, puntaje, mejora);
  const objetivo = elegirObjetivo(ui.oleada, ui.objetivoBloqueado, tecnica);
  if (objetivo && dano <= 0) {
    const destino = posMonstruo(objetivo);
    ui.textos.push({ x: destino.x, y: destino.y - 18 * escalaCampo(), texto: "fallo", inicio: performance.now(), color: COLOR.MAL });
    return { dano, golpes: 0 };
  }
  if (!objetivo) return { dano, golpes: 0 };
  const golpe = atacar(ui.oleada, dano, efectoMejora(mejora).objetivos, objetivo);
  for (const g of golpe.golpes) {
    const destino = posMonstruo(g.objetivo);
    ui.proyectiles.push({ desde: posTorre(tecnica), hasta: destino, inicio: performance.now() });
    ui.textos.push({ x: destino.x, y: destino.y - 18 * escalaCampo(), texto: `−${dano}`, inicio: performance.now(), color: COLOR.TINTA });
    if (g.vencido) ui.textos.push({ x: destino.x, y: destino.y + 6 * escalaCampo(), texto: `+${OLEADA.TINTA_POR_MONSTRUO}`, inicio: performance.now(), color: COLOR.ACENTO });
  }
  abonarTinta(cobrarTinta(ui.oleada));
  return { dano, golpes: golpe.golpes.length };
}

function enOleada() {
  return ui.modo === MODO.OLEADA && ui.oleada && !ui.oleada.terminada;
}

function terminarTrazoCubo(ej, puntos) {
  const aristas = aristasCubo(ej);
  const usadas = ej.hechos.map((x) => x.arista);
  const indice = asignarArista(puntos, aristas, usadas);
  const r = indice >= 0 ? evaluarFugante(puntos, aristas[indice], ej.fuga) : { valido: false, puntaje: 0 };
  const enTutorial = tutorial.activo();
  const fin = puntos[puntos.length - 1];
  if (!r.valido) {
    crearMarca(r, null, 0, fin, ej.tecnica);
    pintarLectura(r, null);
    if (!cuboEnCurso()) ui.objetivoBloqueado = null;
    pintarPad();
    pintarHud();
    return;
  }
  ej.hechos.push({ puntos, arista: indice, r });
  pad.dataset.ejercicio = JSON.stringify(ej);
  if (!enTutorial) { registrarTrazo(estado, ej.tecnica, r, new Date()); persistir(); }
  const n = ej.hechos.length;
  if (n < PUNTAJE.CUBO_LINEAS) {
    ui.marca = { x: fin.x, y: fin.y, grande: `${n}/${PUNTAJE.CUBO_LINEAS}`, extra: "", chico: `Convergencia ${fmt(r.desvio_deg)}° · ${Math.round(r.puntaje * 100)}%`, color: colorPuntaje(r.puntaje), inicio: performance.now() };
    pintarLectura({ ...r, linea: n }, null);
    pintarPista();
    ui.bloqueoHasta = performance.now();
    pintarPad();
    pintarHud();
    return;
  }
  const total = resumenCubo(ej.hechos.map((x) => x.r));
  let dano = null;
  let golpes = 0;
  if (!enTutorial && enOleada()) ({ dano, golpes } = golpear(ej.tecnica, total.puntaje));
  if (!enTutorial) pintarTorres();
  ui.objetivoBloqueado = null;
  crearMarca(total, dano, golpes, fin, ej.tecnica);
  pintarLectura(total, dano);
  pintarPista();
  ui.feedback = { ejercicio: ej, trazo: null, color: colorPuntaje(total.puntaje) };
  ui.bloqueoHasta = performance.now() + FEEDBACK_MS * 1.5;
  pintarPad();
  setTimeout(siguienteEjercicio, FEEDBACK_MS * 1.5);
  pintarHud();
}

function terminarTrazo(puntos) {
  const ej = ui.ejercicio;
  ui.trazo = null;
  if (ui.jefe.activo) {
    terminarTrazoJefe(puntos);
    if (ui.redimPendiente) { ui.redimPendiente = false; redimensionar(); }
    return;
  }
  if (!ej) return;
  if (ej.tecnica === TECNICA.PERSPECTIVA) {
    terminarTrazoCubo(ej, puntos);
    if (ui.redimPendiente) { ui.redimPendiente = false; redimensionar(); }
    return;
  }
  const r = evaluar(ej, puntos);
  let dano = null;
  let golpes = 0;
  const enTutorial = tutorial.activo();
  if (r.valido && !enTutorial) {
    registrarTrazo(estado, ej.tecnica, r, new Date());
    if (enOleada()) ({ dano, golpes } = golpear(ej.tecnica, r.puntaje));
    persistir();
    pintarTorres();
  }
  ui.objetivoBloqueado = null;
  crearMarca(r, dano, golpes, puntos[puntos.length - 1], ej.tecnica);
  pintarLectura(r, dano);
  if (enTutorial) tutorial.trazoHecho(r.valido);
  ui.feedback = r.valido ? { ejercicio: ej, trazo: puntos, color: colorPuntaje(r.puntaje) } : null;
  ui.bloqueoHasta = performance.now() + (r.valido ? FEEDBACK_MS : 0);
  pintarPad();
  if (r.valido) setTimeout(siguienteEjercicio, FEEDBACK_MS);
  if (ui.redimPendiente) { ui.redimPendiente = false; redimensionar(); }
  pintarHud();
}

function siguienteEjercicio() {
  if (ui.trazo) return;
  ui.feedback = null;
  nuevoEjercicio();
  if (typeof pad.animate === "function") pad.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: TRANSICION_MS, easing: "ease-out" });
}

function conectarLienzo(canvas, { puede, empezar, mover, terminar }) {
  let activo = null;
  let rect = null;
  const leer = (e) => ({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp });
  canvas.addEventListener("pointerdown", (e) => {
    if (activo !== null || !puede()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    activo = e.pointerId;
    rect = canvas.getBoundingClientRect();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { activo = e.pointerId; }
    empezar(leer(e));
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== activo) return;
    e.preventDefault();
    const lista = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    for (const ev of lista.length ? lista : [e]) mover(leer(ev));
  });
  const fin = (e) => {
    if (e.pointerId !== activo) return;
    activo = null;
    terminar(e.type === "pointercancel");
  };
  canvas.addEventListener("pointerup", fin);
  canvas.addEventListener("pointercancel", fin);
  for (const tipo of ["touchstart", "touchmove"]) canvas.addEventListener(tipo, (e) => e.preventDefault(), { passive: false });
}

conectarLienzo(pad, {
  puede: () => {
    if (ui.jefe.activo) return !ui.jefe.vencido && performance.now() >= ui.jefe.bloqueoHasta;
    return performance.now() >= ui.bloqueoHasta && (!tutorial.activo() || tutorial.esperaTrazo());
  },
  empezar(p) {
    if (ui.demo) pararDemo();
    ui.feedback = null;
    ui.marca = null;
    if (!cuboEnCurso()) {
      const objetivo = ui.modo === MODO.OLEADA && ui.oleada ? objetivoPrincipal(ui.oleada) : null;
      ui.objetivoBloqueado = objetivo ? objetivo.id : null;
    }
    ui.trazo = [p];
    pintarPad();
  },
  mover(p) {
    if (!ui.trazo) return;
    const ult = ui.trazo[ui.trazo.length - 1];
    if (Math.hypot(p.x - ult.x, p.y - ult.y) < 0.5) return;
    ui.trazo.push(p);
    pintarPad();
  },
  terminar(cancelado) {
    const puntos = ui.trazo;
    ui.trazo = null;
    if (cancelado || !puntos) {
      if (!cuboEnCurso()) ui.objetivoBloqueado = null;
      if (ui.redimPendiente) { ui.redimPendiente = false; redimensionar(); }
      pintarPad();
      return;
    }
    terminarTrazo(puntos);
  },
});

document.addEventListener("gesturestart", (e) => e.preventDefault());

function textoEfecto(nivel) {
  const e = MEJORA.EFECTOS[nivel - 1];
  if (e.objetivos > 0) return `golpea ${efectoMejora(nivel).objetivos} objetivos`;
  return `+${Math.round(e.dano * 100)}% daño`;
}

const ICONO_TORRE = Object.freeze({
  [TECNICA.LINEA]: '<path d="M17 31L31 17"/>',
  [TECNICA.ELIPSE]: '<ellipse cx="24" cy="24" rx="9" ry="6"/>',
  [TECNICA.PERSPECTIVA]: '<path d="M16 21h9v9h-9zM16 21l5-5h9l-5 5M25 30l5-5v-9"/>',
});

function spriteTorre(t, nivel, elegida) {
  const maximo = nivel >= MEJORA.MAX;
  const borde = maximo ? "#b8862b" : nivel > 0 ? COLOR.ACENTO : COLOR.TINTA;
  const relleno = nivel >= 3 ? "#e6e8fb" : COLOR.PAPEL;
  const pips = Array.from({ length: nivel }, (_, i) => {
    const ang = Math.PI * (1.15 + (0.7 * (i + 0.5)) / MEJORA.MAX);
    return `<circle cx="${(24 + Math.cos(ang) * 21).toFixed(1)}" cy="${(24 + Math.sin(ang) * 21).toFixed(1)}" r="2.4" fill="${borde}"/>`;
  }).join("");
  const halo = elegida ? '<circle cx="24" cy="24" r="21" fill="rgba(75,91,214,0.2)"/>' : "";
  const corona = maximo ? `<path d="M17 9l3.5 3 3.5-5 3.5 5 3.5-3-1.5 6h-11z" fill="${borde}"/>` : "";
  const torre = `<circle cx="24" cy="24" r="16" fill="${relleno}" stroke="${borde}" stroke-width="${(1.8 + nivel * 0.45).toFixed(2)}"/>`;
  const icono = `<g fill="none" stroke="${borde}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONO_TORRE[t]}</g>`;
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${halo}${torre}${icono}${pips}${corona}</svg>`;
}

function textoProgreso(t) {
  const torre = TORRE[t];
  const mejora = estado.mejoras[t];
  if (mejora >= MEJORA.MAX) return `${torre.nombre}: mejora al máximo`;
  if (siguienteMejora(estado) === t) return `Sube a M${mejora + 1} (${textoEfecto(mejora + 1)}) con ${progresoTinta(estado)} de ${MEJORA.TINTA_POR_NIVEL} tinta`;
  return `Sube a M${mejora + 1} cuando le toque, después de las torres de menor nivel`;
}

function pastillaMejora(t) {
  const mejora = estado.mejoras[t];
  if (mejora >= MEJORA.MAX) return h("span", { class: "mejora-btn maximo", "aria-hidden": "true" }, h("span", { class: "mas", text: "Máx" }));
  if (siguienteMejora(estado) !== t) return h("span", { class: "mejora-btn espera", "data-progreso": t, "aria-hidden": "true" }, h("small", { text: "luego" }));
  const valor = progresoTinta(estado);
  return h("span", { class: "mejora-btn progreso", "data-progreso": t, style: `--p:${Math.round((valor / MEJORA.TINTA_POR_NIVEL) * 100)}%`, "aria-hidden": "true" }, h("small", { text: `${valor}/${MEJORA.TINTA_POR_NIVEL}` }));
}

function tocarTorre(t) {
  elegirTorre(t);
}

function pintarTorres() {
  const ahora = performance.now();
  const enfocada = torresEl.querySelector(".torre-btn.tuto-foco");
  const tecnicaEnfocada = enfocada ? enfocada.dataset.tecnica : null;
  torresEl.replaceChildren(...TECNICAS.map((t) => {
    const torre = TORRE[t];
    const mejora = estado.mejoras[t];
    const elegida = ui.tecnica === t && !ui.jefe.activo;
    const marco = h("button", {
      type: "button",
      class: "torre-btn",
      "aria-pressed": String(elegida),
      "data-tecnica": t,
      "aria-label": `${torre.nombre}, M${mejora}. ${textoProgreso(t)}`,
      onclick: () => tocarTorre(t),
    });
    marco.innerHTML = spriteTorre(t, mejora, elegida);
    marco.prepend(h("span", { class: "torre-nivel", text: `M${mejora}` }));
    marco.append(h("span", { class: "torre-nombre", text: torre.corto }), pastillaMejora(t));
    if (tecnicaEnfocada === t) marco.classList.add("tuto-foco");
    const siguiente = siguienteMejora(estado) === t;
    const celda = h("div", { class: "torre" + (mejora >= MEJORA.MAX ? " maximo" : "") + (siguiente ? " siguiente" : ""), "data-torre": t, "data-nivel": String(mejora) }, marco);
    const aviso = ui.avisos[t];
    if (aviso && ahora - aviso.inicio < AVISO_MEJORA_MS) celda.append(h("span", { class: "torre-aviso", role: "status", text: aviso.texto }));
    return celda;
  }));
}

function elegirTorre(t) {
  if (tutorial.activo() && tutorial.esperaTrazo()) return;
  if (ui.jefe.activo) {
    toast("Contra el jefe no eliges torre: dibuja la caja y cada trazo le hace daño.");
    return;
  }
  const pedida = tecnicaPedida();
  if (pedida && pedida !== t) {
    toast(`En la oleada elige el monstruo que va primero: ahora pide ${TORRE[pedida].corto.toLowerCase()}.`);
    return;
  }
  if (ui.tecnica === t && ui.ejercicio && ui.ejercicio.tecnica === t) return;
  ui.tecnica = t;
  ui.feedback = null;
  pintarTorres();
  nuevoEjercicio(true);
}

function pintarHud() {
  const est = $("#hud-estado");
  const ola = $("#btn-oleada");
  const demo = $("#btn-demo");
  if (ui.modo === MODO.OLEADA && ui.oleada) {
    const o = ui.oleada;
    if (o.jefe && ui.jefe.activo) est.textContent = `Oleada ${o.numero} · Jefe ${Math.max(0, o.jefe.vida)}/${o.jefe.vidaMax}`;
    else est.textContent = `Oleada ${o.numero} · ${o.vidas} vidas · quedan ${o.cola.length + o.vivos.length}`;
  } else {
    est.textContent = `Práctica libre · nivel ${nivelJugador(estado)}`;
  }
  ola.disabled = ui.modo !== MODO.LIBRE;
  ola.hidden = ui.jefe.activo;
  demo.hidden = !ui.jefe.activo;
  demo.disabled = ui.jefe.vencido;
  const borrar = $("#btn-borrar");
  borrar.hidden = !ui.jefe.activo;
  borrar.disabled = ui.jefe.vencido || !ui.jefe.trazos.length;
}

function iniciarOleada() {
  if (ui.modo === MODO.OLEADA) return;
  ui.modo = MODO.OLEADA;
  ui.oleada = crearOleada(ui.numeroOleada, tecnicaMasDebil(estado), jefeDesbloqueado(estado));
  ui.proyectiles = [];
  ui.textos = [];
  if (!ui.trazo) { ui.feedback = null; nuevoEjercicio(true); }
  pintarTorres();
  pintarPista();
  pintarHud();
}

function faltanMinimos() {
  return minimosCapitulo(estado).filter((m) => !m.cumple).map((m) => TORRE[m.tecnica].corto.toLowerCase());
}

function terminarOleada() {
  const o = ui.oleada;
  const conJefe = Boolean(o.jefe);
  registrarOleada(estado, { ganada: o.ganada, monstruos: o.vencidos, tinta: cobrarTinta(o) });
  let mensaje;
  if (o.ganada && conJefe) mensaje = `¡Jefe vencido! Oleada ${o.numero} superada: +${JEFE.recompensaTinta + OLEADA.TINTA_POR_OLEADA} tinta.`;
  else if (o.ganada) mensaje = `Oleada ${o.numero} superada: +${OLEADA.TINTA_POR_OLEADA} tinta.`;
  else mensaje = `La oleada ${o.numero} llegó a tu cuaderno. No pierdes nada: vuelve a intentarlo.`;
  if (o.ganada && !conJefe) {
    const faltan = faltanMinimos();
    if (faltan.length) mensaje += ` El jefe llega al final cuando cumplas los mínimos del capítulo 1 (falta ${faltan.join(", ")}).`;
  }
  if (o.ganada) ui.numeroOleada += 1;
  const bonus = completarSesion(estado, new Date());
  if (bonus > 0) mensaje += ` Primera oleada del día: +${bonus} tinta.`;
  aplicarSubidas();
  ui.modo = MODO.LIBRE;
  ui.oleada = null;
  salirJefe();
  persistir();
  pintarPista();
  pintarHud();
  toast(mensaje);
}

function insignia(ctx, t, r) {
  const c = { x: r * 0.85, y: r * 0.75 };
  punto(ctx, c, 6.5, COLOR.PAPEL);
  ctx.strokeStyle = COLOR.ACENTO;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  if (t === TECNICA.LINEA) { ctx.moveTo(c.x - 3.5, c.y + 3); ctx.lineTo(c.x + 3.5, c.y - 3); }
  else if (t === TECNICA.ELIPSE) ctx.ellipse(c.x, c.y, 4, 2.6, 0, 0, Math.PI * 2);
  else { ctx.rect(c.x - 3.5, c.y - 1.5, 5, 5); ctx.moveTo(c.x - 3.5, c.y - 1.5); ctx.lineTo(c.x - 1.5, c.y - 3.5); ctx.lineTo(c.x + 3.5, c.y - 3.5); ctx.lineTo(c.x + 3.5, c.y + 1.5); ctx.lineTo(c.x + 1.5, c.y + 3.5); }
  ctx.stroke();
}

function pintarCampo(ahora) {
  const { ctx, w, h: alto } = tamCampo;
  ctx.clearRect(0, 0, w, alto);
  ctx.fillStyle = "#efe9dc";
  ctx.fillRect(0, 0, w, alto);
  const s = escalaCampo();
  const pts = CAMINO.map(([x, y]) => [x * w, y * alto]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, ancho] of [[COLOR.CAMINO_BORDE, 30], [COLOR.CAMINO, 26]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho * s;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  const [bx, by] = pts[pts.length - 1];
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(s, s);
  ctx.fillStyle = COLOR.PAPEL;
  ctx.strokeStyle = COLOR.TINTA;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(-17, -12, 34, 26, 4);
  else ctx.rect(-17, -12, 34, 26);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = COLOR.TENUE;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-11, -5 + i * 6); ctx.lineTo(11, -5 + i * 6); ctx.stroke(); }
  ctx.restore();
  campo.dataset.base = JSON.stringify({ x: Math.round(bx), y: Math.round(by), h: alto });
  if (ui.oleada) {
    ctx.fillStyle = COLOR.TINTA;
    ctx.font = `600 ${Math.round(13 * s)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(`♥ ${ui.oleada.vidas}`, bx, by - 24 * s);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "start";
  }
  if (ui.oleada) {
    for (const m of ui.oleada.vivos) {
      const tipo = tipoMonstruo(m.tipo);
      const p = posMonstruo(m);
      const r = tipo.radio;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(s, s);
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = r * (1 + 0.12 * Math.sin(a * 3 + ahora / 180 + m.id));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.fillStyle = m.golpeMs > 0 ? COLOR.MAL : tipo.color;
      ctx.fill();
      ctx.fillStyle = "#fff";
      punto(ctx, { x: -r * 0.35, y: -r * 0.15 }, r * 0.22, "#fff");
      punto(ctx, { x: r * 0.35, y: -r * 0.15 }, r * 0.22, "#fff");
      punto(ctx, { x: -r * 0.3, y: -r * 0.1 }, r * 0.1, COLOR.TINTA);
      punto(ctx, { x: r * 0.4, y: -r * 0.1 }, r * 0.1, COLOR.TINTA);
      ctx.fillStyle = "rgba(31,29,43,0.15)";
      ctx.fillRect(-r, -r - 8, r * 2, 3);
      ctx.fillStyle = COLOR.BIEN;
      ctx.fillRect(-r, -r - 8, r * 2 * Math.max(0, m.vida / m.vidaMax), 3);
      if (m.tecnica) insignia(ctx, m.tecnica, r);
      ctx.restore();
    }
    pintarJefeCampo(ctx, ahora);
  }
  ui.proyectiles = ui.proyectiles.filter((pr) => ahora - pr.inicio < PROYECTIL_MS);
  for (const pr of ui.proyectiles) {
    const f = Math.min(1, (ahora - pr.inicio) / (PROYECTIL_MS * 0.5));
    ctx.globalAlpha = 1 - Math.max(0, (ahora - pr.inicio) / PROYECTIL_MS - 0.5) * 2;
    trazar(ctx, [pr.desde, { x: pr.desde.x + (pr.hasta.x - pr.desde.x) * f, y: pr.desde.y + (pr.hasta.y - pr.desde.y) * f }], COLOR.ACENTO, 3 * s);
    ctx.globalAlpha = 1;
  }
  ui.textos = ui.textos.filter((t) => ahora - t.inicio < TEXTO_FLOTANTE_MS);
  ctx.font = `700 ${Math.round(13 * s)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = "center";
  for (const t of ui.textos) {
    const f = (ahora - t.inicio) / TEXTO_FLOTANTE_MS;
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = t.color;
    ctx.fillText(t.texto, t.x, t.y - f * 16 * s);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  if (!ui.oleada) {
    ctx.fillStyle = "rgba(31,29,43,0.55)";
    ctx.font = `${Math.round(13 * s)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Sin oleada: pulsa Oleada", w / 2, alto * ZONA_DIBUJO.ARRIBA * 0.62);
    ctx.textAlign = "start";
  }
}

let ultimoFrame = performance.now();
let ultimoHud = 0;
function bucle(ahora) {
  const dt = Math.min(DT_MAX_MS, ahora - ultimoFrame);
  ultimoFrame = ahora;
  const corre = ui.modo === MODO.OLEADA && ui.oleada && ui.pantalla === PANTALLA.JUGAR && !tutorial.activo() && document.visibilityState === "visible";
  if (corre) {
    actualizarOleada(ui.oleada, ui.trazo ? dt * CAMARA_LENTA.FACTOR : dt);
    if (ui.oleada.terminada) {
      if (!(ui.jefe.activo && ahora < (ui.jefe.finHasta || 0))) terminarOleada();
    } else if (ui.oleada.jefe && !ui.jefe.activo && !ui.trazo && ahora >= ui.bloqueoHasta) {
      llegarJefe();
    } else if (ahora - ultimoHud > 250) {
      ultimoHud = ahora;
      pintarHud();
      pintarCola();
      const pedida = tecnicaPedida();
      if (!ui.trazo && !ui.feedback && ahora >= ui.bloqueoHasta && pedida && pedida !== ui.tecnica) nuevoEjercicio();
    }
  }
  const lento = Boolean(corre && ui.trazo);
  if (campoWrap.classList.contains("lento") !== lento) {
    campoWrap.classList.toggle("lento", lento);
    campoWrap.dataset.ritmo = lento ? String(CAMARA_LENTA.FACTOR) : "1";
  }
  if (ui.pantalla === PANTALLA.JUGAR) {
    pintarCampo(ahora);
    if (ui.marca || ui.demo) pintarPad();
  }
  requestAnimationFrame(bucle);
}

const COLOR_TRAZO_JEFE = Object.freeze({
  [TIPO_TRAZO_JEFE.HORIZONTE]: "#7d86c9",
  [TIPO_TRAZO_JEFE.FUGANTE]: COLOR.ACENTO,
  [TIPO_TRAZO_JEFE.FRONTAL]: COLOR.TINTA,
  [TIPO_TRAZO_JEFE.ELIPSE]: "#2f8f5b",
  [TIPO_TRAZO_JEFE.DESCARTADO]: COLOR.MAL,
});

const NOMBRE_TRAZO_JEFE = Object.freeze({
  [TIPO_TRAZO_JEFE.HORIZONTE]: "Horizonte",
  [TIPO_TRAZO_JEFE.FUGANTE]: "Línea de fuga",
  [TIPO_TRAZO_JEFE.FRONTAL]: "Cara frontal",
  [TIPO_TRAZO_JEFE.ELIPSE]: "Elipse",
});

const TORRE_DE_TRAZO = Object.freeze({
  [TIPO_TRAZO_JEFE.HORIZONTE]: TECNICA.LINEA,
  [TIPO_TRAZO_JEFE.FRONTAL]: TECNICA.LINEA,
  [TIPO_TRAZO_JEFE.FUGANTE]: TECNICA.PERSPECTIVA,
  [TIPO_TRAZO_JEFE.ELIPSE]: TECNICA.ELIPSE,
});

const ETIQUETA_GUIA = Object.freeze({ FUGA: "punto de fuga", CENTRO: "centro de la cara", FUENTE: "11px -apple-system, system-ui, sans-serif", SEPARACION: 10 });

function arribaPad() {
  const cabeza = $("#zona-cabeza");
  return cabeza.offsetTop + cabeza.offsetHeight + MARGEN_PISTA;
}

function guiaJefe(ctx, p, color, texto) {
  punto(ctx, p, 12, color === COLOR.MAL ? "rgba(192,69,58,0.16)" : "rgba(75,91,214,0.16)");
  punto(ctx, p, 5, color);
  ctx.fillStyle = color;
  ctx.font = ETIQUETA_GUIA.FUENTE;
  ctx.textBaseline = "bottom";
  const derecha = p.x < tamPad.w * 0.7;
  ctx.textAlign = derecha ? "left" : "right";
  ctx.fillText(texto, p.x + (derecha ? ETIQUETA_GUIA.SEPARACION : -ETIQUETA_GUIA.SEPARACION), p.y - 6);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function duracionDemo(n) {
  return n * (DEMO_JEFE.TRAZO_MS + DEMO_JEFE.PAUSA_MS) + DEMO_JEFE.FINAL_MS;
}

function estadoDemo() {
  if (!ui.demo || !ui.jefe.escena) return null;
  const trazos = trazosDemoJefe(ui.jefe.escena);
  const pasado = performance.now() - ui.demo.inicio;
  if (pasado >= duracionDemo(trazos.length)) return { trazos, hechos: trazos.length, trazo: null, f: 1, fin: true };
  const ciclo = DEMO_JEFE.TRAZO_MS + DEMO_JEFE.PAUSA_MS;
  const hechos = Math.min(trazos.length, Math.floor(pasado / ciclo));
  const f = hechos < trazos.length ? Math.min(1, (pasado - hechos * ciclo) / DEMO_JEFE.TRAZO_MS) : 1;
  return { trazos, hechos, trazo: trazos[Math.min(hechos, trazos.length - 1)], f, fin: false };
}

function parcial(puntos, f) {
  if (f >= 1) return puntos;
  const largo = puntos.reduce((acc, p, i) => (i ? acc + Math.hypot(p.x - puntos[i - 1].x, p.y - puntos[i - 1].y) : 0), 0);
  let resto = largo * f;
  const salida = [puntos[0]];
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    const tramo = Math.hypot(b.x - a.x, b.y - a.y);
    if (tramo >= resto) {
      const k = tramo > 0 ? resto / tramo : 0;
      salida.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
      return salida;
    }
    salida.push(b);
    resto -= tramo;
  }
  return salida;
}

function pintarDemo(ctx) {
  const d = estadoDemo();
  if (!d) return;
  if (d.fin) { pararDemo(); return; }
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.setLineDash([7, 6]);
  for (let i = 0; i < d.hechos && i < d.trazos.length; i++) trazar(ctx, d.trazos[i].puntos, COLOR.GUIA, 3);
  ctx.setLineDash([]);
  if (d.hechos < d.trazos.length) {
    const tramo = parcial(d.trazos[d.hechos].puntos, d.f);
    trazar(ctx, tramo, COLOR.ACENTO, 3);
    punto(ctx, tramo[tramo.length - 1], 6, COLOR.ACENTO);
  }
  ctx.restore();
  pad.dataset.demo = JSON.stringify({ hechos: d.hechos, total: d.trazos.length, paso: d.trazo ? d.trazo.paso : null, f: Math.round(d.f * 100) / 100 });
  const pista = $("#pad-hint");
  const texto = d.trazo ? `Demo · ${PASO_DEMO[d.trazo.paso]}` : textoPasoJefe();
  if (pista.textContent !== texto) pista.textContent = texto;
}

function arrancarDemo() {
  if (!ui.jefe.activo) return;
  ui.demo = { inicio: performance.now() };
  ui.demo.veces = (arrancarDemo.veces = (arrancarDemo.veces || 0) + 1);
  pad.dataset.demoVeces = String(arrancarDemo.veces);
  pintarPad();
}

function pararDemo() {
  ui.demo = null;
  delete pad.dataset.demo;
  pintarPista();
  pintarPad();
}

function pintarEscenaJefe(ctx) {
  const esc = ui.jefe.escena;
  if (!esc) return;
  const clas = clasificarTrazosJefe(ui.jefe.trazos, esc.fuga);
  ui.jefe.trazos.forEach((t, i) => trazar(ctx, t, COLOR_TRAZO_JEFE[clas[i].tipo], 3));
  if (ui.trazo) trazar(ctx, ui.trazo, COLOR.TINTA, 3);
  if (ui.demo) pintarDemo(ctx);
  guiaJefe(ctx, esc.fuga, COLOR.MAL, ETIQUETA_GUIA.FUGA);
  guiaJefe(ctx, esc.centro, COLOR.ACENTO, ETIQUETA_GUIA.CENTRO);
}

function nuevaEscenaJefe() {
  ui.jefe.escena = escenaJefe(tamPad.w, tamPad.h, arribaPad());
  pad.dataset.jefe = JSON.stringify({ fuga: ui.jefe.escena.fuga, centro: ui.jefe.escena.centro, lado: ui.jefe.escena.lado });
}

function llegarJefe() {
  ui.jefe = { ...jefeVacio(), activo: true, nivel: nivelJugador(estado) };
  ui.ejercicio = null;
  ui.feedback = null;
  ui.marca = null;
  ui.objetivoBloqueado = null;
  delete pad.dataset.ejercicio;
  nuevaEscenaJefe();
  $("#lectura").replaceChildren(chip("Jefe", JEFE.nombre), chip("Vida", String(ui.oleada.jefe.vidaMax)));
  pintarCola();
  pintarTorres();
  arrancarDemo();
  pintarPista();
  pintarHud();
  toast(`Llega el ${JEFE.nombre}. Mira la demo y dibuja la caja: cada trazo le quita vida.`);
}

function salirJefe() {
  clearTimeout(ui.jefe.rondaTimer);
  ui.jefe = jefeVacio();
  ui.demo = null;
  delete pad.dataset.demo;
  delete pad.dataset.jefe;
  delete pad.dataset.resultado;
  delete campo.dataset.jefe;
  $("#lectura").classList.remove("puntos");
  ui.feedback = null;
  nuevoEjercicio(true);
  pintarCola();
  pintarTorres();
}

function posJefe() {
  return { x: tamCampo.w / 2, y: tamCampo.h * BATALLA_JEFE.Y };
}

function pintarJefeCampo(ctx, ahora) {
  const j = ui.oleada && ui.oleada.jefe;
  if (!j || !ui.jefe.activo) return;
  const s = escalaCampo();
  const p = posJefe();
  const r = BATALLA_JEFE.RADIO * s;
  const vaiven = Math.sin(ahora / 400) * 2 * s;
  ctx.save();
  ctx.translate(p.x, p.y + vaiven);
  ctx.fillStyle = j.golpeMs > 0 ? COLOR.MAL : COLOR.TINTA;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.8);
  ctx.lineTo(0, -r);
  ctx.lineTo(r, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLOR.PAPEL;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, r * 0.8);
  ctx.lineTo(0, -r * 0.1);
  ctx.lineTo(r * 0.5, r * 0.8);
  ctx.stroke();
  punto(ctx, { x: -r * 0.25, y: r * 0.35 }, r * 0.12, COLOR.PAPEL);
  punto(ctx, { x: r * 0.25, y: r * 0.35 }, r * 0.12, COLOR.PAPEL);
  punto(ctx, { x: 0, y: -r * 0.55 }, r * 0.1, COLOR.MAL);
  const ancho = r * 4;
  const alto = 6 * s;
  const y = -r - alto - 6 * s;
  ctx.fillStyle = "rgba(31,29,43,0.15)";
  ctx.fillRect(-ancho / 2, y, ancho, alto);
  ctx.fillStyle = COLOR.MAL;
  ctx.fillRect(-ancho / 2, y, ancho * Math.max(0, j.vida / j.vidaMax), alto);
  ctx.fillStyle = COLOR.TINTA;
  ctx.font = `700 ${Math.round(11 * s)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${Math.max(0, j.vida)}/${j.vidaMax}`, ancho / 2 + 6 * s, y + alto / 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
  campo.dataset.jefe = JSON.stringify({ vida: j.vida, vidaMax: j.vidaMax, x: Math.round(p.x), y: Math.round(p.y) });
}

function marcaJefe(fin, grande, chico, color) {
  ui.marca = { x: fin.x, y: fin.y, grande, extra: "", chico, color, inicio: performance.now() };
}

function textoMedidaJefe(c) {
  if (c.tipo === TIPO_TRAZO_JEFE.ELIPSE) return c.elipse && c.elipse.valido ? `ajuste ${fmt(c.elipse.ajuste_pct)}%` : "";
  return `${fmt(c.error_deg)}°`;
}

function chipPunto(p) {
  const valor = p.valor === null ? "–" : `${fmt(p.valor)}${p.unidad}`;
  return h("span", { class: "dato " + (p.roto ? "bien" : "mal"), "data-punto": p.id, title: `${p.texto} ${valor}; meta ${p.compara === COMPARA.MENOR_O_IGUAL ? "≤" : "≥"} ${fmt(p.meta)}${p.unidad}` }, `${p.roto ? "✓" : "✗"} ${p.corto || p.nombre} `, h("b", { text: valor }));
}

function danarJefe(dano) {
  const golpe = golpearJefe(ui.oleada, dano);
  if (golpe.dano > 0) {
    const pj = posJefe();
    ui.proyectiles.push({ desde: { x: tamCampo.w / 2, y: tamCampo.h * ZONA_DIBUJO.ARRIBA }, hasta: pj, inicio: performance.now() });
    const desvio = ((ui.textos.length % 3) - 1) * BATALLA_JEFE.RADIO * escalaCampo();
    ui.textos.push({ x: pj.x + desvio, y: pj.y - BATALLA_JEFE.RADIO * escalaCampo() - 18 * escalaCampo(), texto: `−${golpe.dano}`, inicio: performance.now(), color: COLOR.TINTA });
  }
  return golpe;
}

function vencerJefe() {
  ui.jefe.vencido = true;
  ui.jefe.bloqueoHasta = Infinity;
  ui.demo = null;
  registrarJefe(estado, true, JEFE.recompensaTinta);
  aplicarSubidas();
  persistir();
  const pj = posJefe();
  ui.textos.push({ x: pj.x, y: pj.y + 10 * escalaCampo(), texto: `+${JEFE.recompensaTinta}`, inicio: performance.now(), color: COLOR.ACENTO });
  ui.jefe.finHasta = performance.now() + BATALLA_JEFE.RONDA_MS;
}

function terminarTrazoJefe(puntos) {
  const esc = ui.jefe.escena;
  const fin = puntos[puntos.length - 1];
  const trazos = [...ui.jefe.trazos, puntos];
  const clas = clasificarTrazosJefe(trazos, esc.fuga);
  const c = clas[clas.length - 1];
  if (c.tipo === TIPO_TRAZO_JEFE.DESCARTADO) {
    marcaJefe(fin, "muy corto", "Traza más largo", COLOR.MAL);
    pintarPad();
    return;
  }
  if (cuentaJefe(clas)[{ [TIPO_TRAZO_JEFE.HORIZONTE]: "horizonte", [TIPO_TRAZO_JEFE.FRONTAL]: "frontales", [TIPO_TRAZO_JEFE.FUGANTE]: "fugantes", [TIPO_TRAZO_JEFE.ELIPSE]: "elipses" }[c.tipo]] > CUPO_JEFE[c.tipo]) {
    marcaJefe(fin, "sobra", `${NOMBRE_TRAZO_JEFE[c.tipo]}: ya está. ${textoPasoJefe().replace(/^Jefe · \d\. /, "")}`, COLOR.MAL);
    pintarPad();
    return;
  }
  if (c.tipo === TIPO_TRAZO_JEFE.ELIPSE && !c.cara) {
    marcaJefe(fin, "falta la cara", "Primero 2 horizontales y 2 verticales", COLOR.MAL);
    pintarPad();
    return;
  }
  ui.jefe.trazos = trazos;
  const puntaje = puntajeTrazoJefe(c);
  const dano = danoTrazoJefe(puntaje, estado.mejoras[TORRE_DE_TRAZO[c.tipo]]);
  const golpe = danarJefe(dano);
  if (c.tipo === TIPO_TRAZO_JEFE.ELIPSE && c.elipse) { registrarTrazo(estado, TECNICA.ELIPSE, c.elipse, new Date()); persistir(); }
  const medida = textoMedidaJefe(c);
  const lectura = $("#lectura");
  lectura.classList.remove("puntos");
  lectura.replaceChildren(
    chip(NOMBRE_TRAZO_JEFE[c.tipo], `${Math.round(puntaje * 100)}%`, puntaje >= 0.7 ? "bien" : puntaje < 0.4 ? "mal" : ""),
    ...(medida ? [chip(c.tipo === TIPO_TRAZO_JEFE.ELIPSE ? "Elipse" : "Error", medida)] : []),
    ...(c.tipo === TIPO_TRAZO_JEFE.ELIPSE && c.elipse ? [chip("Cierre", `${fmt(c.elipse.cierre_pct)}%`), chip("Temblor", `${fmt(c.elipse.temblor_deg)}°`)] : []),
    chip(golpe.dano > 0 ? "Daño" : "Sin", golpe.dano > 0 ? String(golpe.dano) : "daño", golpe.dano > 0 ? "dano" : "mal"),
  );
  const color = golpe.dano === 0 ? COLOR.MAL : colorPuntaje(puntaje);
  marcaJefe(fin, golpe.dano > 0 ? `−${golpe.dano}` : "fallo", `${NOMBRE_TRAZO_JEFE[c.tipo]} ${Math.round(puntaje * 100)}%${medida ? ` · ${medida}` : ""}`, color);
  const falta = faltantesJefe(clas);
  if (!golpe.vencido && Object.values(falta).every((v) => v === 0)) {
    const res = evaluarJefe(trazos, esc.fuga, ui.jefe.nivel);
    const rotos = res.puntos.filter((p) => p.roto).length;
    const bonus = danarJefe(danoPuntosDebiles(rotos));
    ui.jefe.resultado = res;
    ui.oleada.jefe.rondas += 1;
    pad.dataset.resultado = JSON.stringify({ rotos, bonus: bonus.dano, puntos: res.puntos.map((p) => ({ id: p.id, roto: p.roto, valor: p.valor, meta: p.meta })) });
    lectura.replaceChildren(...res.puntos.map(chipPunto));
    lectura.classList.add("puntos");
    marcaJefe(fin, `−${golpe.dano + bonus.dano}`, `Trazo −${golpe.dano} · ${rotos}/${res.puntos.length} puntos débiles −${bonus.dano}`, rotos ? COLOR.BIEN : COLOR.TINTA);
    if (bonus.vencido) vencerJefe();
    else {
      ui.jefe.bloqueoHasta = performance.now() + BATALLA_JEFE.RONDA_MS;
      ui.jefe.rondaTimer = setTimeout(() => {
        if (!ui.jefe.activo || ui.jefe.vencido) return;
        ui.jefe.trazos = [];
        ui.jefe.resultado = null;
        delete pad.dataset.resultado;
        pintarPista();
        pintarPad();
      }, BATALLA_JEFE.RONDA_MS);
    }
  } else if (golpe.vencido) {
    vencerJefe();
  }
  pintarPista();
  pintarPad();
  pintarHud();
}

function svgCurva(puntos, unidad) {
  const NS = "http://www.w3.org/2000/svg";
  const W = 320;
  const H = 96;
  const M = { l: 30, r: 8, t: 8, b: 18 };
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "curva");
  svg.setAttribute("role", "img");
  const el = (tag, attrs, texto) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (texto !== undefined) n.textContent = texto;
    svg.append(n);
    return n;
  };
  el("line", { class: "eje", x1: M.l, y1: H - M.b, x2: W - M.r, y2: H - M.b });
  if (!puntos.length) {
    el("text", { x: W / 2, y: H / 2, "text-anchor": "middle" }, "Aún no hay trazos medidos");
    return svg;
  }
  const valores = puntos.map((p) => p.valor);
  const max = Math.max(...valores);
  const min = Math.min(0, ...valores);
  const rango = max - min || 1;
  const x = (i) => (puntos.length === 1 ? (M.l + W - M.r) / 2 : M.l + (i / (puntos.length - 1)) * (W - M.l - M.r));
  const y = (v) => M.t + (1 - (v - min) / rango) * (H - M.t - M.b);
  el("text", { x: M.l - 4, y: M.t + 8, "text-anchor": "end" }, `${fmt(max)}${unidad}`);
  el("text", { x: M.l - 4, y: H - M.b, "text-anchor": "end" }, `${fmt(min, 0)}`);
  el("polyline", { class: "traza", points: puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ") });
  puntos.forEach((p, i) => el("circle", { class: "punto", cx: x(i).toFixed(1), cy: y(p.valor).toFixed(1), r: 2.5 }));
  el("text", { x: M.l, y: H - 4 }, puntos[0].dia.slice(5));
  if (puntos.length > 1) el("text", { x: W - M.r, y: H - 4, "text-anchor": "end" }, puntos[puntos.length - 1].dia.slice(5));
  svg.setAttribute("aria-label", `Promedio diario, ${puntos.length} días`);
  return svg;
}

function pintarProgreso() {
  const raiz = $("#screen-progreso");
  const minimos = minimosCapitulo(estado);
  const tarjetas = TECNICAS.map((t) => {
    const prom = promedioMovil(estado, t);
    const nivel = nivelTecnica(estado, t);
    const met = METRICA_PRINCIPAL[t];
    return h("div", { class: "card", "data-tecnica": t },
      h("div", { class: "fila" }, h("h3", { text: TORRE[t].corto }), h("span", { class: "nivel", text: `Nivel ${nivel}/5` })),
      h("div", { class: "medidor" }, h("span", { style: `width:${Math.round((nivel / 5) * 100)}%` })),
      h("p", { class: "tenue", text: prom.muestras ? `${met.etiqueta}: ${fmt(prom.metrica)}${met.unidad} · puntaje ${Math.round(prom.puntaje * 100)}% · últimos ${prom.muestras} trazos` : "Sin trazos medidos todavía." }),
      h("p", { class: "tenue", text: `${met.etiqueta} por día (más bajo es mejor)` }),
      svgCurva(curva(estado, t).slice(-CURVA_DIAS), met.unidad));
  });
  raiz.replaceChildren(
    h("div", { class: "card" },
      h("h2", { text: "Capítulo 1 · Drawabox" }),
      h("p", { class: "tenue", text: "Líneas, elipses y cajas. Cumple los mínimos y el jefe aparece al final de cada oleada." }),
      h("ul", { class: "lista" }, minimos.map((m) => h("li", { "data-minimo": m.tecnica },
        h("span", { class: "marca" + (m.cumple ? " hecho" : ""), text: m.cumple ? "✓" : "" }),
        h("span", { text: `${TORRE[m.tecnica].corto}: ${m.requeridos} trazos con ${METRICA_PRINCIPAL[m.tecnica].etiqueta.toLowerCase()} ≤ ${m.maximo}${m.unidad}. Llevas ${Math.min(m.trazos, m.requeridos)}/${m.requeridos} · ${fmt(m.metrica)}${m.unidad}.` }))),
        h("li", {}, h("span", { class: "marca" + (estado.contadores.jefes ? " hecho" : ""), text: estado.contadores.jefes ? "✓" : "" }), h("span", { text: `Jefe: ${JEFE.nombre}` + (estado.contadores.jefes ? ` · vencido ${estado.contadores.jefes} ${estado.contadores.jefes === 1 ? "vez" : "veces"}` : "") })))),
    ...tarjetas,
    h("div", { class: "card" },
      h("h2", { text: "En qué se basa" }),
      h("p", { class: "tenue", text: "Capítulo 1: lección 1 de Drawabox (líneas, elipses, cajas). Los siguientes capítulos siguen a Betty Edwards, Scott Robertson, Loomis, Gurney y Gombrich." })),
  );
}

function pintarProyecto() {
  const raiz = $("#screen-proyecto");
  const p = metaProyecto(PROYECTO);
  const hechos = FASE_PUNTOS.filter((x) => x.estado === PUNTO_FASE.HECHO).length;
  const bloque = h("div", { class: "proyecto" + (p ? ` estado-${p.fase_estado}` : ""), id: "proyecto-bloque" });
  if (p) {
    const descartada = p.fase === FASE.DESCARTADA;
    bloque.append(
      h("p", { class: "proyecto-fase", text: descartada ? `Descartada · ${p.fases_completadas}/${TOTAL_FASES} fases` : `Fase ${p.fase}/${TOTAL_FASES} · ${FASES_NOMBRE[p.fase - 1]} · ${ESTADOS_NOMBRE[p.fase_estado]}` }),
      h("div", { class: "proyecto-barra", role: "progressbar", "aria-label": "Fases completadas", "aria-valuemin": "0", "aria-valuemax": String(TOTAL_FASES), "aria-valuenow": String(p.fases_completadas), "aria-valuetext": `${p.fases_completadas} de ${TOTAL_FASES} fases completadas` },
        h("span", { style: `width:${Math.round((p.fases_completadas / TOTAL_FASES) * 100)}%` })),
      h("p", { class: "proyecto-objetivo", text: p.objetivo }));
  }
  raiz.replaceChildren(
    h("div", { class: "card" },
      h("h2", { text: "Fase del proyecto" }),
      bloque,
      h("p", { class: "tenue", text: `Tipo: ${TIPOS_NOMBRE[PROYECTO.tipo] || "–"}` })),
    h("div", { class: "card" },
      h("div", { class: "fila" }, h("h2", { text: `Puntos de ${FASES_NOMBRE[PROYECTO.fase - 1].toLowerCase()}` }), h("span", { class: "nivel", text: `${hechos}/${FASE_PUNTOS.length}` })),
      h("ul", { class: "lista", id: "fase-puntos" }, FASE_PUNTOS.map((x) => h("li", { "data-estado": x.estado },
        h("span", { class: "marca" + (x.estado === PUNTO_FASE.HECHO ? " hecho" : ""), text: x.estado === PUNTO_FASE.HECHO ? "✓" : "" }),
        h("span", { text: x.texto }))))),
  );
}

function pintarAjustes() {
  const raiz = $("#screen-ajustes");
  raiz.replaceChildren(
    h("div", { class: "card" },
      h("h2", { text: "Tutorial" }),
      h("p", { class: "tenue", text: "Repasa cómo se ataca dibujando, cómo se mide cada trazo y el jefe." }),
      h("button", { class: "btn primary ancho", type: "button", id: "repetir-tutorial", onclick: () => { cambiarPantalla(PANTALLA.JUGAR); abrirTutorial(); }, text: "Repetir tutorial" })),
    h("div", { class: "card" },
      h("h2", { text: "Progreso" }),
      h("p", { class: "tenue", text: "Se guarda solo en este navegador." }),
      h("button", { class: "btn peligro ancho", type: "button", onclick: reiniciar, text: "Borrar mi progreso" })),
    h("div", { class: "card" },
      h("h2", { text: "Acerca de" }),
      h("p", { class: "tenue", text: `${APP_ID} v${APP_VERSION}. Ejercicios basados en la lección 1 de Drawabox. Todo se mide con geometría sobre tus trazos, sin modelos de IA.` })),
  );
}

function reiniciar() {
  if (!window.confirm("¿Borrar tu progreso de este navegador? No se puede deshacer.")) return;
  if (storage) storage.removeItem(SAVE_KEY);
  location.reload();
}

function cambiarPantalla(p) {
  ui.pantalla = p;
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.dataset.screen !== p;
  for (const b of document.querySelectorAll(".tabbar button")) b.classList.toggle("activo", b.dataset.tab === p);
  if (p === PANTALLA.PROGRESO) pintarProgreso();
  if (p === PANTALLA.PROYECTO) pintarProyecto();
  if (p === PANTALLA.AJUSTES) pintarAjustes();
  if (p === PANTALLA.JUGAR) requestAnimationFrame(redimensionar);
}

for (const b of document.querySelectorAll(".tabbar button")) {
  b.addEventListener("click", () => { if (!tutorial.activo()) cambiarPantalla(b.dataset.tab); });
}

$("#btn-oleada").addEventListener("click", iniciarOleada);
$("#btn-demo").addEventListener("click", arrancarDemo);
$("#btn-borrar").addEventListener("click", () => {
  if (!ui.jefe.activo || ui.jefe.vencido || performance.now() < ui.jefe.bloqueoHasta) return;
  ui.jefe.trazos = [];
  ui.marca = null;
  pintarPista();
  pintarPad();
  pintarHud();
});

const tutorial = crearTutorial({
  raiz: $("#tuto"),
  alEntrarPaso(paso) {
    if (paso.accion === ACCION_TUTORIAL.TRAZO && ui.tecnica !== TECNICA.LINEA) {
      ui.tecnica = TECNICA.LINEA;
      pintarTorres();
      nuevoEjercicio(true);
    }
  },
  alTerminar() {
    if (!estado.tutorialVisto) {
      estado.tutorialVisto = true;
      persistir();
    }
    pintarPista();
    pintarHud();
  },
});

function abrirTutorial() {
  if (ui.modo !== MODO.LIBRE) {
    toast("Termina la oleada para ver el tutorial.");
    return;
  }
  ui.tecnica = TECNICA.LINEA;
  pintarTorres();
  nuevoEjercicio(true);
  $("#lectura").replaceChildren();
  tutorial.abrir();
  pintarPista();
}

function redimensionar() {
  if (ui.pantalla !== PANTALLA.JUGAR) return;
  if (ui.trazo) { ui.redimPendiente = true; return; }
  const antesW = tamPad.w;
  const antesH = tamPad.h;
  tamCampo = ajustarCanvas(campo);
  tamPad = ajustarCanvas(pad);
  const cambio = antesW !== tamPad.w || antesH !== tamPad.h;
  if (ui.jefe.activo) {
    if (cambio || !ui.jefe.escena) { ui.jefe.trazos = []; nuevaEscenaJefe(); pintarPista(); }
    pintarPad();
  } else if (!ui.ejercicio || cambio) { ui.feedback = null; nuevoEjercicio(true); }
  else pintarPad();
}

if (typeof ResizeObserver === "function") {
  const ro = new ResizeObserver(() => redimensionar());
  ro.observe($("#pad-wrap"));
  ro.observe($("#campo-wrap"));
} else {
  window.addEventListener("resize", redimensionar);
}

window.addEventListener("pagehide", () => escritorMeta.vaciar());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") escritorMeta.vaciar();
});

document.getElementById("bar-version").textContent = `v${APP_VERSION}`;
if (aplicarSubidas().length) persistir();
pintarTinta();
pintarTorres();
redimensionar();
pintarHud();
if (!metaRead(APP_ID)) escritorMeta.pedir();
requestAnimationFrame(bucle);
if (!estado.tutorialVisto) abrirTutorial();

if ("serviceWorker" in navigator) {
  const habiaControl = Boolean(navigator.serviceWorker.controller);
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaControl || recargando) return;
    recargando = true;
    location.reload();
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then((registro) => {
        registro.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registro.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
