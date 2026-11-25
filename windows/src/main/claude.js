'use strict';
const { Paths, head } = require('./models');
const Shell = require('./shell');

const model = 'claude-sonnet-5-5';
const effort = 'medium';

const base = [
  '-p', '--model', model, '--effort', effort,
  '--safe-mode', '--strict-mcp-config', '--no-session-persistence',
];

/** One-shot structured question. Read is the only tool (for the screenshot). */
async function ask({ system, prompt, schema, readDirs = [] }) {
  const args = [...base,
    '--output-format', 'json', '--tools', 'Read', '--allowedTools', 'Read',
    '--permission-prompts', 'none', '--system-prompt', system, '--json-schema', schema];
  for (const d of readDirs) args.push('--add-dir', d);
  const r = await Shell.run('claude', args, { cwd: Paths.support, stdin: prompt });
  const res = { structured: null, text: '', cost: 0, error: null };
  let o = null;
  try { const j = JSON.parse(r.out); if (j && typeof j === 'object' && !Array.isArray(j)) o = j; } catch {}
  if (!o) { res.error = head(r.err === '' ? r.out : r.err, 300); return res; }
  res.cost = typeof o.total_cost_usd === 'number' ? o.total_cost_usd : 0;
  res.text = typeof o.result === 'string' ? o.result : '';
  res.structured = o.structured_output && typeof o.structured_output === 'object' ? o.structured_output : null;
  if (!res.structured) {
    try { const j = JSON.parse(res.text); if (j && typeof j === 'object' && !Array.isArray(j)) res.structured = j; } catch {}
  }
  if (o.is_error === true) res.error = head(res.text, 300);
  return res;
}

/** Autonomous coding run inside a project folder. Events stream back as parsed JSON. */
async function agent({ proc, cwd, prompt, system, allowCommands, readDirs, budget, onEvent }) {
  const args = [...base,
    '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'acceptEdits', '--permission-prompts', 'none',
    '--append-system-prompt', system,
    '--max-budget-usd', Math.max(0.2, budget).toFixed(2),
    '--disallowedTools', 'WebFetch', 'WebSearch', 'Bash(dotnet *)', 'Bash(git push *)', 'Bash(rm -rf *)', 'Bash(sudo *)', 'Bash(curl *)'];
  if (allowCommands) {
    args.push('--tools', 'Read,Edit,Write,Glob,Grep,Bash',
      '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep',
      'Bash(npm *)', 'Bash(npx *)', 'Bash(php artisan *)', 'Bash(composer *)', 'Bash(ls *)', 'Bash(mkdir *)');
  } else {
    args.push('--tools', 'Read,Edit,Write,Glob,Grep', '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep');
  }
  for (const d of readDirs) args.push('--add-dir', d);
  const res = { structured: null, text: '', cost: 0, error: null };
  const code = await proc.run(['claude', ...args], {
    cwd, stdin: prompt,
    onLine: line => {
      let o;
      try { o = JSON.parse(line); } catch { return; }
      if (!o || typeof o !== 'object' || Array.isArray(o)) return;
      if (o.type === 'result') {
        res.cost = typeof o.total_cost_usd === 'number' ? o.total_cost_usd : 0;
        res.text = typeof o.result === 'string' ? o.result : '';
        if (o.is_error === true) res.error = head(res.text, 300);
      }
      onEvent(o);
    },
  });
  if (code !== 0 && res.text === '' && res.error == null) res.error = `agent exited with code ${code}`;
  return res;
}

module.exports = { model, effort, ask, agent };
