# ✏️ Trazo Defense

> Tower defense para aprender a dibujar: cada torre dispara con un ejercicio de dibujo medido de forma objetiva.

**[▶ Jugar ahora](https://juliangdeveloper.github.io/trazo-defense/)** · gratis, en el navegador, sin instalar

<img src="docs/screenshot.png" alt="Partida de Trazo Defense con monstruos bajando y la caja del ejercicio de elipse" width="320">

## Cómo se juega

- Los monstruos salen por arriba y bajan hacia tu cuaderno, abajo. Dibujas sobre el campo, en la franja entre ellos y la base, y la torre activa dispara.
- Mientras dibujas, los monstruos van en cámara lenta. «Luego» muestra los próximos ejercicios.
- **Línea:** une los dos puntos de un solo trazo. Se mide desviación, extremos, repasos y velocidad.
- **Elipse:** dibújala dentro de la caja. Se mide ajuste, cierre y temblor.
- **Perspectiva:** cierra un cubo en perspectiva de un punto con 3 rectas hacia el punto de fuga. Se mide la convergencia en grados, el cierre en las esquinas y la rectitud.
- Las tres torres están disponibles desde el inicio. En una oleada los monstruos mezclan técnicas y el que va primero elige la torre y el ejercicio.
- Mejor trazo, más daño. Cada resultado muestra sus métricas.
- **Mejoras:** cada 10 de tinta la torre de menor nivel sube sola (empate: línea, elipse, perspectiva). Cada torre muestra su nivel y la tinta que lleva hacia la siguiente mejora, por ejemplo 7/10. Son 5 niveles que alternan más daño y más objetivos, y la torre cambia de aspecto. El daño sigue dependiendo del puntaje del trazo.
- **Jefe:** con los mínimos del capítulo 1 cumplidos, aparece al final de cada oleada en el mismo campo, con una demo animada que se repite con «Ver demo». Dibujas horizonte, cara frontal, 4 líneas de fuga y una elipse dentro de la cara, guiado por el punto de fuga y el centro de la cara, que cambian de sitio en cada aparición. Cada línea y la elipse son un ataque. Vencerlo da 30 de tinta. Sin los mínimos, la oleada termina normal y te dice qué falta.
- **Ataques al jefe:** cada ataque se califica en 5 dimensiones con 4 niveles (Débil, Bien, Fuerte, Perfecto): precisión respecto a su punto guía, rectitud (o curva pareja en la elipse), seguridad (un trazo continuo, a velocidad constante, sin repasos ni pausas), proporción (tamaño y ángulo para la cara y la perspectiva) y presión (constancia del lápiz; sin lápiz se estima con la velocidad). El daño crece con los niveles. Al cerrar la caja llega un ataque final que combina toda la caja, y cada uno de sus 5 puntos débiles roto (horizonte, líneas de fuga, cara frontal, seguridad y elipse) le quita más.
- **Destello:** cada ataque lanza un destello de 5 anillos sobre el jefe, del centro hacia afuera precisión, rectitud, seguridad, proporción y presión. El color es el nivel: negro débil, rojo bien, ámbar fuerte y blanco brillante perfecto. Cuanto mejor el ataque, más halo y rayos. La leyenda se abre con el botón de anillos del campo o desde Ajustes.
- La primera oleada que terminas cada día da tinta extra. No hay rachas ni se pierde nada.
- El tutorial se puede repetir desde Ajustes.
- Los trazos se dibujan con tinta suave. Con lápiz óptico el grosor sigue la presión; con dedo o ratón es uniforme. La medición usa siempre los puntos originales del trazo.
- **Deshacer** quita el último trazo en práctica y contra el jefe, y devuelve la vida que ese ataque le quitó al jefe. En una oleada solo se deshacen trazos que no dañaron monstruos, y contra el jefe se bloquea al cerrar la caja.
- Con lápiz óptico se ignoran los toques mientras dibuja y justo después, y los contactos grandes de la palma siempre. Si no usas lápiz, el dedo funciona normal.

## Stack

HTML, CSS y JavaScript con módulos ES. Funciona sin conexión con service worker y guarda el progreso en `localStorage`.

```bash
python3 -m http.server 8080
```

## Créditos

Trazos dibujados con [perfect-freehand](https://github.com/steveruizok/perfect-freehand) de Steve Ruiz, licencia MIT, incluido sin cambios en `js/vendor/perfect-freehand/` con su `LICENSE`.

---

Más proyectos: https://juliangdeveloper.github.io/

Hecho con ❤️ y ✏️
