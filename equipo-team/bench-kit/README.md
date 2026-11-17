# bench-kit

Datos para medir el equipo `/team` contra un solo agente. Son datos puros: sin rutas ni credenciales.

| Carpeta | Contenido |
|---|---|
| `base/` | Repo de juguete en Node (`calcDiscount`, `parseLine`, `buildSummary`; líneas de pedido y descuentos, dominio ficticio) con 3 tests visibles que pasan. Sin `.git`: se copia y se inicializa por ejecución |
| `tasks/T1.txt` a `T4.txt` | Enunciados de las tareas (función con casos borde, corrección de bug, cambio multiarchivo con CLI, y T4 con una decisión de diseño explícita: formato de persistencia) |
| `hidden/T1.test.js` a `T4.test.js` | Tests **ocultos**: no se muestran a los agentes; miden si la tarea quedó bien (6, 5, 6 y 5 tests) |
| `run.ps1` | Arnés: ejecuta tareas contra un solo agente (`-Mode A`) o el equipo (`-Mode TEAM`) y escribe un CSV por etiqueta (`summary-<tag>.csv`) con costo, tiempo, tests ocultos, uso por agente y rondas del arquitecto |

## Cómo se usó
1. Copiar `base/` a una carpeta de trabajo **fuera de carpetas sincronizadas en la nube** (con `Copy-Item -Recurse`) y hacer `git init` + commit.
2. Ejecutar el modo a medir con el enunciado de `tasks/Tn.txt` (por ejemplo `claude -p "/team --full --sin-aprobacion <enunciado>" --output-format json`).
3. Copiar `hidden/Tn.test.js` a una subcarpeta `.hid/` del resultado y ejecutar `node --test .hid/Tn.test.js`: `pass N`/`fail 0` es el criterio.
4. Registrar `total_cost_usd`, `modelUsage`, `duration_ms`, `num_turns` y `subagent_stats` del JSON, y `git diff --numstat`.

Validación del kit: la base pasa sus 3 tests visibles; cada test oculto falla sobre la base (de lo contrario no mediría nada);
y una solución de referencia, escrita aparte, pasa los 17 tests ocultos (6, 5 y 6) sin romper los visibles.

## Pendiente
- Escribir un arnés que ejecute todas las celdas y consolide un CSV (el original no se conservó).
- Agregar tareas **complejas y ambiguas** donde un solo agente pueda fallar; con las tres actuales, un solo agente acierta siempre.
