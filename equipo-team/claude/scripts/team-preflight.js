#!/usr/bin/env node
// Preflight for /team: verifies the plugins and files the team depends on. Exit 1 (aborts the skill) if anything is missing.
// Usage: node team-preflight.js [projectDir]   (env TEAM_PREFLIGHT_HOME overrides the home dir, for tests)
const fs = require('fs');
const os = require('os');
const path = require('path');

// Plugins are matched by name, whatever the origin they were installed from ("name" or "name@origin").
const REQUIRED_PLUGINS = [
  { name: 'ponytail', why: 'reglas ponytail (desarrollador y arquitecto)' },
  { name: 'fullstack-dev-skills', why: 'skill architecture-designer (arquitecto)' },
];
const REQUIRED_FILES = [
  'agents/arquitecto.md', 'agents/desarrollador.md', 'agents/qa.md', 'agents/explorador.md',
  'scripts/team-qa-guard.js', 'scripts/team-write-guard.js',
];

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch (e) { return null; }
}

// Effective value: user < project < project-local (later layers override earlier ones).
function pluginEnabled(name, home, project) {
  let v;
  for (const f of [path.join(home, '.claude', 'settings.json'), path.join(project, '.claude', 'settings.json'), path.join(project, '.claude', 'settings.local.json')]) {
    const s = readJson(f);
    if (!s || !s.enabledPlugins) continue;
    for (const [k, val] of Object.entries(s.enabledPlugins)) if (k === name || k.startsWith(name + '@')) v = val;
  }
  return v === true;
}

function check(home, project) {
  const problems = [];
  for (const p of REQUIRED_PLUGINS) if (!pluginEnabled(p.name, home, project)) problems.push(`Plugin no habilitado: ${p.name} (${p.why}).`);
  for (const f of REQUIRED_FILES) if (!fs.existsSync(path.join(home, '.claude', f))) problems.push(`Falta el archivo ~/.claude/${f}.`);
  return problems;
}

if (require.main === module) {
  const home = process.env.TEAM_PREFLIGHT_HOME || os.homedir();
  const project = path.resolve(process.argv[2] || process.cwd());
  const problems = check(home, project);
  if (problems.length) {
    console.log('PREFLIGHT FALLIDO: el equipo /team no puede ejecutarse.\n- ' + problems.join('\n- ') + '\nDetente y avisa al usuario; no lances ningun agente.');
    process.exit(1);
  }
  console.log(`PREFLIGHT OK: plugins habilitados (${REQUIRED_PLUGINS.map(p => p.name).join(', ')}), 4 agentes y 2 guardias presentes. Proyecto: ${project}`);
}
module.exports = { check, pluginEnabled };
