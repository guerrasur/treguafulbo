# Jugadores — Primera División Argentina 2026

Actualizado: 2026-09-30.

## Alcance

La base integrada en `players-argentina-2026.js` contiene 957 futbolistas únicos de los 30 clubes que aparecen en el dataset de Primera División Argentina 2026.

El dataset original contiene 975 filas. Hay 18 nombres que aparecen en dos clubes por transferencias dentro de la temporada; Treguafulbo los consolida en una sola carta y suma sus estadísticas de ambos pasos, conservando la lista de clubes.

## Fuentes

1. Planteles y rendimiento 2026: `GonzalezCrisanto/la-fecha`, archivo `THEDATA/players_argentina_2026.csv`.
   - https://github.com/GonzalezCrisanto/la-fecha/blob/main/THEDATA/players_argentina_2026.csv
2. Atributos de videojuego disponibles: export FC 27 de `Wrexist/dynasty-manager`, snapshot 2026-08-28.
   - https://github.com/Wrexist/dynasty-manager/blob/main/data/fc27/FC27_male_players.csv
3. Referencia pública de escala: página de ratings de EA SPORTS FC 27 para Liga Profesional de Fútbol.
   - https://www.ea.com/es/games/ea-sports-fc/ratings/leagues-ratings/liga-profesional-de-futbol/353

## Campos conservados

Por futbolista se guardan: club o clubes, posición, PJ, titularidades, minutos, goles, asistencias, amarillas, rojas, remates, remates al arco, quites ganados, intercepciones, atajadas, tiros al arco recibidos, vallas invictas y valor de mercado cuando la fuente lo provee.

556 futbolistas se pudieron cruzar por identidad con el snapshot FC 27 y conservan RIT/TIR/PAS/REG/DEF/FÍS y atributos específicos de arquero. Esos atributos alimentan ATQ/PAS/DEF/ARQ dentro del motor.

## AVG para jugadores sin cruce FC 27

401 futbolistas —principalmente juveniles, reservas y altas recientes— no tienen una coincidencia fiable en ese snapshot. Su `rating` de Treguafulbo se calcula únicamente para balance del juego usando valor de mercado, minutos y producción 2026 ajustada por posición. Está limitado al rango 55–82.

Ese AVG derivado **no es un rating oficial de EA**. Las estadísticas de temporada permanecen separadas y no se sustituyen por valores inventados.

## Compatibilidad

Las 28 cartas históricas que existían hasta v0.7.2 se mantienen como `legacy` para que inventarios y saves previos no pierdan IDs. Las nuevas cartas usan IDs con prefijo `arg26-`.
