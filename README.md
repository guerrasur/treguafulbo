# Trucebol

Demo offline de fútbol y conquista territorial.

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
- resultado con AVG + azar;
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

Trucebol está pensado para multiplayer asincrónico con amigos y sin presión.

- no hay reloj obligatorio;
- cerrar turno es manual;
- inspeccionar mapa, plantel, liga o reglas no consume acciones;
- al volver debe poder entenderse qué ocurrió desde la última visita;
- las notificaciones futuras informan el turno, no penalizan demoras.

## Arquitectura

Demo estática sin backend ni build. La primera versión se concentra en `index.html` para facilitar prueba e iteración. GitHub Pages sirve `main`.

Save: `trucebol-demo-v1`.

## Versionado

La versión visible y `version.json` deben actualizarse juntos. Toda update debe revisar mobile, touch, persistencia, turnos, AVG, mapa y partidos.
