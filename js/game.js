import { CAMINO, MONSTRUO, OLEADA, TORRE, PUNTAJE, MEJORA, MEZCLA, TECNICAS, JEFE, ATAQUE, NIVEL_ATAQUE } from "./config.js";

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
    if (n >= 2 && i % 5 === 0) cola.push(MONSTRUO.MANCHA.id);
    else if (i % 3 === 0) cola.push(MONSTRUO.GARABATO.id);
    else cola.push(MONSTRUO.BORRON.id);
  }
  return cola;
}

export function tipoMonstruo(id) {
  return Object.values(MONSTRUO).find((m) => m.id === id) || MONSTRUO.BORRON;
}

export function tecnicasOleada(cantidad, debil, numero = 1, peso = MEZCLA.PESO_DEBIL) {
  const base = TECNICAS.includes(debil) ? debil : TECNICAS[0];
  const otras = TECNICAS.filter((t) => t !== base);
  const lista = [];
  let siguienteOtra = Math.max(0, Math.floor(numero) - 1);
  for (let i = 0; i < cantidad; i++) {
    if (Math.floor((i + 1) * peso) > Math.floor(i * peso)) lista.push(base);
    else { lista.push(otras[siguienteOtra % otras.length]); siguienteOtra += 1; }
  }
  return lista;
}

export function crearOleada(numero, debil, conJefe = false) {
  const tipos = composicionOleada(numero);
  const tecnicas = tecnicasOleada(tipos.length, debil, numero);
  return {
    numero: Math.max(1, Math.floor(numero)),
    cola: tipos.map((tipo, i) => ({ tipo, tecnica: tecnicas[i] })),
    vivos: [],
    siguienteId: 1,
    esperaMs: 600,
    vidas: OLEADA.VIDAS_BASE,
    vencidos: 0,
    llegaron: 0,
    tinta: 0,
    abonada: 0,
    conJefe: Boolean(conJefe),
    jefe: null,
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
  if (oleada.cola.length && oleada.esperaMs <= 0) {
    const entrada = oleada.cola.shift();
    const tipo = tipoMonstruo(entrada.tipo);
    const vida = Math.round(tipo.vida * multiplicadorVida(oleada.numero));
    oleada.vivos.push({ id: oleada.siguienteId++, tipo: tipo.id, tecnica: entrada.tecnica, vida, vidaMax: vida, avance: 0, golpeMs: 0 });
    oleada.esperaMs = OLEADA.INTERVALO_MS;
  }
  for (const m of oleada.vivos) {
    m.avance += tipoMonstruo(m.tipo).velocidad * (dtMs / 1000);
    m.golpeMs = Math.max(0, m.golpeMs - dtMs);
  }
  const llegan = oleada.vivos.filter((m) => m.avance >= 1);
  if (llegan.length) {
    oleada.llegaron += llegan.length;
    oleada.vidas = Math.max(0, oleada.vidas - llegan.length);
    oleada.vivos = oleada.vivos.filter((m) => m.avance < 1);
  }
  if (oleada.vidas <= 0) {
    oleada.terminada = true;
    oleada.ganada = false;
  } else if (!oleada.cola.length && !oleada.vivos.length) {
    if (oleada.conJefe && !oleada.jefe) {
      oleada.jefe = crearJefe(oleada.numero);
      return oleada;
    }
    if (oleada.jefe && oleada.jefe.vida > 0) {
      oleada.jefe.golpeMs = Math.max(0, oleada.jefe.golpeMs - dtMs);
      return oleada;
    }
    oleada.terminada = true;
    oleada.ganada = true;
    oleada.tinta += OLEADA.TINTA_POR_OLEADA;
  }
  return oleada;
}

export function crearJefe(numero) {
  const vida = Math.round(JEFE.vida * multiplicadorVida(Math.max(1, Math.floor(numero))));
  return { vida, vidaMax: vida, golpeMs: 0, rondas: 0 };
}

export function jefeActivo(oleada) {
  return Boolean(oleada && oleada.jefe && oleada.jefe.vida > 0 && !oleada.terminada);
}

export function multiplicadorDeNiveles(niveles) {
  if (!Array.isArray(niveles) || !niveles.length) return 0;
  return niveles.reduce((s, n) => s + (NIVEL_ATAQUE.MULTIPLICADOR[n] || 0), 0) / niveles.length;
}

export function danoAtaqueJefe(niveles, mejora = 0) {
  return Math.round(ATAQUE.DANO_TRAZO * multiplicadorDeNiveles(niveles) * efectoMejora(mejora).multiplicador);
}

export function danoAtaqueFinal(niveles) {
  return Math.round(ATAQUE.DANO_FINAL * multiplicadorDeNiveles(niveles));
}

export function danoPuntosDebiles(rotos) {
  return Math.max(0, Math.floor(rotos)) * JEFE.danoPuntoDebil;
}

export function golpearJefe(oleada, dano) {
  const jefe = oleada && oleada.jefe;
  if (!jefe || jefe.vida <= 0 || !(dano > 0)) return { dano: 0, vencido: false };
  const real = Math.min(jefe.vida, Math.round(dano));
  jefe.vida -= real;
  jefe.golpeMs = JEFE.golpeMs;
  return { dano: real, vencido: jefe.vida <= 0 };
}

export function cobrarTinta(oleada) {
  const nueva = Math.max(0, oleada.tinta - oleada.abonada);
  oleada.abonada = oleada.tinta;
  return nueva;
}

export function objetivoPrincipal(oleada) {
  let mejor = null;
  for (const m of oleada.vivos) if (!mejor || m.avance > mejor.avance) mejor = m;
  return mejor;
}

export function efectoMejora(nivel) {
  const n = Math.min(MEJORA.MAX, Math.max(0, Math.floor(nivel) || 0));
  let multiplicador = 1;
  let objetivos = 1;
  for (const e of MEJORA.EFECTOS.slice(0, n)) { multiplicador += e.dano; objetivos += e.objetivos; }
  return { multiplicador: Math.round(multiplicador * 100) / 100, objetivos };
}

export function danoDeTrazo(tecnica, puntaje, mejora = 0) {
  const torre = TORRE[tecnica];
  if (!torre || !Number.isFinite(puntaje) || puntaje < PUNTAJE.FALLO_BAJO) return 0;
  return Math.round(torre.danoBase * puntaje * efectoMejora(mejora).multiplicador);
}

export function ordenDelFrente(oleada) {
  const vivos = [...oleada.vivos].sort((a, b) => b.avance - a.avance).map((m) => m.tecnica);
  return [...vivos, ...oleada.cola.map((e) => e.tecnica)];
}

export function proximasTecnicas(oleada, cantidad) {
  return ordenDelFrente(oleada).slice(1, 1 + Math.max(0, cantidad));
}

export function objetivosDelFrente(oleada, cantidad = 1) {
  return [...oleada.vivos].sort((a, b) => b.avance - a.avance).slice(0, Math.max(1, cantidad));
}

export function elegirObjetivo(oleada, idBloqueado, tecnica) {
  const bloqueado = oleada.vivos.find((m) => m.id === idBloqueado);
  if (bloqueado) return bloqueado;
  const frente = [...oleada.vivos].sort((a, b) => b.avance - a.avance);
  return frente.find((m) => m.tecnica === tecnica) || frente[0] || null;
}

export function atacar(oleada, dano, cantidad = 1, primero = null) {
  const inicial = primero && oleada.vivos.includes(primero) ? [primero] : [];
  const resto = objetivosDelFrente(oleada, oleada.vivos.length).filter((m) => m !== primero);
  const objetivos = [...inicial, ...resto].slice(0, Math.max(1, cantidad));
  if (!objetivos.length || dano <= 0) return { golpes: [], dano: 0 };
  const golpes = objetivos.map((objetivo) => {
    objetivo.vida -= dano;
    objetivo.golpeMs = 220;
    const vencido = objetivo.vida <= 0;
    if (vencido) {
      oleada.vencidos += 1;
      oleada.tinta += OLEADA.TINTA_POR_MONSTRUO;
    }
    return { objetivo, vencido };
  });
  oleada.vivos = oleada.vivos.filter((m) => m.vida > 0);
  return { golpes, dano };
}
