// A small ZIP reader for the viewer: list entries, read one. Stored and
// deflate only (the two methods nearly every zip uses). ZIP64 and encrypted
// entries are reported, not opened. Inflation uses the browser's native
// DecompressionStream, so there is no library.

export const MAX_ENTRY_BYTES = 256 * 1024 * 1024
export const MAX_RATIO = 1000

const u16 = (d, o) => d.getUint16(o, true)
const u32 = (d, o) => d.getUint32(o, true)

export function listZip(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // End of central directory: scan back through the comment (max 65535 bytes).
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(d, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Not a readable ZIP: no end-of-archive record.')
  const count = u16(d, eocd + 10)
  const size = u32(d, eocd + 12)
  const start = u32(d, eocd + 16)
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) throw new Error('ZIP64 archives are not supported here.')
  const entries = []
  let p = start
  const dec = new TextDecoder('utf-8')
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || u32(d, p) !== 0x02014b50) throw new Error('Corrupt ZIP directory.')
    const flags = u16(d, p + 8)
    const method = u16(d, p + 10)
    const csize = u32(d, p + 20)
    const usize = u32(d, p + 24)
    const nlen = u16(d, p + 28)
    const xlen = u16(d, p + 30)
    const clen = u16(d, p + 32)
    const offset = u32(d, p + 42)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen))
    entries.push({ name, method, csize, usize, offset, encrypted: (flags & 1) === 1, dir: name.endsWith('/') })
    p += 46 + nlen + xlen + clen
  }
  return entries
}

export async function readEntry(buf, entry) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  if (entry.encrypted) throw new Error('This entry is password-protected.')
  if (entry.usize > MAX_ENTRY_BYTES) throw new Error('Entry is too large to open here.')
  if (entry.csize > 0 && entry.usize / entry.csize > MAX_RATIO) throw new Error('Entry refused: compression ratio is implausibly high.')
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const o = entry.offset
  if (o + 30 > bytes.length || u32(d, o) !== 0x04034b50) throw new Error('Corrupt ZIP entry header.')
  const dataStart = o + 30 + u16(d, o + 26) + u16(d, o + 28)
  const raw = bytes.subarray(dataStart, dataStart + entry.csize)
  if (entry.method === 0) return raw.slice()
  if (entry.method !== 8) throw new Error(`Compression method ${entry.method} is not supported.`)
  const out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
  if (out.byteLength > MAX_ENTRY_BYTES) throw new Error('Entry is too large to open here.')
  return new Uint8Array(out)
}
