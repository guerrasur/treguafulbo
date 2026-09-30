# Jugadores — Primera División Argentina 2026

Actualizado: 2026-09-30.

## Alcance

La base activa integrada en `players-argentina-2026.js` contiene **200 futbolistas** y cubre los **30 clubes** de Primera División Argentina 2026.

La fuente consolidada previa contiene 957 futbolistas únicos. Para Treguafulbo se usa una selección más manejable: primero se reservan los 5 jugadores mejor valorados de cada club y luego se completa hasta 200 por AVG, usando minutos 2026 como desempate. Las transferencias internas siguen consolidadas en una sola carta y conservan todos sus clubes.

Distribución activa: 24 ARQ · 71 DEF · 67 MED · 38 DEL.

## Fuentes

1. Planteles y rendimiento 2026: `GonzalezCrisanto/la-fecha`, archivo `THEDATA/players_argentina_2026.csv`.
   - https://github.com/GonzalezCrisanto/la-fecha/blob/main/THEDATA/players_argentina_2026.csv
2. Atributos de videojuego disponibles: export FC 27 de `Wrexist/dynasty-manager`, snapshot 2026-08-28.
   - https://github.com/Wrexist/dynasty-manager/blob/main/data/fc27/FC27_male_players.csv
3. Referencia pública de escala: página de ratings de EA SPORTS FC 27 para Liga Profesional de Fútbol.
   - https://www.ea.com/es/games/ea-sports-fc/ratings/leagues-ratings/liga-profesional-de-futbol/353

## Campos conservados

Por futbolista se guardan: club o clubes, posición, PJ, titularidades, minutos, goles, asistencias, amarillas, rojas, remates, remates al arco, quites ganados, intercepciones, atajadas, tiros al arco recibidos, vallas invictas y valor de mercado cuando la fuente lo provee.

182 de las 200 cartas activas están cruzadas con el snapshot FC 27 y conservan RIT/TIR/PAS/REG/DEF/FÍS y atributos específicos de arquero. Esos atributos alimentan ATQ/PAS/DEF/ARQ dentro del motor.

## AVG para jugadores sin cruce FC 27

18 cartas activas no tienen una coincidencia fiable en ese snapshot. Su `rating` de Treguafulbo se calcula únicamente para balance del juego usando la metodología de la base consolidada; no debe presentarse como un rating oficial de EA.

Las estadísticas de temporada permanecen separadas y no se sustituyen por valores inventados.

## Compatibilidad

Las 29 cartas históricas que existían hasta v0.7.2 mantienen sus IDs en un índice de compatibilidad para poder resolver saves previos, pero **no integran el pool activo de 200**, ni aparecen en sobres, mercado o Álbum de una partida nueva.
