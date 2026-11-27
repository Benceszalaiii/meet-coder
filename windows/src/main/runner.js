'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Claude = require('./claude');
const Shell = require('./shell');
const { Paths, head } = require('./models');

const noResult = error => ({ structured: null, text: '', cost: 0, error });
const commands = ['npm *', 'npx *', 'php artisan *', 'composer *', 'ls *', 'mkdir *'];
const cancelled = 'A művelet megszakítva.';

function objectFrom(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

function strictSchema(schema) {
  if (schema.properties) {
    schema.additionalProperties = false;
    Object.values(schema.properties).forEach(strictSchema);
  }
  if (schema.items) strictSchema(schema.items);
  return schema;
}

function matches(value, schema) {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (![schema.type].flat().includes(type)) return false;
  if (type !== 'object') return true;
  return (schema.required || []).every(key => Object.hasOwn(value, key))
    && Object.entries(schema.properties || {}).every(([key, child]) => !Object.hasOwn(value, key) || matches(value[key], child));
}

function providerFailure(result, signal) {
  if (signal?.aborted) return { ...result, error: cancelled, structured: null, unavailable: false };
  if (!result.error) return result;
  // Only CLI diagnostics from failed calls may mark a subscription unavailable.
  result.unavailable = /(?:\b(?:401|403|429)\b|unauthori[sz]ed|not (?:logged|signed) in|authentication[_ -](?:failed|required|error)|(?:invalid|expired|revoked)[_ -](?:api[_ -]?key|token)|please.{0,16}(?:log in|login|authenticate)|(?:hit|reached) (?:your |the )?(?:(?:session|weekly|usage|rate) )?limit|(?:rate|usage|credit|spend)[_ -]?limit|(?:insufficient|exceeded)[_ -]?quota|billing_error|model[_ -]not[_ -]found|(?:model|subscription).{0,100}(?:unavailable|not available|not supported|not accessible|does not exist|expired)|(?:access|entitlement).{0,24}(?:denied|model)|spawn .+ ENOENT)/i.test(result.error);
  result.structured = null;
  return result;
}

function codexArgs(selection, { cwd, image, system }, editing, schemaFile) {
  const args = ['codex', 'exec', '--json', '--ephemeral', '--skip-git-repo-check', '--ignore-user-config',
    '--sandbox', editing ? 'workspace-write' : 'read-only',
    '-c', 'approval_policy="never"', '-c', 'model_provider="openai"', '-c', 'forced_login_method="chatgpt"',
    '-c', 'web_search="disabled"', '--disable', 'shell_tool', '--disable', 'unified_exec', '--disable', 'multi_agent',
    '-c', 'developer_instructions=' + JSON.stringify(system)];
  if (editing) {
    args.push('-c', 'mcp_servers.meetcoder.command=' + JSON.stringify(process.execPath),
      '-c', 'mcp_servers.meetcoder.args=' + JSON.stringify([path.join(__dirname, 'project-reader.js'), cwd]),
      '-c', 'mcp_servers.meetcoder.env.ELECTRON_RUN_AS_NODE="1"');
  }
  if (selection.model) args.push('--model', selection.model);
  if (image && selection.supportsImages !== false) args.push('--image', image);
  if (schemaFile) args.push('--output-schema', schemaFile);
  args.push('-');
  return args;
}

function openCodeConfig(major, editing, allowCommands, system) {
  const description = 'MeetCoder';
  const allowedTools = editing ? ['read', 'glob', 'grep', 'edit'] : [];
  const shell = editing && allowCommands ? commands : [];
  if (major === 1) {
    const permission = { '*': 'deny' };
    for (const tool of allowedTools) permission[tool] = 'allow';
    if (shell.length) permission.bash = { '*': 'deny', ...Object.fromEntries(shell.map(pattern => [pattern, 'allow'])) };
    return { agent: { meetcoder: { mode: 'primary', description, prompt: system, permission } } };
  }
  const permissions = [{ action: '*', resource: '*', effect: 'deny' }];
  for (const tool of allowedTools) permissions.push({ action: tool, resource: '*', effect: 'allow' });
  for (const pattern of shell) permissions.push({ action: 'shell', resource: pattern, effect: 'allow' });
  return { agents: { meetcoder: { mode: 'primary', description, system, permissions } } };
}

function toolEvent(onEvent, name, input) {
  onEvent?.({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
}

function codexEvent(event, result, onEvent) {
  const item = event.item || {};
  if (event.type === 'error' || event.type === 'turn.failed') {
    result.error = head(event.error?.message || event.message || 'Codex-hiba', 300);
  } else if (event.type === 'turn.completed') {
    result.error = null; // Earlier retryable transport errors can precede a completed turn.
  } else if (event.type === 'item.completed' && item.type === 'agent_message') {
    result.text = item.text || '';
  } else if (event.type === 'item.completed' && item.type === 'file_change') {
    for (const change of item.changes || []) toolEvent(onEvent, 'Edit', { file_path: change.path });
  } else if (event.type === 'item.started' && item.type === 'mcp_tool_call' && item.server === 'meetcoder') {
    const input = typeof item.arguments === 'string' ? objectFrom(item.arguments) : item.arguments;
    toolEvent(onEvent, item.tool === 'read_file' ? 'Read' : 'Glob', { file_path: input?.path, pattern: input?.path });
  }
}

const toolNames = { read: 'Read', edit: 'Edit', write: 'Write', patch: 'Edit', apply_patch: 'Edit',
  glob: 'Glob', grep: 'Grep', bash: 'Bash', shell: 'Bash' };

function openCodeEvent(event, result, onEvent) {
  const part = event.part || {};
  if (event.type === 'text' && typeof part.text === 'string') {
    result.text += (result.text ? '\n' : '') + part.text;
  } else if (event.type === 'step_finish' && Number.isFinite(part.cost)) {
    result.cost += part.cost;
  } else if (event.type === 'error') {
    result.error = head(event.error?.data?.message || event.error?.message || event.error?.name || 'OpenCode-hiba', 300);
  } else if (event.type === 'tool_use' && toolNames[part.tool]) {
    const input = part.state?.input || {};
    toolEvent(onEvent, toolNames[part.tool], { ...input, file_path: input.filePath || input.path });
  }
}

async function run(selection, opts, editing) {
  let temp;
  const cwd = editing ? opts.cwd : Paths.support;
  try {
    if (opts.signal?.aborted) return noResult(cancelled);
    let result;
    if (selection.provider === 'claude') {
      const fn = editing ? Claude.agent : Claude.ask;
      result = await fn({ ...opts, model: selection.model, onEvent: opts.onEvent || (() => {}) });
    } else {
      let argv, env, input = opts.prompt, parseEvent;
      if (selection.provider === 'codex') {
        let schemaFile;
        if (!editing) {
          temp = fs.mkdtempSync(path.join(os.tmpdir(), 'meetcoder-schema-'));
          schemaFile = path.join(temp, 'response.json');
          fs.writeFileSync(schemaFile, JSON.stringify(strictSchema(JSON.parse(opts.schema))));
        }
        argv = codexArgs(selection, { ...opts, cwd }, editing, schemaFile);
        if (editing) input += '\nUse the MeetCoder read and directory tools to inspect the project, and apply_patch for edits. Shell commands are disabled.';
        parseEvent = codexEvent;
      } else if (selection.provider === 'opencode' && [1, 2].includes(selection.openCodeMajor)) {
        const major = selection.openCodeMajor;
        argv = ['opencode', 'run', '--format', 'json', '--agent', 'meetcoder'];
        if (major === 2) argv.push('--standalone');
        if (selection.model) argv.push('--model', selection.model);
        if (opts.image && selection.supportsImages === true) argv.push('--file', opts.image);
        if (!editing) input += '\n\nReturn only one JSON object matching this schema:\n' + opts.schema;
        const config = Shell.env.OPENCODE_CONFIG_CONTENT ? JSON.parse(Shell.env.OPENCODE_CONFIG_CONTENT) : {};
        const key = major === 1 ? 'agent' : 'agents';
        const settings = openCodeConfig(major, editing, opts.allowCommands, opts.system);
        config[key] = { ...config[key], ...settings[key] };
        env = { ...Shell.env, PWD: cwd, OPENCODE_CONFIG_CONTENT: JSON.stringify(config) };
        parseEvent = openCodeEvent;
      } else {
        return noResult('Nem támogatott szolgáltató vagy parancssori verzió.');
      }
      result = noResult(null);
      let diagnostic = '';
      const proc = opts.proc || new Shell.StreamProc();
      const code = await proc.run(argv, { cwd, stdin: input, env, onLine(line, source) {
        const event = source === 'stderr' ? null : objectFrom(line);
        if (event) {
          parseEvent(event, result, opts.onEvent);
          if (selection.provider === 'opencode' && editing && event.type === 'step_finish'
            && event.part?.reason === 'tool-calls' && result.cost >= opts.budget && !result.error) {
            result.error = 'A kódolás elérte a költségkeretet.';
            proc.terminate();
          }
        } else if (line.trim()) diagnostic = head(line.trim(), 300);
      } });
      if ((code !== 0 || !result.text) && !result.error) result.error = diagnostic || `A(z) ${selection.provider} nem adott teljes választ (kilépési kód: ${code}).`;
    }
    if (!editing && !result.error) {
      const text = result.text.trim().replace(/^\x60\x60\x60(?:json)?\s*\n([\s\S]*?)\n\x60\x60\x60$/i, '$1');
      result.structured ??= objectFrom(text);
      if (!matches(result.structured, JSON.parse(opts.schema))) result.error = 'A válasz nem felel meg a kért JSON-sémának.';
    }
    return providerFailure(result, opts.signal);
  } catch (error) {
    return providerFailure(noResult(head(error.message, 300)), opts.signal);
  } finally {
    if (temp) { try { fs.rmSync(temp, { recursive: true, force: true }); } catch {} }
  }
}

module.exports = {
  ask: (selection, opts) => run(selection, opts, false),
  agent: (selection, opts) => run(selection, opts, true),
};
