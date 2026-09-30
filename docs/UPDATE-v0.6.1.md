# Treguafulbo v0.6.1 — UX de turno y mapa

Base revisada antes de implementar: `main` en `f06dea9` (v0.6.0).

## Problemas detectados

La pantalla principal combinaba una tira de turno, una tira de temporada, el mapa y cinco tarjetas permanentes. En anchos menores a 900 px el rail lateral pasaba debajo del mapa; en celular eso convertía la interacción normal en una secuencia vertical larga. La acción Expandir además dependía de `activeAction === 'expand'`, por lo que abrir Paquete o entrar a Mercado/Plantel podía dejar el mapa visual o lógicamente fuera de ese modo hasta reactivarlo.

## Cambio de jerarquía

La nueva jerarquía es: HUD compacto → estado de liga → frente → mapa → acciones frecuentes. El mapa sigue siendo el elemento dominante. Fichar, Paquete y Plantel están junto al mapa. AVG de equipos y Eventos permanecen disponibles en paneles plegables.

En escritorio el mapa usa un rail lateral compacto. En mobile el mismo contenido se reordena sin duplicar DOM: el frente aparece antes del mapa, las acciones debajo, y la información secundaria queda al final.

## Expansión predeterminada

Las casillas libres válidas y las fronteras disputables ya no consultan `activeAction` para habilitarse. `handleTile` conserva todas las validaciones de turno, acciones y legalidad territorial, pero no exige seleccionar Expandir. `openScreen('gameScreen')` restablece `activeAction='expand'` como estado defensivo adicional.

No cambió la lógica que decide qué casillas son válidas, cuándo se genera un partido, cómo se resuelve una disputa, ni cuánto cuesta una acción.

## Mobile

- touch targets de acciones principales: mínimo 48 px en el rail del mapa;
- sin selector extra de expansión;
- márgenes y alturas reducidos con contenido esencial legible;
- `map-rail` usa `display: contents` bajo 900 px para reordenar frente/mapa/acciones sin duplicar elementos;
- paneles secundarios plegables;
- navegación inferior, safe areas, modales y versión visible se conservan.

## Compatibilidad

No se modifica el schema del estado ni las claves de `localStorage`. Se mantiene `treguafulbo-demo-v1` y la migración de `trucebol-demo-v1`. La liga sigue siendo de 6 PJ y la simulación de partidos no se tocó.
