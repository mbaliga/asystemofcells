/*
 * Build-time loaders for the extension developer docs.
 *
 * Nothing here is copied by hand. The manifest reference, the permission table
 * and the catalog rules are all read from the files the tools themselves use,
 * so the pages cannot drift from them:
 *
 *   extensions/sdk/schemas/extension.schema.json   manifest schema
 *   extensions/sdk/schemas/catalog.schema.json     catalog entry schema
 *   extensions/tools/permissions.json              permission meanings and risk
 *   extensions/tools/build.mjs                     category list (parsed from source)
 */
import fs from 'node:fs'
import path from 'node:path'

function findExtensionsDir() {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'extensions')
    if (fs.existsSync(path.join(candidate, 'sdk', 'schemas', 'extension.schema.json'))) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('extensions-docs: could not find the repo extensions/ folder from ' + process.cwd())
}

const EXT = findExtensionsDir()
const read = (...p) => fs.readFileSync(path.join(EXT, ...p), 'utf8')

export const SOURCES = {
  extensionSchema: 'extensions/sdk/schemas/extension.schema.json',
  catalogSchema: 'extensions/sdk/schemas/catalog.schema.json',
  permissions: 'extensions/tools/permissions.json',
  build: 'extensions/tools/build.mjs',
}

export const rawExtensionSchema = () => read('sdk', 'schemas', 'extension.schema.json')
export const rawCatalogSchema = () => read('sdk', 'schemas', 'catalog.schema.json')
export const rawPermissions = () => read('tools', 'permissions.json')

export const extensionSchema = () => JSON.parse(rawExtensionSchema())
export const catalogSchema = () => JSON.parse(rawCatalogSchema())
export const permissionsTable = () => JSON.parse(rawPermissions())

/** The category list is a constant inside build.mjs; read it from there. */
export function categories() {
  const m = read('tools', 'build.mjs').match(/const CATEGORIES = \[([^\]]*)\]/)
  if (!m) throw new Error('extensions-docs: CATEGORIES not found in build.mjs')
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

export const statusValues = () => catalogSchema().$defs.entry.properties.status.enum

// ---------------------------------------------------------------- schema walk

const refName = (ref) => ref.replace('#/$defs/', '')

function resolve(node, schema) {
  if (node && node.$ref) {
    const base = schema.$defs[refName(node.$ref)]
    const { $ref, ...rest } = node
    return { ...base, ...rest }
  }
  return node || {}
}

/** One-line type description of a schema node. */
function typeOf(node, schema) {
  const n = resolve(node, schema)
  if (n.$ref) return refName(n.$ref)
  if (n.const !== undefined) return JSON.stringify(n.const)
  if (n.enum) return 'one of'
  if (n.type === 'array') {
    const it = n.items ? resolve(n.items, schema) : {}
    const inner = n.items && n.items.$ref ? refName(n.items.$ref) : it.enum ? 'enum' : it.type || 'any'
    return `${inner}[]`
  }
  if (n.oneOf && !n.type) return 'one of several shapes'
  return n.type || 'any'
}

/** Constraint strings copied from the schema keywords, never from memory. */
function constraintsOf(node, schema) {
  const n = resolve(node, schema)
  const out = []
  if (n.const !== undefined) out.push(`exactly ${JSON.stringify(n.const)}`)
  if (n.enum) out.push(n.enum.map((v) => JSON.stringify(v)).join(' | '))
  if (n.minLength !== undefined) out.push(`minLength ${n.minLength}`)
  if (n.maxLength !== undefined) out.push(`maxLength ${n.maxLength}`)
  if (n.minimum !== undefined) out.push(`minimum ${n.minimum}`)
  if (n.maximum !== undefined) out.push(`maximum ${n.maximum}`)
  if (n.minItems !== undefined) out.push(`minItems ${n.minItems}`)
  if (n.maxItems !== undefined) out.push(`maxItems ${n.maxItems}`)
  if (n.maxProperties !== undefined) out.push(`maxProperties ${n.maxProperties}`)
  if (n.uniqueItems) out.push('unique items')
  if (n.pattern) out.push(`pattern ${n.pattern}`)
  if (n.items) {
    const it = resolve(n.items, schema)
    if (it.enum) out.push(`items: ${it.enum.map((v) => JSON.stringify(v)).join(' | ')}`)
    else if (it.pattern) out.push(`item pattern ${it.pattern}`)
    else if (it.maxLength !== undefined) out.push(`item maxLength ${it.maxLength}`)
  }
  if (n.propertyNames) {
    const pn = resolve(n.propertyNames, schema)
    if (pn.pattern) out.push(`key pattern ${pn.pattern}`)
  }
  if (n.default !== undefined) out.push(`default ${JSON.stringify(n.default)}`)
  return out
}

/** Rows (key, type, required, constraints, description) for an object node. */
export function rowsFor(node, schema = extensionSchema()) {
  const n = resolve(node, schema)
  const required = new Set(n.required || [])
  return Object.entries(n.properties || {}).map(([key, p]) => ({
    key,
    type: typeOf(p, schema),
    required: required.has(key),
    constraints: constraintsOf(p, schema),
    description: resolve(p, schema).description || '',
  }))
}

/** Variants of a oneOf (actions, ui nodes), each with its discriminating type. */
export function variantsFor(defName, schema = extensionSchema()) {
  const def = schema.$defs[defName]
  const common = rowsFor({ properties: def.properties, required: def.required }, schema)
  const variants = (def.oneOf || []).map((v) => {
    const r = resolve(v, schema)
    const typeProp = r.properties && r.properties.type
    const label = typeProp && typeProp.const !== undefined ? typeProp.const : '(variant)'
    const req = new Set(r.required || [])
    const rows = Object.entries(r.properties || {})
      .filter(([k]) => k !== 'type')
      .map(([key, p]) => ({
        key,
        type: typeOf(p, schema),
        required: req.has(key),
        constraints: constraintsOf(p, schema),
        description: resolve(p, schema).description || '',
      }))
    return { label, rows, description: r.description || '' }
  })
  return { common, variants }
}

/** The contribution kinds under contributes, with their limits. */
export function contributionKinds(schema = extensionSchema()) {
  const props = schema.properties.contributes.properties
  return Object.entries(props).map(([key, p]) => ({
    key,
    isArray: p.type === 'array',
    maxItems: p.maxItems,
    def: p.items && p.items.$ref ? refName(p.items.$ref) : null,
  }))
}

// ------------------------------------------------------------- permissions

/** Permission ids as patterns, in schema order, joined with the plain-language table. */
export function permissionRows() {
  const table = permissionsTable().permissions
  return table.map((p) => ({
    match: p.match,
    label: p.label,
    risk: p.risk,
    summary: p.summary,
    idPattern: p.match === 'net:*' ? 'net:<host>' : p.match,
  }))
}

/** The id regex from the manifest schema's permission items, for display. */
export function permissionPattern(schema = extensionSchema()) {
  return schema.properties.permissions.items.pattern
}
