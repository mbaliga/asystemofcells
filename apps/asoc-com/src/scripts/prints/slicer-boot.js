// The only script on /prints/slicer until a file is chosen: a drop zone and a lazy import.
const input = document.getElementById('file'), drop = document.getElementById('drop')
let started = false
async function go(file) {
  if (!file) return
  if (started) { (await import('./slicer-app.js')).start(file); return }
  started = true
  drop.setAttribute('aria-busy', 'true')
  const app = await import('./slicer-app.js') // three.js and the Worker load now, not before
  document.getElementById('app').hidden = false
  app.start(file)
}
input.addEventListener('change', () => go(input.files[0]))
for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over') })
for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over') })
drop.addEventListener('drop', (e) => go(e.dataTransfer.files[0]))
