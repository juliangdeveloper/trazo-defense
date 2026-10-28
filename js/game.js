import { CAMINO, MONSTRUO, OLEADA, TORRE, PUNTAJE, SESION } from "./config.js";

export function largoCamino(camino = CAMINO) {
  let total = 0;
  for (let i = 1; i < camino.length; i++) total += Math.hypot(camino[i][0] - camino[i - 1][0], camino[i][1] - camino[i - 1][1]);
  return total;
}

export function puntoEnCamino(avance, camino = CAMINO) {
  const total = largoCamino(camino);
  let restante = Math.min(1, Math.max(0, avance)) * total;
  for (let i = 1; i < camino.length; i++) {
    const [x0, y0] = camino[i - 1];
    const [x1, y1] = camino[i];
    const tramo = Math.hypot(x1 - x0, y1 - y0);
    if (restante <= tramo || i === camino.length - 1) {
      const f = tramo > 0 ? Math.min(1, restante / tramo) : 0;
      return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f];
    }
    restante -= tramo;
  }
  return camino[camino.length - 1].slice();
}

export function composicionOleada(numero) {
  const n = Math.max(1, Math.floor(numero));
  const cantidad = OLEADA.MONSTRUOS_BASE + (n - 1) * OLEADA.MONSTRUOS_POR_OLEADA;
  const cola = [];
  for (let i = 1; i <= cantidad; i++) {
    cola.push({ tipo: tipoEnPosicion(i, n >= 2), tecnica: null });
  }
  return cola;
}

function tipoEnPosicion(i, conManchas) {
  if (conManchas && i % 5 === 0) return MONSTRUO.MANCHA.id;
  if (i % 3 === 0) return MONSTRUO.GARABATO.id;
  return MONSTRUO.BORRON.id;
}

export function tecnicasOleadaDia(disponibles, debil, cantidad = SESION.MONSTRUOS, peso = SESION.PESO_DEBIL) {
  const otras = disponibles.filter((t) => t !== debil);
  const lista = [];
  let siguienteOtra = 0;
  for (let i = 0; i < cantidad; i++) {
    const tocaDebil = !otras.length || Math.ceil((i + 1) * peso) > Math.ceil(i * peso);
    if (tocaDebil) lista.push(debil);
    else { lista.push(otras[siguienteOtra % otras.length]); siguienteOtra += 1; }
  }
  return lista;
}

export function crearOleadaDia({ disponibles, debil, nivel = 1 }) {
  const tecnicas = tecnicasOleadaDia(disponibles, debil);
  const oleada = crearOleada(Math.max(1, Math.floor(nivel)));
  oleada.diaria = true;
  oleada.cola = tecnicas.map((tecnica, i) => ({ tipo: tipoEnPosicion(i + 1, true), tecnica }));
  oleada.intervaloMs = (SESION.DURACION_MS - SESION.MARGEN_FINAL_MS) / Math.max(1, tecnicas.length - 1);
  return oleada;
}

export function restanteMs(oleada) {
  return Math.max(0, SESION.DURACION_MS - oleada.transcurridoMs);
}

export function tipoMonstruo(id) {
  return Object.values(MONSTRUO).find((m) => m.id === id) || MONSTRUO.BORRON;
}

export function crearOleada(numero) {
  return {
    numero: Math.max(1, Math.floor(numero)),
    cola: composicionOleada(numero),
    vivos: [],
    siguienteId: 1,
    esperaMs: 600,
    intervaloMs: OLEADA.INTERVALO_MS,
    transcurridoMs: 0,
    diaria: false,
    vidas: OLEADA.VIDAS_BASE,
    vencidos: 0,
    llegaron: 0,
    tinta: 0,
    terminada: false,
    ganada: false,
  };
}

function multiplicadorVida(numero) {
  return 1 + OLEADA.CRECIMIENTO_VIDA * (numero - 1);
}

export function actualizarOleada(oleada, dtMs) {
  if (oleada.terminada) return oleada;
  oleada.esperaMs -= dtMs;
  oleada.transcurridoMs += dtMs;
  if (oleada.cola.length && oleada.esperaMs <= 0) {
    const sale = oleada.cola.shift();
    const tipo = tipoMonstruo(sale.tipo);
    const vida = Math.round(tipo.vida * multiplicadorVida(oleada.numero));
    oleada.vivos.push({ id: oleada.siguienteId++, tipo: tipo.id, tecnica: sale.tecnica, vida, vidaMax: vida, avance: 0, golpeMs: 0 });
    oleada.esperaMs = oleada.intervaloMs;
  }
  for (const m of oleada.vivos) {
    m.avance += tipoMonstruo(m.tipo).velocidad * (dtMs / 1000);
    m.golpeMs = Math.max(0, m.golpeMs - dtMs);
  }
  const llegan = oleada.vivos.filter((m) => m.avance >= 1);
  if (llegan.length) {
    oleada.llegaron += llegan.length;
    if (!oleada.diaria) oleada.vidas = Math.max(0, oleada.vidas - llegan.length);
    oleada.vivos = oleada.vivos.filter((m) => m.avance < 1);
  }
  if (oleada.diaria && oleada.transcurridoMs >= SESION.DURACION_MS) {
    oleada.llegaron += oleada.vivos.length + oleada.cola.length;
    oleada.vivos = [];
    oleada.cola = [];
  }
  if (oleada.vidas <= 0) {
    oleada.terminada = true;
    oleada.ganada = false;
  } else if (!oleada.cola.length && !oleada.vivos.length) {
    oleada.terminada = true;
    oleada.ganada = true;
    oleada.tinta += OLEADA.TINTA_POR_OLEADA;
  }
  return oleada;
}

export function objetivoPrincipal(oleada) {
  let mejor = null;
  for (const m of oleada.vivos) if (!mejor || m.avance > mejor.avance) mejor = m;
  return mejor;
}

export function danoDeTrazo(tecnica, puntaje) {
  const torre = TORRE[tecnica];
  if (!torre || !Number.isFinite(puntaje) || puntaje < PUNTAJE.FALLO_BAJO) return 0;
  return Math.round(torre.danoBase * puntaje);
}

export function atacar(oleada, dano) {
  const objetivo = objetivoPrincipal(oleada);
  if (!objetivo || dano <= 0) return { objetivo, dano: 0, vencido: false };
  objetivo.vida -= dano;
  objetivo.golpeMs = 220;
  let vencido = false;
  if (objetivo.vida <= 0) {
    vencido = true;
    oleada.vivos = oleada.vivos.filter((m) => m !== objetivo);
    oleada.vencidos += 1;
    oleada.tinta += OLEADA.TINTA_POR_MONSTRUO;
  }
  return { objetivo, dano, vencido };
}
