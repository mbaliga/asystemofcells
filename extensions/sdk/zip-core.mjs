// Clackpad .cpx (zip) writer, PURE (no Node APIs). Shared by pack.mjs (Node, deflated) and the browser Extension Studio
// (stored, or deflated through CompressionStream). The header layout is exactly what pack.mjs always wrote, so a package built
// here with the same compressor is byte-for-byte the same file (extensions/build.sh --check depends on that).
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/**
 * entries: [{ name, data: Uint8Array }] in the order they should appear.
 * deflate: optional (Uint8Array) => Uint8Array raw-deflate; without it entries are stored (method 0).
 * Returns the zip as a Uint8Array.
 */
export function buildZip(entries, deflate) {
  const enc = new TextEncoder();
  const parts = []; const central = []; let offset = 0;
  const u16 = (dv, o, v) => dv.setUint16(o, v, true); const u32 = (dv, o, v) => dv.setUint32(o, v >>> 0, true);
  for (const { name, data } of entries) {
    const method = deflate ? 8 : 0;
    const comp = deflate ? deflate(data) : data;
    const nb = enc.encode(name); const crc = crc32(data);
    const lh = new Uint8Array(30); const l = new DataView(lh.buffer);
    u32(l, 0, 0x04034b50); u16(l, 4, 20); u16(l, 6, 0x0800); u16(l, 8, method); u16(l, 10, 0); u16(l, 12, 0x21);
    u32(l, 14, crc); u32(l, 18, comp.length); u32(l, 22, data.length); u16(l, 26, nb.length);
    parts.push(lh, nb, comp);
    const ch = new Uint8Array(46); const c = new DataView(ch.buffer);
    u32(c, 0, 0x02014b50); u16(c, 4, (3 << 8) | 20); u16(c, 6, 20); u16(c, 8, 0x0800); u16(c, 10, method);
    u16(c, 12, 0); u16(c, 14, 0x21); u32(c, 16, crc); u32(c, 20, comp.length); u32(c, 24, data.length); u16(c, 28, nb.length);
    u32(c, 38, (0o100644 << 16) >>> 0); u32(c, 42, offset);
    central.push(ch, nb);
    offset += 30 + nb.length + comp.length;
  }
  let cdLen = 0; for (const p of central) cdLen += p.length;
  const end = new Uint8Array(22); const e = new DataView(end.buffer);
  u32(e, 0, 0x06054b50); u16(e, 8, entries.length); u16(e, 10, entries.length); u32(e, 12, cdLen); u32(e, 16, offset);
  const all = [...parts, ...central, end];
  let total = 0; for (const p of all) total += p.length;
  const out = new Uint8Array(total); let o = 0;
  for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}

/** Sort like pack.mjs always has: by name, locale compare. */
export const sortEntries = (entries) => entries.slice().sort((a, b) => a.name.localeCompare(b.name));
