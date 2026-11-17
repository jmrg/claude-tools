# equipo-team: equipo de agentes de desarrollo `/team`

Un equipo de subagentes de Claude Code (arquitecto, desarrollador, QA y explorador) y un skill orquestador `/team` que los
dirige con una puerta humana de aprobación y un bucle de corrección acotado. Disponible en todos los proyectos de la máquina
(se instala en `~/.claude`).

> **Estado (2026-11-17):** construido y probado de punta a punta en un repo de juguete en Node, con una ronda de optimización de
> consumo ya aplicada y medida ([`docs/optimizacion-2026-11-17.md`](docs/optimizacion-2026-11-17.md)). No se ha validado con tareas
> complejas ni en repos reales (.NET, PHP). Ver [Límites conocidos](#límites-conocidos).

## Contenido

```
equipo-team/
├── install.ps1                  instala en ~/.claude (respalda lo que cambie); -Check solo compara
├── claude/                      espejo de ~/.claude
│   ├── agents/                  arquitecto, desarrollador, qa, explorador
│   ├── skills/team/SKILL.md     orquestador /team
│   └── scripts/                 preflight, 2 guardias, registro de uso por subagente y sus pruebas
├── bench-kit/                   repo de juguete, 4 tareas, tests ocultos y arnés de medición (run.ps1)
└── docs/                        mediciones del 2026-11-16 y de la optimización del 2026-11-17 (informes y datos)
```

## Requisitos

- Claude Code (probado con 2.1.325) y Node.js (probado con v24).
- Plugins habilitados (el preflight de `/team` los exige):
  - `ponytail`: reglas de cambio mínimo; su hook `SubagentStart` las inyecta en todos los subagentes.
  - `fullstack-dev-skills` (repo `jeffallan/claude-skills`, MIT): aporta el skill `architecture-designer` del arquitecto.
  - El preflight identifica cada plugin por su nombre, sin importar desde qué origen se instaló.

## Instalación

```powershell
.\equipo-team\install.ps1            # copia claude/** a ~/.claude y respalda lo que reemplace
.\equipo-team\install.ps1 -Check     # compara lo desplegado con el repo (código 1 si difiere)
node --test "$HOME/.claude/scripts/team-guards.test.js" "$HOME/.claude/scripts/team-preflight.test.js" "$HOME/.claude/scripts/team-usage-log.test.js"
```

El repo es la fuente de verdad: edita aquí, vuelve a instalar y comprueba con `-Check`.
**Desinstalar:** borra de `~/.claude` los archivos listados en `claude/` (agentes, `skills/team`, `scripts/team-*`).

## Uso

```
/team <tarea>             triage automático
/team --full <tarea>      fuerza el equipo
/team --solo <tarea>      un solo agente, sin subagentes
```

Se ejecuta desde la raíz del proyecto (el directorio actual es el proyecto). El orquestador no hace commit ni push.

## Cómo funciona

1. **Preflight** (`team-preflight.js`, antes de que el modelo vea el skill): comprueba que los 2 plugins estén habilitados y
   que existan los 4 agentes y las 2 guardias. Si falla, el skill se aborta y no se lanza ningún agente.
2. **Triage:** hasta 2 archivos de producción (no cuentan tests ni documentación), sin decisión de diseño y con requisito claro, lo
   hace un solo agente. El equipo cuesta entre 2,5 y 6 veces más (medido): se usa con decisión de diseño o de tecnología,
   requisito ambiguo, 3 o más archivos de producción o riesgo de regresión.
3. **Arquitecto** escribe `.team/<id>/plan.md`: requisitos, ADR (solo si hay una decisión de diseño real), criterios de
   aceptación verificables, lista cerrada de archivos, lo que NO se hará, riesgos y un diagrama Mermaid simple (siempre). Copia
   literal las reglas numéricas del enunciado; si una admite dos lecturas, la registra en "Preguntas abiertas".
4. **Aprobación humana del plan:** única puerta obligatoria (`--sin-aprobacion` existe solo para pruebas automatizadas). Los
   ajustes se piden al mismo arquitecto con `SendMessage`, sin relanzarlo.
5. **Desarrollador** implementa el cambio mínimo del plan y escribe sus propios tests.
6. **QA** verifica en caja negra y devuelve un veredicto. Si es `FAIL`, vuelve **solo la unidad que falló** al desarrollador
   (máximo 3 reintentos); un FAIL solo se cierra con un nuevo `PASS` de QA. El orquestador no edita el proyecto.
7. **Cierre:** compara `git status` con la línea base, informa lo que QA no pudo verificar y no hace commit.

| Agente | Modelo | Herramientas | Notas |
|---|---|---|---|
| `arquitecto` | Opus | Read, Grep, Glob, Write | Guardia: solo puede escribir en `.team/`. Skill `architecture-designer` |
| `desarrollador` | Sonnet | Read, Grep, Glob, Edit, Write, Bash | Escribe sus tests; toca solo los archivos del plan |
| `qa` | Sonnet | Read, Grep, Glob, Bash | Sin Edit; Bash limitado por guardia a lectura y pruebas |
| `explorador` | Haiku | Read, Grep, Glob | Solo lectura; devuelve referencias `archivo:línea` |

**Veredicto de QA:** `PASS` solo si la suite completa pasa, cada criterio tiene un test que lo cubre y pasa, y el diff está
dentro del plan. Un criterio sin test es `FAIL` de cobertura. Si no pudo ejecutar la suite, `NO VERIFICABLE`.

**Guardias** (hooks `PreToolUse` en el frontmatter de los agentes; fallan cerrado: cualquier error o duda bloquea con código 2):
- `team-qa-guard.js`: el QA solo ejecuta `git status|diff|log|show`, `npm test`, `node --test`, `dotnet test`, `pytest`,
  `composer test`, `ls`, `cat`, `grep`; un comando por llamada, sin `cd`, `&&`, pipes ni redirecciones (solo `2>&1` al final).
- `team-write-guard.js`: el arquitecto solo escribe dentro de `<proyecto>/.team/` (resuelve `..`).

## Medir el consumo

- **Por agente:** `team-usage-log.js` está registrado como hook `Stop` en el frontmatter de los 4 agentes (se ejecuta como `SubagentStop`).
  Lee el transcrito del subagente y agrega una línea a `~/.claude/team-metrics/usage.jsonl` (o a la carpeta de `TEAM_METRICS_DIR`) con
  los tokens de entrada, salida, caché leída y caché creada (con su nivel de TTL). Nunca bloquea: siempre sale con 0.
- **Requiere sesión persistida:** con `--no-session-persistence` el transcrito del subagente no existe y no se registra nada.
- **Por ejecución:** `claude -p --output-format json` entrega `total_cost_usd`, `modelUsage` por modelo y `subagent_stats`.
- **Arnés:** `bench-kit/run.ps1` ejecuta tareas del kit contra un solo agente o el equipo y consolida un CSV por etiqueta.

## Decisiones de diseño y por qué

- **Desarrollador en Sonnet, no Haiku:** Haiku no ahorró casi nada y escribió de 1,4 a 2,2 veces más código, aun con ponytail.
- **Arquitecto en Opus:** decisión de diseño. Pesa entre 35 y 45 % del costo del equipo; no está demostrado que mejore tareas fáciles.
- **Un solo desarrollador, no uno por lenguaje;** el lenguaje lo aportan el `CLAUDE.md` del repo y los skills.
- **Verificación ejecutable, no opinión:** un modelo revisando a otro comparte puntos ciegos; por eso el QA exige tests que pasen.
- **`tools` explícito y sin `Agent`** en todos los agentes: sin él, el agente hereda todas las herramientas, incluida la que lanza subagentes.
- **Ponytail sin filtro:** no se usa `PONYTAIL_SUBAGENT_MATCHER`; ponytail llega a todos los subagentes (decisión de diseño).
- **Lista de comandos en hook, no `tools` con `Bash(...)`:** los especificadores en `tools` no limitan Bash, y `node`/PowerShell se
  saltan los permisos de edición. Solo el hook bloquea de verdad.
- **Entrega por archivos** en `.team/` (plan y lecciones); `.team/` debe estar ignorado por git (gitignore global o del repo).
- **Marcadores:** el arquitecto y el desarrollador abren su respuesta citando literalmente el skill y el bloque ponytail que
  cargaron; un nombre de skill inexistente en `skills:` falla en silencio, y esto lo detecta.

## Resultados de la medición

Repo de juguete, 3 tareas fáciles, una corrida por celda, tests ocultos que los agentes no ven (detalle en
[`docs/medicion-2026-11-16.md`](docs/medicion-2026-11-16.md)):

| | Un agente | Equipo, dev Haiku | Equipo, dev Sonnet |
|---|---|---|---|
| Tests ocultos | 17/17 | 17/17 | 17/17 |
| Costo medio por tarea | 0,20 USD | 0,51 USD | 0,54 USD |
| Tiempo medio | 34 s | 112 s | 95 s |

Con `/team` real: PASS en 173 s y 0,72 USD; y un caso con FAIL forzado que cerró en PASS tras 1 reintento (1,19 USD, 262 s).

Tras la optimización (detalle en [`docs/optimizacion-2026-11-17.md`](docs/optimizacion-2026-11-17.md)): sin `--full`, las tareas
fáciles van a un solo agente (≈0,20 USD) y la de diseño al equipo (0,617 USD); el equipo en T3 bajó de 0,779 a 0,714 USD (−8 %);
un ajuste del plan cuesta ≈0,12 USD en vez de ≈0,32 USD. Una muestra por celda.

## Límites conocidos

- Las tareas eran fáciles: un solo agente las resolvió todas, así que no se midió si el equipo mejora la calidad, solo su costo
  (2,5 a 6 veces el de un solo agente).
- **Sin probar:** la puerta interactiva de aprobación del plan, el modo `--solo`, repos reales de .NET o PHP, y el uso en repos
  dentro de carpetas sincronizadas en la nube. El triage automático se probó solo en 4 tareas del repo de juguete.
- El arquitecto sigue reinterpretando el redondeo de T1 en cada ejecución del equipo: el orquestador lo detecta y lo corrige con
  `SendMessage`, pero la regla de literalidad no lo evita. El orquestador no redujo sus lecturas de caché con la regla de agrupar turnos.
- El QA no puede hacer sondeos propios (la guardia lo impide): informa siempre lo que no verificó. Un caso borde sin test es FAIL.
- Un comando permitido (`npm test`, `dotnet test`) ejecuta código del proyecto, que podría escribir; el orquestador compara
  `git status` al cierre, pero esa comprobación no está probada por separado.
- El orquestador se saltó el proceso una vez (corrigió un FAIL él mismo); se endureció el skill y la repetición obedeció. Es una sola muestra.
- Carpetas sincronizadas en la nube: los worktrees de git pueden corromperse; conviene trabajar de forma secuencial y sin worktrees.
- Los agentes son de alcance de usuario. En los agentes empaquetados como plugin se ignoran `hooks`, `permissionMode` y
  `mcpServers`: si se empaquetaran así, las guardias tendrían que ir como hooks del plugin.

## Pendiente

- Ronda de validación con tareas sintéticas complejas (un agente ×2 contra el equipo).
- Probar la puerta de aprobación y el triage en sesiones interactivas.
- Reducir el retrabajo del arquitecto con una regla verificable (por ejemplo, ejemplos calculados a mano para cada fórmula del enunciado) y medirla.
- Experimento sobre `omitClaudeMd` en el `explorador` (no ejecutado): solo se adoptaría si quita el índice de memoria del usuario del contexto.
