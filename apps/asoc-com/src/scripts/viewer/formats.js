// What the file viewer can do, per extension. One registry: the viewer reads
// it to decide how to open a file, and the landing-page "wall" reads it to
// brighten the extensions that really open (the rest are shown dimmed, never
// promised). Pure data, no DOM.
//
// kind -> how it opens:
//   image   decoded by the browser; edit: rotate, flip, crop, resize, tone, re-save
//   svg     drawn as an image (scripts never run); source is editable
//   video / audio   the browser's own player (what plays depends on the browser)
//   pdf     the browser's own PDF viewer when it has one. No editing.
//   text    editable text. json and csv get small extra tools.
//   zip     archive listing; entries open in the viewer. docx/odt show their text only.
//   font    drawn with the font itself
//   hex     anything else: identified, then a hex dump. Never executed.

const row = (kind, exts) => exts.split(' ').map((e) => [e, kind])

export const FORMATS = Object.fromEntries([
  ...row('image', 'jpg jpeg jpe png gif webp avif bmp ico apng'),
  ...row('svg', 'svg'),
  ...row('video', 'mp4 m4v webm mov ogv'),
  ...row('audio', 'mp3 m4a aac wav ogg oga opus flac weba'),
  ...row('pdf', 'pdf'),
  ...row('text', 'txt md markdown log ini cfg conf toml yaml yml xml html htm css js mjs ts tsx jsx kt java py rb go rs c h cpp hpp sh bat ps1 sql gradle properties srt vtt tex rtf env gitignore'),
  ...row('json', 'json geojson jsonl webmanifest'),
  ...row('csv', 'csv tsv'),
  ...row('zip', 'zip jar apk aab xpi epub docx xlsx pptx odt ods odp'),
  ...row('font', 'ttf otf woff woff2'),
])

/** Extensions people meet that the viewer identifies but cannot render. */
export const IDENTIFIED_ONLY = 'heic heif dng cr2 cr3 nef arw raf orf rw2 raw tif tiff psd ai eps indd mkv avi wmv flv 3gp 7z rar tar gz tgz bz2 xz iso dmg exe dll so db sqlite sqlite3 bin dat obj stl 3mf fbx glb gltf'.split(' ')

export function extOf(name) {
  const m = /\.([A-Za-z0-9]+)$/.exec(String(name))
  return m ? m[1].toLowerCase() : ''
}

export function kindForExt(ext) {
  return FORMATS[ext] || 'hex'
}

export function opens(ext) {
  return Object.prototype.hasOwnProperty.call(FORMATS, ext)
}

/** Can the viewer change this file and hand back a changed copy? */
export function editable(kind) {
  return kind === 'image' || kind === 'svg' || kind === 'text' || kind === 'json' || kind === 'csv'
}

// The walls behind the Fotoz and Fylz landings. Order is only the drift order.
export const WALLS = {
  photo: 'jpg png heic gif webp avif raw dng cr2 nef arw tiff bmp svg ico mp4 mov mkv webm 3gp m4v avi mp3 wav flac m4a ogg psd xmp json csv zip'.split(' '),
  files: 'pdf docx xlsx pptx odt txt md csv json xml html css js py kt zip 7z rar tar gz apk aab epub iso jpg png heic mp4 mkv mp3 flac wav ttf otf db sqlite log yaml toml srt stl exe dmg'.split(' '),
}
