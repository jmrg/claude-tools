#!/usr/bin/env node
// Usage log for /team subagents. Registered as a Stop hook in each agent's frontmatter (it runs as SubagentStop).
// Reads the subagent transcript and appends one JSON line with its token usage. Metrics never block: always exits 0.
// The transcript repeats the same message.id on several lines, so usage is kept once per id (max per field).
// Stop fires every time the agent stops: a resumed agent logs again with cumulative totals (diff rows by agent_id).
const fs = require('fs');
const os = require('os');
const path = require('path');

const FIELDS = ['input', 'output', 'cache_read', 'cache_create', 'cache_5m', 'cache_1h'];

function sumUsage(lines) {
  const byId = new Map();
  let model = '';
  let anon = 0;
  for (const line of lines) {
    let o;
    try { o = JSON.parse(line); } catch (e) { continue; }
    const m = o && o.message;
    if (!m || !m.usage) continue;
    const u = m.usage;
    const cc = u.cache_creation || {};
    const cur = {
      input: u.input_tokens || 0, output: u.output_tokens || 0,
      cache_read: u.cache_read_input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0,
      cache_5m: cc.ephemeral_5m_input_tokens || 0, cache_1h: cc.ephemeral_1h_input_tokens || 0,
    };
    const id = m.id || 'anon-' + anon++;
    const prev = byId.get(id);
    byId.set(id, prev ? Object.fromEntries(FIELDS.map(f => [f, Math.max(prev[f], cur[f])])) : cur);
    if (m.model) model = m.model;
  }
  const total = Object.fromEntries(FIELDS.map(f => [f, 0]));
  for (const v of byId.values()) for (const f of FIELDS) total[f] += v[f];
  return { model, messages: byId.size, ...total };
}

function logUsage(raw, outDir) {
  const input = JSON.parse(raw.replace(/^﻿/, ''));
  const file = input.agent_transcript_path;
  if (!file || !fs.existsSync(file)) return false;
  const row = { ts: new Date().toISOString(), session_id: input.session_id || '', agent_id: input.agent_id || '', agent_type: input.agent_type || '', ...sumUsage(fs.readFileSync(file, 'utf8').split(/\r?\n/)) };
  fs.mkdirSync(outDir, { recursive: true });
  fs.appendFileSync(path.join(outDir, 'usage.jsonl'), JSON.stringify(row) + '\n');
  return true;
}

if (require.main === module) {
  let s = '';
  process.stdin.on('data', d => (s += d)).on('end', () => {
    try { logUsage(s, process.env.TEAM_METRICS_DIR || path.join(os.homedir(), '.claude', 'team-metrics')); } catch (e) { /* metrics never block */ }
    process.exit(0);
  });
  process.stdin.on('error', () => process.exit(0));
}
module.exports = { sumUsage, logUsage };
