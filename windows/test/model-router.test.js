'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ModelRouter } = require('../src/main/model-router');
const Runner = require('../src/main/runner');
const Catalog = require('../src/main/model-catalog');

const models = [
  { id: 'claude:sonnet', provider: 'claude' },
  { id: 'codex:test', provider: 'codex', isDefault: true },
  { id: 'opencode:default', provider: 'opencode' },
];

test('automatic reads continue through unavailable subscriptions and count each reported cost', async t => {
  t.mock.method(Catalog, 'discover', async () => ({ models, providers: {} }));
  const ask = t.mock.method(Runner, 'ask', async m => ({ unavailable: m.provider !== 'opencode', cost: 0.1, text: m.provider }));
  const router = new ModelRouter(() => {});
  const result = await router.run('ask', 'auto', {});
  assert.equal(ask.mock.callCount(), 3);
  assert.equal(result.text, 'opencode');
  assert.ok(Math.abs(result.cost - 0.3) < 1e-12);
  assert.equal(router.snapshot('auto').active.provider, 'opencode');
});

test('editing runs are never replayed and refresh restores the saved preference', async t => {
  t.mock.method(Catalog, 'discover', async () => ({ models, providers: {} }));
  const agent = t.mock.method(Runner, 'agent', async () => ({ unavailable: true, cost: 0 }));
  const router = new ModelRouter(() => {});
  await router.run('agent', 'codex:test', {});
  assert.equal(agent.mock.callCount(), 1);
  assert.equal(router.snapshot('codex:test').active.provider, 'opencode');
  await router.refresh();
  assert.equal(router.snapshot('codex:test').active.provider, 'codex');
  await router.run('agent', 'codex:test', { signal: AbortSignal.abort() });
  assert.equal(agent.mock.callCount(), 1);
});
