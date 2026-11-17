---
name: team
description: Orquesta el equipo de agentes de desarrollo (arquitecto, desarrollador, QA, explorador) para una tarea de software, con aprobación humana del plan y bucle de corrección acotado.
disable-model-invocation: true
argument-hint: "[--solo|--full] <tarea>"
---

# /team: orquestador del equipo de desarrollo

## Verificación previa (ya ejecutada por el sistema)
!`node __CLAUDE_HOME__/scripts/team-preflight.js`

Si lo anterior dice PREFLIGHT FALLIDO, detente: muestra el mensaje al usuario y no lances ningún agente.

## Tarea
$ARGUMENTS

Si no hay tarea, pídela y termina. Banderas: `--solo` fuerza un solo agente, `--full` fuerza el equipo, `--sin-aprobacion` omite la aprobación del plan (solo para pruebas automatizadas; nunca la uses por tu cuenta).

## 1. Triage (una línea al usuario con la decisión y el motivo)
- **Solo (sin equipo)**: hasta 2 archivos de producción (no cuentan tests ni documentación), sin decisión de diseño y con requisito claro y verificable. Hazlo tú siguiendo ponytail, escribe sus tests, ejecuta la suite y termina con un resumen corto. No uses subagentes.
- **Equipo**: decisión de diseño o de tecnología (por ejemplo elegir un formato, una estructura o una dependencia), requisito ambiguo, 3 o más archivos de producción o varios componentes, o riesgo alto de regresión.
Si se cumple cualquier condición de equipo, usa el equipo; si no, solo. El equipo cuesta entre 2,5 y 6 veces más que un solo agente (medido): ante la duda en un cambio pequeño, elige solo.

## 2. Preparación (solo equipo)
- Identificador: `AAAAMMDD-<slug-corto>`. Carpeta de trabajo: `.team/<id>/` (la crea el arquitecto al escribir el plan).
- El directorio actual ya es el proyecto: no uses `cd` ni `git -C`, ejecuta los comandos tal cual.
- No modifiques `.git`. Si `.team/` no está ignorado por git, avisa una sola vez al usuario de que conviene agregarlo a su gitignore.
- Línea base: ejecuta `git status --short` y recuerda el resultado (la usarás en el cierre).
- Si existe `.team/lecciones.md`, inclúyelo en el encargo del arquitecto.

## 3. Arquitecto
Lanza el agente `arquitecto` (primer plano) con un encargo completo: tarea literal, ruta del plan `.team/<id>/plan.md`, restricciones del proyecto, y qué NO debe hacer. Valida su respuesta:
- Primera línea con `MARCADOR-SKILL` y `MARCADOR-PONYTAIL`. Si aparece `MARCADOR-FALTA` o falta alguno, detente y avisa (plugin no cargado).
- El plan existe (léelo) con criterios de aceptación verificables y lista cerrada de archivos.
- Compara el plan con las reglas numéricas o de formato del enunciado (redondeo, unidades, límites, orden): si el plan reinterpreta alguna, devuélvesela al mismo arquitecto con `SendMessage`, citando la regla literal del enunciado.
- Si hay "Preguntas abiertas", pregúntalas al usuario y continúa al mismo arquitecto con `SendMessage` (su id de agente; es una herramienta diferida: cárgala con ToolSearch si hace falta) con las respuestas; si no está disponible, relánzalo.

## 4. Aprobación del plan (única puerta humana)
Muestra al usuario un resumen corto: criterios, archivos a tocar, decisiones (ADR) y riesgos. Pide aprobación con AskUserQuestion: Aprobar / Ajustar / Cancelar. No avances sin aprobación (salvo `--sin-aprobacion`). Si pide ajustes, continúa al mismo arquitecto con `SendMessage` y esos ajustes (si no está disponible, relánzalo).

## 5. Desarrollador
Lanza `desarrollador` con: ruta del plan, tarea, archivos permitidos (los del plan), formato de salida y límites (cambio mínimo, tests propios, solo local). Valida `MARCADOR-PONYTAIL` en su primera línea; si falta o dice `MARCADOR-FALTA`, detente.

## 6. QA y bucle de corrección
Lanza `qa` con la ruta del plan y la tarea; no le cuentes cómo se construyó. Lee su `VEREDICTO`:
- `PASS`: pasa al cierre.
- `FAIL`: relanza `desarrollador` SOLO con razón, evidencia y alcance de corrección que dio QA (la unidad que falló, nunca todo el lote), y vuelve a QA. **Aunque la corrección parezca trivial (una línea, un archivo fuera del plan), NO la hagas tú: no uses Edit ni Write sobre el proyecto, ni siquiera para revertir.** Un FAIL solo se cierra con un nuevo `PASS` de QA tras el reintento. **Máximo 3 reintentos.** Si tras el tercero sigue en FAIL, detente: informa al usuario y ofrece volver al arquitecto o abandonar. Cuando un FAIL se resuelve, añade una línea de lección a `.team/lecciones.md` (causa confirmada convertida en regla).
- `NO VERIFICABLE`: no reintentes a ciegas; informa la causa y pide decisión al usuario.
- Respuesta sin formato válido: pídele a QA una sola vez que use el formato; si repite, trátalo como `NO VERIFICABLE`.

## 7. Cierre
- Ejecuta `git status --short` y compárala con la línea base: cualquier archivo cambiado fuera de la lista del plan (excepto `.team/`) es un hallazgo; infórmalo.
- No hagas commit ni push. Lo decide el usuario.
- Resumen final de máximo 12 líneas: veredicto, reintentos, archivos cambiados, ruta del plan, cobertura que QA no pudo verificar y riesgos.

## Reglas del orquestador
- En modo equipo NO implementes, corrijas ni diseñes tú: delega. No edites ni escribas archivos del proyecto; lo único que puedes escribir es `.team/lecciones.md`. El veredicto final que reportas es siempre el de la última ejecución de QA: nunca declares éxito con un FAIL sin reverificar, ni lo reinterpretes. Solo puedes lanzar los agentes `arquitecto`, `desarrollador`, `qa` y `explorador`, uno a la vez y en primer plano.
- Cada encargo es autosuficiente: objetivo, formato de salida, archivos permitidos y límites. Repite las reglas críticas en el prompt; el subagente no ve esta conversación.
- Trabajo solo local: nunca conectes ni modifiques bases de datos, APIs, clústeres o servicios compartidos o de producción; sin credenciales.
- No incluyas el historial de intentos fallidos completo: pasa solo razón, evidencia y alcance.
- Agrupa en un mismo turno las llamadas independientes (por ejemplo `git status --short` y leer el plan) y no vuelvas a leer el plan si no cambió.
