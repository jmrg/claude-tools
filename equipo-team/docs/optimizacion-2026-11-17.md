# Optimización de consumo de tokens del equipo `/team` (2026-11-17)

Una revisión independiente de solo lectura (Opus 5.5, 1,30 USD, 17 turnos, 307 s) propuso mitigaciones sobre el análisis de consumo
de la medición anterior. Se verificaron sus afirmaciones, se aplicaron las aprobadas y se midieron en el repo de juguete.
Todos los costos son estimaciones de lista de Claude Code, no facturas.

## Qué cambió en el análisis tras verificar

- **Los subagentes escriben caché de 5 minutos**, no de 1 hora: 2 425 082 tokens en 5 min y 0 en 1 h en 26 transcritos. El "todo a 1 h"
  de la medición anterior salía solo de la sesión principal. La mitigación `experimental.cacheTtl: 5m` **no aplica**.
- **Los porcentajes por clase de token estaban inflados:** en un solo agente la caché creada es ≈61 %, la lectura ≈26 % y la salida ≈13 %
  (equivalentes de entrada), no 71 %. El ajuste de precios de Sonnet mezclaba escrituras de 1 h y de 5 min y no debe usarse.
- **Retrabajo:** relanzar al arquitecto costaba ≈0,32 a 0,34 USD; un ciclo de reintento (desarrollador + QA), ≈0,13 USD.
- **El costo está en orquestar y diseñar, no en implementar:** el desarrollador Sonnet cuesta ≈0,06 USD.

## Cambios aplicados

| ID | Cambio | Archivos | Evidencia |
|---|---|---|---|
| M4 | Hook de uso por subagente (0 tokens de modelo), registrado como `Stop` en el frontmatter de los 4 agentes (se ejecuta como `SubagentStop`) | `scripts/team-usage-log.js` y su prueba; `agents/*.md` | Coincide al 0 % con `modelUsage` en las 4 clases de token; 7 pruebas unitarias |
| M1 | Triage: cuenta solo archivos de producción (no tests ni documentación); decide la decisión de diseño | `skills/team/SKILL.md` | Medido en 4 tareas: ver abajo |
| M3 | Arquitecto proporcional: ADR solo con decisión real (el diagrama Mermaid se mantiene siempre), plan corto, reglas numéricas copiadas literal, dos lecturas a "Preguntas abiertas" | `agents/arquitecto.md` | Plan más corto; **no evitó** el retrabajo de redondeo en T1 |
| M2 | Ajustes del plan: continuar al mismo arquitecto con `SendMessage` en vez de relanzarlo; el orquestador compara el plan con las reglas numéricas del enunciado | `skills/team/SKILL.md` | El ajuste costó 48 % de la primera pasada (una muestra) |
| M5 | El orquestador agrupa llamadas independientes y no relee el plan | `skills/team/SKILL.md` | **Sin efecto medible** |

No aplicados: **M6** (`cacheTtl`, descartada por datos), **M7** (`omitClaudeMd` solo en `explorador`; su experimento no se ejecutó) y un
refinamiento de M3 (ejemplos calculados a mano para cada fórmula) que se desplegó brevemente y se revirtió sin probar.

## Mediciones

Línea base con el sistema anterior más el hook de uso (un solo agente; equipo con `--full`):

| Tarea | Modo | Costo | Tiempo | Tests ocultos |
|---|---|---|---|---|
| T1 | un agente | 0,181 USD | 27 s | 6/6 |
| T2 | un agente | 0,191 USD | 33 s | 5/5 |
| T3 | un agente | 0,210 USD | 33 s | 6/6 |
| T3 | equipo | 0,779 USD (Opus 0,284; Sonnet 0,496) | 136 s | 6/6 |

Por agente en el equipo de T3 (tokens): arquitecto salida 6 389, caché creada 28 584, caché leída 65 366; desarrollador 4 031 / 30 355 / 46 186;
QA 2 281 / 29 254 / 45 262; orquestador (por diferencia) 3 279 / 47 406 / 517 696.

Con M1, M2, M3 y M5 desplegados:

| Tarea | Modo | Decisión | Costo | Tests ocultos |
|---|---|---|---|---|
| T1 | `/team` | solo | 0,201 USD | 6/6 |
| T2 | `/team` | solo | 0,197 USD | 5/5 |
| T3 | `/team` | solo | 0,230 USD | 6/6 |
| T4 (decisión de diseño explícita) | `/team` | equipo | 0,617 USD | 5/5 |
| T1 | `/team --full` | equipo, arquitecto en 2 rondas | 0,821 USD | 6/6 |
| T3 | `/team --full` | equipo | 0,714 USD (Opus 0,217; Sonnet 0,497) | 6/6 |

- El modo solo cuesta de 0,006 a 0,020 USD más que un agente directo (la carga del skill).
- En T3 con equipo el costo bajó de 0,779 a 0,714 USD (−8 %), casi todo por Opus (0,284 a 0,217): salida del arquitecto 6 389 a 4 746 tokens.
- Ajuste del arquitecto en T1 con M2: ronda 1 = 0,250 USD; ronda 2 = 0,121 USD (48 %), frente a ≈0,32 USD al relanzarlo.

## Umbrales de la revisión frente a resultados

| Prueba | Umbral | Resultado |
|---|---|---|
| Triage (M1) | solo en T1 a T3, equipo en la de diseño, tests ocultos 100 % | **Cumple** |
| M3 + M5: tests ocultos | 100 % | **Cumple** (12 de 12 ejecuciones del equipo y de un agente) |
| M3: 0 retrabajos del arquitecto en T1 | 0 | **No cumple** (2 rondas, aunque continuadas con `SendMessage`) |
| M3: salida de Opus en T3 | ≤ 4 500 tokens | **No cumple** por poco (4 746; base 6 389) |
| M3: costo del equipo en T3 | ≤ 0,60 USD | **No cumple** (0,714; base 0,779) |
| M5: turnos del orquestador | ≤ 9 | **No evaluable** (`num_turns` = 2 en el equipo); la caché leída por el orquestador no bajó (577 000 frente a 518 000) |
| M2: costo del ajuste | ≤ 50 % de la primera pasada | **Cumple con reservas** (48 %, una muestra) |
| M7 (`omitClaudeMd`) | experimento X1 | **No ejecutado** |

## Hallazgos técnicos

- **Hook de uso:** un `Stop` en el frontmatter de un agente llega como `SubagentStop` con `agent_transcript_path`, y las variables de entorno
  del proceso llegan al hook. El transcrito repite el mismo `message.id` en varias líneas (149 de 249 con uso): hay que **conservar el máximo por
  `message.id`**; sin deduplicar se sobrecuenta ≈2,4 veces.
- **Requiere sesión persistida:** con `--no-session-persistence` el transcrito del subagente no existe y el hook no registra nada. Las mediciones
  deben ejecutarse sin ese flag y borrar después la carpeta de proyecto que crea Claude Code (lo hace `bench-kit/run.ps1`).
- **Filas acumulativas:** si un agente se continúa con `SendMessage`, el hook registra otra fila con totales acumulados; se restan por `agent_id`.
- **Salida:** `~/.claude/team-metrics/usage.jsonl` (o la carpeta de la variable `TEAM_METRICS_DIR`), una línea por parada de agente.

## Limitaciones

- Una muestra por celda y tareas fáciles (un solo agente las resuelve todas): no se midió si el equipo mejora la calidad.
- El retrabajo del arquitecto en T1 apareció en todas las ejecuciones del equipo (ahora costando menos por M2), así que la mitigación M3 es parcial.
- El orquestador (Sonnet) sigue siendo la mayor parte del costo de Sonnet por sus lecturas de caché; M5 no lo redujo.
- Coste aproximado de estas pruebas: ≈4,7 USD, más 1,30 USD de la revisión.

## Cómo reproducir

```powershell
.\equipo-team\bench-kit\run.ps1 -Tag base -Tasks T1,T2,T3 -Mode A
.\equipo-team\bench-kit\run.ps1 -Tag base -Tasks T3 -Mode TEAM -TeamFlags '--full --sin-aprobacion'
.\equipo-team\bench-kit\run.ps1 -Tag triage -Tasks T1,T2,T3,T4 -Mode TEAM -TeamFlags '--sin-aprobacion'
```
