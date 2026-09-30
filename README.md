# Treguafulbo

Demo offline de fútbol y conquista territorial.

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

## Decisiones provisorias

- Inicio: 3 casillas por equipo.
- Economía: todavía no implementada. Fichar o abrir paquete consume 1 acción y no dinero.
- Partido: se muestra al generarse y luego continúa el turno.
- Empate: la zona se divide entre ambos equipos.

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

Demo estática sin backend ni build. La primera versión se concentra en `index.html` para facilitar prueba e iteración. GitHub Pages sirve `main`.

Save actual: `treguafulbo-demo-v1`. Se conserva compatibilidad con `trucebol-demo-v1` para migrar partidas previas.

## Versionado

La versión visible y `version.json` deben actualizarse juntos. Toda update debe revisar mobile, touch, persistencia, turnos, AVG, mapa y partidos.


## Dirección de partidos

La parte jugable ocurre antes del partido: armar el XI y mejorar el plantel. El encuentro se simula por completo. La referencia de 7a0 se usa para dar peso al armado del equipo; New Star Soccer se toma sólo como referencia de presentación y protagonismo de los momentos del partido, no de controles interactivos.
