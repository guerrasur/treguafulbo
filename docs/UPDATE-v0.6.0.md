# Treguafulbo v0.6.0

## Análisis

La v0.5.1 ya combinaba conquista en un tablero 8×8, planteles con 11 titulares, paquetes, mercado y partidos automáticos con atributos individuales. La actualización publicada en paralelo (07e2be2) agregó partidos recibidos, cola persistente y final territorial. Se integra completa como base. El usuario confirmó expresamente para v0.6.0 el final de **liga de 6 partidos**, en lugar del cierre territorial reciente.

Faltaban un calendario finito, premios, presentación de fichajes, progreso visible, previa separada de la reproducción y recuperación de partidos aún no confirmados. La experiencia seguía siendo una demo local: este trabajo no inventa un backend multijugador.

## Referencias investigadas y selección

| Referencia | Idea adoptada | Idea descartada |
| --- | --- | --- |
| [eFootball: contratos y tipos de jugadores](https://www.konami.com/efootball/en-us/page/overview) | Mercado para elegir y paquetes aleatorios como rutas de obtención diferenciadas | Moneda premium, contratos pagos y mejora permanente de stats |
| [Pokémon TCG Pocket: colección y rareza](https://www.pokemon.com/uk/strategy/a-guide-to-collecting-cards-and-using-wonder-picks-in-pokemon-trading-card-game-pocket) | Carta legible, rareza con color y texto, revelación individual y álbum | Esperas diarias y sistemas de energía |
| [Hearthstone: protección contra duplicados](https://news.blizzard.com/en-gb/article/20852959/hearthstone-update-upcoming-card-pack-changes) | Cada paquete incorpora jugadores que aún faltan en el plantel | Duplicados convertidos en una nueva moneda |
| [Football Manager: presentación del partido](https://www.footballmanager.com/fm26/features/where-storytelling-evolves-fm26s-match-day-experience) | Previa, cancha 2D, momentos destacados, estadísticas y celebración | Órdenes tácticas durante el partido y realismo 3D |
| [New Star Soccer](https://www.newstargames.com/new-star-soccer) | Protagonismo visual de las jugadas y los goles | Remates, pases y minijuegos interactivos |
| [Clash Royale: Trophy Road](https://supercell.com/en/games/clashroyale/blog/release-notes/new-update-feature-enter-the-trophy-road/) | Progreso explícito y premios registrados | Ladder permanente, perder rango y presión por jugar |
| [Rocket League: torneos y premios](https://www.rocketleague.com/news/revamped-tournaments--a-closer-look?lang=en) | Premio según posición y cierre de torneo | Brackets en tiempo real y horarios obligatorios |

Las características del juego resultante son decisiones de diseño propias; estas referencias inspiran presentación, no sustituyen las reglas existentes.

## Plan implementado, por prioridad

1. **Flujo completo.** Calendario con seis partidos por equipo para 2, 3 y 4 participantes; las fronteras adelantan cruces del calendario; partidos de respaldo al cerrar cada ronda, sin exigir contacto territorial. Cada pareja se enfrenta como máximo una vez por ronda. Final por tabla y cierre manual. Un equipo sin territorio sigue en la liga.
2. **Integridad.** Transacción persistida antes de mostrar un partido territorial. Recargar conserva los eventos y resultado ya simulados. Confirmación única, cupos por pareja, cola de partidos recibidos antes del resumen y premios idempotentes. Migración del historial previo sin borrarlo.
3. **Partidos.** Previa con escudos, AVG y perfiles; botón Ver partido; cancha ilustrativa con 22 jugadores, balón y protagonista; reloj de 0 a 90, pausa voluntaria, ×1/×2 e Ir al final; pausa y énfasis en goles; resultado, puntos, territorio, XP, figura y rendimientos completos. Repeticiones no entregan premios nuevos.
4. **Obtención y presentación.** Mercado por posición, diferencia contra el titular más débil de ese puesto; fichaje confirmado en carta; paquetes de hasta cinco nuevas cartas, reversos tocables y Revelar todos; cuatro rarezas calculadas por rating y pesos decrecientes; ningún paquete vacío gasta acciones. Plantel con rareza, filtro y penalización visible fuera de posición.
5. **Premios y progresión.** XP por partido (30 victoria, 20 empate, 15 derrota), niveles de registro personal cada 250 XP, álbum persistente y medallas. Premio final: primer lugar 150 XP, segundo 100, tercero 70, cuarto 40. Ningún premio modifica stats ni el plantel inicial de una nueva liga.
6. **Final.** Podio oro/plata/bronce según la clasificación real; presentación diferenciada del campeón, confeti respetando movimiento reducido, goleador y resumen deportivo. Si persiste empate tras puntos, DG, GF y enfrentamientos directos, posición compartida.
7. **Game feel.** Versión debajo del título visible en móvil, señales de acción, transición de pantalla, sonido opcional recordado, controles grandes, tablas desplazables, diálogos acotados a la pantalla y respeto por movimiento reducido. Tutorial ampliado y calendario con historial reproducible.

## Reglas preservadas

Tres acciones por turno. Expandir, fichar y abrir paquetes consumen acción; modificar XI y Mejor XI no. Partidos completamente simulados por atributos, posición y azar. No se introducen temporizadores de turno, moneda, minijuegos, compras ni ventajas estadísticas entre ligas. Presión territorial: reparto en empate; disputa directa: el defensor conserva la casilla en empate o victoria defensiva.

## Compatibilidad

Se conserva `treguafulbo-demo-v1` y la migración desde `trucebol-demo-v1`. En partidas antiguas se reconstruye la tabla con los primeros cruces que caben en el calendario; partidos excedentes quedan guardados como amistosos. El registro personal usa `treguafulbo-profile-v1`. CSS y lógica se separan en `styles.css` y `game.js`, sin dependencias ni build.

## Próxima ronda sugerida

- Probar y balancear con partidas humanas: trade-off entre fichar un jugador concreto y abrir cinco cartas.
- Mejorar IA de gestión y ofrecer perfiles tácticos antes del partido, manteniendo su simulación automática.
- Preparar salas y turnos asincrónicos reales; hoy los rivales siguen siendo IA local.
- Ampliar variedad del catálogo y dibujos de camisetas/escudos, sin usar identidades oficiales no autorizadas.

## Fuera de alcance deliberadamente

Multiplayer real, moneda, entrenamiento permanente y partidos interactivos requieren decisiones y arquitectura adicionales. No forman parte del plan implementado. La cancha es una visualización de eventos: no un motor físico nuevo.

## Validación realizada

- 10 pruebas automáticas de motor: 300 ligas completas (100 para cada cantidad de equipos), 500 partidos con coherencia de goles/remates/tiros al arco/xG, calendarios sin contacto y sin territorio, cupos, confirmación única, migración y recompensas.
- Chromium con viewport de 320, 390, 768 y 1440 px: versión visible, ausencia de desbordamiento horizontal, paquetes, fichajes, Mejor XI respetando posiciones, filtros y álbum.
- Ligas completas de 2, 3 y 4 equipos recorridas desde botones reales, incluidos partidos recibidos, podio y recarga del cierre sin duplicar XP.
- Recarga durante una disputa territorial: mismo ID, eventos y resultado; una sola confirmación.
- Gol: reloj detenido durante el énfasis visual y marcador con animación; pausa voluntaria comprobada.
- Sin errores JavaScript en esas rutas. Sintaxis y `git diff --check` correctos. Inspección visual de mapa móvil, cartas, partido y podio.

Limitación de estas pruebas: emulación móvil en Chromium; no equivalen a probar Safari en un iPhone físico. El balance deportivo/económico requiere sesiones humanas; no se introdujo moneda.
