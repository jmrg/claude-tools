# claude-tools

Herramientas y configuración de Claude Code: equipos de agentes, comandos, perfiles y
configuraciones que se instalan en `~/.claude`. Cada herramienta vive en su propia carpeta, con su README y su instalador.

## Contenido

| Carpeta | Qué es | Estado |
|---|---|---|
| [`analysis/`](analysis/README.md) | Skill `/analysis`: revisión independiente de solo lectura con un modelo fuerte (Opus por defecto), con topes de costo, verificación posterior y correcciones | Escrito a partir de una sesión real; sin desplegar ni probar |
| [`equipo-team/`](equipo-team/README.md) | Equipo de agentes de desarrollo `/team`: arquitecto, desarrollador, QA y explorador, con orquestador, guardias de seguridad y preflight de plugins | Construido, optimizado y probado en un repo de juguete (2026-11-17); falta validar con tareas complejas |
| [`configs/`](configs/README.md) | Configuraciones numeradas de Claude Code que el propio Claude ejecuta paso a paso; la `1.` es la primera a realizar (Claude Code + vault de Obsidian como memoria de contexto). | Comprobada en local con scripts y carpetas temporales; falta probarla en un equipo limpio |

## Convenciones

- **Este repo es la fuente de verdad.** Los archivos se editan aquí y se despliegan con el `install.ps1` de cada herramienta;
  no se editan a mano en `~/.claude`.
- **Rutas portables:** los archivos que necesitan la ruta de `~/.claude` usan el marcador `__CLAUDE_HOME__`; el instalador lo
  resuelve en cada equipo. Nada de rutas personales ni de usuario en el repo.
- **Sin secretos ni datos confidenciales:** no se guardan contraseñas, tokens, claves, datos de clientes o de personas ni de
  sistemas de producción. Los ejemplos usan datos ficticios.
- **Fines de línea LF** (`.gitattributes`): los agentes y skills llevan frontmatter YAML.
- Cada herramienta documenta cómo se verificó y qué queda sin verificar.

## Licencia

MIT (ver [`LICENSE`](LICENSE)).
