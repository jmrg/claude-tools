#!/usr/bin/env node
// PreToolUse(Bash) guard for the "qa" agent. Fail-closed: anything not explicitly allowed, or any error, exits 2.
// Allows read-only inspection and test runners only; one command per call (no chaining, redirection or substitution).
// shortcut: allowlist is global and Node/.NET/Python/PHP oriented, extend ALLOW per language when a repo needs it.
const ALLOW = /^(git (status|diff|log|show)|npm test|npm run test|node --test|dotnet test|pytest|python -m pytest|composer test|ls|cat|grep)( |$)/;
const META = /[;&|<>`$()\n\r]/;

function decide(raw) {
  let cmd = '';
  try { cmd = String((JSON.parse(raw.replace(/^﻿/, '')).tool_input || {}).command || ''); } catch (e) { return false; }
  cmd = cmd.trim().replace(/ 2>&1$/, ''); // merging stderr into stdout is harmless
  if (!cmd || META.test(cmd)) return false;
  if (/(^| )--output(=| |$)/.test(cmd)) return false; // git diff/log/show --output=<file> writes a file
  return ALLOW.test(cmd);
}

if (require.main === module) {
  try {
    let s = '';
    process.stdin.on('data', d => (s += d)).on('end', () => {
      let ok = false;
      try { ok = decide(s); } catch (e) { ok = false; }
      if (process.env.TEAM_GUARD_LOG) { try { require('fs').appendFileSync(process.env.TEAM_GUARD_LOG, (ok ? 'ALLOW ' : 'BLOCK ') + s.replace(/\s+/g, ' ').slice(0, 300) + '\n'); } catch (e) {} }
      if (!ok) {
        console.error('BLOQUEADO (qa): solo lectura y pruebas. Un comando por llamada, sin cd, &&, pipes ni redirecciones (solo se admite 2>&1 al final). Permitidos: git status|diff|log|show, npm test, node --test, dotnet test, pytest, composer test, ls, cat, grep.');
        process.exit(2);
      }
      process.exit(0);
    });
    process.stdin.on('error', () => process.exit(2));
  } catch (e) { process.exit(2); }
}
module.exports = { decide };
