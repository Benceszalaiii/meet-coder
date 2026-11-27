'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const Runner = require('../src/main/runner');
const Shell = require('../src/main/shell');
const { setAppData } = require('../src/main/models');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meetcoder-runner-'));
setAppData(root);
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

const schema = JSON.stringify({ type: 'object', properties: { task: { type: ['object', 'null'],
  properties: { name: { type: 'string' } }, required: ['name'] } }, required: ['task'] });
const opts = { cwd: root, system: 'System', prompt: 'Prompt', schema, readDirs: [], allowCommands: false, budget: 1 };
const codex = { provider: 'codex', model: 'test-model' };
const openCode = openCodeMajor => ({ provider: 'opencode', model: '', openCodeMajor });

function processFixture(events, inspect = () => {}, code = 0) {
  return { async run(argv, options) {
    inspect(argv, options);
    for (const event of events) options.onLine(JSON.stringify(event), 'stdout');
    return code;
  } };
}

test('Codex analysis attaches images and enforces a strict nested output schema per invocation', async () => {
  let file;
  const proc = processFixture([{ type: 'item.completed', item: { type: 'agent_message', text: '{"task":null}' } },
    { type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 7 } }], (args, { stdin }) => {
    assert.equal(args[args.indexOf('--sandbox') + 1], 'read-only');
    assert.equal(args[args.indexOf('--model') + 1], 'test-model');
    assert.equal(args[args.indexOf('--image') + 1], 'frame.jpg');
    assert.equal(stdin, 'Prompt');
    file = args[args.indexOf('--output-schema') + 1];
    const strict = JSON.parse(fs.readFileSync(file));
    assert.equal(strict.additionalProperties, false);
    assert.equal(strict.properties.task.additionalProperties, false);
  });
  const got = await Runner.ask(codex, { ...opts, image: 'frame.jpg', proc });
  assert.deepEqual(got.structured, { task: null });
  assert.equal(got.cost, 0);
  assert.equal(fs.existsSync(file), false);
});

test('Codex edits in the project without a general-purpose shell and reports changed files', async () => {
  const seen = [];
  const proc = processFixture([{ type: 'item.completed', item: { type: 'file_change', changes: [{ path: 'a.cs' }] } },
    { type: 'item.completed', item: { type: 'agent_message', text: 'HEADER: Szia' } }], (args, { cwd }) => {
    assert.equal(cwd, root);
    assert.equal(args[args.indexOf('--sandbox') + 1], 'workspace-write');
    assert.ok(args.includes('shell_tool') && args.includes('unified_exec'));
    assert.ok(args.some(arg => arg.startsWith('mcp_servers.meetcoder.command=')));
    assert.ok(!args.includes('--image'));
  });
  const got = await Runner.agent({ ...codex, supportsImages: false }, {
    ...opts, image: 'ignored.jpg', proc, onEvent: event => seen.push(event.message.content[0]) });
  assert.equal(got.text, 'HEADER: Szia');
  assert.equal(seen[0].input.file_path, 'a.cs');
});

for (const major of [1, 2]) {
  test(`OpenCode v${major} uses its configured default and limits C# projects to file operations`, async () => {
    const events = [{ type: 'tool_use', part: { tool: 'edit', state: { input: { filePath: 'a.cs' } } } },
      { type: 'step_finish', part: { cost: 0.125 } }, { type: 'text', part: { text: 'HEADER: Módosítás' } },
      { type: 'step_finish', part: { cost: 0.25 } }];
    const proc = processFixture(events, (argv, { env, cwd }) => {
      assert.equal(argv.includes('--standalone'), major === 2);
      assert.ok(!argv.includes('--model') && !argv.includes('--auto'));
      assert.equal(env.PWD, cwd);
      const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
      if (major === 1) {
        assert.equal(config.agent.meetcoder.permission['*'], 'deny');
        assert.equal(config.agent.meetcoder.permission.edit, 'allow');
        assert.equal(config.agent.meetcoder.permission.bash, undefined);
      } else {
        const p = config.agents.meetcoder.permissions;
        assert.deepEqual(p[0], { action: '*', resource: '*', effect: 'deny' });
        assert.ok(p.some(r => r.action === 'edit') && !p.some(r => r.action === 'shell'));
      }
    });
    const seen = [];
    const got = await Runner.agent(openCode(major), { ...opts, proc, onEvent: e => seen.push(e) });
    assert.equal(got.cost, 0.375);
    assert.equal(got.text, 'HEADER: Módosítás');
    assert.equal(seen[0].message.content[0].name, 'Edit');
  });
}

test('unstructured or partial responses cannot produce a task', async () => {
  for (const text of ['not JSON', '{"task":{"wrong":3}}']) {
    const proc = processFixture([{ type: 'text', part: { text } }], (args, { stdin }) => {
      assert.ok(stdin.includes(schema));
      assert.ok(!args.includes('--file'));
    });
    const r = await Runner.ask(openCode(1), { ...opts, image: 'frame.jpg', proc });
    assert.equal(r.structured, null);
    assert.ok(r.error);
    assert.equal(r.unavailable, false);
  }
});

test('only provider failures are tagged for fallback, and cancellation launches no process', async () => {
  const denied = processFixture([{ type: 'turn.failed', error: { message: '401 Unauthorized' } }], undefined, 1);
  assert.equal((await Runner.agent(codex, { ...opts, proc: denied })).unavailable, true);
  const broken = processFixture([{ type: 'turn.failed', error: { message: 'Invalid schema' } }], undefined, 1);
  assert.equal((await Runner.agent(codex, { ...opts, proc: broken })).unavailable, false);
  const unused = { run() { throw Error('should never launch'); } };
  assert.match((await Runner.agent(codex, { ...opts, signal: AbortSignal.abort(), proc: unused })).error, /megszakítva/);
});

test('Claude uses the selected alias and reports authentication errors', async t => {
  t.mock.method(Shell, 'run', async (exe, args) => {
    assert.equal(exe, 'claude');
    assert.equal(args[args.indexOf('--model') + 1], 'opus');
    return { code: 1, out: JSON.stringify({ is_error: true, error: 'authentication_failed', result: 'Error' }), err: '' };
  });
  const r = await Runner.ask({ provider: 'claude', model: 'opus' }, opts);
  assert.equal(r.unavailable, true);
  assert.equal(r.structured, null);
});

test('Codex project reader responds over MCP and refuses traversal', () => {
  const file = path.join(root, 'Sample.cs');
  fs.writeFileSync(file, 'class Sample {}');
  const messages = [{ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
    { id: 2, method: 'tools/list' }, ...['Sample.cs', '../other.cs', '.env'].map((p, i) => ({
      id: i + 3, method: 'tools/call', params: { name: 'read_file', arguments: { path: p } } }))];
  const script = path.resolve(__dirname, '../src/main/project-reader.js');
  const r = spawnSync(process.execPath, [script, root], { input: messages.map(m => JSON.stringify(m)).join('\n'), encoding: 'utf8' });
  assert.equal(r.status, 0);
  const replies = r.stdout.trim().split('\n').map(JSON.parse);
  assert.equal(replies[1].result.tools.length, 2);
  assert.equal(replies[2].result.content[0].text, 'class Sample {}');
  assert.ok(replies[3].result.isError && replies[4].result.isError);
});
