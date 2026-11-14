#!/usr/bin/env node
// Scaffold a new Clackpad extension from a starter template. Zero dependencies.
//   node create.mjs <hello|theme> <folder> --id com.you.name [--name "Name"] [--author "You"] [--description "One sentence."]
// Copies the template, fills in the identity, drops the template's translations (they describe the template, not your extension),
// then validates the result so you start from a package that passes. The id is permanent (docs/EXTENSIONS.md): pick it once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePath, validateManifest } from './validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const templates = fs.readdirSync(path.join(here, 'templates'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

/** Copies [template] into [dir] and rewrites extension.json. Returns the validator's problems (empty = valid). Throws on usage errors. */
export function scaffold({ template, dir, id, name, author, description }) {
  if (!templates.includes(template)) throw new Error(`unknown template "${template}" (have: ${templates.join(', ')})`);
  if (!id) throw new Error('--id is required, e.g. --id com.you.myextension');
  // Ask the validator's own rule about the id before copying anything (one rule, not a second regex here).
  const probe = validateManifest({ schema: 'clackpad-extension/1', id });
  const idProblem = (Array.isArray(probe) ? probe : probe.errors).find((e) => e.startsWith('id:'));
  if (idProblem) throw new Error(idProblem);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${dir} already exists and is not empty`);
  fs.cpSync(path.join(here, 'templates', template), dir, { recursive: true });
  const file = path.join(dir, 'extension.json');
  const m = JSON.parse(fs.readFileSync(file, 'utf8'));
  m.id = id;
  m.name = name || id.split('.').pop().replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase());
  m.version = '1.0.0';
  if (author) m.author = author;
  if (description) m.description = description;
  delete m.homepage; delete m.i18n;
  fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
  return validatePath(dir);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : undefined; };
  const pos = a.filter((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--')));
  const [template, dir] = pos;
  if (!template || !dir) { console.error(`usage: node create.mjs <${templates.join('|')}> <folder> --id com.you.name [--name N] [--author A] [--description D]`); process.exit(2); }
  try {
    const problems = scaffold({ template, dir, id: opt('id'), name: opt('name'), author: opt('author'), description: opt('description') });
    console.log(`created ${dir} from the "${template}" template`);
    if (problems.length) { console.error(`${problems.length} problem(s) to fix before it will install:`); for (const p of problems) console.error(`  - ${p}`); }
    console.log(`next: edit ${path.join(dir, 'extension.json')}, then  node validate.mjs ${dir}  and  node pack.mjs ${dir}`);
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(2); }
}
