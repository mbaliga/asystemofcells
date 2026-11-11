// Runs off the main thread: parse -> place -> estimate. The Worker keeps the placed mesh so the page
// never re-sends it. Messages in:
//   { type:'load', buf, name, volume }          parse and place a model
//   { type:'transform', op, factor?, volume }   'layFlat' | 'rotate' | 'scale'
//   { type:'estimate', id, settings, calibration? }
import { parseModel, ParseError } from './parse.js'
import { placeOnPlate, layFlat, rotateZ, scaled, bbox, fits, scaleToFit } from './place.js'
import { meshStats, estimatePrint, DEFAULT_SETTINGS } from './estimate.js'

const DEFAULT_VOLUME = { x: 180, y: 180, z: 180 }
let held = null // placed mesh, mm, on the plate

function publish(type, ext, volume) {
  const copy = held.slice()
  self.postMessage({ type, pos: copy, ext, tris: held.length / 9, bbox: bbox(held), fits: fits(held, volume), fitScale: scaleToFit(held, volume) }, [copy.buffer])
}

self.onmessage = async (e) => {
  const m = e.data
  const volume = m.volume || DEFAULT_VOLUME
  try {
    if (m.type === 'load') {
      const { pos, ext } = await parseModel(m.buf, m.name)
      held = placeOnPlate(pos, volume)
      publish('loaded', ext, volume)
    } else if (m.type === 'transform' && held) {
      if (m.op === 'layFlat') held = layFlat(held)
      else if (m.op === 'rotate') held = rotateZ(held, 1)
      else if (m.op === 'scale' && m.factor > 0) held = scaled(held, m.factor)
      held = placeOnPlate(held, volume)
      publish('transformed', null, volume)
    } else if (m.type === 'estimate' && held) {
      const settings = { ...DEFAULT_SETTINGS, ...m.settings }
      const stats = meshStats(held, settings)
      self.postMessage({ type: 'estimated', id: m.id, stats: { volume: stats.volume, area: stats.area, height: stats.height, manifold: stats.manifold, overhangArea: stats.overhangArea, supportVolume: stats.supportVolume }, est: estimatePrint(stats, settings, m.calibration) })
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err instanceof ParseError ? err.message : 'That file could not be read.' })
  }
}
