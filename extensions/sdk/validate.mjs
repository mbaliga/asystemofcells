#!/usr/bin/env node
// Clackpad extension validator. Zero dependencies.
//   node validate.mjs <folder | file.cpx> [--host-version N] [--json]
// Checks extension.json against the same rules the app enforces at install (docs/EXTENSIONS.md) and, for a folder or
// package, the package limits (size, entries, traversal, symlinks, native code, referenced files).
// The rules themselves live in validate-core.mjs (shared with the browser Extension Studio); this file adds the Node
// file reading (folder, zip) and the command line.
// Exit 0 = valid, 1 = errors (each printed with the path of the offending field), 2 = usage.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { LIMITS, nameProblem, looksLikeCode, validateFiles } from './validate-core.mjs';
export { LIMITS, FORBIDDEN_EXT, URI_SCHEMES, FIXED_PERMS, validateManifest, validateFiles } from './validate-core.mjs';

/** Read a zip from a Buffer into Map(name -> Buffer), enforcing the same limits as the app. Throws Error with a readable message. */
export function readZip(buf) {
  if (buf.length > LIMITS.packageBytes) throw new Error('package is larger than 5 MB');
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const total = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16);
  if (total === 0xffff || cdOff === 0xffffffff) throw new Error('Zip64 packages are not accepted');
  if (total > LIMITS.entries) throw new Error(`more than ${LIMITS.entries} entries`);
  if (total === 0) throw new Error('package is empty');
  if (cdOff + cdSize > eocd) throw new Error('corrupt zip directory');
  const out = new Map(); const seen = new Set(); let declared = 0; let p = cdOff; let budget = LIMITS.unpackedBytes;
  for (let n = 0; n < total; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt zip directory');
    const madeBy = buf.readUInt16LE(p + 4), flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const ext = buf.readUInt32LE(p + 38), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    if (flags & 1) throw new Error('encrypted entries are not accepted');
    if (method !== 0 && method !== 8) throw new Error(`"${name}" uses an unsupported compression method`);
    if ((madeBy >> 8) === 3 && ((ext >>> 16) & 0xf000) === 0xa000) throw new Error(`"${name}" is a symbolic link`);
    const isDir = name.endsWith('/');
    const why = nameProblem(name, isDir); if (why) throw new Error(`"${name.slice(0, 60)}" ${why}`);
    if (seen.has(name.toLowerCase())) throw new Error(`"${name}" appears twice`); seen.add(name.toLowerCase());
    if (usize > LIMITS.entryBytes) throw new Error(`"${name}" is larger than 5 MB unpacked`);
    declared += usize; if (declared > LIMITS.unpackedBytes) throw new Error('package unpacks to more than 16 MB');
    if (isDir) continue;
    if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error('corrupt zip directory');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const raw = buf.subarray(start, start + csize);
    const data = method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw, { maxOutputLength: Math.min(usize, budget) + 1 });
    if (data.length > usize) throw new Error(`"${name}" unpacks to more than its declared size`);
    budget -= data.length;
    if (looksLikeCode(data)) throw new Error(`"${name}" contains native or Dalvik code, which extensions may never ship`);
    out.set(name, data);
  }
  return out;
}

function readFolder(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name); const rel = path.relative(dir, full).split(path.sep).join('/');
      if (e.name.startsWith('.') && e.name !== '.') continue;
      if (e.isSymbolicLink()) throw new Error(`"${rel}" is a symbolic link`);
      if (e.isDirectory()) walk(full);
      else { const why = nameProblem(rel, false); if (why) throw new Error(`"${rel}" ${why}`); out.set(rel, fs.readFileSync(full)); }
    }
  };
  walk(dir);
  if (out.size > LIMITS.entries) throw new Error(`more than ${LIMITS.entries} entries`);
  for (const [n, d] of out) { if (looksLikeCode(d)) throw new Error(`"${n}" contains native or Dalvik code`); if (d.length > LIMITS.entryBytes) throw new Error(`"${n}" is larger than 5 MB`); }
  return out;
}

export function validatePath(target, opts = {}) {
  let files;
  try { files = fs.statSync(target).isDirectory() ? readFolder(target) : readZip(fs.readFileSync(target)); }
  catch (e) { return [e.message]; }
  return validateFiles(files, opts);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--host-version');
  if (!target) { console.error('usage: node validate.mjs <folder | file.cpx> [--host-version N] [--json]'); process.exit(2); }
  const hi = args.indexOf('--host-version');
  const errors = validatePath(target, hi >= 0 ? { hostVersion: Number(args[hi + 1]) } : {});
  if (args.includes('--json')) console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
  else if (errors.length === 0) console.log(`OK  ${target}`);
  else { console.error(`${errors.length} problem${errors.length === 1 ? '' : 's'} in ${target}:`); for (const e of errors) console.error(`  - ${e}`); }
  process.exit(errors.length === 0 ? 0 : 1);
}
