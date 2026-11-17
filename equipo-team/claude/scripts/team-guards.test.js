// Run: node --test __CLAUDE_HOME__/scripts/team-guards.test.js
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const qa = require('./team-qa-guard');
const wr = require('./team-write-guard');

const bash = command => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

test('qa: comandos permitidos', () => {
  for (const c of ['git status --short', 'git diff --stat', 'git log --oneline', 'git show HEAD', 'npm test', 'npm test 2>&1', 'npm run test', 'node --test', 'dotnet test', 'pytest -q', 'python -m pytest', 'composer test', 'ls src', 'cat package.json', 'grep -rn calcDiscount src'])
    assert.strictEqual(qa.decide(bash(c)), true, c);
});

test('qa: comandos bloqueados', () => {
  for (const c of [
    'echo HOLA > w.txt', 'printf X | tee w.txt', 'cat a > b', 'sed -i s/a/b/ f', 'node w.js', 'node -e "1"', 'powershell -File w.ps1',
    'cd /tmp && npm test', 'npm test; rm -rf x', 'npm test | tail -5', 'npm test $(whoami)', 'npm test `id`',
    'git -C other status', 'git checkout -- .', 'git reset --hard', 'git diff --output=out.txt', 'git log --output out.txt',
    'rm -rf x', 'curl http://x', 'npm install', 'dotnet build', '', '   ',
  ]) assert.strictEqual(qa.decide(bash(c)), false, c);
});

test('qa: entrada invalida bloquea (fail-closed)', () => {
  for (const raw of ['', 'no es json', '{}', '{"tool_input":{}}', '{"tool_input":{"command":null}}']) assert.strictEqual(qa.decide(raw), false, raw);
});

test('qa: ejecutable real devuelve 2 al bloquear y 0 al permitir', () => {
  const script = path.join(__dirname, 'team-qa-guard.js');
  const run = input => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });
  const blocked = run(bash('echo x > y'));
  assert.strictEqual(blocked.status, 2);
  assert.match(blocked.stderr, /BLOQUEADO/);
  assert.strictEqual(run(bash('npm test')).status, 0);
  assert.strictEqual(run('basura').status, 2);
});

test('arquitecto: solo escribe dentro de .team', () => {
  const cwd = process.platform === 'win32' ? 'C:\\proj' : '/proj';
  const w = file_path => JSON.stringify({ tool_input: { file_path }, cwd });
  assert.strictEqual(wr.decide(w(path.join(cwd, '.team', 'plan.md'))), true);
  assert.strictEqual(wr.decide(w('.team/t1/plan.md')), true);
  for (const f of [path.join(cwd, 'src', 'a.js'), 'src/a.js', '.team/../src/a.js', path.join(cwd, '.teamX', 'a.md'), path.join(cwd, '..', 'otro', '.team', 'a.md'), '', undefined])
    assert.strictEqual(wr.decide(w(f)), false, String(f));
  assert.strictEqual(wr.decide('no es json'), false);
  assert.strictEqual(wr.decide(JSON.stringify({ tool_input: { file_path: '.team/a.md' } }), undefined), false);
});

test('arquitecto: ejecutable real devuelve 2 fuera de .team', () => {
  const script = path.join(__dirname, 'team-write-guard.js');
  const cwd = process.cwd();
  const run = file_path => spawnSync(process.execPath, [script], { input: JSON.stringify({ tool_input: { file_path }, cwd }), encoding: 'utf8' });
  assert.strictEqual(run('src/x.js').status, 2);
  assert.strictEqual(run('.team/plan.md').status, 0);
});
