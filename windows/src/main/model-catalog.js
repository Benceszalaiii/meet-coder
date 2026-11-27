'use strict';
const readline = require('node:readline');
const Shell = require('./shell');
const { Paths } = require('./models');

const timeoutMs = 10000;
const names = { claude: 'Claude Code', codex: 'Codex', opencode: 'OpenCode' };

function claudeModels(auth) {
  const paid = ['pro', 'max', 'ultra', 'team', 'enterprise'].includes(String(auth.subscriptionType).toLowerCase());
  if (auth.loggedIn !== true || auth.authMethod !== 'claude.ai' || !paid) return [];
  return ['Sonnet', 'Opus', 'Haiku'].map(name => ({
    id: 'claude:' + name.toLowerCase(), provider: 'claude', model: name.toLowerCase(),
    label: 'Claude ' + name, supportsImages: true,
  }));
}

// Keep the app-server connection alive through the handshake and paginated catalog read.
// Only the plan and model descriptors leave this probe.
function codexModels(cli, cwd) {
  const child = cli.spawnResolved('codex', ['app-server', '-c', 'model_provider="openai"'], {
    cwd, env: cli.env, stdio: ['pipe', 'pipe', 'ignore'],
  });
  return new Promise((resolve, reject) => {
    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    const models = new Map();
    let id = 0;
    let finished = false;
    const timer = setTimeout(() => finish(new Error('Codex timeout')), timeoutMs);
    function finish(error, value) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      lines.close();
      child.stdin.end();
      child.kill();
      if (error) reject(error); else resolve(value);
    }
    function send(message) {
      child.stdin.write(JSON.stringify(message) + '\n');
    }
    function request(method, params) {
      send({ id: ++id, method, params });
    }
    function list(cursor) {
      request('model/list', { includeHidden: false, limit: 100, modelProvider: 'openai', cursor });
    }
    child.on('error', error => finish(error));
    child.on('close', () => finish(new Error('Codex closed')));
    child.stdin.on('error', error => finish(error));
    lines.on('line', line => {
      if (finished) return;
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (!message || message.id !== id) return;
      const result = message.result;
      if (!result || message.error) { finish(new Error('Codex probe failed')); return; }
      if (id === 1) {
        send({ method: 'initialized' });
        request('account/read', { refreshToken: false });
      } else if (id === 2) {
        const account = result.account;
        const plan = account && account.planType;
        if (account?.type !== 'chatgpt' || typeof plan !== 'string' || ['', 'unknown', 'free'].includes(plan.toLowerCase())) {
          finish(null, []);
          return;
        }
        list(null);
      } else {
        if (!Array.isArray(result.data)) { finish(new Error('Missing Codex models')); return; }
        for (const m of result.data) {
          if (m?.hidden || typeof m?.model !== 'string' || !m.model) continue;
          models.set(m.model, {
            id: 'codex:' + m.model, provider: 'codex', model: m.model,
            label: 'Codex · ' + (m.displayName || m.model), isDefault: m.isDefault === true,
            supportsImages: !Array.isArray(m.inputModalities) || m.inputModalities.includes('image'),
          });
        }
        if (result.nextCursor) list(result.nextCursor);
        else if (models.size) finish(null, [...models.values()]);
        else finish(new Error('Empty Codex model list'));
      }
    });
    request('initialize', { clientInfo: { name: 'meetcoder', version: '1.0.0' } });
  });
}

async function probe(provider, cli, cwd) {
  const name = names[provider];
  if (!cli.findOnPath(provider)) {
    return { models: [], status: 'missing', detail: `Telepítsd a terminálból elérhető ${name} parancssori programot.` };
  }
  try {
    let models;
    if (provider === 'opencode') {
      const r = await cli.run(provider, ['--version'], { cwd, timeoutMs });
      const version = /^(?:opencode\s+)?v?(\d+)\.\d+\.\d+(?:[-+]\S*)?\s*$/im.exec(r.out.trim());
      const major = version && Number(version[1]);
      if (r.code !== 0 || ![1, 2].includes(major)) {
        return { models: [], status: 'unavailable', detail: 'A használathoz az OpenCode CLI 1-es vagy 2-es verziója szükséges.' };
      }
      models = [{ id: 'opencode:default', provider, model: '', label: 'OpenCode', openCodeMajor: major }];
    } else if (provider === 'claude') {
      const r = await cli.run(provider, ['auth', 'status', '--json'], { cwd, timeoutMs });
      const auth = JSON.parse(r.out);
      if (typeof auth?.loggedIn !== 'boolean' || (r.code !== 0 && auth.loggedIn)) throw new Error('Claude probe failed');
      models = claudeModels(auth);
    } else {
      models = await codexModels(cli, cwd);
    }
    if (models.length) return { models, status: 'ready', detail: '' };
    const login = provider === 'claude' ? 'claude auth login' : 'codex login';
    return { models: [], status: 'sign-in', detail: `Jelentkezz be előfizetéses fiókkal a terminálban (${login}).` };
  } catch {
    return { models: [], status: 'unavailable', detail: `${name} nem elérhető. Frissítsd a modelllistát.` };
  }
}

async function discover(cli = Shell) {
  const providers = {};
  const models = [];
  const keys = Object.keys(names);
  const results = await Promise.all(keys.map(key => probe(key, cli, Paths.support)));
  for (const [i, { status, detail, models: choices }] of results.entries()) {
    providers[keys[i]] = { status, detail };
    models.push(...choices);
  }
  return { models, providers };
}

function resolve(preference, catalog) {
  const models = catalog?.models || [];
  const fallback = models.find(m => m.provider === 'opencode') || null;
  if (preference && preference !== 'auto') return models.find(m => m.id === preference) || fallback;
  return models.find(m => m.id === 'claude:sonnet')
    || models.find(m => m.provider === 'codex' && m.isDefault)
    || models.find(m => m.provider === 'codex')
    || fallback;
}

module.exports = { discover, resolve };
