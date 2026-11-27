'use strict';
// Read-only MCP tools for Codex when the app has disabled shell execution.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const excluded = /^(?:\.|node_modules$|vendor$|bin$|obj$|dist$|build$|coverage$)|\.(?:pem|key|pfx|p12)$/i;
const source = /\.(?:[cm]?[jt]sx?|cs|csproj|slnx?|razor|cshtml|php|html?|css|scss|sass|less|vue|svelte|json|md|txt|xml|ya?ml|toml|sql|prisma|graphql|resx|props|targets)$/i;
const tools = [
  { name: 'list_directory', description: 'List source files and subdirectories at a project-relative path.' },
  { name: 'read_file', description: 'Read one UTF-8 project source file at a relative path.' },
].map(tool => ({ ...tool, inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } }));

function readProject(root, name, input) {
  if (typeof input !== 'string' || path.isAbsolute(input) || /[:\x00]/.test(input)) throw Error('Use a project-relative path.');
  const parts = input.split(/[\\/]/).filter(part => part && part !== '.');
  if (parts.some(part => excluded.test(part))) throw Error('This path is excluded.');
  const requested = path.join(root, ...parts);
  const target = fs.realpathSync(requested);
  if (path.relative(requested, target) !== '') throw Error('Linked paths are excluded.');
  if (name === 'list_directory') {
    return fs.readdirSync(target, { withFileTypes: true })
      .filter(e => !excluded.test(e.name) && (e.isDirectory() || (e.isFile() && source.test(e.name))))
      .slice(0, 500).map(e => e.name + (e.isDirectory() ? '/' : '')).join('\n');
  }
  if (name !== 'read_file' || !source.test(target)) throw Error('Select a project source file.');
  const file = fs.statSync(target);
  if (!file.isFile() || file.size > 256 * 1024) throw Error('Select a source file under 256 KiB.');
  const text = fs.readFileSync(target, 'utf8');
  if (text.includes('\0')) throw Error('Binary files are excluded.');
  return text;
}

if (require.main === module) {
  const root = fs.realpathSync(process.argv[2]);
  readline.createInterface({ input: process.stdin }).on('line', line => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.id == null) return;
    const reply = { jsonrpc: '2.0', id: msg.id };
    switch (msg.method) {
      case 'initialize':
        reply.result = { protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'MeetCoder', version: '1.0' } };
        break;
      case 'ping': reply.result = {}; break;
      case 'tools/list': reply.result = { tools }; break;
      case 'tools/call': {
        let text, isError = false;
        try { text = readProject(root, msg.params.name, msg.params.arguments.path); }
        catch (e) { isError = true; text = e.message; }
        reply.result = { content: [{ type: 'text', text }], isError };
        break;
      }
      default: reply.error = { code: -32601, message: 'Unknown method' };
    }
    process.stdout.write(JSON.stringify(reply) + '\n');
  });
}

module.exports = { readProject };
