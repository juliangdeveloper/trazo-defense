export const APP_ID = "trazo-defense";
export const APP_VERSION = "0.3.0";
export const SAVE_KEY = "trazo-defense.save";
export const SAVE_VERSION = 3;
export const CACHE_PREFIX = "trazo-defense-";

export const CAPITULO = Object.freeze({ UNO: 1, DOS: 2 });

export const TECNICA = Object.freeze({
  LINEA: "linea",
  ELIPSE: "elipse",
  PERSPECTIVA: "perspectiva",
  SALCHICHAS: "salchichas",
  FORMAS: "formas",
  MIXTA: "mixta",
});

export const TECNICAS_CAPITULO = Object.freeze({
  [CAPITULO.UNO]: Object.freeze([TECNICA.LINEA, TECNICA.ELIPSE, TECNICA.PERSPECTIVA]),
  [CAPITULO.DOS]: Object.freeze([TECNICA.SALCHICHAS, TECNICA.FORMAS, TECNICA.MIXTA]),
});

export const TECNICAS = Object.freeze([
  TECNICA.LINEA, TECNICA.ELIPSE, TECNICA.PERSPECTIVA,
  TECNICA.SALCHICHAS, TECNICA.FORMAS, TECNICA.MIXTA,
]);

export const TORRE = Object.freeze({
  [TECNICA.LINEA]: Object.freeze({ nombre: "Torre de línea", corto: "Línea", danoBase: 24, leccion: "Drawabox 1 · Líneas", capitulo: CAPITULO.UNO }),
  [TECNICA.ELIPSE]: Object.freeze({ nombre: "Torre de elipse", corto: "Elipse", danoBase: 30, leccion: "Drawabox 1 · Elipses", capitulo: CAPITULO.UNO }),
  [TECNICA.PERSPECTIVA]: Object.freeze({ nombre: "Torre de perspectiva", corto: "Perspectiva", danoBase: 60, leccion: "Drawabox 1 · Cajas", capitulo: CAPITULO.UNO }),
  [TECNICA.SALCHICHAS]: Object.freeze({ nombre: "Torre de salchichas", corto: "Salchichas", danoBase: 32, leccion: "Drawabox 2 · Intersecciones orgánicas", capitulo: CAPITULO.DOS }),
  [TECNICA.FORMAS]: Object.freeze({ nombre: "Torre de formas", corto: "Formas", danoBase: 36, leccion: "Drawabox 2 · Intersecciones de formas", capitulo: CAPITULO.DOS }),
  [TECNICA.MIXTA]: Object.freeze({ nombre: "Torre mixta", corto: "Mixta", danoBase: 40, leccion: "Drawabox 2 · Orgánico y geométrico", capitulo: CAPITULO.DOS }),
});

export const METRICA_PRINCIPAL = Object.freeze({
  [TECNICA.LINEA]: Object.freeze({ clave: "desviacion_pct", etiqueta: "Desviación media", unidad: "%" }),
  [TECNICA.ELIPSE]: Object.freeze({ clave: "ajuste_pct", etiqueta: "Error de ajuste medio", unidad: "%" }),
  [TECNICA.PERSPECTIVA]: Object.freeze({ clave: "desvio_deg", etiqueta: "Convergencia al punto de fuga", unidad: "°" }),
  [TECNICA.SALCHICHAS]: Object.freeze({ clave: "desviacion_pct", etiqueta: "Desviación a la guía", unidad: "%" }),
  [TECNICA.FORMAS]: Object.freeze({ clave: "desviacion_pct", etiqueta: "Desviación a la guía", unidad: "%" }),
  [TECNICA.MIXTA]: Object.freeze({ clave: "desviacion_pct", etiqueta: "Desviación a la guía", unidad: "%" }),
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
  PERSPECTIVA_CIERRE_MAX_PCT: 25,
  CUBO_LINEAS: 3,
  GUIA_DESVIACION_MAX_PCT: 12,
  GUIA_SUAVIDAD_MAX_DEG: 16,
  GUIA_EXTREMOS_MAX_PCT: 20,
  GUIA_CIERRE_MAX_PCT: 28,
  INTERSECCION_MIN_PASOS: 1,
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
  [CAPITULO.UNO]: Object.freeze({
    [TECNICA.LINEA]: Object.freeze({ trazos: 10, maximo: 6 }),
    [TECNICA.ELIPSE]: Object.freeze({ trazos: 6, maximo: 12 }),
    [TECNICA.PERSPECTIVA]: Object.freeze({ trazos: 6, maximo: 6 }),
  }),
  [CAPITULO.DOS]: Object.freeze({
    [TECNICA.SALCHICHAS]: Object.freeze({ trazos: 6, maximo: 12 }),
    [TECNICA.FORMAS]: Object.freeze({ trazos: 6, maximo: 12 }),
    [TECNICA.MIXTA]: Object.freeze({ trazos: 6, maximo: 12 }),
  }),
});

export const PUNTO_DEBIL = Object.freeze({
  HORIZONTE: "horizonte",
  FUGANTES: "fugantes",
  FRONTALES: "frontales",
  SEGURIDAD: "seguridad",
  ELIPSE: "elipse",
  VP1: "vp1",
  VP2: "vp2",
  CILINDRO: "cilindro",
  INTERSECCION: "interseccion",
});

export const COMPARA = Object.freeze({ MENOR_O_IGUAL: "<=", MAYOR_O_IGUAL: ">=" });

export const JEFE_CAP1 = Object.freeze({
  id: "guardian_fuga",
  nombre: "Guardián del Punto de Fuga",
  leccion: "Drawabox 1 · Cajas en perspectiva de un punto",
  capitulo: CAPITULO.UNO,
  minimoHorizonte: 1,
  minimoFugantes: 4,
  minimoFrontales: 4,
  minimoElipses: 1,
  rectitudSeguraPct: 4,
  elipseRectitudMinPct: 12,
  elipseBarridoMinDeg: 270,
  vida: 300,
  danoPuntoDebil: 20,
  recompensaTinta: 30,
  golpeMs: 220,
  puntosDebiles: Object.freeze([
    Object.freeze({ id: PUNTO_DEBIL.HORIZONTE, nombre: "Horizonte", corto: "Horizonte", texto: "el horizonte se inclina", media: false, unidad: "°", base: 4, paso: -0.5, limite: 1.5, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.FUGANTES, nombre: "Líneas de fuga", corto: "Fuga", texto: "tus líneas de fuga se desvían", media: true, unidad: "°", base: 6, paso: -0.75, limite: 3, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.FRONTALES, nombre: "Cara frontal", corto: "Cara", texto: "tus verticales y horizontales se inclinan", media: true, unidad: "°", base: 5, paso: -0.6, limite: 2, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.SEGURIDAD, nombre: "Seguridad", corto: "Seguridad", texto: "trazos seguros:", media: false, unidad: "%", base: 60, paso: 5, limite: 85, compara: COMPARA.MAYOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.ELIPSE, nombre: "Elipse", corto: "Elipse", texto: "la elipse en la cara frontal puntúa", media: false, unidad: "%", base: 55, paso: 5, limite: 80, compara: COMPARA.MAYOR_O_IGUAL }),
  ]),
});

export const JEFE_CAP2 = Object.freeze({
  id: "golem_intersecciones",
  nombre: "Gólem de Intersecciones",
  leccion: "Drawabox 2 · Intersecciones",
  capitulo: CAPITULO.DOS,
  minimoFormas: 4,
  minimoIntersecciones: 2,
  rectitudSeguraPct: 4,
  vida: 380,
  danoPuntoDebil: 22,
  recompensaTinta: 40,
  golpeMs: 220,
  puntosDebiles: Object.freeze([
    Object.freeze({ id: PUNTO_DEBIL.VP1, nombre: "Formas sólidas", corto: "Formas", texto: "tus formas se desvían de la guía", media: true, unidad: "%", base: 14, paso: -1, limite: 7, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.VP2, nombre: "Contornos", corto: "Contorno", texto: "tus contornos se desvían", media: true, unidad: "%", base: 14, paso: -1, limite: 7, compara: COMPARA.MENOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.CILINDRO, nombre: "Cierres", corto: "Cierre", texto: "el cierre de curvas puntúa", media: false, unidad: "%", base: 50, paso: 5, limite: 78, compara: COMPARA.MAYOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.INTERSECCION, nombre: "Intersección", corto: "Corte", texto: "la línea de intersección se acerca", media: false, unidad: "%", base: 45, paso: 5, limite: 75, compara: COMPARA.MAYOR_O_IGUAL }),
    Object.freeze({ id: PUNTO_DEBIL.SEGURIDAD, nombre: "Seguridad", corto: "Seguridad", texto: "trazos seguros:", media: false, unidad: "%", base: 58, paso: 5, limite: 85, compara: COMPARA.MAYOR_O_IGUAL }),
  ]),
});

export const JEFES = Object.freeze({
  [CAPITULO.UNO]: JEFE_CAP1,
  [CAPITULO.DOS]: JEFE_CAP2,
});

export const JEFE = JEFE_CAP1;

export const DIMENSION = Object.freeze({
  PRECISION: "precision",
  RECTITUD: "rectitud",
  SEGURIDAD: "seguridad",
  PROPORCION: "proporcion",
  PRESION: "presion",
});

export const DIMENSIONES = Object.freeze([
  Object.freeze({ id: DIMENSION.PRECISION, nombre: "Precisión", corto: "Prec." }),
  Object.freeze({ id: DIMENSION.RECTITUD, nombre: "Rectitud", corto: "Rect." }),
  Object.freeze({ id: DIMENSION.SEGURIDAD, nombre: "Seguridad", corto: "Seg." }),
  Object.freeze({ id: DIMENSION.PROPORCION, nombre: "Proporción", corto: "Prop." }),
  Object.freeze({ id: DIMENSION.PRESION, nombre: "Presión", corto: "Pres." }),
]);

export const NIVEL_ATAQUE = Object.freeze({
  DEBIL: 0,
  BIEN: 1,
  FUERTE: 2,
  PERFECTO: 3,
  NOMBRES: Object.freeze(["Débil", "Bien", "Fuerte", "Perfecto"]),
  COLORES: Object.freeze(["#1b1b1f", "#d2452a", "#f2b33d", "#ffffff"]),
  CORTES: Object.freeze([0.45, 0.7, 0.9]),
  MULTIPLICADOR: Object.freeze([0.1, 0.45, 0.75, 1]),
  CALOR: Object.freeze([0, 0.45, 0.8, 1]),
});

export const ATAQUE = Object.freeze({
  DANO_TRAZO: 20,
  DANO_FINAL: 20,
  PRECISION_HORIZONTE_MAX: 0.3,
  PRECISION_FUGA_MAX_DEG: 10,
  PRECISION_FRONTAL_MAX: 0.3,
  PRECISION_ELIPSE_MAX: 0.25,
  PRECISION_INTER_MAX: 0.35,
  RECTITUD_MAX_PCT: 8,
  RECTITUD_ELIPSE_TEMBLOR_MAX_DEG: 12,
  SEGURIDAD_VARIACION_MAX: 0.8,
  SEGURIDAD_VENTANA_MS: 30,
  SEGURIDAD_PAUSA_PX_MS: 0.05,
  SEGURIDAD_PENALIZACION_PAUSA: 0.6,
  PROPORCION_EJE_MAX_DEG: 6,
  PROPORCION_LADO_MAX: 0.5,
  PROPORCION_FONDO_BANDA: 0.1,
  PROPORCION_FONDO_CAIDA: 0.4,
  PROPORCION_ELIPSE_AJUSTE_MAX_PCT: 15,
  PRESION_VARIACION_MAX: 0.35,
  PRESION_VELOCIDAD_REF_PX_MS: 1.5,
  RECORTE_EXTREMOS: 0.1,
});

export const DESTELLO = Object.freeze({
  RADIO: 40,
  ESCALA_FINAL: 1.2,
  MS: 1500,
  ENTRADA_MS: 160,
  SALIDA_MS: 450,
  RETRASO_FINAL_MS: 520,
  ESCALA_INICIAL: 0.6,
  DPR_MAX: 3,
});

export const ESCENA_JEFE = Object.freeze({
  FUGA: Object.freeze([0.66, 0.2]),
  CENTRO: Object.freeze([0.3, 0.64]),
  LADO: 0.36,
  FONDO: 0.45,
  RESERVA_MAX: 0.3,
  AZAR_FUGA_Y: Object.freeze([0.1, 0.26]),
  AZAR_CENTRO_Y: Object.freeze([0.6, 0.7]),
  AZAR_BORDE: 0.06,
  AZAR_FUGA_X: Object.freeze([0.1, 0.9]),
  AZAR_SEPARACION: 0.1,
});

export const ESCENA_JEFE2 = Object.freeze({
  RESERVA_MAX: 0.3,
  HORIZONTE: Object.freeze([0.12, 0.22]),
  VP_MARGEN: 0.06,
  VP_SEPARACION_MIN: 0.45,
  CENTRO: Object.freeze([0.38, 0.62]),
  LADO: 0.28,
  FONDO: 0.42,
  CIL_RADIO: 0.11,
  AZAR_HORIZONTE: Object.freeze([0.1, 0.24]),
  AZAR_CENTRO_Y: Object.freeze([0.55, 0.72]),
  AZAR_CENTRO_X: Object.freeze([0.32, 0.68]),
  AZAR_EJE: Object.freeze([-0.55, 0.55]),
});

export const PALMA = Object.freeze({
  CONTACTO_MAX_PX: 50,
  GRACIA_LAPIZ_MS: 800,
});

export const DESHACER = Object.freeze({ MAX: 20 });

export const DEMO_JEFE = Object.freeze({
  TRAZO_MS: 420,
  PAUSA_MS: 140,
  FINAL_MS: 900,
});

export const BATALLA_JEFE = Object.freeze({
  Y: 0.12,
  RADIO: 26,
  RONDA_MS: 1400,
});

export const MEJORA = Object.freeze({
  MAX: 5,
  TINTA_POR_NIVEL: 10,
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
  [0.14, -0.05], [0.14, 0.12], [0.86, 0.12], [0.86, 0.42], [0.3, 0.42], [0.3, 0.66], [0.88, 0.66], [0.88, 0.9],
]);

export const PANTALLA = Object.freeze({
  JUGAR: "jugar",
  PROGRESO: "progreso",
  AJUSTES: "ajustes",
});

export const MODO = Object.freeze({
  LIBRE: "libre",
  OLEADA: "oleada",
  TUTORIAL: "tutorial",
});

export const CAPITULO_INFO = Object.freeze({
  [CAPITULO.UNO]: Object.freeze({
    titulo: "Capítulo 1 · Drawabox",
    corto: "Líneas, cajas y elipses",
    resumen: "Líneas, elipses y cajas en un punto de fuga. Cumple los mínimos y el Guardián del Punto de Fuga aparece al final de cada oleada.",
  }),
  [CAPITULO.DOS]: Object.freeze({
    titulo: "Capítulo 2 · Intersecciones",
    corto: "Intersecciones",
    resumen: "Salchichas que se cruzan, formas geométricas compartiendo espacio y mezclas de ambas. El Gólem de Intersecciones aparece al final cuando cumples los mínimos.",
  }),
});

