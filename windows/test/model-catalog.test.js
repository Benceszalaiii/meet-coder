'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Writable, PassThrough } = require('node:stream');
const { setAppData } = require('../src/main/models');
const { discover, resolve } = require('../src/main/model-catalog');

let dataDir;
before(() => { dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetcoder-models-')); setAppData(dataDir); });
after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

const claude = { loggedIn: true, authMethod: 'claude.ai', subscriptionType: 'max' };
const codex = { account: { type: 'chatgpt', planType: 'plus' }, pages: [
  { data: [{ model: 'text-only', inputModalities: ['text'] }, { model: 'hidden', hidden: true }], nextCursor: 'more' },
  { data: [{ model: 'best', displayName: 'Preferred', isDefault: true }], nextCursor: null },
] };

function fakeCLI(accounts) {
  const calls = [];
  return {
    calls,
    findOnPath: provider => Object.hasOwn(accounts, provider),
    async run(provider, args, options) {
      calls.push({ provider, args, options });
      if (provider === 'claude') return { code: accounts.claude?.loggedIn === false ? 1 : 0, out: JSON.stringify(accounts.claude) };
      return { code: 0, out: accounts.opencode };
    },
    spawnResolved() {
      const child = new EventEmitter();
      child.kill = () => { child.stdout.end(); };
      child.stdout = new PassThrough();
      let page = 0;
      child.stdin = new Writable({ write(data, _, done) {
        const msg = JSON.parse(data);
        calls.push(msg);
        // Like stdio, responses arrive after the request has returned.
        queueMicrotask(() => {
          if (!msg.id) return;
          const result = msg.method === 'initialize' ? {} : msg.method === 'account/read'
            ? { account: accounts.codex.account } : accounts.codex.pages[page++];
          child.stdout.write(JSON.stringify({ id: msg.id, result }) + '\n');
        });
        done();
      } });
      return child;
    },
  };
}

test('discovers subscription models across pages and keeps the executable model slug', async () => {
  const cli = fakeCLI({ claude, codex, opencode: '2.1.0' });
  const catalog = await discover(cli);
  assert.deepEqual(catalog.models.map(m => m.id), ['claude:sonnet', 'claude:opus', 'claude:haiku', 'codex:text-only', 'codex:best', 'opencode:default']);
  assert.equal(resolve('auto', catalog).id, 'claude:sonnet');
  assert.equal(resolve('codex:best', catalog).model, 'best');
  assert.equal(resolve('codex:text-only', catalog).supportsImages, false);
  assert.equal(resolve('opencode:default', catalog).openCodeMajor, 2);
  assert.deepEqual(cli.calls.filter(m => m.method).map(m => m.method), ['initialize', 'initialized', 'account/read', 'model/list', 'model/list']);
  assert.equal(cli.calls.at(-1).params.cursor, 'more');
  assert.ok(cli.calls.filter(c => c.provider).every(c => c.options.timeoutMs > 0));
});

test('automatic selection uses the Codex default; an unavailable explicit model falls back to OpenCode', async () => {
  const catalog = await discover(fakeCLI({ codex, opencode: '1.19.0' }));
  assert.equal(resolve('auto', catalog).id, 'codex:best');
  assert.equal(resolve('claude:sonnet', catalog).id, 'opencode:default');
  assert.equal(resolve('codex:retired', catalog).id, 'opencode:default');
  assert.equal(catalog.providers.claude.status, 'missing');
  assert.equal(resolve('claude:sonnet', await discover(fakeCLI({ codex }))), null);
});

test('API keys, signed-out CLIs and free accounts do not unlock subscription models', async () => {
  const pairs = [
    [{ ...claude, authMethod: 'api_key' }, { type: 'apiKey' }],
    [{ ...claude, loggedIn: false }, null],
    [{ ...claude, subscriptionType: 'free' }, { type: 'chatgpt', planType: 'free' }],
    [{ ...claude, subscriptionType: null }, { type: 'chatgpt', planType: 'unknown' }],
  ];
  for (const [auth, account] of pairs) {
    const cli = fakeCLI({ claude: auth, codex: { account }, opencode: '1.19.0' });
    const catalog = await discover(cli);
    assert.equal(resolve('auto', catalog).id, 'opencode:default');
    assert.equal(catalog.providers.codex.status, 'sign-in');
    assert.equal(catalog.providers.claude.status, 'sign-in');
    assert.ok(!cli.calls.some(m => m.method === 'model/list'));
  }
});

test('unreadable metadata, unsupported OpenCode, and missing CLIs produce actionable states', async () => {
  const catalog = await discover(fakeCLI({ claude: null, opencode: '3.0.0' }));
  assert.equal(resolve('auto', catalog), null);
  assert.equal(catalog.providers.claude.status, 'unavailable');
  assert.equal(catalog.providers.opencode.status, 'unavailable');
  assert.equal(catalog.providers.codex.status, 'missing');
  assert.ok(Object.values(catalog.providers).every(p => p.detail.length > 0));
});
