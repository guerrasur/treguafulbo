# CLAUDE.md — Trucebol

## Producto

Juego web de fútbol + territorio pensado para multiplayer asincrónico con amigos. La demo v0.1.0 es local: 1 humano y 1–3 rivales simulados.

## NEXO

Jugar sin presión, poder observar y pensar, y cerrar el turno de forma voluntaria.

- NO agregar reloj obligatorio.
- NO cerrar turnos automáticamente.
- NO premiar velocidad ni castigar pausas.
- Inspeccionar mapa, plantel, liga y reglas es gratis.
- El multiplayer futuro debe resumir lo sucedido desde la última visita.

## Dirección visual

Tomar el concept art aprobado como norte: tablero táctico colorido, papel crema, cielo azul, verde, rojo y amarillo, azul petróleo, bordes gruesos, escudos simples e ilustración ligera. Evitar solemnidad y realismo bélico.

## Lenguaje de interfaz

Usar texto mínimo, neutro, directo y funcional. Evitar jerga, chistes, tono canchero, frases grandilocuentes o intentos de complicidad.

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
- save `trucebol-demo-v1`.

## Arquitectura

Repo: `guerrasur/treguafulbo`.
GitHub Pages: rama `main`.
Demo estática sin build ni Firebase.

## Updates

Mantener versión visible + `version.json`. Antes de publicar, revisar regresiones visibles, mobile, touch, persistencia, turnos, AVG, mapa y partidos. No romper saves sin migración deliberada.
