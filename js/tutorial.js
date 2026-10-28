export const ACCION_TUTORIAL = Object.freeze({ NINGUNA: "ninguna", TRAZO: "trazo" });

export const PASOS = Object.freeze([
  Object.freeze({ id: "bienvenida", foco: null, titulo: "Dibujar es tu ataque", texto: "Aquí no hay botones de disparo: cada torre se activa con un ejercicio de dibujo y el juego mide tu trazo.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "campo", foco: "#campo-wrap", titulo: "Los monstruos", texto: "Avanzan por el camino hacia tu cuaderno. Si llegan, la oleada pierde una vida. Fuera de la oleada no pierdes nada.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "trazo", foco: "#pad-wrap", titulo: "Tu primer trazo", texto: "Traza una línea de un punto al otro en un solo movimiento, sin detenerte. Inténtalo ahora.", accion: ACCION_TUTORIAL.TRAZO }),
  Object.freeze({ id: "medida", foco: "#lectura", titulo: "Así se mide", texto: "Desviación: cuánto se aleja de la recta ideal. Extremos: qué tan cerca empiezas y terminas. Seguridad: dibujar sin dudar. Repasos: volver sobre el trazo. Mejor trazo, más daño.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "torres", foco: "#torres", titulo: "Tres torres, tres ejercicios", texto: "Línea, elipse y perspectiva, como la lección 1 de Drawabox. Las nuevas se compran con tinta, que ganas venciendo monstruos.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "jefe", foco: "#btn-jefe", titulo: "El jefe y sus puntos débiles", texto: "Cuando cumples los mínimos del capítulo, aparece el jefe. Dibujas una caja en perspectiva y él tiene 4 puntos débiles medibles: horizonte, líneas de fuga, cara frontal y seguridad. Al final ves cuánto te faltó en cada uno.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "sesion", foco: "#btn-sesion", titulo: "5 minutos al día, sin rachas", texto: "La sesión de hoy es un calentamiento con tu técnica más débil y una oleada. La primera del día da tinta extra. Si faltas un día o una semana, no pierdes nada.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "progreso", foco: "[data-tab='progreso']", titulo: "Tu nivel es tu dibujo", texto: "El nivel de cada técnica sale del promedio de tus últimos 20 trazos, no de las horas jugadas. En Progreso ves la curva día a día. Puedes repetir este tutorial desde Ajustes.", accion: ACCION_TUTORIAL.NINGUNA }),
]);

export function crearTutorial({ raiz, alTerminar, alEntrarPaso }) {
  const velo = raiz.querySelector("#tuto-velo");
  const card = raiz.querySelector("#tuto-card");
  const etiqueta = raiz.querySelector("#tuto-paso");
  const titulo = raiz.querySelector("#tuto-titulo");
  const texto = raiz.querySelector("#tuto-texto");
  const saltar = raiz.querySelector("#tuto-saltar");
  const siguiente = raiz.querySelector("#tuto-siguiente");
  let indice = -1;
  let foco = null;
  let esperandoTrazo = false;

  function limpiarFoco() {
    if (foco) foco.classList.remove("tuto-foco");
    foco = null;
  }

  function ubicar() {
    card.classList.remove("arriba", "abajo");
    if (!foco) { card.classList.add("abajo"); return; }
    const r = foco.getBoundingClientRect();
    card.classList.add(r.top + r.height / 2 > window.innerHeight * 0.5 ? "arriba" : "abajo");
  }

  function mostrar(i) {
    limpiarFoco();
    indice = i;
    const paso = PASOS[i];
    if (alEntrarPaso) alEntrarPaso(paso);
    foco = paso.foco ? document.querySelector(paso.foco) : null;
    if (foco) foco.classList.add("tuto-foco");
    esperandoTrazo = paso.accion === ACCION_TUTORIAL.TRAZO;
    raiz.classList.toggle("interactivo", esperandoTrazo);
    velo.style.pointerEvents = "auto";
    etiqueta.textContent = `Paso ${i + 1} de ${PASOS.length}`;
    titulo.textContent = paso.titulo;
    texto.textContent = paso.texto;
    siguiente.textContent = i === PASOS.length - 1 ? "Empezar" : "Siguiente";
    siguiente.disabled = esperandoTrazo;
    ubicar();
  }

  function cerrar(completo) {
    limpiarFoco();
    raiz.hidden = true;
    indice = -1;
    esperandoTrazo = false;
    alTerminar(completo);
  }

  saltar.addEventListener("click", () => cerrar(false));
  siguiente.addEventListener("click", () => {
    if (indice >= PASOS.length - 1) cerrar(true);
    else mostrar(indice + 1);
  });
  window.addEventListener("resize", () => { if (indice >= 0) ubicar(); });

  return {
    abrir() {
      raiz.hidden = false;
      mostrar(0);
    },
    activo() {
      return indice >= 0;
    },
    esperaTrazo() {
      return esperandoTrazo;
    },
    trazoHecho(valido) {
      if (!esperandoTrazo || !valido) return;
      esperandoTrazo = false;
      siguiente.disabled = false;
      const en = indice;
      setTimeout(() => { if (indice === en && en < PASOS.length - 1) mostrar(en + 1); }, 900);
    },
    pasoActual() {
      return indice >= 0 ? PASOS[indice] : null;
    },
  };
}
