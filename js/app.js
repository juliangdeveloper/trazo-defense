import {
  APP_ID, APP_VERSION, SAVE_KEY, TECNICA, TECNICAS, TORRE, METRICA_PRINCIPAL, POSICION_TORRE, CAMINO,
  JEFE, COMPARA, PANTALLA, MODO, FASE_PUNTOS, PUNTO_FASE, FASES_NOMBRE, ESTADOS_NOMBRE, TIPOS_NOMBRE, TOTAL_FASES, OLEADA, MEJORA,
} from "./config.js";
import { PROYECTO, FASE, metaProyecto, metaUpdate, metaRead, crearEscritor } from "./meta.js";
import { evaluarLinea, evaluarElipse, evaluarPerspectiva, evaluarJefe, clasificarTrazosJefe, faltantesJefe, metaPuntoDebil, TIPO_TRAZO_JEFE } from "./geometry.js";
import {
  STATS, cargar, guardar, registrarTrazo, promedioMovil, nivelTecnica, nivelJugador, minimosCapitulo, jefeDesbloqueado,
  tecnicaMasDebil, costoMejora, puedeMejorar, mejorarTorre, completarSesion, registrarOleada, registrarJefe, curva, statsMeta, logrosDe,
} from "./progress.js";
import { crearOleada, actualizarOleada, objetivoPrincipal, puntoEnCamino, danoDeTrazo, atacar, tipoMonstruo, efectoMejora } from "./game.js";
import { crearEjercicio, escenaJefe } from "./ejercicios.js";
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
const MARGEN_PISTA = 10;
const PROYECTIL_MS = 420;
const TEXTO_FLOTANTE_MS = 900;
const TOAST_MS = 3200;
const DT_MAX_MS = 50;
const CURVA_DIAS = 30;
const RADIO_TORRE = 15;

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
  mejorasAbiertas: false,
  jefe: { abierto: false, trazos: [], trazo: null, nivel: 1, resultado: null },
};

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
const pad = $("#pad");
const jefePad = $("#jefe-pad");
let tamCampo = ajustarCanvas(campo);
let tamPad = ajustarCanvas(pad);
let tamJefe = { ctx: jefePad.getContext("2d"), w: 1, h: 1 };

function pintarTinta() {
  $("#tinta-valor").textContent = String(Math.round(estado.tinta));
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

function nuevoEjercicio() {
  seguirMonstruo();
  pintarPista();
  const pista = $("#pad-hint");
  const arriba = pista.offsetTop + pista.offsetHeight + MARGEN_PISTA;
  ui.ejercicio = crearEjercicio(ui.tecnica, tamPad.w, tamPad.h, Math.random, arriba);
  pad.dataset.ejercicio = JSON.stringify(ui.ejercicio);
  pintarPad();
}

function pintarPista() {
  const pista = $("#pad-hint");
  const textos = {
    [TECNICA.LINEA]: "Traza una recta de un punto al otro, en un solo trazo seguro.",
    [TECNICA.ELIPSE]: "Dibuja una elipse que toque los 4 lados de la caja y cierre sobre sí misma.",
    [TECNICA.PERSPECTIVA]: "Desde el punto negro, traza una recta que vaya hacia el punto de fuga.",
  };
  let texto = textos[ui.tecnica];
  if (ui.modo === MODO.LIBRE && !tutorial.activo()) texto += " Sin oleada: solo práctica medida.";
  pista.textContent = texto;
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
    ctx.strokeStyle = COLOR.TENUE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ej.fuga.y);
    ctx.lineTo(tamPad.w, ej.fuga.y);
    ctx.stroke();
    ctx.fillStyle = COLOR.TENUE;
    ctx.font = "11px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("horizonte", tamPad.w - 8, ej.fuga.y + 5);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    if (mostrarIdeal) {
      ctx.setLineDash([6, 6]);
      trazar(ctx, [ej.origen, ej.fuga], COLOR.GUIA, 2);
      ctx.setLineDash([]);
    }
    punto(ctx, ej.fuga, 12, "rgba(192,69,58,0.14)");
    punto(ctx, ej.fuga, 5, COLOR.MAL);
    punto(ctx, ej.origen, 6, COLOR.TINTA);
  }
}

function pintarPad() {
  const { ctx, w, h: alto } = tamPad;
  ctx.clearRect(0, 0, w, alto);
  ctx.fillStyle = "#e9e4d8";
  for (let x = 16; x < w; x += 24) for (let y = 16; y < alto; y += 24) ctx.fillRect(x, y, 1.2, 1.2);
  const fb = ui.feedback;
  if (fb) {
    pintarEjercicio(ctx, fb.ejercicio, true);
    trazar(ctx, fb.trazo, fb.color, 3);
  } else {
    pintarEjercicio(ctx, ui.ejercicio, false);
    if (ui.trazo) trazar(ctx, ui.trazo, COLOR.TINTA, 3);
  }
}

function evaluar(ej, puntos) {
  if (ej.tecnica === TECNICA.LINEA) return evaluarLinea(puntos, ej.a, ej.b);
  if (ej.tecnica === TECNICA.ELIPSE) return evaluarElipse(puntos, ej.caja);
  return evaluarPerspectiva(puntos, ej.origen, ej.fuga, ej.largoGuia);
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
    el.append(chip("Desvío", `${fmt(r.desvio_deg)}°`), chip("Rectitud", `${fmt(r.rectitud_pct)}%`), chip("Inicio", `${fmt(r.inicio_pct)}%`), chip("Repasos", String(r.repasos), r.repasos ? "mal" : ""));
  }
  if (dano !== null) el.append(chip(dano > 0 ? "Daño" : "Sin", dano > 0 ? String(dano) : "daño", dano > 0 ? "dano" : "mal"));
}

function posTorre(t) {
  const [x, y] = POSICION_TORRE[t];
  return { x: x * tamCampo.w, y: y * tamCampo.h };
}

function posMonstruo(m) {
  const [x, y] = puntoEnCamino(m.avance);
  return { x: x * tamCampo.w, y: y * tamCampo.h };
}

function terminarTrazo(puntos) {
  const ej = ui.ejercicio;
  ui.trazo = null;
  if (!ej) return;
  const r = evaluar(ej, puntos);
  let dano = null;
  const enTutorial = tutorial.activo();
  if (r.valido && !enTutorial) {
    registrarTrazo(estado, ej.tecnica, r, new Date());
    if (ui.modo === MODO.OLEADA && ui.oleada && !ui.oleada.terminada) {
      const mejora = estado.mejoras[ej.tecnica];
      dano = danoDeTrazo(ej.tecnica, r.puntaje, mejora);
      const objetivo = objetivoPrincipal(ui.oleada);
      if (objetivo && dano <= 0) {
        const destino = posMonstruo(objetivo);
        ui.textos.push({ x: destino.x, y: destino.y - 18, texto: "fallo", inicio: performance.now(), color: COLOR.MAL });
      } else if (objetivo) {
        const golpe = atacar(ui.oleada, dano, efectoMejora(mejora).objetivos);
        for (const g of golpe.golpes) {
          const destino = posMonstruo(g.objetivo);
          ui.proyectiles.push({ desde: posTorre(ej.tecnica), hasta: destino, inicio: performance.now() });
          ui.textos.push({ x: destino.x, y: destino.y - 18, texto: `−${dano}`, inicio: performance.now(), color: COLOR.TINTA });
          if (g.vencido) ui.textos.push({ x: destino.x, y: destino.y + 6, texto: `+${OLEADA.TINTA_POR_MONSTRUO}`, inicio: performance.now(), color: COLOR.ACENTO });
        }
      }
    }
    persistir();
    pintarTorres();
  }
  pintarLectura(r, dano);
  if (enTutorial) tutorial.trazoHecho(r.valido);
  ui.feedback = r.valido ? { ejercicio: ej, trazo: puntos, color: r.puntaje >= 0.7 ? COLOR.BIEN : r.puntaje < 0.4 ? COLOR.MAL : COLOR.TINTA } : null;
  ui.bloqueoHasta = performance.now() + (r.valido ? FEEDBACK_MS : 0);
  pintarPad();
  if (r.valido) setTimeout(() => { ui.feedback = null; nuevoEjercicio(); }, FEEDBACK_MS);
  pintarHud();
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
  puede: () => performance.now() >= ui.bloqueoHasta && (!tutorial.activo() || tutorial.esperaTrazo()),
  empezar(p) { ui.feedback = null; ui.trazo = [p]; pintarPad(); },
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
    if (cancelado || !puntos) { pintarPad(); return; }
    terminarTrazo(puntos);
  },
});

document.addEventListener("gesturestart", (e) => e.preventDefault());

function pintarTorres() {
  const cont = $("#torres");
  cont.replaceChildren();
  for (const t of TECNICAS) {
    const torre = TORRE[t];
    const detalle = `Nv ${nivelTecnica(estado, t)} · Mejora ${estado.mejoras[t]}`;
    cont.append(h("button", {
      type: "button",
      role: "tab",
      class: "torre-btn",
      "aria-selected": String(ui.tecnica === t),
      "data-tecnica": t,
      onclick: () => elegirTorre(t),
    }, h("span", { text: torre.corto }), h("small", { text: detalle })));
  }
}

function elegirTorre(t) {
  if (tutorial.activo() && tutorial.esperaTrazo()) return;
  const pedida = tecnicaPedida();
  if (pedida && pedida !== t) {
    toast(`En la oleada elige el monstruo que va primero: ahora pide ${TORRE[pedida].corto.toLowerCase()}.`);
    return;
  }
  ui.tecnica = t;
  ui.feedback = null;
  pintarTorres();
  nuevoEjercicio();
}

function pintarHud() {
  const est = $("#hud-estado");
  const ola = $("#btn-oleada");
  const jefe = $("#btn-jefe");
  if (ui.modo === MODO.OLEADA && ui.oleada) {
    const o = ui.oleada;
    est.textContent = `Oleada ${o.numero} · ${o.vidas} vidas · quedan ${o.cola.length + o.vivos.length}`;
  } else {
    est.textContent = `Práctica libre · nivel ${nivelJugador(estado)}`;
  }
  const ocupado = ui.modo !== MODO.LIBRE;
  ola.disabled = ocupado;
  const abierto = jefeDesbloqueado(estado);
  jefe.classList.toggle("bloqueado", !abierto);
  jefe.classList.toggle("listo", abierto);
  jefe.disabled = ocupado;
  jefe.setAttribute("aria-label", abierto ? "Enfrentar al jefe" : "Jefe bloqueado");
}

function iniciarOleada() {
  if (ui.modo === MODO.OLEADA) return;
  ui.modo = MODO.OLEADA;
  ui.oleada = crearOleada(ui.numeroOleada, tecnicaMasDebil(estado));
  ui.proyectiles = [];
  ui.textos = [];
  if (!ui.trazo) { ui.feedback = null; nuevoEjercicio(); }
  pintarPista();
  pintarHud();
}

function terminarOleada() {
  const o = ui.oleada;
  registrarOleada(estado, { ganada: o.ganada, monstruos: o.vencidos, tinta: o.tinta });
  let mensaje = o.ganada ? `Oleada ${o.numero} superada: +${o.tinta} tinta.` : `La oleada ${o.numero} llegó a tu cuaderno. No pierdes nada: vuelve a intentarlo.`;
  if (o.ganada) ui.numeroOleada += 1;
  const bonus = completarSesion(estado, new Date());
  if (bonus > 0) mensaje += ` Primera oleada del día: +${bonus} tinta.`;
  ui.modo = MODO.LIBRE;
  ui.oleada = null;
  persistir();
  pintarTorres();
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
  else { ctx.moveTo(c.x - 4, c.y + 3); ctx.lineTo(c.x, c.y - 3); ctx.lineTo(c.x + 4, c.y + 3); }
  ctx.stroke();
}

function pintarCampo(ahora) {
  const { ctx, w, h: alto } = tamCampo;
  ctx.clearRect(0, 0, w, alto);
  ctx.fillStyle = "#efe9dc";
  ctx.fillRect(0, 0, w, alto);
  const pts = CAMINO.map(([x, y]) => [x * w, y * alto]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, ancho] of [[COLOR.CAMINO_BORDE, 30], [COLOR.CAMINO, 26]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = ancho;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  const [bx, by] = pts[pts.length - 1];
  ctx.fillStyle = COLOR.PAPEL;
  ctx.strokeStyle = COLOR.TINTA;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(bx - 4, by - 20, 30, 40, 4);
  else ctx.rect(bx - 4, by - 20, 30, 40);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = COLOR.TENUE;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(bx + 2, by - 10 + i * 7); ctx.lineTo(bx + 20, by - 10 + i * 7); ctx.stroke(); }
  if (ui.oleada) {
    ctx.fillStyle = COLOR.TINTA;
    ctx.font = "600 12px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`♥ ${ui.oleada.vidas}`, Math.min(w - 18, bx + 11), Math.min(alto - 6, by + 36));
    ctx.textAlign = "start";
  }
  for (const t of TECNICAS) {
    const p = posTorre(t);
    punto(ctx, p, RADIO_TORRE + 3, ui.tecnica === t ? "rgba(75,91,214,0.22)" : "rgba(31,29,43,0.06)");
    punto(ctx, p, RADIO_TORRE, COLOR.PAPEL);
    ctx.strokeStyle = ui.tecnica === t ? COLOR.ACENTO : COLOR.TINTA;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, RADIO_TORRE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    if (t === TECNICA.LINEA) { ctx.moveTo(p.x - 7, p.y + 6); ctx.lineTo(p.x + 7, p.y - 6); }
    else if (t === TECNICA.ELIPSE) ctx.ellipse(p.x, p.y, 8, 5, 0, 0, Math.PI * 2);
    else { ctx.moveTo(p.x - 8, p.y + 6); ctx.lineTo(p.x, p.y - 5); ctx.lineTo(p.x + 8, p.y + 6); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (ui.oleada) {
    for (const m of ui.oleada.vivos) {
      const tipo = tipoMonstruo(m.tipo);
      const p = posMonstruo(m);
      const r = tipo.radio;
      ctx.save();
      ctx.translate(p.x, p.y);
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
  }
  ui.proyectiles = ui.proyectiles.filter((pr) => ahora - pr.inicio < PROYECTIL_MS);
  for (const pr of ui.proyectiles) {
    const f = Math.min(1, (ahora - pr.inicio) / (PROYECTIL_MS * 0.5));
    ctx.globalAlpha = 1 - Math.max(0, (ahora - pr.inicio) / PROYECTIL_MS - 0.5) * 2;
    trazar(ctx, [pr.desde, { x: pr.desde.x + (pr.hasta.x - pr.desde.x) * f, y: pr.desde.y + (pr.hasta.y - pr.desde.y) * f }], COLOR.ACENTO, 3);
    ctx.globalAlpha = 1;
  }
  ui.textos = ui.textos.filter((t) => ahora - t.inicio < TEXTO_FLOTANTE_MS);
  ctx.font = "700 13px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const t of ui.textos) {
    const f = (ahora - t.inicio) / TEXTO_FLOTANTE_MS;
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = t.color;
    ctx.fillText(t.texto, t.x, t.y - f * 16);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  if (!ui.oleada) {
    ctx.fillStyle = "rgba(31,29,43,0.55)";
    ctx.font = "13px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Sin oleada: pulsa Oleada", w / 2, alto - 10);
    ctx.textAlign = "start";
  }
}

let ultimoFrame = performance.now();
let ultimoHud = 0;
function bucle(ahora) {
  const dt = Math.min(DT_MAX_MS, ahora - ultimoFrame);
  ultimoFrame = ahora;
  const corre = ui.modo === MODO.OLEADA && ui.oleada && ui.pantalla === PANTALLA.JUGAR && !tutorial.activo() && !ui.jefe.abierto && !ui.mejorasAbiertas && document.visibilityState === "visible";
  if (corre) {
    actualizarOleada(ui.oleada, dt);
    if (ui.oleada.terminada) terminarOleada();
    else if (ahora - ultimoHud > 250) {
      ultimoHud = ahora;
      pintarHud();
      const pedida = tecnicaPedida();
      if (!ui.trazo && !ui.feedback && ahora >= ui.bloqueoHasta && pedida && pedida !== ui.tecnica) nuevoEjercicio();
    }
  }
  if (ui.pantalla === PANTALLA.JUGAR) pintarCampo(ahora);
  requestAnimationFrame(bucle);
}

function signoMeta(p) {
  return p.compara === COMPARA.MENOR_O_IGUAL ? "≤" : "≥";
}

function retratoJefe() {
  return `<svg viewBox="0 0 52 52"><path d="M6 44 L26 8 L46 44 Z" fill="#1f1d2b"/><path d="M14 44 L26 22 L38 44" fill="none" stroke="#fffdf8" stroke-width="1.5"/><circle cx="20" cy="34" r="3" fill="#fffdf8"/><circle cx="32" cy="34" r="3" fill="#fffdf8"/><circle cx="26" cy="16" r="2.5" fill="#c0453a"/></svg>`;
}

function pintarPuntosDebiles() {
  const lista = $("#puntos-debiles");
  lista.replaceChildren();
  const res = ui.jefe.resultado;
  for (const p of JEFE.puntosDebiles) {
    const meta = metaPuntoDebil(p, ui.jefe.nivel);
    const r = res ? res.puntos.find((x) => x.id === p.id) : null;
    lista.append(h("li", { class: r ? (r.roto ? "roto" : "fallo") : "", "data-punto": p.id },
      h("span", { class: "ojo", "aria-hidden": "true" }),
      h("span", {}, h("b", { text: p.nombre }), `meta ${signoMeta(p)} ${fmt(meta)}${p.unidad}`)));
  }
}

function pintarPasoJefe() {
  const paso = $("#jefe-paso");
  const clas = clasificarTrazosJefe(ui.jefe.trazos, escenaJefe(tamJefe.w, tamJefe.h).fuga);
  const falta = faltantesJefe(clas);
  if (!ui.jefe.trazos.length) paso.textContent = "1. Traza el horizonte: una recta horizontal que pase por el punto de fuga rojo.";
  else {
    const fr = JEFE.minimoFrontales - falta.frontales;
    const fu = JEFE.minimoFugantes - falta.fugantes;
    paso.textContent = `2. Dibuja una caja en perspectiva de un punto: aristas frontales horizontales y verticales (${fr}/${JEFE.minimoFrontales}) y aristas hacia el punto de fuga (${fu}/${JEFE.minimoFugantes}).`;
  }
  $("#jefe-atacar").disabled = !(falta.horizonte === 0 && falta.frontales === 0 && falta.fugantes === 0) || !!ui.jefe.resultado;
}

const COLOR_TRAZO_JEFE = Object.freeze({
  [TIPO_TRAZO_JEFE.HORIZONTE]: "#7d86c9",
  [TIPO_TRAZO_JEFE.FUGANTE]: COLOR.ACENTO,
  [TIPO_TRAZO_JEFE.FRONTAL]: COLOR.TINTA,
  [TIPO_TRAZO_JEFE.DESCARTADO]: COLOR.MAL,
});

function pintarJefe() {
  const { ctx, w, h: alto } = tamJefe;
  ctx.clearRect(0, 0, w, alto);
  ctx.fillStyle = "#e9e4d8";
  for (let x = 16; x < w; x += 24) for (let y = 16; y < alto; y += 24) ctx.fillRect(x, y, 1.2, 1.2);
  const { fuga } = escenaJefe(w, alto);
  punto(ctx, fuga, 13, "rgba(192,69,58,0.14)");
  punto(ctx, fuga, 5, COLOR.MAL);
  ctx.fillStyle = COLOR.MAL;
  ctx.font = "11px -apple-system, system-ui, sans-serif";
  ctx.fillText("punto de fuga", fuga.x + 10, fuga.y - 10);
  const clas = clasificarTrazosJefe(ui.jefe.trazos, fuga);
  ui.jefe.trazos.forEach((t, i) => trazar(ctx, t, COLOR_TRAZO_JEFE[clas[i].tipo], 2.5));
  if (ui.jefe.trazo) trazar(ctx, ui.jefe.trazo, COLOR.TINTA, 2.5);
}

function textoEfecto(nivel) {
  const e = MEJORA.EFECTOS[nivel - 1];
  if (e.objetivos > 0) return `Nv ${nivel}: golpea ${efectoMejora(nivel).objetivos} objetivos`;
  return `Nv ${nivel}: +${Math.round(e.dano * 100)}% daño`;
}

function pintarMejoras() {
  $("#mejoras-tinta").textContent = `Tienes ${Math.round(estado.tinta)} tinta.`;
  const lista = $("#mejoras-lista");
  lista.replaceChildren(...TECNICAS.map((t) => {
    const nivel = estado.mejoras[t];
    const ef = efectoMejora(nivel);
    const costo = costoMejora(estado, t);
    return h("div", { class: "mejora", "data-tecnica": t },
      h("div", { class: "fila" }, h("h3", { text: TORRE[t].nombre }), h("span", { class: "nivel", text: `Mejora ${nivel}/${MEJORA.MAX}` })),
      h("p", { class: "tenue", text: `Daño ×${ef.multiplicador.toFixed(2)} · ${ef.objetivos === 1 ? "1 objetivo" : `${ef.objetivos} objetivos`}` }),
      h("ol", { class: "mejora-niveles" }, MEJORA.EFECTOS.map((_, i) => h("li", { class: i < nivel ? "hecho" : "", text: `${textoEfecto(i + 1)} · ${MEJORA.COSTOS[i]} tinta` }))),
      h("button", {
        class: "btn primary ancho", type: "button", disabled: !puedeMejorar(estado, t), "data-mejorar": t,
        onclick: () => comprarMejora(t),
        text: costo === null ? "Nivel máximo" : `Mejorar a Nv ${nivel + 1} · ${costo} tinta`,
      }));
  }));
}

function comprarMejora(t) {
  if (!mejorarTorre(estado, t)) return;
  persistir();
  pintarTinta();
  pintarTorres();
  pintarMejoras();
  toast(`${TORRE[t].nombre}: ${textoEfecto(estado.mejoras[t])}.`);
}

function abrirMejoras() {
  if (tutorial.activo()) return;
  ui.mejorasAbiertas = true;
  pintarMejoras();
  $("#mejoras").hidden = false;
}

function cerrarMejoras() {
  ui.mejorasAbiertas = false;
  $("#mejoras").hidden = true;
  ultimoFrame = performance.now();
}

function abrirJefe() {
  if (!jefeDesbloqueado(estado)) {
    const faltan = minimosCapitulo(estado).filter((m) => !m.cumple).map((m) => TORRE[m.tecnica].corto.toLowerCase());
    toast(`El jefe aparece cuando cumples los mínimos del capítulo 1. Te falta: ${faltan.join(", ")}. Míralo en Progreso.`);
    return;
  }
  ui.jefe = { abierto: true, trazos: [], trazo: null, nivel: nivelJugador(estado), resultado: null };
  $("#jefe-titulo").textContent = JEFE.nombre;
  $("#jefe-leccion").textContent = `${JEFE.leccion} · nivel ${ui.jefe.nivel}`;
  $("#jefe-retrato").innerHTML = retratoJefe();
  $("#jefe-resultado").hidden = true;
  $("#jefe").hidden = false;
  tamJefe = ajustarCanvas(jefePad);
  pintarPuntosDebiles();
  pintarPasoJefe();
  pintarJefe();
}

function cerrarJefe() {
  ui.jefe.abierto = false;
  $("#jefe").hidden = true;
  pintarHud();
}

function textoPunto(p) {
  if (p.valor === null) return `${p.nombre}: sin trazos para medir.`;
  const valor = `${fmt(p.valor)}${p.unidad}`;
  return `${p.texto} ${valor}${p.media ? " de media" : ""}; meta ${p.compara === COMPARA.MENOR_O_IGUAL ? "≤" : "≥"} ${fmt(p.meta)}${p.unidad}`;
}

function atacarJefe() {
  const res = evaluarJefe(ui.jefe.trazos, escenaJefe(tamJefe.w, tamJefe.h).fuga, ui.jefe.nivel);
  if (!res.listo) return;
  ui.jefe.resultado = res;
  if (res.vencido) registrarJefe(estado, true, JEFE.recompensaTinta);
  persistir();
  pintarPuntosDebiles();
  pintarPasoJefe();
  const caja = $("#jefe-resultado");
  const rotos = res.puntos.filter((p) => p.roto).length;
  caja.replaceChildren(
    h("h3", { text: res.vencido ? "¡Jefe vencido!" : `Rompiste ${rotos} de ${res.puntos.length} puntos débiles` }),
    h("p", { class: "tenue", text: res.vencido ? `+${JEFE.recompensaTinta} tinta. Las metas suben cuando sube tu nivel.` : "El jefe sigue en pie. Esto es lo que faltó:" }),
    h("ul", {}, res.puntos.map((p) => h("li", { class: p.roto ? "bien" : "mal", text: (p.roto ? "✓ " : "✗ ") + textoPunto(p) }))),
    h("div", { class: "jefe-acciones" },
      h("button", { class: "btn", type: "button", onclick: cerrarJefe, text: "Salir" }),
      h("button", { class: "btn primary", type: "button", style: "grid-column: span 2", onclick: () => { ui.jefe.trazos = []; ui.jefe.resultado = null; $("#jefe-resultado").hidden = true; pintarPuntosDebiles(); pintarPasoJefe(); pintarJefe(); }, text: "Intentar de nuevo" })),
  );
  caja.hidden = false;
}

conectarLienzo(jefePad, {
  puede: () => ui.jefe.abierto && !ui.jefe.resultado,
  empezar(p) { ui.jefe.trazo = [p]; pintarJefe(); },
  mover(p) { if (ui.jefe.trazo) { ui.jefe.trazo.push(p); pintarJefe(); } },
  terminar(cancelado) {
    const t = ui.jefe.trazo;
    ui.jefe.trazo = null;
    if (!cancelado && t && t.length > 1) ui.jefe.trazos.push(t);
    pintarJefe();
    pintarPasoJefe();
  },
});

$("#jefe-salir").addEventListener("click", cerrarJefe);
$("#btn-mejoras").addEventListener("click", abrirMejoras);
$("#mejoras-salir").addEventListener("click", cerrarMejoras);
$("#jefe-deshacer").addEventListener("click", () => { if (ui.jefe.resultado) return; ui.jefe.trazos.pop(); pintarJefe(); pintarPasoJefe(); });
$("#jefe-borrar").addEventListener("click", () => { if (ui.jefe.resultado) return; ui.jefe.trazos = []; pintarJefe(); pintarPasoJefe(); });
$("#jefe-atacar").addEventListener("click", atacarJefe);

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
      h("p", { class: "tenue", text: "Líneas, elipses y cajas. Cumple los mínimos para enfrentar al jefe." }),
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
$("#btn-jefe").addEventListener("click", abrirJefe);

const tutorial = crearTutorial({
  raiz: $("#tuto"),
  alEntrarPaso(paso) {
    if (paso.accion === ACCION_TUTORIAL.TRAZO && ui.tecnica !== TECNICA.LINEA) {
      ui.tecnica = TECNICA.LINEA;
      pintarTorres();
      nuevoEjercicio();
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
  nuevoEjercicio();
  $("#lectura").replaceChildren();
  tutorial.abrir();
  pintarPista();
}

function redimensionar() {
  if (ui.pantalla !== PANTALLA.JUGAR) return;
  const antesW = tamPad.w;
  const antesH = tamPad.h;
  tamCampo = ajustarCanvas(campo);
  tamPad = ajustarCanvas(pad);
  if (!ui.ejercicio || antesW !== tamPad.w || antesH !== tamPad.h) { ui.feedback = null; nuevoEjercicio(); }
  else pintarPad();
  if (ui.jefe.abierto) { tamJefe = ajustarCanvas(jefePad); pintarJefe(); }
}

if (typeof ResizeObserver === "function") {
  const ro = new ResizeObserver(() => redimensionar());
  ro.observe($("#pad-wrap"));
  ro.observe($("#campo-wrap"));
  ro.observe($("#jefe-wrap"));
} else {
  window.addEventListener("resize", redimensionar);
}

window.addEventListener("pagehide", () => escritorMeta.vaciar());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") escritorMeta.vaciar();
});

document.getElementById("bar-version").textContent = `v${APP_VERSION}`;
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
