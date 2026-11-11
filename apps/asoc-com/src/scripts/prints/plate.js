// The plate preview (07 §2). Three.js is imported here and only here, and this module is only
// imported after a model is dropped. Z is up, units are mm, the plate is z = 0.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const GREY = 0x6f7d86 // outside the volume (owner's rule)

export function createPlate(canvas, { volume = { x: 180, y: 180, z: 180 }, dark = true } = {}) {
  const ground = dark ? 0x07070a : 0xf2f2f4
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(ground)
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(ground, 380, 900) // geometry dissolves into the ground: no horizon
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 3000)
  camera.up.set(0, 0, 1)
  const target = new THREE.Vector3(volume.x / 2, volume.y / 2, volume.z / 3)
  camera.position.set(volume.x * 1.55, -volume.y * 1.2, volume.z * 1.1)
  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(target); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495
  controls.update()

  // upper-left key light plus a soft fill
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-200, -260, 420); scene.add(key)
  scene.add(new THREE.HemisphereLight(0xb8c0c8, ground, 0.9))

  const matte = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 })
  // the plate, and the A1 mini as a low-poly grey silhouette made of boxes
  const bed = new THREE.Mesh(new THREE.BoxGeometry(volume.x, volume.y, 3), matte(dark ? 0x1b1d21 : 0xd5d7da)); bed.position.set(volume.x / 2, volume.y / 2, -1.5); scene.add(bed)
  const frame = new THREE.Group()
  const box = (w, d, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), matte(c)); m.position.set(x, y, z); frame.add(m) }
  box(volume.x + 40, volume.y + 40, 14, volume.x / 2, volume.y / 2 + 6, -10, dark ? 0x2a2d33 : 0xbfc2c7)
  box(14, 14, volume.z * 1.25, -14, volume.y / 2, volume.z * 0.6, dark ? 0x30343a : 0xb2b6bb)
  box(14, 14, volume.z * 1.25, volume.x + 14, volume.y / 2, volume.z * 0.6, dark ? 0x30343a : 0xb2b6bb)
  box(volume.x + 42, 16, 14, volume.x / 2, volume.y / 2, volume.z * 0.78, dark ? 0x353a41 : 0xa9adb3)
  scene.add(frame)
  // the printable volume's outline
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(volume.x, volume.y, volume.z)), new THREE.LineBasicMaterial({ color: dark ? 0x59616a : 0x8a9099 }))
  outline.position.set(volume.x / 2, volume.y / 2, volume.z / 2); scene.add(outline)

  let mesh = null, inside = true, colour = 0xd9d9d6
  const apply = () => {
    if (!mesh) return
    mesh.material.color.setHex(inside ? colour : GREY)
    mesh.material.transparent = !inside; mesh.material.opacity = inside ? 1 : 0.6; mesh.material.needsUpdate = true
  }
  const resize = () => {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 400
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize()

  let raf = 0, running = true
  const loop = () => { raf = requestAnimationFrame(loop); if (!running) return; controls.update(); renderer.render(scene, camera) }
  const io = new IntersectionObserver((e) => { running = e[0].isIntersecting }); io.observe(canvas)
  loop()

  return {
    /** pos: Float32Array triangle soup, mm, already on the plate. */
    setModel(pos, fitsVolume, hex) {
      if (mesh) { mesh.geometry.dispose(); mesh.material.dispose(); scene.remove(mesh) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals()
      mesh = new THREE.Mesh(g, matte(0xffffff)); inside = fitsVolume; if (hex != null) colour = hex
      scene.add(mesh); apply()
    },
    setFits(f) { inside = f; apply() },
    setColour(hex) { colour = hex; apply() },
    recentre() { controls.target.copy(target); camera.position.set(volume.x * 1.55, -volume.y * 1.2, volume.z * 1.1); controls.update() },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose() },
    webgl: true,
  }
}

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}
