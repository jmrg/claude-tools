#!/usr/bin/env node
// PreToolUse(Write|Edit) guard for the "arquitecto" agent: it may only write under <project>/.team/.
// Fail-closed: any error or path outside .team exits 2.
const path = require('path');

function decide(raw, fallbackCwd) {
  let input;
  try { input = JSON.parse(raw.replace(/^﻿/, '')); } catch (e) { return false; }
  const file = (input.tool_input || {}).file_path;
  const cwd = input.cwd || fallbackCwd;
  if (!file || !cwd) return false;
  const root = path.resolve(cwd, '.team') + path.sep;
  const target = path.resolve(cwd, String(file)); // resolves ".." so traversal cannot escape
  const norm = p => (process.platform === 'win32' ? p.toLowerCase() : p);
  return norm(target).startsWith(norm(root));
}

if (require.main === module) {
  try {
    let s = '';
    process.stdin.on('data', d => (s += d)).on('end', () => {
      let ok = false;
      try { ok = decide(s, process.cwd()); } catch (e) { ok = false; }
      if (!ok) {
        console.error('BLOQUEADO (arquitecto): solo puedes escribir dentro de .team/ del proyecto (por ejemplo .team/plan.md).');
        process.exit(2);
      }
      process.exit(0);
    });
    process.stdin.on('error', () => process.exit(2));
  } catch (e) { process.exit(2); }
}
module.exports = { decide };
