// Identify a file from its first bytes, so a wrong or missing extension does
// not decide how it is opened. Returns { ext, label } or null.
const A = (s) => [...s].map((c) => c.charCodeAt(0))
const at = (b, off, sig) => sig.every((v, i) => b[off + i] === v)

export function sniff(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (b.length < 4) return null
  if (at(b, 0, [0x89, 0x50, 0x4e, 0x47])) return { ext: 'png', label: 'PNG image' }
  if (at(b, 0, [0xff, 0xd8, 0xff])) return { ext: 'jpg', label: 'JPEG image' }
  if (at(b, 0, A('GIF8'))) return { ext: 'gif', label: 'GIF image' }
  if (at(b, 0, A('RIFF')) && at(b, 8, A('WEBP'))) return { ext: 'webp', label: 'WebP image' }
  if (at(b, 0, A('RIFF')) && at(b, 8, A('WAVE'))) return { ext: 'wav', label: 'WAV audio' }
  if (at(b, 0, A('RIFF')) && at(b, 8, A('AVI '))) return { ext: 'avi', label: 'AVI video' }
  if (at(b, 0, A('BM'))) return { ext: 'bmp', label: 'BMP image' }
  if (at(b, 0, [0, 0, 1, 0])) return { ext: 'ico', label: 'Icon' }
  if (at(b, 0, A('%PDF'))) return { ext: 'pdf', label: 'PDF document' }
  if (at(b, 0, A('PK\x03\x04')) || at(b, 0, A('PK\x05\x06'))) return { ext: 'zip', label: 'ZIP container' }
  if (at(b, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return { ext: '7z', label: '7-Zip archive' }
  if (at(b, 0, A('Rar!'))) return { ext: 'rar', label: 'RAR archive' }
  if (at(b, 0, [0x1f, 0x8b])) return { ext: 'gz', label: 'gzip data' }
  if (at(b, 0, A('OggS'))) return { ext: 'ogg', label: 'Ogg media' }
  if (at(b, 0, A('fLaC'))) return { ext: 'flac', label: 'FLAC audio' }
  if (at(b, 0, A('ID3')) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { ext: 'mp3', label: 'MP3 audio' }
  if (at(b, 0, [0x1a, 0x45, 0xdf, 0xa3])) return { ext: 'webm', label: 'Matroska / WebM video' }
  if (at(b, 4, A('ftyp'))) {
    const brand = String.fromCharCode(...b.slice(8, 12))
    if (/^(heic|heix|hevc|mif1|msf1|heim|heis)/.test(brand)) return { ext: 'heic', label: 'HEIC image' }
    if (brand === 'avif' || brand === 'avis') return { ext: 'avif', label: 'AVIF image' }
    if (brand === 'qt  ') return { ext: 'mov', label: 'QuickTime video' }
    if (/^(M4A|M4B)/.test(brand)) return { ext: 'm4a', label: 'MPEG-4 audio' }
    return { ext: 'mp4', label: 'MPEG-4 media' }
  }
  if (at(b, 0, A('wOFF'))) return { ext: 'woff', label: 'WOFF font' }
  if (at(b, 0, A('wOF2'))) return { ext: 'woff2', label: 'WOFF2 font' }
  if (at(b, 0, [0, 1, 0, 0]) || at(b, 0, A('true'))) return { ext: 'ttf', label: 'TrueType font' }
  if (at(b, 0, A('OTTO'))) return { ext: 'otf', label: 'OpenType font' }
  if (at(b, 0, A('SQLite format 3'))) return { ext: 'sqlite', label: 'SQLite database' }
  if (at(b, 0, [0x7f, 0x45, 0x4c, 0x46])) return { ext: 'elf', label: 'ELF executable' }
  if (at(b, 0, A('MZ'))) return { ext: 'exe', label: 'Windows executable' }
  if (at(b, 0, [0x49, 0x49, 0x2a, 0]) || at(b, 0, [0x4d, 0x4d, 0, 0x2a])) return { ext: 'tif', label: 'TIFF image (or a camera raw built on it)' }
  if (at(b, 0, A('8BPS'))) return { ext: 'psd', label: 'Photoshop document' }
  return null
}

/** True when the sample reads as UTF-8 text (no NULs, few control bytes). */
export function looksLikeText(bytes, limit = 8192) {
  const b = bytes.subarray(0, Math.min(bytes.length, limit))
  if (!b.length) return true
  let bad = 0
  for (const v of b) {
    if (v === 0) return false
    if (v < 9 || (v > 13 && v < 32)) bad++
  }
  if (bad / b.length > 0.02) return false
  try { new TextDecoder('utf-8', { fatal: true }).decode(b); return true } catch { return false }
}
