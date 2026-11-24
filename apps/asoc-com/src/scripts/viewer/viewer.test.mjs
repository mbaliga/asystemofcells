import { test } from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { FORMATS, WALLS, extOf, kindForExt, opens, editable } from './formats.js'
import { sniff, looksLikeText } from './sniff.js'
import { listZip, readEntry } from './zip.js'
import { parseCsv, toCsv, formatJson, minifyJson, officeText, hexDump, humanSize } from './textkit.js'

test('extension to kind', () => {
  assert.equal(extOf('Holiday.JPG'), 'jpg')
  assert.equal(extOf('noext'), '')
  assert.equal(kindForExt('apk'), 'zip')
  assert.equal(kindForExt('heic'), 'hex')
  assert.equal(opens('heic'), false)
  assert.equal(editable('image'), true)
  assert.equal(editable('pdf'), false)
  assert.ok(Object.keys(FORMATS).length > 60)
  for (const w of Object.values(WALLS)) assert.equal(new Set(w).size, w.length)
})

test('sniff beats a wrong extension', () => {
  assert.equal(sniff(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10])).ext, 'png')
  assert.equal(sniff(new TextEncoder().encode('%PDF-1.7')).ext, 'pdf')
  const heic = new Uint8Array(16); heic.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]); assert.equal(sniff(heic).ext, 'heic')
  assert.equal(sniff(new Uint8Array([1, 2, 3, 4])), null)
  assert.equal(looksLikeText(new TextEncoder().encode('hello\nworld')), true)
  assert.equal(looksLikeText(Uint8Array.from([0, 1, 2, 3, 4])), false)
})

function makeZip(files) {
  const parts = [], central = []
  let off = 0
  for (const [name, data, method] of files) {
    const nb = Buffer.from(name), raw = Buffer.from(data)
    const comp = method === 8 ? zlib.deflateRawSync(raw) : raw
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(method, 8); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nb.length, 26)
    parts.push(h, nb, comp)
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(method, 10); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42)
    central.push(c, nb)
    off += h.length + nb.length + comp.length
  }
  const cd = Buffer.concat(central)
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16)
  return new Uint8Array(Buffer.concat([...parts, cd, e]))
}

test('zip lists and reads stored and deflated entries', async () => {
  const z = makeZip([['a.txt', 'hello', 0], ['dir/b.txt', 'world '.repeat(50), 8]])
  const es = listZip(z)
  assert.deepEqual(es.map((e) => e.name), ['a.txt', 'dir/b.txt'])
  assert.equal(new TextDecoder().decode(await readEntry(z, es[0])), 'hello')
  assert.equal(new TextDecoder().decode(await readEntry(z, es[1])), 'world '.repeat(50))
})

test('zip refuses junk and implausible ratios', async () => {
  assert.throws(() => listZip(new Uint8Array(40)), /not a readable ZIP/i)
  await assert.rejects(readEntry(new Uint8Array(100), { csize: 1, usize: 5e6, method: 8, offset: 0 }), /ratio/)
  await assert.rejects(readEntry(new Uint8Array(100), { csize: 1, usize: 1, method: 8, offset: 0, encrypted: true }), /password/)
})

test('csv round-trips quotes, commas and newlines', () => {
  const rows = [['a', 'b,c', 'd"e'], ['1', 'x\ny', '']]
  assert.deepEqual(parseCsv(toCsv(rows)), rows)
  assert.deepEqual(parseCsv('a\tb\n1\t2', '\t'), [['a', 'b'], ['1', '2']])
})

test('json format, minify, error', () => {
  assert.equal(formatJson('{"a":[1,2]}').text, '{\n  "a": [\n    1,\n    2\n  ]\n}\n')
  assert.equal(minifyJson('{ "a" : 1 }').text, '{"a":1}')
  assert.equal(formatJson('{oops').ok, false)
})

test('office text extraction', () => {
  assert.equal(officeText('<w:p><w:r><w:t>Hi &amp; bye</w:t></w:r></w:p><w:p><w:r><w:t>Two</w:t></w:r></w:p>', 'docx'), 'Hi & bye\nTwo')
  assert.equal(officeText('<text:h text:outline-level="1">Title</text:h><text:p>Body</text:p>', 'odt'), 'Title\nBody')
})

test('hex dump and sizes', () => {
  assert.equal(hexDump(new TextEncoder().encode('AB')), `00000000  ${'41 42'.padEnd(47)}  AB`)
  assert.equal(humanSize(1536), '1.5 KB')
})
