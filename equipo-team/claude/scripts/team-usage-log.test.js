// Run: node --test __CLAUDE_HOME__/scripts/team-usage-log.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sumUsage, logUsage } = require('./team-usage-log');
const script = path.join(__dirname, 'team-usage-log.js');

const line = (id, usage, model = 'claude-test-1') => JSON.stringify({ type: 'assistant', message: { id, model, usage } });
const u = (i, o, cr, cc, c5 = cc, c1 = 0) => ({ input_tokens: i, output_tokens: o, cache_read_input_tokens: cr, cache_creation_input_tokens: cc, cache_creation: { ephemeral_5m_input_tokens: c5, ephemeral_1h_input_tokens: c1 } });

test('suma mensajes distintos', () => {
  const r = sumUsage([line('a', u(2, 10, 100, 50)), line('b', u(3, 20, 200, 0))]);
  assert.deepStrictEqual(r, { model: 'claude-test-1', messages: 2, input: 5, output: 30, cache_read: 300, cache_create: 50, cache_5m: 50, cache_1h: 0 });
});

test('un message.id repetido cuenta una sola vez (maximo por campo)', () => {
  const r = sumUsage([line('a', u(2, 4, 0, 14230)), line('a', u(2, 120, 0, 14230)), line('a', u(2, 120, 0, 14230))]);
  assert.strictEqual(r.messages, 1);
  assert.strictEqual(r.output, 120);
  assert.strictEqual(r.cache_create, 14230);
});

test('ignora lineas sin usage o invalidas, y reporta el nivel de TTL', () => {
  const r = sumUsage(['', 'no es json', JSON.stringify({ type: 'user' }), JSON.stringify({ message: { id: 'x' } }), line('a', u(1, 1, 0, 10, 0, 10))]);
  assert.strictEqual(r.messages, 1);
  assert.strictEqual(r.cache_1h, 10);
  assert.strictEqual(r.cache_5m, 0);
});

test('usage sin cache_creation no rompe', () => {
  const r = sumUsage([line('a', { input_tokens: 1, output_tokens: 2 })]);
  assert.deepStrictEqual([r.input, r.output, r.cache_create, r.cache_5m], [1, 2, 0, 0]);
});

test('logUsage escribe una fila por llamada y es acumulativo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ul-'));
  const tr = path.join(dir, 'agent-1.jsonl');
  fs.writeFileSync(tr, line('a', u(1, 5, 0, 100)) + '\n');
  const input = JSON.stringify({ agent_transcript_path: tr, agent_id: 'ag1', agent_type: 'qa', session_id: 's1' });
  assert.strictEqual(logUsage(input, dir), true);
  fs.appendFileSync(tr, line('b', u(1, 7, 100, 0)) + '\n');
  logUsage(input, dir);
  const rows = fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual([rows[0].agent_type, rows[0].agent_id, rows[0].output], ['qa', 'ag1', 5]);
  assert.strictEqual(rows[1].output, 12);
});

test('sin transcrito no escribe nada', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ul-'));
  assert.strictEqual(logUsage(JSON.stringify({ agent_id: 'x' }), dir), false);
  assert.strictEqual(logUsage(JSON.stringify({ agent_transcript_path: path.join(dir, 'no-existe.jsonl') }), dir), false);
  assert.strictEqual(fs.existsSync(path.join(dir, 'usage.jsonl')), false);
});

test('ejecutable real: siempre sale con 0, incluso con basura o sin destino escribible', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ul-'));
  const run = (input, env) => spawnSync(process.execPath, [script], { input, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.strictEqual(run('basura', { TEAM_METRICS_DIR: dir }).status, 0);
  assert.strictEqual(run('', { TEAM_METRICS_DIR: dir }).status, 0);
  const tr = path.join(dir, 't.jsonl'); fs.writeFileSync(tr, line('a', u(1, 1, 1, 1)) + '\n');
  assert.strictEqual(run(JSON.stringify({ agent_transcript_path: tr }), { TEAM_METRICS_DIR: dir }).status, 0);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'usage.jsonl'), 'utf8').trim().split('\n').length, 1);
  const bad = path.join(dir, 'archivo'); fs.writeFileSync(bad, 'x'); // un archivo donde se esperaba una carpeta
  assert.strictEqual(run(JSON.stringify({ agent_transcript_path: tr }), { TEAM_METRICS_DIR: path.join(bad, 'sub') }).status, 0);
});
