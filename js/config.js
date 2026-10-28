export const APP_ID = "trazo-defense";
export const APP_VERSION = "0.1.7";
export const SAVE_KEY = "trazo-defense.save";
export const SAVE_VERSION = 1;
export const CACHE_PREFIX = "trazo-defense-";

export const TECNICA = Object.freeze({
  LINEA: "linea",
  ELIPSE: "elipse",
  PERSPECTIVA: "perspectiva",
});

export const TECNICAS = Object.freeze([TECNICA.LINEA, TECNICA.ELIPSE, TECNICA.PERSPECTIVA]);

export const TORRE = Object.freeze({
  [TECNICA.LINEA]: Object.freeze({ nombre: "Torre de línea", corto: "Línea", danoBase: 24, leccion: "Drawabox 1 · Líneas" }),
  [TECNICA.ELIPSE]: Object.freeze({ nombre: "Torre de elipse", corto: "Elipse", danoBase: 30, leccion: "Drawabox 1 · Elipses" }),
  [TECNICA.PERSPECTIVA]: Object.freeze({ nombre: "Torre de perspectiva", corto: "Perspectiva", danoBase: 36, leccion: "Drawabox 1 · Cajas" }),
});

export const METRICA_PRINCIPAL = Object.freeze({
  [TECNICA.LINEA]: Object.freeze({ clave: "desviacion_pct", etiqueta: "Desviación media", unidad: "%" }),
  [TECNICA.ELIPSE]: Object.freeze({ clave: "ajuste_pct", etiqueta: "Error de ajuste medio", unidad: "%" }),
  [TECNICA.PERSPECTIVA]: Object.freeze({ clave: "desvio_deg", etiqueta: "Desvío medio al punto de fuga", unidad: "°" }),
});

export const PUNTAJE = Object.freeze({
  LINEA_DESVIACION_MAX_PCT: 8,
  LINEA_EXTREMOS_MAX_PCT: 15,
  VELOCIDAD_LENTA_PX_MS: 0.12,
  VELOCIDAD_SEGURA_PX_MS: 0.4,
  PENALIZACION_REPASO: 0.5,
  REPASO_MIN_PCT: 4,
  ELIPSE_AJUSTE_MAX_PCT: 15,
  ELIPSE_CIERRE_MAX_PCT: 20,
  ELIPSE_TEMBLOR_MAX_DEG: 12,
  ELIPSE_COBERTURA_MIN_DEG: 270,
  ELIPSE_COBERTURA_OK_DEG: 330,
  ELIPSE_MUESTRAS: 64,
  PERSPECTIVA_DESVIO_MAX_DEG: 8,
  PERSPECTIVA_RECTITUD_MAX_PCT: 8,
  PERSPECTIVA_INICIO_MAX_PCT: 20,
  TRAZO_MIN_PX: 20,
  FALLO_BAJO: 0.15,
});

export const NIVEL = Object.freeze({
  VENTANA: 20,
  MUESTRAS_MIN: 5,
  CORTES: Object.freeze([0.4, 0.55, 0.7, 0.82]),
  MAX: 5,
  DIAS_HISTORIAL: 120,
});

export const MINIMOS_CAPITULO = Object.freeze({
  [TECNICA.LINEA]: Object.freeze({ trazos: 10, maximo: 6 }),
  [TECNICA.ELIPSE]: Object.freeze({ trazos: 6, maximo: 12 }),
  [TECNICA.PERSPECTIVA]: Object.freeze({ trazos: 6, maximo: 6 }),
});

export const PUNTO_DEBIL = Object.freeze({
  HORIZONTE: "horizonte",
  FUGANTES: "fugantes",
  FRONTALES: "frontales",
  SEGURIDAD: "seguridad",
});

export const COMPARA = Object.freeze({ MENOR_O_IGUAL: "<=", MAYOR_O_IGUAL: ">=" });

export const JEFE = Object.freeze({
  id: "guardian_fuga",
  nombre: "Guardián del Punto de Fuga",
  leccion: "Drawabox 1 · Cajas en perspectiva de un punto",
  minimoFugantes: 4,
  minimoFrontales: 4,
  rectitudSeguraPct: 4,
  recompensaTinta: 60,
  puntosDebiles: Object.freeze([
    Object.freeze({ id: PUNTO_DEBIL.HORIZONTE, nombre: "Horizonte", texto: "el horizonte se inclina", media: false, unidad: "°", base: 4, paso: -0.5, limite: 1.5, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.FUGANTES, nombre: "Líneas de fuga", texto: "tus líneas de fuga se desvían", media: true, unidad: "°", base: 6, paso: -0.75, limite: 3, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.FRONTALES, nombre: "Cara frontal", texto: "tus verticales y horizontales se inclinan", media: true, unidad: "°", base: 5, paso: -0.6, limite: 2, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.SEGURIDAD, nombre: "Seguridad", texto: "trazos seguros:", media: false, unidad: "%", base: 60, paso: 5, limite: 85, compara: COMPARA.MAYOR_O_IGUAL }),
  ]),
});

export const MEJORA = Object.freeze({
  MAX: 5,
  COSTOS: Object.freeze([30, 50, 80, 120, 180]),
  EFECTOS: Object.freeze([
    Object.freeze({ dano: 0.15, objetivos: 0 }),
    Object.freeze({ dano: 0, objetivos: 1 }),
    Object.freeze({ dano: 0.15, objetivos: 0 }),
    Object.freeze({ dano: 0, objetivos: 1 }),
    Object.freeze({ dano: 0.2, objetivos: 0 }),
  ]),
});

export const MEZCLA = Object.freeze({
  PESO_DEBIL: 0.4,
});

export const SESION = Object.freeze({
  BONUS_TINTA: 40,
});

export const OLEADA = Object.freeze({
  VIDAS_BASE: 10,
  MONSTRUOS_BASE: 6,
  MONSTRUOS_POR_OLEADA: 2,
  INTERVALO_MS: 3800,
  TINTA_POR_MONSTRUO: 2,
  TINTA_POR_OLEADA: 10,
  CRECIMIENTO_VIDA: 0.12,
});

export const CAMARA_LENTA = Object.freeze({
  FACTOR: 0.3,
});

export const ZONA_DIBUJO = Object.freeze({
  ARRIBA: 0.25,
  ABAJO: 0.79,
});

export const COLA = Object.freeze({
  CANTIDAD: 3,
});

export const MONSTRUO = Object.freeze({
  BORRON: Object.freeze({ id: "borron", nombre: "Borrón", vida: 40, velocidad: 0.034, radio: 13, color: "#3b3a4a" }),
  GARABATO: Object.freeze({ id: "garabato", nombre: "Garabato", vida: 24, velocidad: 0.055, radio: 10, color: "#5b4bd6" }),
  MANCHA: Object.freeze({ id: "mancha", nombre: "Mancha", vida: 80, velocidad: 0.024, radio: 16, color: "#b8483f" }),
});

export const CAMINO = Object.freeze([
  [0.14, -0.05], [0.14, 0.12], [0.86, 0.12], [0.86, 0.5], [0.5, 0.5], [0.5, 0.9],
]);

export const POSICION_TORRE = Object.freeze({
  [TECNICA.LINEA]: Object.freeze([0.13, 0.9]),
  [TECNICA.ELIPSE]: Object.freeze([0.3, 0.9]),
  [TECNICA.PERSPECTIVA]: Object.freeze([0.7, 0.9]),
});

export const PANTALLA = Object.freeze({
  JUGAR: "jugar",
  PROGRESO: "progreso",
  PROYECTO: "proyecto",
  AJUSTES: "ajustes",
});

export const MODO = Object.freeze({
  LIBRE: "libre",
  OLEADA: "oleada",
  TUTORIAL: "tutorial",
});

export const PUNTO_FASE = Object.freeze({ HECHO: "hecho", PENDIENTE: "pendiente" });

export const FASE_PUNTOS = Object.freeze([
  Object.freeze({ texto: "Campo con camino, monstruos, base y oleadas", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Torre de línea medida: desviación, extremos, seguridad y repasos", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Torre de elipse medida: ajuste, cierre, temblor y cobertura", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Torre de perspectiva medida en grados hacia el punto de fuga", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Jefe con 4 puntos débiles y metas que suben con tu nivel", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Nivel por técnica desde promedios móviles, no por horas jugadas", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Curva de progreso por día y mínimos del capítulo 1", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Bonus de tinta en la primera oleada de cada día, sin rachas", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Las 3 torres desde el inicio y oleadas que mezclan técnicas", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Mejoras de torre con tinta: más daño o más objetivos, sin quitarle peso al trazo", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Campo vertical: los monstruos bajan hacia tu cuaderno y dibujas sobre el campo, entre ellos y la base", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Cámara lenta mientras dibujas y cola con los próximos ejercicios", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Tutorial inicial que se puede repetir", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Funciona sin conexión, en iPhone 13 mini y en iPad mini", estado: PUNTO_FASE.HECHO }),
  Object.freeze({ texto: "Calibrar umbrales con trazos reales", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Capítulos 2 en adelante: cajas rotadas, texturas y formas orgánicas", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Torre de gesto con poses de 30 segundos", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Jefes de proporción, valor, composición y color", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Preguntas de historia y estilos con repaso espaciado", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Presión del lápiz en la puntuación", estado: PUNTO_FASE.PENDIENTE }),
  Object.freeze({ texto: "Sonido y animaciones finales", estado: PUNTO_FASE.PENDIENTE }),
]);

export const FASES_NOMBRE = Object.freeze(["Idea", "Definición", "Diseño", "Construcción", "Validación", "Lanzamiento"]);
export const ESTADOS_NOMBRE = Object.freeze(["Pendiente", "En curso", "Bloqueada", "En revisión", "Completada"]);
export const TIPOS_NOMBRE = Object.freeze({ proyecto: "Proyecto", area: "Área", recurso: "Recurso", archivo: "Archivo" });
export const TOTAL_FASES = 6;
