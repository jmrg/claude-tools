// Run: node --test __CLAUDE_HOME__/scripts/team-preflight.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const script = path.join(__dirname, 'team-preflight.js');

function fakeHome(enabled, withFiles = true) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-home-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({ enabledPlugins: enabled }));
  if (withFiles) for (const f of ['agents/arquitecto.md', 'agents/desarrollador.md', 'agents/qa.md', 'agents/explorador.md', 'scripts/team-qa-guard.js', 'scripts/team-write-guard.js']) {
    fs.mkdirSync(path.dirname(path.join(home, '.claude', f)), { recursive: true });
    fs.writeFileSync(path.join(home, '.claude', f), 'x');
  }
  return home;
}
const run = (home, project) => spawnSync(process.execPath, [script, project], { encoding: 'utf8', env: { ...process.env, TEAM_PREFLIGHT_HOME: home } });
const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-proj-'));
const ALL = { 'ponytail@origen-a': true, 'fullstack-dev-skills@origen-b': true };

test('todo presente: exit 0', () => { const r = run(fakeHome(ALL), proj); assert.strictEqual(r.status, 0); assert.match(r.stdout, /PREFLIGHT OK/); });
test('falta ponytail: exit 1', () => { const r = run(fakeHome({ 'fullstack-dev-skills@origen-b': true }), proj); assert.strictEqual(r.status, 1); assert.match(r.stdout, /ponytail/); });
test('un plugin de nombre parecido no cuenta', () => { const r = run(fakeHome({ 'ponytail-extra@origen-a': true, 'fullstack-dev-skills@origen-b': true }), proj); assert.strictEqual(r.status, 1); assert.match(r.stdout, /ponytail/); });
test('nombre sin origen tambien cuenta', () => { const r = run(fakeHome({ 'ponytail': true, 'fullstack-dev-skills': true }), proj); assert.strictEqual(r.status, 0); });
test('plugin en false: exit 1', () => { const r = run(fakeHome({ ...ALL, 'fullstack-dev-skills@origen-b': false }), proj); assert.strictEqual(r.status, 1); assert.match(r.stdout, /fullstack-dev-skills/); });
test('faltan archivos del equipo: exit 1', () => { const r = run(fakeHome(ALL, false), proj); assert.strictEqual(r.status, 1); assert.match(r.stdout, /agents\/arquitecto\.md/); });
test('el proyecto puede deshabilitar un plugin', () => {
  const home = fakeHome(ALL); const p = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-proj-'));
  fs.mkdirSync(path.join(p, '.claude')); fs.writeFileSync(path.join(p, '.claude', 'settings.local.json'), JSON.stringify({ enabledPlugins: { 'ponytail@origen-a': false } }));
  assert.strictEqual(run(home, p).status, 1);
});
test('sin settings.json: exit 1', () => { const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-home-')); assert.strictEqual(run(home, proj).status, 1); });
test('instalacion real del usuario: exit 0', () => { const r = spawnSync(process.execPath, [script, proj], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stdout); });
