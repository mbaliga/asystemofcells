#!/usr/bin/env node
// Pack an extension folder into a .cpx (a zip) and print its size and sha256. Zero dependencies.
//   node pack.mjs <folder> [out.cpx]
// Validates first (same rules as validate.mjs) and refuses to write an invalid package.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validatePath } from './validate.mjs';
import { buildZip } from './zip-core.mjs';

export function zipFolder(dir) {
  const entries = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { if (e.name.startsWith('.')) continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else entries.push({ name: path.relative(dir, f).split(path.sep).join('/'), data: fs.readFileSync(f) }); } };
  walk(dir);
  return Buffer.from(buildZip(entries, (data) => zlib.deflateRawSync(data, { level: 9 })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, outArg] = process.argv.slice(2);
  if (!dir) { console.error('usage: node pack.mjs <folder> [out.cpx]'); process.exit(2); }
  const errors = validatePath(dir);
  if (errors.length) { console.error(`not packing: ${errors.length} problem(s)`); for (const e of errors) console.error(`  - ${e}`); process.exit(1); }
  const id = JSON.parse(fs.readFileSync(path.join(dir, 'extension.json'), 'utf8'));
  const out = outArg || `${id.id}-${id.version}.cpx`;
  const buf = zipFolder(dir);
  if (buf.length > 5 * 1024 * 1024) { console.error('package is larger than 5 MB'); process.exit(1); }
  fs.writeFileSync(out, buf);
  const again = validatePath(out);
  if (again.length) { console.error('packed file failed validation:', again); process.exit(1); }
  console.log(`${out}  ${buf.length} bytes\nsha256 ${crypto.createHash('sha256').update(buf).digest('hex')}`);
}
