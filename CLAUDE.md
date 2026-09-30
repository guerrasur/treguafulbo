# CLAUDE.md — Treguafulbo

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

## Dirección de partidos

- Los partidos son 100% simulados. NO agregar minijuegos, QTE, tiros manuales ni decisiones durante el encuentro.
- La profundidad debe venir de los stats del jugador, la posición natural, el puesto ocupado y el armado del XI.
- Mantener azar ponderado: un mejor equipo debe tener ventaja, no garantía absoluta.
- Conservar informe de posesión, remates, tiros al arco, xG, atajadas, goles, asistencias, figura, minuto a minuto y rendimientos.
- No reemplazar la base de Treguafulbo por la arquitectura del repo abandonado `guerrasur/trucebol`; portar mejoras de forma incremental.

## v0.2.0

- Base visual, mapa, navegación, plantel, mercado, IA y flujo de v0.1 conservados.
- Atributos ATQ/PAS/DEF/ARQ y penalización por fuera de posición.
- Simulación avanzada e informe ampliado.
- Save actual `treguafulbo-demo-v1`, con migración no destructiva desde `trucebol-demo-v1`.

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

## Updates

Mantener versión visible + `version.json`. Antes de publicar, revisar regresiones visibles, mobile, touch, persistencia, turnos, AVG, mapa y partidos. No romper saves sin migración deliberada.
