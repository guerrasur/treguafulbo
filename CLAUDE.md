# CLAUDE.md — Treguafulbo

## Producto

Juego web de fútbol + territorio pensado para multiplayer asincrónico con amigos. La demo v0.9.1 es local: 1 humano y 1–3 rivales simulados. La estructura competitiva usa Torneos dentro de una Liga persistente.

## Verificaciones de v0.9.1

- Declarar las claves de almacenamiento antes de inicializar `profile`; una excepción capturada no debe ocultar una pérdida de progreso.
- En penales, la elección de cada arquero pertenece a su propio equipo y se compara con el remate rival.
- Recargar debe conservar progreso personal, partido de desempate, ronda de penales y elecciones pendientes.
- Las tablas finales deben coincidir con el campeón decidido por el desempate y con el podio.
- Mantener compatible el save competitivo de v0.9.0 (`seasonSchema: 3`).

## NEXO

Jugar sin presión, poder observar y pensar, y cerrar el turno de forma voluntaria.

- NO agregar reloj obligatorio.
- NO cerrar turnos automáticamente.
- NO premiar velocidad ni castigar pausas.
- Inspeccionar mapa, plantel, liga y reglas es gratis.
- Conservar entre actualizaciones y nuevas partidas el último nombre de club y los dos colores elegidos por el jugador.
- El multiplayer futuro debe resumir lo sucedido desde la última visita.

## v0.9.0 — Liga persistente y Torneos

- Jerarquía vigente: **Partido → Torneo → Liga → Prestigio**.
- Un Torneo conserva el calendario de **6 PJ por equipo**, con 3 puntos por victoria, 1 por empate y 0 por derrota.
- Una Liga contiene hasta **5 Torneos**. Cada cierre entrega puntos de Liga por posición: **1.º +5, 2.º +3, 3.º +2, 4.º +1**.
- La Liga termina al completar 5 Torneos o antes si el líder ya es matemáticamente inalcanzable.
- Si el primer puesto de un Torneo queda empatado en puntos, NO definir campeón por DG/GF: jugar desempate. Si el desempate empata, resolver por penales. Los empates múltiples usan una serie sembrada por criterios secundarios.
- Los penales guardan elecciones ocultas de **patear** y **atajar** y las revelan juntas. La demo offline completa la elección rival con IA; el futuro online debe esperar ambas selecciones sin revelar una antes de tiempo.
- Al iniciar cada Torneo se reinician **plantel, monedas, tabla del Torneo, mapa, mercado/scouting y calendario**. El nombre/colores del club y el prestigio no se reinician.
- Cada Torneo genera una **silueta procedural conectada** del tablero. Las zonas A–H se calculan sólo con sus casillas activas.
- Cada Liga recibe un nombre temático procedural basado en una lista curada de pueblos/culturas originarias latinoamericanas. No inventar etnónimos.
- Ganar una Liga sólo entrega **prestigio estético**: trofeo/badge y contador de Ligas ganadas. Nunca dar bonus de stats, economía, plantel o probabilidades.
- Al comenzar un Torneo, mostrar el XI inicial antes del mapa. **Asignar automáticamente** debe informar explícitamente quién entra y quién sale.
- Los saves competitivos anteriores a v0.9.0 pueden invalidarse deliberadamente durante la demo. Mantener aparte identidad del club y progreso estético.
- Preparación online: `league.id` identifica cada mundo; `entrantMeta` registra desde qué Torneo participa cada equipo y `pendingEntrants` permite altas sólo entre Torneos. El backend futuro debe permitir que un usuario pertenezca a varias Ligas simultáneas, cada una con su propio estado.
- La demo offline mantiene una sola Liga activa a la vez; no simular multijugador/backend que todavía no existe.

## Dirección visual

Tomar el concept art aprobado como norte: tablero táctico colorido, papel crema, cielo azul, verde, rojo y amarillo, azul petróleo, bordes gruesos, escudos simples e ilustración ligera. Evitar solemnidad y realismo bélico.

## Lenguaje de interfaz

Usar texto mínimo, neutro, directo y funcional. Evitar jerga, chistes, tono canchero, frases grandilocuentes o intentos de complicidad.

## Presentación del partido

- No mostrar el resultado completo inmediatamente al generarse el partido.
- Reproducir el encuentro de forma acelerada del 0' al 90' usando los eventos ya simulados; la animación NO puede recalcular el resultado.
- Los goles deben frenar brevemente la reproducción y tener énfasis visual.
- En cruces territoriales, el invasor se presenta como **Visitante** y el defensor como **Local**. Es una regla temática/visual: NO modifica stats, probabilidades ni simulación.
- Antes de un partido, mostrar claramente el progreso del frente y qué casilla puede dispararlo.
- Mantener **Asignar automáticamente** como acción gratuita de gestión del plantel: debe escoger los mejores futbolistas disponibles para ARQ/DEF/MED/DEL respetando posiciones y mostrar quién entra/sale.

## Dirección actual de partidos

- **Regla vigente para la demo:** los partidos son 100% simulados. NO agregar minijuegos, QTE, tiros manuales ni decisiones durante el encuentro salvo que el usuario apruebe explícitamente el cambio de dirección descrito en la sección de exploración futura.
- La profundidad debe venir de los stats del jugador, la posición natural, el puesto ocupado y el armado del XI.
- Mantener azar ponderado: un mejor equipo debe tener ventaja, no garantía absoluta.
- Conservar informe de posesión, remates, tiros al arco, xG, atajadas, goles, asistencias, figura, minuto a minuto y rendimientos.
- No reemplazar la base de Treguafulbo por la arquitectura del repo abandonado `guerrasur/trucebol`; portar mejoras de forma incremental.

## Exploración futura — partidos asincrónicos interactivos tipo New Star Soccer

**Idea guardada; NO implementar todavía.** Es una posible nueva dirección para el sistema de partidos y reemplazaría la regla de simulación 100% automática sólo después de una aprobación explícita.

Concepto base: convertir el partido en una experiencia asincrónica donde cada jugador ve una simulación acelerada, pero recibe un número pequeño de intervenciones jugables al estilo de New Star Soccer: pases, centros, remates, penales u otras jugadas puntuales.

Flujo tentativo:

- Juega primero el jugador A. Ve su versión del partido en vivo y recibe, por ejemplo, 3 intervenciones: un pase y dos remates.
- Sus decisiones y ejecuciones producen resultados reales —por ejemplo, convierte 2 goles—, pero A **no conoce todavía el marcador final**.
- Al terminar su turno de partido, queda guardado todo lo que hizo A.
- Más tarde juega B. B reproduce el mismo encuentro desde su lado y puede ver los eventos ya fijados del rival —incluidos los goles de A—, mientras recibe sus propias intervenciones.
- Las oportunidades de B pueden diferir en cantidad y/o calidad según la fuerza de su equipo. Por ejemplo, un equipo con mejor AVG podría recibir una oportunidad adicional o situaciones de mayor calidad.
- La ventaja estadística nunca debe convertir el partido en un resultado predeterminado. Un jugador con peor equipo que ejecuta perfectamente sus oportunidades debe poder empatar o ganar.
- El AVG y los atributos deben actuar como **ventaja probabilística**, no como garantía: pueden influir en cuántas situaciones aparecen, su dificultad, precisión, margen de error, posición inicial de la jugada, calidad de compañeros/rivales, etc.
- Cuando ambos jugadores completaron sus respectivas intervenciones, se combinan los eventos fijados por ambos lados y recién entonces se determina y revela el resultado definitivo.
- El sistema debe evitar que el segundo jugador tenga información o ventajas injustas por jugar después. Ver los goles ya ocurridos puede ser parte deliberada de la tensión, pero no debe permitir rehacer o alterar las acciones ya fijadas del jugador A.
- El objetivo conceptual es aproximarse a un **“New Star Soccer online/asíncrono”**, adaptado a Treguafulbo y al NEXO de jugar con amigos sin presión.

Problema técnico principal: para que funcione bien no alcanza con agregar botones o QTE simples. Requiere diseñar una capa sólida de minijuegos de fútbol, generación de situaciones, física/inputs, dificultad ligada a stats, persistencia asincrónica y resolución determinista/justa entre ambos turnos.

Antes de implementar esta dirección hay que prototipar por separado al menos: remate al arco, pase/centro y cómo se generan/distribuyen las oportunidades según AVG, sin comprometer todavía el sistema de liga ni el mapa.

## v0.8.1 — base argentina 2026 (200 cartas activas)

- `players-argentina-2026.js` debe cargarse antes de `game.js`.
- El pool activo contiene **200 futbolistas** y cubre los 30 clubes de Primera División Argentina 2026, con un mínimo de 5 cartas por club.
- La selección prioriza AVG y, a igualdad, minutos 2026. Después de garantizar representación de todos los clubes, se completa con las cartas mejor valoradas.
- Las estadísticas 2026 de temporada se mantienen separadas del AVG.
- Los jugadores cruzados con el snapshot FC 27 usan sus atributos disponibles en la simulación. Los no cruzados usan un AVG interno derivado para balance y **nunca debe presentarse como rating oficial de EA**.
- Los IDs de las 29 cartas históricas se conservan sólo como índice de compatibilidad para saves anteriores; no forman parte de sobres, mercado ni Álbum nuevo.
- La escala de rareza/precio para esta liga es: 80+ Legendario, 77–79 Épico, 74–76 Destacado, ≤73 Base.
- Cualquier regeneración del dataset debe conservar el prefijo `arg26-`, posiciones ARQ/DEF/MED/DEL y compatibilidad con Mercado, sobres, Álbum, Mejor XI y simulación.

## v0.6.1 — invariantes de UX

- El mapa es la acción territorial por defecto. **No exigir un selector/bandera de Expandir** para ocupar una casilla libre válida ni para disputar una frontera habilitada.
- Al volver a `gameScreen` desde Plantel, Liga, Mercado o Álbum, restablecer `activeAction='expand'`.
- Abrir paquetes, fichar o gestionar plantel no debe dejar el mapa en un modo que bloquee la expansión posterior.
- Mantener el orden visual del turno: HUD esencial → liga → frente → mapa → acciones frecuentes. AVG global y eventos son información secundaria y pueden estar plegados.
- En mobile, preservar touch targets de al menos ~44 px para acciones principales y evitar overflow horizontal.
- No alterar por cambios de interfaz: 6 PJ por Torneo, fixtures, simulación, stats, balance ni resolución territorial. El esquema competitivo v0.9.0 puede invalidar saves demo anteriores deliberadamente.

## v0.6.0 — invariantes vigentes

- Integra la actualización paralela `07e2be2`. Mantener la cola persistente de partidos recibidos y su reproducción antes del resumen.
- **Histórico v0.6.0:** lo que entonces se llamaba Liga de 6 PJ ahora es un **Torneo** dentro de la Liga persistente de v0.9.0. Ningún equipo se elimina del Torneo por tener 0 casillas.
- Calendario de seis PJ con cuotas por pareja. Cruces por presión y disputa cuentan; el cierre de ronda completa cruces pendientes sin necesitar contacto territorial. No exceder el calendario.
- Clasificación interna del Torneo: puntos, DG, GF y minitabla sirven para posiciones secundarias y siembra. El primer puesto empatado en puntos se define jugando un desempate y, si hace falta, penales.
- Guardar `pendingMatch` con resultado y eventos ya simulados antes de abrir previa. En recarga, reanudar ese encuentro, sin volver a simular ni cobrar otra acción. Resolver y premiar una sola vez.
- Premios y álbum persistentes son cosméticos/de registro. Nuevas ligas conservan la igualdad de planteles de inicio. No otorgar ventajas estadísticas por XP o medallas.
- No gastar movimiento territorial en paquete o mercado. Ambos usan monedas; no entregar duplicados del plantel.
- Previa explícita antes de reproducir. Cancha ilustrativa de eventos, sin motor físico ni controles de jugadas. Pausa y ritmo son controles de visualización.
- Mantener los 22 rendimientos y todos los datos del informe. Una repetición no modifica tabla, territorios ni recompensas.
- Respetar `prefers-reduced-motion`, sonido optativo y versión siempre visible debajo del título en móvil.
- Mantener consistentes VERSION, encabezado, URLs de assets y version.json. La aplicación no tiene build: index.html, styles.css, game.js.
- Ejecutar `node --test tests/engine.test.cjs` y pruebas de navegador documentadas en README antes de publicar.

## v0.5.1 (histórico: final territorial sustituido en v0.6.0)

- Todo partido generado durante el turno de una IA que involucre al humano debe mostrarse al comenzar el siguiente turno humano. No alcanza con incluir el resultado en el resumen.
- Si hay varios partidos pendientes contra el humano, reproducirlos en orden antes de mostrar el resumen de ronda.
- La partida termina si el humano queda sin territorio o si sólo queda un equipo con territorio.
- Un equipo con 0 casillas queda eliminado y no vuelve a ejecutar turnos.
- Persistir partidos pendientes y estado de fin de partida para que una recarga no saltee el cierre.
## v0.5.0

- Una nueva partida debe resetear la acción activa a **Expandir**.
- Si el humano o una IA no tienen casillas libres adyacentes, la frontera directa se habilita aunque todavía queden huecos en otras zonas del mapa. No permitir soft-locks por encierro territorial.
- La casilla ⚽ y la previa deben resolver el mismo rival. Si hay varios rivales posibles, la interfaz debe mostrarlos sin atribuir un único rival incorrecto.
- La simulación visible debe ser transaccional: resultado, tabla, goleadores y cambio territorial se confirman recién cuando el reloj llega a **FINAL**. Mientras reproduce, el diálogo de partido no debe poder cerrarse con Escape.
- Guardar xG con precisión interna; redondear sólo para UI.
- **Mejor XI** debe priorizar rating/AVG dentro de la posición natural para que la acción automática sea coherente con el AVG general mostrado.
- Al cargar un save, reparar `turnIndex` si quedó apuntando accidentalmente a una IA; conservar `actionsLeft` válido.
- Empates: cruce por presión territorial = reparto de zona; disputa directa = la casilla defensora permanece igual.

## v0.4.0

- La expansión normal sigue usando casillas libres.
- Cuando **todo el tablero está ocupado**, el juego entra en una fase de frontera activa: una casilla rival adyacente marcada con ⚽ puede disputarse gastando 1 acción.
- En una disputa directa, victoria del atacante = captura de la casilla elegida; empate o derrota = la casilla permanece en manos del defensor.
- Mantener como regla de seguridad un solo cruce entre la misma pareja de equipos por ronda.
- La IA debe poder disputar fronteras cuando no quedan casillas libres.
- El AVG general del XI debe ser un dato de primer nivel: visible en mapa, Plantel, comparación de rivales, Liga y contexto previo al partido.
- Plantel debe priorizar legibilidad: cabecera con escudo + AVG general + posición/PJ/PTS, resumen ATQ/MED/DEF/ARQ, titulares agrupados por puesto y banco separado.

## v0.2.0

- Base visual, mapa, navegación, plantel, mercado, IA y flujo de v0.1 conservados.
- Atributos ATQ/PAS/DEF/ARQ y penalización por fuera de posición.
- Simulación avanzada e informe ampliado.
- Save competitivo actual `treguafulbo-demo-v1` con `seasonSchema: 3`. En demo, saves competitivos viejos pueden reiniciarse; identidad del club y progreso estético usan almacenamiento separado.

## v0.1.0

- 2–4 equipos;
- 1 humano + IA local;
- mapa 8x8;
- 3 acciones;
- inicio provisorio de 3 casillas;
- reorganizar plantel no consume acción;
- economía no implementada;
- fichar/paquete consume 1 acción;
- frente con umbral de 3 adyacencias;
- partido inmediato y turno continúa (provisorio);
- empate divide la zona;
- save `treguafulbo-demo-v1`.

## Arquitectura

Repo: `guerrasur/treguafulbo`.
GitHub Pages: rama `main`.
Demo estática sin build ni Firebase.

## Actualizaciones

Mantener el botón de actualización en la barra superior. Debe consultar `version.json` sin caché, mostrarse sólo si la versión publicada difiere de `VERSION` y recargar con cache-busting sin borrar el save.

## Updates

Mantener versión visible + `version.json`. Antes de publicar, revisar regresiones visibles, mobile, touch, persistencia, turnos, AVG, mapa y partidos. No romper saves sin migración deliberada.
