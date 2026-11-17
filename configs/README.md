# configs: configuraciones de Claude Code, en orden de aplicación

Cada archivo de esta carpeta es un **instructivo que Claude Code ejecuta paso a paso** para dejar un equipo configurado. Los archivos se **numeran** (`1.`, `2.`, ...) en el orden en que deben aplicarse: **la configuración `1.` es la primera que hay que realizar**, y las siguientes pueden suponer que las anteriores ya están hechas.

## Cómo usar un archivo de esta carpeta

Pásaselo a Claude Code con esta instrucción:

> *Lee este archivo y ejecuta la configuración en mi equipo, paso a paso, siguiendo sus reglas y pidiéndome confirmación antes de modificar archivos existentes.*

Cada archivo trae sus propias reglas, sus condiciones de parada y comprobaciones con salida esperada; Claude debe detenerse y avisar si algo no coincide. Antes de modificar `settings.json` o `CLAUDE.md` se hace un respaldo.

## Configuraciones

| N.º | Archivo | Qué configura | Requisitos |
|---|---|---|---|
| 1 | [`1.guia-claude-obsidian.md`](1.guia-claude-obsidian.md) | Claude Code con un **vault de Obsidian como memoria de contexto extendida**: vault y plantillas, scripts de índices, hook `SessionStart`, permisos, bloque de `CLAUDE.md` y memoria automática | Windows, Windows PowerShell 5.1 y Node.js 18 o superior |

| 2 | [`2.reglas-alcance-y-eficiencia-de-tokens.md`](2.reglas-alcance-y-eficiencia-de-tokens.md) | Bloque de reglas en `~/.claude/CLAUDE.md`: hacer solo lo pedido (alcance) y gastar los tokens mínimos (sin subagentes por defecto, lectura acotada, sesión nueva en trabajos largos) | Cualquier sistema; solo edita `CLAUDE.md` |
| 3 | [`3.perfiles-cops-cdev.md`](3.perfiles-cops-cdev.md) | Dos comandos, `cops` (Sonnet + advisor Opus + subagentes Haiku) y `cdev` (Opus, sin advisor), con perfiles `--settings` sin tocar `settings.json` | Windows y Claude Code (Node.js 18 o superior solo para validar JSON) |
| 4 | [`4.reglas-de-agentes.md`](4.reglas-de-agentes.md) | Reglas para definir y usar subagentes (modelos por rol, herramientas mínimas, guardias con hooks, marcadores, orquestación) e instalación del equipo `/team` de `equipo-team/` | Windows, PowerShell 5.1 y Node.js 18 o superior; plugins `ponytail` y `fullstack-dev-skills` |

Qué modifica la configuración 1: `~/.claude/settings.json` (se fusiona), `~/.claude/CLAUDE.md` (se agrega un bloque entre marcadores), `~/.claude/scripts/` y el vault de Obsidian. No instala nada y no pide credenciales.

## Convenciones para agregar una configuración

- Número consecutivo al inicio del nombre: `2.nombre.md`, `3.nombre.md`...
- El archivo debe poder ejecutarlo Claude Code sin contexto previo: reglas y condiciones de parada al inicio, cada paso con su comprobación y salida esperada, respaldo antes de modificar archivos existentes.
- Los archivos o scripts que se incrustan llevan su hash para poder verificarlos.
- Sin credenciales, tokens ni datos personales o de clientes.

## Estado

La configuración 1 se comprobó en local con scripts y carpetas temporales (extracción de los anexos con sus hashes, fusión de `settings.json`, lectura de notas con BOM y UTF-16). **Todavía no se ha probado con Claude Code ejecutándola sobre un equipo limpio.**
