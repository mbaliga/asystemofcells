#!/usr/bin/env node
// Validate every extension folder, pack it deterministically into dist/<id>-<version>.cpx and regenerate index.json.
//   node tools/build.mjs [app]            write dist/ and index.json
//   node tools/build.mjs [app] --check    change nothing; exit 1 if dist/ or index.json is out of date
// `app` is a sub-folder holding catalog.json + the extension folders (the website repo keeps one per app: extensions/clackpad/).
// Without it the folder above tools/ is the app (the layout used inside the Clackpad repo).
// The SDK (validate.mjs, pack.mjs) is found in $CLACKPAD_SDK, ./sdk, or ../clackpad/extensions-sdk (inside the Clackpad repo).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const toolsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const root = appArg ? path.join(toolsRoot, appArg) : toolsRoot;
if (!fs.existsSync(path.join(root, 'catalog.json'))) { console.error(`no catalog.json in ${root}`); process.exit(2); }
const check = process.argv.includes('--check');
const sdk = [process.env.CLACKPAD_SDK, path.join(toolsRoot, 'sdk'), path.join(toolsRoot, '..', 'clackpad', 'extensions-sdk')]
  .filter(Boolean).find((d) => fs.existsSync(path.join(d, 'validate.mjs')) && fs.existsSync(path.join(d, 'pack.mjs')));
if (!sdk) { console.error('Clackpad SDK not found: set CLACKPAD_SDK or run ./build.sh --vendor-sdk'); process.exit(2); }
const { validatePath } = await import(pathToFileURL(path.join(sdk, 'validate.mjs')).href);
const { zipFolder } = await import(pathToFileURL(path.join(sdk, 'pack.mjs')).href);

const permTable = JSON.parse(fs.readFileSync(path.join(toolsRoot, 'tools', 'permissions.json'), 'utf8')).permissions;
const CATEGORIES = ['typing', 'writing', 'productivity', 'appearance', 'accessibility', 'developer'];
const describePerm = (id) => {
  const hit = permTable.find((p) => p.match === id) || (id.startsWith('net:') ? permTable.find((p) => p.match === 'net:*') : null);
  if (!hit) return { id, label: id, risk: 'high', summary: 'Unknown permission.' };
  return { id, label: id.startsWith('net:') ? `Talk to ${id.slice(4)}` : hit.label, risk: hit.risk, summary: hit.summary };
};
const parseChangelog = (text) => {
  const out = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const [head, ...rest] = block.split('\n');
    out.push({ version: head.trim(), notes: rest.map((l) => l.replace(/^\s*[-*]\s+/, '').trim()).filter(Boolean) });
  }
  return out;
};
const storeEntries = [];
const src = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json'), 'utf8'));
const dist = path.join(root, 'dist');
const problems = [];
const entries = [];
const wanted = new Set();

for (const e of src.extensions) {
  const dir = path.join(root, e.dir);
  const errs = validatePath(dir);
  if (errs.length) { problems.push(`${e.dir}: ${errs.join('; ')}`); continue; }
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'extension.json'), 'utf8'));
  const buf = zipFolder(dir);
  const file = `${m.id}-${m.version}.cpx`;
  wanted.add(file);
  const again = validatePath(Buffer.isBuffer(buf) ? writeTemp(buf) : '');
  if (again.length) problems.push(`${e.dir}: packed file fails validation: ${again.join('; ')}`);
  const target = path.join(dist, file);
  if (check) {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(buf)) problems.push(`dist/${file} is out of date: run ./build.sh`);
  } else {
    fs.mkdirSync(dist, { recursive: true });
    fs.writeFileSync(target, buf);
  }
  entries.push({
    id: m.id, name: m.name, version: m.version, author: m.author, description: m.description,
    permissions: m.permissions || [], package: `${src.base}/dist/${file}`,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    homepage: m.homepage, status: e.status, noncommercial: e.noncommercial, minClackpad: m.minClackpad,
    // Optional listing fields (the app ignores any it does not know): category, up to 5 short tags, package size, icon URL.
    category: e.category, tags: (e.tags || []).slice(0, 5), size: buf.length,
    icon: m.icon ? `${src.base}/${e.dir}/${m.icon}` : undefined,
  });
  if (!CATEGORIES.includes(e.category)) problems.push(`${e.dir}: catalog.json needs "category", one of ${CATEGORIES.join(', ')}`);
  const shots = (e.screenshots || []).map((rel) => {
    if (!fs.existsSync(path.join(root, rel))) problems.push(`${e.dir}: screenshot ${rel} does not exist`);
    return `${src.base}/${rel}`;
  });
  const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return ''; } };
  storeEntries.push({
    id: m.id, name: m.name, version: m.version, author: m.author, summary: m.description,
    category: e.category, tags: e.tags || [], status: e.status, noncommercial: !!e.noncommercial, license: m.license || null,
    minAppVersionCode: m.minClackpad, homepage: m.homepage || null,
    permissions: (m.permissions || []).map(describePerm),
    icon: m.icon ? `${src.base}/${e.dir}/${m.icon}` : null,
    screenshots: shots,
    readme: read('README.md').slice(0, 8000),
    changelog: parseChangelog(read('CHANGELOG.md')),
    package: `${src.base}/dist/${file}`, size: buf.length, sha256: entries[entries.length - 1].sha256,
  });
  console.log(`${e.dir}: ${file}  ${buf.length} bytes  sha256 ${entries[entries.length - 1].sha256}`);
}
if (problems.length) { for (const p of problems) console.error(`  - ${p}`); process.exit(1); }

entries.sort((a, b) => a.id.localeCompare(b.id));
const indexPath = path.join(root, 'index.json');
let updated = src.updated;
try { // keep the old date while nothing in the list changed, so rebuilding is idempotent
  const old = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (JSON.stringify(old.extensions) === JSON.stringify(entries)) updated = old.updated;
} catch { /* first build */ }
const storePath = path.join(root, 'store.json');
storeEntries.sort((a, b) => a.id.localeCompare(b.id));
const store = { schema: 'asoc-extension-store/1', app: src.app, name: src.name, updated, extensions: storeEntries };
const storeText = JSON.stringify(store, null, 2) + '\n';
const index = { schema: 'clackpad-catalog/1', name: src.name, updated, extensions: entries };
const text = JSON.stringify(index, null, 2) + '\n';
if (check) {
  if (!fs.existsSync(indexPath) || fs.readFileSync(indexPath, 'utf8') !== text) { console.error('  - index.json is out of date: run ./build.sh'); process.exit(1); }
  if (!fs.existsSync(storePath) || fs.readFileSync(storePath, 'utf8') !== storeText) { console.error('  - store.json is out of date: run the build'); process.exit(1); }
  console.log('OK  dist/, index.json and store.json are up to date');
} else {
  fs.writeFileSync(indexPath, text);
  fs.writeFileSync(storePath, storeText);
  console.log(`wrote index.json (${entries.length} extensions)`);
}

function writeTemp(buf) {
  const p = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'cpx-build-')), 'x.cpx');
  fs.writeFileSync(p, buf);
  return p;
}
