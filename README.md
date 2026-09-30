# Treguafulbo

## v0.7.1

Hotfix de render:
- corrige el selector de acciones que detenía el render principal;
- el plantel vuelve a mostrarse sin alterar el inventario guardado;
- abrir paquetes vuelve a completar el flujo y mostrar las cartas adquiridas;
- no cambia economía, movimientos, liga ni balance de v0.7.0.

## v0.7.0

- los 3 puntos del turno pasan a ser **movimientos territoriales**: expandir, atacar una frontera rival o reforzar una casilla propia;
- fichajes y paquetes dejan de gastar movimientos: cuestan monedas (fichajes 6/9/12/16 según nivel; paquete 12);
- cada equipo empieza con 30 monedas y cobra por territorio al comenzar una nueva ronda; una región completa de 8 casillas suma +3;
- la primera conquista rival de cada ronda entrega +5 monedas;
- se puede atacar una casilla rival adyacente aunque todavía queden casillas neutrales disponibles;
- reforzar cuesta 1 movimiento y da +4 DEF local mientras la casilla siga en manos del mismo equipo;
- un dado virtual se tira al comienzo de cada ronda y entrega sólo un bonus económico pequeño; nunca interviene en el resultado de los partidos;
- la IA usa los mismos movimientos y puede invertir monedas en jugadores;
- se mantienen la liga de 6 partidos, scouting territorial, simulación minuto a minuto y guardados anteriores.

## v0.6.4

El territorio ahora alimenta el scouting del Mercado sin dar puntos ni bonus directos al equipo.

- cada ronda congela una cobertura de scouting según las casillas controladas al comenzar: 3 observados por defecto, 4 desde 6 sectores, 5 desde 10 y 6 desde 15;
- el Mercado muestra sólo esos jugadores observados durante toda la ronda y no se puede rerollear abriéndolo de nuevo;
- expandirse durante el turno mejora la cobertura de la ronda siguiente, no la selección actual;
- fichar sigue costando 1 acción y los paquetes conservan su funcionamiento actual;
- partidas guardadas anteriores siguen siendo compatibles: el scouting se genera automáticamente al cargarlas.

## v0.6.1

Actualización de UX sobre el `main` v0.6.0 (`f06dea9`), sin cambiar liga, balance ni simulación de partidos.

- interfaz de turno reorganizada alrededor del mapa: HUD compacto, liga, frente, mapa y acciones auxiliares;
- **Expandir deja de ser un selector**: una casilla libre válida o una frontera disputable se puede tocar directamente siempre que queden acciones;
- volver desde Plantel, Liga o Mercado deja el mapa listo para expandir; abrir un paquete tampoco desactiva la expansión;
- Fichar, Paquete y Plantel quedan junto al mapa; AVG de rivales y eventos pasan a paneles secundarios desplegables;
- mobile-first: menos márgenes, tarjetas más bajas, acciones táctiles de 48 px, frente antes del mapa y navegación fija preservada;
- escritorio conserva el mapa como elemento principal con un rail lateral compacto;
- compatibilidad de guardado intacta: se mantiene `treguafulbo-demo-v1` y la migración anterior.

Demo offline de fútbol y conquista territorial.

## v0.6.0

Actualización completa integrada sobre `07e2be2`, sin perder la cola de partidos recibidos de v0.5.1. El usuario confirmó el final por **liga de seis partidos por equipo**, que reemplaza el final territorial anterior.

- calendario finito para 2–4 equipos; cruces territoriales y partidos de respaldo al cerrar ronda;
- previa con escudos y atributos, cancha ilustrativa, pausa voluntaria, ×1/×2 y resultado al FINAL;
- partido pendiente guardado antes de reproducir; recargar no genera otro resultado;
- tarjetas de cuatro rarezas, revelación individual de paquetes, filtros por posición y comparación con el XI;
- álbum, XP y premios persistentes sin ventajas estadísticas entre partidas;
- podio diferenciado de oro, plata y bronce; campeón, goleador y cierre de liga;
- sonido opcional, movimiento reducido y versión visible debajo del título en celular;
- pruebas automatizadas de liga, simulación, migración, premios, guardado e interfaz.

[Análisis, referencias, plan completo y próxima ronda](docs/UPDATE-v0.6.0.md).

### Ejecutar y probar

Abrir con un servidor estático (`python -m http.server 8000`) o GitHub Pages. No requiere build.

```sh
node --test tests/engine.test.cjs
```

Las pruebas de navegador requieren Playwright y Chromium. No son dependencias del juego:

```sh
PLAYWRIGHT_MODULE=/ruta/a/playwright CHROME_EXECUTABLE=/ruta/a/chromium node tests/browser.test.cjs
```

## v0.5.1

- los partidos que una IA juega contra el equipo humano quedan pendientes y se reproducen al comenzar el siguiente turno del jugador, en lugar de aparecer sólo como texto en el resumen;
- si hubo varios cruces contra el humano, se reproducen en orden antes del resumen de ronda;
- la partida termina cuando el equipo humano se queda sin territorio o cuando queda un solo equipo con territorio;
- los equipos eliminados dejan de ejecutar turnos, evitando rondas vacías y bucles sin salida;
- el estado de partidos pendientes y fin de partida se guarda en el save para sobrevivir a una recarga.
## v0.5.0

- corrige el bloqueo de turno cuando un equipo queda encerrado antes de que el tablero esté completo: si ya no tiene expansión libre, puede disputar una frontera rival;
- una partida nueva siempre vuelve a **Expandir** y recupera saves que hayan quedado accidentalmente en un turno de IA;
- la previa y las casillas ⚽ usan el mismo rival determinista, evitando anunciar un cruce y resolver otro;
- en partidos visibles, tabla, goleadores y territorio se aplican recién al llegar a **FINAL**; Escape no puede cortar la reproducción antes de ese punto;
- el xG se conserva con precisión interna y sólo se redondea al mostrarlo, para que el minuto a minuto coincida con el total final;
- **Mejor XI** prioriza el mayor AVG/rating dentro de cada posición natural y mantiene la reorganización gratuita;
- el ritmo minuto a minuto se ajustó para mejorar la lectura sin dejar de ser acelerado;
- se aclaró la diferencia entre empate por presión territorial y empate en disputa directa.

## v0.4.1

- el resumen de ronda ya no informa coordenadas o sectores concretos de expansión;
- ahora resume por equipo cuántas casillas ganó y cuántas perdió durante la ronda;
- los resultados de partidos siguen apareciendo de forma separada y compacta.

## v0.4.0

- cuando el tablero queda completamente ocupado, las fronteras siguen siendo jugables: las casillas rivales adyacentes marcadas con ⚽ se pueden disputar;
- disputar una frontera consume 1 acción y genera un partido; si el atacante gana, captura la casilla elegida; empate o derrota mantienen el sector defensor;
- la IA también disputa fronteras cuando ya no quedan casillas libres;
- el menú **Plantel** fue reorganizado con cabecera de equipo, AVG general destacado, posición, PJ, puntos y titulares agrupados por puesto;
- comparación visible del **AVG general** de todos los equipos en Plantel y en el mapa;
- la tabla de Liga incorpora una columna AVG;
- los paneles de frente muestran el AVG propio y el del rival cuando hay un cruce próximo o activo.

## v0.3.0

- indicador **Frente** con progreso hacia el próximo partido;
- casillas ⚽ que muestran qué expansión dispara un encuentro;
- reproducción acelerada del partido desde 0' a 90', sin revelar el resultado de entrada;
- pausa y parpadeo al producirse un gol;
- remates, tiros al arco y xG se actualizan durante la reproducción; figura y rendimientos aparecen al final;
- botón **Mejor XI**: ubica automáticamente a los mejores jugadores disponibles en sus posiciones naturales sin consumir acciones.

## v0.2.1

- botón **Actualizar** en la barra superior cuando `version.json` detecta una versión nueva;
- la actualización fuerza una recarga sin caché y conserva la partida guardada.

## v0.2.0

- mantiene la demo y el flujo existente de Treguafulbo;
- partidos 100% simulados, sin controles ni minijuegos dentro del encuentro;
- atributos individuales ATQ, PAS, DEF y ARQ;
- la posición natural y el puesto ocupado en el XI afectan el rendimiento;
- perfil de equipo ATQ / MED / DEF / ARQ;
- simulación de posesión, remates, tiros al arco, xG y atajadas;
- goles, asistencias, figura, minuto a minuto y rendimientos individuales;
- el azar sigue existiendo, pero los stats del XI inclinan la simulación;
- migración automática del save anterior `trucebol-demo-v1` a `treguafulbo-demo-v1` sin borrar el original.

## v0.1.0

- 2 a 4 equipos;
- 1 equipo controlado y 1–3 rivales simulados;
- mapa 8x8;
- 3 acciones por turno;
- expansión territorial;
- 11 titulares + inventario;
- AVG calculado con titulares;
- mercado y paquetes;
- partidos activados por 3 adyacencias;
- resultado simulado según plantel + azar;
- territorio, tabla y goleadores;
- guardado local con localStorage;
- sin temporizador.

## Regla de final vigente (v0.6.0)

Todos los equipos completan 6 PJ. La clasificación usa puntos, diferencia de gol, goles a favor y una minitabla de enfrentamientos directos entre los equipos empatados; si aún persiste igualdad, se comparte posición. El territorio no agrega puntos y perder todas las casillas no elimina de la liga.

Los cruces territoriales consumen un encuentro de esa pareja en el calendario. El cierre manual de ronda garantiza los pendientes, incluso sin contacto entre equipos. Nadie juega más de 6 PJ; la liga termina al completar todas las fechas.

## Decisiones provisorias

- Inicio: 3 casillas por equipo.
- Economía: implementada. Territorio y regiones generan monedas; fichajes y paquetes usan monedas y no consumen movimientos.
- Partido: se muestra al generarse y luego continúa el turno.
- Empate: en un cruce por presión territorial, la zona se divide; en una disputa directa de frontera, la casilla defendida no cambia de dueño.

## Dirección visual

Usar como referencia el concept art aprobado: colores vivos, mapa táctico ilustrado, papel crema, azul petróleo, verde, rojo y amarillo, bordes gruesos, botones grandes y escudos simples. Evitar solemnidad y realismo bélico.

## Lenguaje de interfaz

Texto mínimo, neutro, directo y funcional. Evitar jerga, chistes, tono canchero, frases grandilocuentes o intentos de complicidad.

## NEXO

Treguafulbo está pensado para multiplayer asincrónico con amigos y sin presión.

- no hay reloj obligatorio;
- cerrar turno es manual;
- inspeccionar mapa, plantel, liga o reglas no consume acciones;
- al volver debe poder entenderse qué ocurrió desde la última visita;
- las notificaciones futuras informan el turno, no penalizan demoras.

## Arquitectura

Demo estática sin backend ni build: `index.html` (estructura), `styles.css` (presentación) y `game.js` (reglas, estado e interfaz). GitHub Pages sirve `main`.

Save actual: `treguafulbo-demo-v1`. Se conserva compatibilidad con `trucebol-demo-v1` para migrar partidas previas.

## Versionado

La versión visible y `version.json` deben actualizarse juntos. Toda update debe revisar mobile, touch, persistencia, turnos, AVG, mapa y partidos.


## Dirección de partidos

La parte jugable ocurre antes del partido: armar el XI y mejorar el plantel. El encuentro se simula por completo. La referencia de 7a0 se usa para dar peso al armado del equipo; New Star Soccer se toma sólo como referencia de presentación y protagonismo de los momentos del partido, no de controles interactivos.
