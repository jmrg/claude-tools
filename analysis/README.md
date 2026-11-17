# analysis: skill `/analysis`

Skill genérico de Claude Code para pedir una **revisión independiente de solo lectura** de un análisis, plan, diseño o código a un modelo fuerte (Opus por defecto), en una sesión aparte, con topes de costo y una verificación posterior. **No modifica nada de lo analizado.**

> **Estado:** escrito a partir de una sesión de revisión real; **sin desplegar y sin probar como skill**. Ver [Límites](#límites).

## Contenido

```
analysis/
├── install.ps1                                 instala en ~/.claude (respalda lo que cambie); -Check solo compara
└── claude/skills/analysis/
    ├── SKILL.md                                el skill: reglas, pasos, plantilla de lanzamiento y lecciones
    └── references/brief-template.md            plantilla del encargo que recibe el revisor
```

## Instalación

```powershell
.\analysis\install.ps1            # copia claude/** a ~/.claude y respalda lo que reemplace
.\analysis\install.ps1 -Check     # compara lo desplegado con el repo (código 1 si difiere)
```

El repo es la fuente de verdad: edita aquí y vuelve a instalar. **Desinstalar:** borra `~/.claude/skills/analysis`.

## Uso

```
/analysis <qué analizar> [--tipo analisis|diseno|codigo|plan] [--paths a,b] [--model opus|sonnet]
          [--budget USD] [--turns N] [--words N] [--web] [--plan] [--out archivo]
```

Ejemplos:

```
/analysis el consumo de tokens del equipo de agentes, con los datos de la carpeta resultados --paths ./equipo-team,./resultados
/analysis revisar la arquitectura de este módulo --tipo diseno --paths ./src --plan
/analysis auditar los cambios de la rama actual --tipo codigo --budget 1.5 --out informe-revision.md
```

El skill solo lo invoca el usuario (`disable-model-invocation`), porque cada ejecución consume presupuesto.

## Cómo funciona

1. La sesión que lo invoca (el coordinador) reúne el contexto y **lista todas las decisiones y límites ya tomados**.
2. Prepara un encargo autosuficiente desde la plantilla y define las carpetas mínimas que el revisor puede leer.
3. Lanza `claude -p --model opus` **de solo lectura**, con tope de presupuesto y de turnos, y sin acceso a la conversación.
4. Verifica en el JSON que se usó el modelo pedido, el costo real y las denegaciones.
5. **Revisa críticamente** el informe: lo contrasta con las decisiones, recalcula cifras clave, verifica lo que el revisor no pudo y redacta "Correcciones posteriores", que prevalecen sobre el informe.
6. Entrega un resumen, con el informe íntegro si hay `--out`, y espera aprobación humana antes de cualquier implementación.

## Reglas con las que se lanza el revisor

- **Solo lectura:** `Edit`, `Write`, `Bash`, `PowerShell`, `NotebookEdit` y `Agent` bloqueados; solo lee las carpetas expuestas con `--add-dir`.
- **Topes:** `--max-budget-usd` (2 por defecto) y `--max-turns` (40). El tope de palabras es solo una instrucción: el freno real es el presupuesto.
- **Encargo de 7 secciones:** rol y límites, objeto, datos, lo que se audita, lo no verificado, decisiones que no se reabren y entregable con estructura fija.
- **Intentar refutar primero** y etiquetar cada afirmación como `[medido]`, `[documentación]` o `[hipótesis]`, con tamaño de muestra y sin cifras inventadas.
- **Verificable:** JSON de salida para comprobar modelo y costo reales.

## Lecciones incorporadas (sesión de referencia)

La sesión que originó este skill costó 1,30 USD en 17 turnos y 307 s. De ahí salieron estas reglas:

- **Listar todas las decisiones del usuario en el encargo.** Una decisión omitida llevó al revisor a proponer justo lo contrario.
- **Darle lectura sobre todas las fuentes que necesita para verificar** (por ejemplo, transcritos de subagentes); lo que no pueda leer, lo verifica el coordinador después.
- **No confiar en el tope de palabras:** el informe superó el límite (4 251 de 3 500 palabras) y la salida fue cerca de la mitad del costo. Pedir tablas y secciones numeradas.
- **Revisar el informe antes de darlo por bueno:** el coordinador encontró errores propios y ajenos (un ajuste estadístico que mezclaba poblaciones, una palanca ya refutada por datos, una propuesta que contradecía una decisión previa).
- **Desconfiar de lo que se mide con muestras pequeñas** y del efecto techo (tareas tan fáciles que no distinguen).

## Límites

- El skill **no se ha ejecutado** como tal: se derivó de una sesión manual con los mismos parámetros. Antes de usarlo en serio conviene una ejecución de prueba con un objeto pequeño y `--budget` bajo.
- La plantilla de lanzamiento es para PowerShell en Windows.
- Verificado en la sesión de referencia: modelo y costo por `modelUsage`, bloqueo de herramientas y de rutas fuera de `--add-dir`. No verificado: que `--add-dir` con rutas con espacios o símbolos funcione igual en todos los entornos.
- El costo es una estimación de lista de Claude Code, no una factura.
