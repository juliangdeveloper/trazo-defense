export const ACCION_TUTORIAL = Object.freeze({ NINGUNA: "ninguna", TRAZO: "trazo" });

export const PASOS = Object.freeze([
  Object.freeze({ id: "bienvenida", foco: null, titulo: "Dibujar es tu ataque", texto: "Aquí no hay botones de disparo: cada torre se activa con un ejercicio de dibujo y el juego mide tu trazo.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "campo", foco: "#campo-wrap", titulo: "Los monstruos", texto: "Salen por arriba y bajan por el camino hasta tu cuaderno, abajo. Si llegan, la oleada pierde una vida. Fuera de la oleada no pierdes nada.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "trazo", foco: "#pad-wrap", titulo: "Dibujas sobre el campo", texto: "La franja clara entre los monstruos y tu cuaderno es tu hoja. Mientras dibujas, los monstruos van en cámara lenta. Sigue la guía de la torre activa en un solo movimiento, sin detenerte.", accion: ACCION_TUTORIAL.TRAZO }),
  Object.freeze({ id: "medida", foco: "#lectura", titulo: "Así se mide", texto: "Cada torre mira métricas distintas: desviación, ajuste, convergencia, suavidad de una curva o alineación de un eje. Mejor trazo, más daño.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "torres", foco: "#torres", titulo: "Tres torres por capítulo", texto: "Capítulo 1: línea, elipse y caja en un punto. Capítulo 2: salchichas que se cruzan, formas geométricas compartiendo espacio y una mezcla de ambas. Fuera de una oleada toca una torre para practicarla.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "mezcla", foco: "#campo-wrap", titulo: "Cada monstruo pide una técnica", texto: "En una oleada los monstruos llegan mezclados y llevan el icono de su técnica, con algo más de la que peor te sale. El que va primero elige la torre y el ejercicio: tú solo dibujas.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "cola", foco: "#cola", titulo: "Lo que viene", texto: "«Luego» muestra la técnica de los monstruos que siguen en la fila: son tus próximos ejercicios cuando cae el de adelante.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "mejoras", foco: ".torre .torre-btn", titulo: "La tinta sube tus torres", texto: "Cada torre muestra su mejora (M0) y, debajo, cuánta tinta lleva hacia la siguiente, por ejemplo 7/10. Cada 10 de tinta la torre de menor nivel del capítulo activo sube sola y cambia de aspecto; las demás dicen «luego».", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "jefe", foco: "#campo-wrap", titulo: "El jefe al final de la oleada", texto: "Cuando cumples los mínimos del capítulo, el jefe llega al final de cada oleada. Capítulo 1: caja en un punto con elipse. Capítulo 2: cuatro formas que se cruzan en el mismo espacio. Mira la demo con «Ver demo». Cada trazo es un ataque en 5 dimensiones y lanza un destello de anillos.", accion: ACCION_TUTORIAL.NINGUNA }),
  Object.freeze({ id: "progreso", foco: "#cap-sel", titulo: "Elige el capítulo", texto: "Arriba puedes pasar del capítulo 1 (líneas, cajas y elipses) al 2 (intersecciones) cuando quieras. En Progreso ves mínimos y curvas de cada uno. Puedes repetir este tutorial desde Ajustes.", accion: ACCION_TUTORIAL.NINGUNA }),
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
    for (const el of document.querySelectorAll(".tuto-foco")) el.classList.remove("tuto-foco");
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
