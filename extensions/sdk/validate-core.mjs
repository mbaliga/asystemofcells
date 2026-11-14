// Clackpad extension rules, PURE (no Node APIs): the one place the manifest and package rules live. Imported by
// validate.mjs / pack.mjs (Node) and by web-config/extension-studio.html (browser), so the editor and the CLI can
// never disagree. The app's own enforcement is ExtensionManifest.kt / ExtensionPackage.kt (docs/EXTENSIONS.md).
// Files are Map(name -> Uint8Array); a Node Buffer is a Uint8Array, so both work.

const dec = (d) => new TextDecoder().decode(d);

export const LIMITS = {
  packageBytes: 5 * 1024 * 1024, entries: 200, entryBytes: 5 * 1024 * 1024, unpackedBytes: 16 * 1024 * 1024,
  pathChars: 160, manifestBytes: 256 * 1024, iconBytes: 64 * 1024,
};
export const FORBIDDEN_EXT = new Set(['dex', 'so', 'apk', 'jar', 'class', 'odex', 'vdex', 'aar', 'oat', 'art']);
export const URI_SCHEMES = new Set(['obsidian', 'logseq', 'https', 'mailto', 'geo']);
export const FIXED_PERMS = ['typed:read', 'clipboard', 'notes:write', 'folder:write', 'suggestions:surface'];
const ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?$/;
const KEY = /^[a-z][A-Za-z0-9_]{0,31}$/;
const ITEM = /^[a-z][A-Za-z0-9_-]{0,31}$/;
const LOCALE = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const HOST = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const SIMPLE_VARS = new Set(['clipboard', 'selection', 'typed', 'title', 'date', 'time', 'datetime']);
const CONFIG_TYPES = ['toggle', 'choice', 'text', 'number', 'color', 'folder'];
const SECTION = /^([#^/])config\.([a-z][A-Za-z0-9_]{0,31})(?:=([A-Za-z0-9_-]{1,40}))?$/;
const RESTRICTED = new Set(['title', 'date', 'time', 'datetime']);
const BINDABLE = { fontSize: 'number', maxCandidates: 'number', colorRole: 'choice', gesture: 'choice', layout: 'choice', look: 'choice', keepStrip: 'toggle', showOnLandscape: 'toggle' };
const BIND_VALUES = { colorRole: ['text', 'accent', 'dim'], gesture: ['tap', 'flick-up', 'both'], layout: ['even', 'above-next-letter'], look: ['plate', 'text'] };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function validateManifest(m, { hostVersion = Infinity } = {}) {
  const errs = [];
  const err = (p, msg) => errs.push(p ? `${p}: ${msg}` : msg);
  if (!isObj(m)) return ['extension.json must be a JSON object'];
  const unknown = (o, allowed, p) => { for (const k of Object.keys(o)) if (!allowed.includes(k)) err(p ? `${p}.${k}` : k, 'unknown key'); };
  const str = (o, k, p, max, required = true) => {
    const where = p ? `${p}${k}` : k;
    if (!(k in o) || o[k] === null) { if (required) err(where, 'is required'); return null; }
    const v = o[k];
    if (typeof v !== 'string') { err(where, 'must be a string'); return null; }
    if (required && v.trim() === '') { err(where, 'must not be empty'); return null; }
    if (v.length > max) { err(where, `longer than ${max} characters`); return null; }
    if (/[\u0000-\u0009\u000b-\u001f]/.test(v)) { err(where, 'contains control characters'); return null; }
    return v;
  };
  const safePath = (v, where) => {
    const bad = !v || v.length > LIMITS.pathChars || v.startsWith('/') || v.includes('\\') || /[\u0000-\u001f:]/.test(v) ||
      v.split('/').some((s) => s === '' || s === '.' || s === '..');
    if (bad) err(where, 'is not a safe relative path inside the package');
    return !bad;
  };
  const tokens = (t) => [...t.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)].map((x) => x[1]);
  const templateProblems = (t, where) => {
    if (t.length > 4000) err(where, 'template longer than 4000 characters');
    if (t.replace(/\{\{\s*[^{}]*?\s*\}\}/g, '').match(/\{\{|\}\}/)) err(where, 'unbalanced {{ }}');
    const open = [];
    for (const tok of tokens(t)) {
      if ('#^/'.includes(tok[0] || ' ')) {
        const m = SECTION.exec(tok);
        if (!m) { err(where, `bad section {{${tok}}} (use {{#config.key}}, {{#config.key=value}}, {{^config.key}} and {{/config.key}})`); continue; }
        const sid = m[2] + (m[3] ? `=${m[3]}` : '');
        if (m[1] === '/') { if (open[open.length - 1] === sid) open.pop(); else err(where, `{{/config.${sid}}} closes a section that is not open`); } else open.push(sid);
        continue;
      }
      if (!(SIMPLE_VARS.has(tok) || /^config\.[a-z][A-Za-z0-9_]{0,31}$/.test(tok) || /^param\.[a-z][A-Za-z0-9_]{0,31}$/.test(tok))) err(where, `unknown template variable {{${tok}}}`);
    }
    if (open.length) err(where, `section {{#config.${open[open.length - 1]}}} is never closed`);
  };
  const restrictedProblems = (t, where) => {
    templateProblems(t, where);
    for (const tok of tokens(t)) if (!RESTRICTED.has(tok) && !/^param\.[a-z][A-Za-z0-9_]{0,31}$/.test(tok)) err(where, `{{${tok}}} is not allowed in an option template (only title, date, time, datetime, param.*)`);
  };

  unknown(m, ['schema', 'id', 'name', 'version', 'author', 'homepage', 'license', 'description', 'minClackpad', 'icon', 'contributes', 'permissions', 'config', 'i18n'], '');
  const schema = str(m, 'schema', '', 40);
  if (schema && schema !== 'clackpad-extension/1') err('schema', 'must be "clackpad-extension/1"');
  const id = str(m, 'id', '', 64);
  if (id && !ID.test(id)) err('id', 'must be reverse-DNS in lower case, e.g. com.example.hello');
  str(m, 'name', '', 40);
  const ver = str(m, 'version', '', 32);
  if (ver && !SEMVER.test(ver)) err('version', 'must be semver, e.g. 1.2.0 (no build metadata)');
  str(m, 'author', '', 60);
  const home = str(m, 'homepage', '', 200, false);
  if (home && !home.startsWith('https://')) err('homepage', 'must be an https:// URL');
  str(m, 'license', '', 40, false);
  str(m, 'description', '', 140);
  if (!('minClackpad' in m)) err('minClackpad', 'is required');
  else if (!Number.isInteger(m.minClackpad) || m.minClackpad < 1) err('minClackpad', 'must be a positive integer (a Clackpad versionCode)');
  else if (m.minClackpad > hostVersion) err('minClackpad', `needs Clackpad build ${m.minClackpad} or newer (this is ${hostVersion})`);
  const icon = str(m, 'icon', '', LIMITS.pathChars, false);
  if (icon && safePath(icon, 'icon') && !icon.endsWith('.png')) err('icon', 'must be a .png file');

  // permissions
  const perms = [];
  if ('permissions' in m) {
    if (!Array.isArray(m.permissions)) err('permissions', 'must be an array');
    else {
      if (m.permissions.length > 16) err('permissions', 'more than 16 entries');
      let hosts = 0;
      m.permissions.forEach((p, i) => {
        if (typeof p !== 'string') return err(`permissions[${i}]`, 'must be a string');
        const ok = FIXED_PERMS.includes(p) || (p.startsWith('uri:') && URI_SCHEMES.has(p.slice(4))) || (p.startsWith('net:') && p.length > 4);
        if (!ok) return err(`permissions[${i}]`, `unknown permission "${p}"`);
        if (p.startsWith('net:')) { if (++hosts > 8) err(`permissions[${i}]`, 'more than 8 net hosts'); if (!HOST.test(p.slice(4))) err('permissions', `${p} is not a plain host name (no wildcards, ports or paths)`); }
        if (perms.includes(p)) err(`permissions[${i}]`, `duplicate permission "${p}"`); else perms.push(p);
      });
    }
  }

  // config fields
  const fields = [];
  const configFields = (arr, p) => arr.forEach((f, i) => {
    const w = `${p}[${i}]`;
    if (!isObj(f)) return err(w, 'must be an object');
    unknown(f, ['key', 'type', 'label', 'default', 'options', 'min', 'max', 'maxLength', 'template'], w);
    const key = str(f, 'key', `${w}.`, 32);
    if (key && !KEY.test(key)) err(`${w}.key`, 'must match [a-z][A-Za-z0-9_]{0,31}');
    if (key && fields.some((x) => x.key === key)) err(`${w}.key`, `duplicate config key "${key}"`);
    const type = str(f, 'type', `${w}.`, 16);
    if (type && !CONFIG_TYPES.includes(type)) err(`${w}.type`, `unknown field type "${type}"`);
    str(f, 'label', `${w}.`, 40);
    if ('default' in f) {
      const d = f.default;
      if (type === 'toggle' && typeof d !== 'boolean') err(`${w}.default`, 'must be true or false');
      else if (type === 'number') { if (typeof d !== 'number') err(`${w}.default`, 'must be a number'); else if ((typeof f.min === 'number' && d < f.min) || (typeof f.max === 'number' && d > f.max)) err(`${w}.default`, 'is outside min..max'); }
      else if (type === 'color' && !(typeof d === 'string' && /^#[0-9A-Fa-f]{6}$/.test(d))) err(`${w}.default`, 'must be #RRGGBB');
      else if (type === 'folder') err(`${w}.default`, 'a folder has no default (the user picks it)');
      else if ((type === 'text' || type === 'choice') && !(typeof d === 'string' && d.length <= 500)) err(`${w}.default`, 'must be a string of at most 500 characters');
    }
    if (type === 'choice') {
      if (!Array.isArray(f.options) || f.options.length < 1 || f.options.length > 24) err(`${w}.options`, 'a choice needs 1 to 24 options');
      else {
        f.options.forEach((o, j) => { if (!isObj(o)) return err(`${w}.options[${j}]`, 'must be an object'); unknown(o, ['value', 'label'], `${w}.options[${j}]`); str(o, 'value', `${w}.options[${j}].`, 40); str(o, 'label', `${w}.options[${j}].`, 40); });
        if (typeof f.default === 'string' && !f.options.some((o) => o && o.value === f.default)) err(`${w}.default`, 'is not one of the options');
      }
    } else if ('options' in f) err(`${w}.options`, 'only a choice has options');
    if (type === 'number') { if (typeof f.min === 'number' && typeof f.max === 'number' && f.min > f.max) err(`${w}.min`, 'is greater than max'); }
    else if ('min' in f || 'max' in f) err(`${w}.min`, 'only a number has min/max');
    if ('maxLength' in f) { if (type !== 'text') err(`${w}.maxLength`, 'only a text field has maxLength'); else if (!Number.isInteger(f.maxLength) || f.maxLength < 1 || f.maxLength > 500) err(`${w}.maxLength`, 'must be 1 to 500'); }
    if ('template' in f) {
      if (type !== 'text') err(`${w}.template`, 'only a text field can be a template');
      else if (typeof f.template !== 'boolean') err(`${w}.template`, 'must be true or false');
      else if (f.template && typeof f.default === 'string') restrictedProblems(f.default, `${w}.default`);
    }
    if (key && type) fields.push({ key, type, choices: type === 'choice' && Array.isArray(f.options) ? f.options.map((o) => o && o.value) : [] });
  });
  if ('config' in m) { if (!Array.isArray(m.config)) err('config', 'must be an array'); else configFields(m.config, 'config'); }

  // i18n
  if ('i18n' in m) {
    if (!isObj(m.i18n)) err('i18n', 'must be an object');
    else for (const [loc, e] of Object.entries(m.i18n)) {
      if (!LOCALE.test(loc)) { err(`i18n.${loc}`, 'is not a locale tag like es or pt-BR'); continue; }
      if (!isObj(e)) { err(`i18n.${loc}`, 'must be an object'); continue; }
      unknown(e, ['name', 'description'], `i18n.${loc}`);
      str(e, 'name', `i18n.${loc}.`, 40, false); str(e, 'description', `i18n.${loc}.`, 140, false);
    }
  }

  // contributes
  const c = m.contributes;
  const actions = []; const tabs = []; const refs = [];
  const files = { icon, refs };
  if (icon) refs.push(icon);
  if (!isObj(c)) err('contributes', 'is required and must be an object');
  else {
    unknown(c, ['theme', 'toolsTab', 'action', 'suggestionSurface', 'settingsPage'], 'contributes');
    const arr = (k, max) => { if (!(k in c)) return []; if (!Array.isArray(c[k])) { err(`contributes.${k}`, 'must be an array'); return []; } if (c[k].length > max) { err(`contributes.${k}`, `more than ${max} entries`); return []; } return c[k]; };
    let themeCount = 0, surfCount = 0;
    arr('theme', 4).forEach((t, i) => {
      const w = `contributes.theme[${i}]`; themeCount++;
      if (!isObj(t)) return err(w, 'must be an object');
      unknown(t, ['file', 'pack'], w);
      if (('file' in t) === ('pack' in t)) return err(w, 'give exactly one of file (a path to a clackpad-theme/1 JSON in the package) or pack (the theme inline)');
      if ('file' in t) { if (typeof t.file === 'string' && safePath(t.file, `${w}.file`)) { if (!t.file.endsWith('.json')) err(`${w}.file`, 'must be a .json file'); refs.push(t.file); } else if (typeof t.file !== 'string') err(`${w}.file`, 'must be a string'); }
      else if (!isObj(t.pack) || t.pack.format !== 'clackpad-theme/1') err(`${w}.pack.format`, 'must be "clackpad-theme/1"');
    });
    if ('settingsPage' in c) {
      if (!isObj(c.settingsPage)) err('contributes.settingsPage', 'must be an object');
      else { unknown(c.settingsPage, ['title', 'fields'], 'contributes.settingsPage'); if (!Array.isArray(c.settingsPage.fields)) err('contributes.settingsPage.fields', 'is required and must be an array'); else configFields(c.settingsPage.fields, 'contributes.settingsPage.fields'); }
    }
    if (fields.length > 24) err('config', 'more than 24 fields');
    const params = (o, w) => { if (!('params' in o)) return; if (!isObj(o.params)) return err(`${w}.params`, 'must be an object'); const ks = Object.keys(o.params); if (ks.length > 8) err(`${w}.params`, 'more than 8 params'); for (const k of ks) { if (!KEY.test(k)) err(`${w}.params.${k}`, 'param names match [a-z][A-Za-z0-9_]{0,31}'); else if (typeof o.params[k] !== 'string' || o.params[k].length > 200) err(`${w}.params.${k}`, 'must be a string of at most 200 characters'); } };
    arr('action', 32).forEach((a, i) => {
      const w = `contributes.action[${i}]`;
      if (!isObj(a)) return err(w, 'must be an object');
      const aid = str(a, 'id', `${w}.`, 32);
      if (aid && !ITEM.test(aid)) err(`${w}.id`, 'must match [a-z][A-Za-z0-9_-]{0,31}');
      if (aid && actions.some((x) => x.id === aid)) err(`${w}.id`, `duplicate action id "${aid}"`);
      const type = str(a, 'type', `${w}.`, 24);
      str(a, 'label', `${w}.`, 40, false);
      if ('quick' in a && typeof a.quick !== 'boolean') err(`${w}.quick`, 'must be true or false');
      const common = ['id', 'type', 'label', 'quick'];
      const tmpl = (k, req = true) => { const t = str(a, k, `${w}.`, 4000, req); if (t) templateProblems(t, `${w}.${k}`); return t; };
      const need = (p, why) => { if (!perms.includes(p)) err(w, `${why} needs the "${p}" permission`); };
      const tplPerms = (t, where) => { if (!t) return; for (const tok of tokens(t)) { if (tok === 'typed' || tok === 'selection') need('typed:read', `{{${tok}}}`); if (tok === 'clipboard') need('clipboard', '{{clipboard}}'); const mm = /^config\.(.+)$/.exec(tok) || /^[#^/]config\.([a-z][A-Za-z0-9_]*)/.exec(tok); if (mm && !fields.some((f) => f.key === mm[1])) err(where, `{{config.${mm[1]}}} names a config field that does not exist`); } };
      switch (type) {
        case 'insertText': unknown(a, [...common, 'template'], w); tplPerms(tmpl('template'), `${w}.template`); break;
        case 'copyToClipboard': unknown(a, [...common, 'template'], w); need('clipboard', 'copyToClipboard'); tplPerms(tmpl('template'), `${w}.template`); break;
        case 'share': unknown(a, [...common, 'template', 'subject'], w); tplPerms(tmpl('template'), `${w}.template`); { const s = str(a, 'subject', `${w}.`, 100, false); if (s) { templateProblems(s, `${w}.subject`); tplPerms(s, `${w}.subject`); } } break;
        case 'openUri': { unknown(a, [...common, 'uriTemplate'], w); const t = tmpl('uriTemplate'); if (t) { tplPerms(t, `${w}.uriTemplate`); const scheme = t.split(':')[0].toLowerCase(); if (!t.includes(':') || scheme.includes('{{') || !URI_SCHEMES.has(scheme)) err(`${w}.uriTemplate`, `must start with a literal scheme from: ${[...URI_SCHEMES].sort().join(', ')}`); else need(`uri:${scheme}`, `a ${scheme}: link`); } break; }
        case 'saveToFolder': { unknown(a, [...common, 'folder', 'fileName', 'template', 'mode', 'appendWhen'], w); need('folder:write', 'saveToFolder'); const f = str(a, 'folder', `${w}.`, 32); const fn = tmpl('fileName', false); const t = tmpl('template'); tplPerms(fn, `${w}.fileName`); tplPerms(t, `${w}.template`); const mode = str(a, 'mode', `${w}.`, 10, false); if (mode && mode !== 'append' && mode !== 'create') err(`${w}.mode`, 'must be append or create'); if (f && fields.find((x) => x.key === f)?.type !== 'folder') err(`${w}.folder`, `must name a config field of type folder ("${f}" is not one)`);
          if ('appendWhen' in a) {
            const aw = a.appendWhen;
            if (!isObj(aw)) err(`${w}.appendWhen`, 'must be an object {"config": key, "in": [values]}');
            else {
              unknown(aw, ['config', 'in'], `${w}.appendWhen`);
              if ('mode' in a) err(`${w}.appendWhen`, 'use either mode or appendWhen, not both');
              const k = str(aw, 'config', `${w}.appendWhen.`, 32); const fld = fields.find((x) => x.key === k);
              if (!Array.isArray(aw.in) || aw.in.length < 1 || aw.in.length > 24) err(`${w}.appendWhen.in`, '1 to 24 option values');
              else aw.in.forEach((v, j) => { if (typeof v !== 'string' || v.length < 1 || v.length > 40) err(`${w}.appendWhen.in[${j}]`, 'must be a short string'); else if (fld && fld.type === 'choice' && !fld.choices.includes(v)) err(`${w}.appendWhen.in`, `"${v}" is not an option of ${k}`); });
              if (k && fld && fld.type !== 'choice') err(`${w}.appendWhen.config`, `must name a choice option ("${k}" is not one)`);
            }
          }
          break; }
        case 'openSettings': unknown(a, common, w); break;
        case 'launchExtensionPage': { unknown(a, [...common, 'page'], w); const pg = str(a, 'page', `${w}.`, LIMITS.pathChars); if (pg && safePath(pg, `${w}.page`)) { if (!pg.endsWith('.html')) err(`${w}.page`, 'must be an .html file in the package'); else refs.push(pg); } break; }
        default: if (type) err(`${w}.type`, `unknown action type "${type}"`);
      }
      if (aid) actions.push({ id: aid });
      params(a, w);
    });
    arr('toolsTab', 4).forEach((t, i) => {
      const w = `contributes.toolsTab[${i}]`;
      if (!isObj(t)) return err(w, 'must be an object');
      unknown(t, ['id', 'title', 'icon', 'ui'], w);
      const tid = str(t, 'id', `${w}.`, 32);
      if (tid && !ITEM.test(tid)) err(`${w}.id`, 'must match [a-z][A-Za-z0-9_-]{0,31}');
      if (tid && tabs.includes(tid)) err(`${w}.id`, `duplicate tab id "${tid}"`);
      if (tid) tabs.push(tid);
      str(t, 'title', `${w}.`, 14); str(t, 'icon', `${w}.`, 4);
      if (!Array.isArray(t.ui) || t.ui.length === 0) return err(`${w}.ui`, 'is required: a non-empty array of UI elements');
      let nodes = 0;
      const actionRef = (id, where) => { if (!actions.some((a) => a.id === id)) err(where, `unknown action "${id}"`); };
      const button = (b, where) => { if (!isObj(b)) return err(where, 'must be an object'); unknown(b, ['type', 'label', 'action', 'params', 'primary'], where); str(b, 'label', `${where}.`, 40); const a = str(b, 'action', `${where}.`, 32); if (a) actionRef(a, `${where}.action`); params(b, where); };
      t.ui.forEach((n, j) => {
        const nw = `${w}.ui[${j}]`;
        if (++nodes > 60) { if (nodes === 61) err(nw, 'more than 60 UI elements'); return; }
        if (!isObj(n)) return err(nw, 'must be an object');
        const nt = str(n, 'type', `${nw}.`, 12);
        if (nt === 'text') { unknown(n, ['type', 'text', 'style'], nw); str(n, 'text', `${nw}.`, 400); const s = str(n, 'style', `${nw}.`, 8, false); if (s && !['title', 'body', 'caption'].includes(s)) err(`${nw}.style`, 'must be title, body or caption'); }
        else if (nt === 'button') button(n, nw);
        else if (nt === 'row') { unknown(n, ['type', 'children'], nw); if (!Array.isArray(n.children) || n.children.length < 1 || n.children.length > 3) err(`${nw}.children`, 'a row holds 1 to 3 buttons'); else n.children.forEach((b, k) => { if (!isObj(b) || b.type !== 'button') err(`${nw}.children[${k}]`, 'a row holds only buttons'); else button(b, `${nw}.children[${k}]`); }); }
        else if (nt === 'list') { unknown(n, ['type', 'items'], nw); if (!Array.isArray(n.items) || n.items.length < 1 || n.items.length > 24) err(`${nw}.items`, 'a list holds 1 to 24 items'); else n.items.forEach((it, k) => { const iw = `${nw}.items[${k}]`; if (!isObj(it)) return err(iw, 'must be an object'); unknown(it, ['label', 'action', 'params'], iw); str(it, 'label', `${iw}.`, 60); const a = str(it, 'action', `${iw}.`, 32); if (a) actionRef(a, `${iw}.action`); params(it, iw); }); }
        else if (nt === 'field') { unknown(n, ['type', 'config', 'label', 'empty'], nw); const k = str(n, 'config', `${nw}.`, 32); str(n, 'label', `${nw}.`, 40); str(n, 'empty', `${nw}.`, 40, false); if (k && !fields.some((f) => f.key === k)) err(`${nw}.config`, 'names a config field that does not exist'); }
        else if (nt === 'divider') unknown(n, ['type'], nw);
        else if (nt) err(`${nw}.type`, `unknown UI element "${nt}"`);
      });
    });
    arr('suggestionSurface', 4).forEach((s, i) => {
      const w = `contributes.suggestionSurface[${i}]`; surfCount++;
      if (!isObj(s)) return err(w, 'must be an object');
      unknown(s, ['surface', 'fontSize', 'colorRole', 'maxCandidates', 'placement', 'gesture', 'showOnLandscape', 'acceptSource', 'layout', 'keepStrip', 'fromConfig', 'replaceStrip', 'look'], w);
      if (s.surface !== 'frets') err(`${w}.surface`, 'the only surface is "frets"');
      if ('fontSize' in s && (!Number.isInteger(s.fontSize) || s.fontSize < 8 || s.fontSize > 18)) err(`${w}.fontSize`, 'must be an integer 8 to 18 (sp)');
      if ('colorRole' in s && !['text', 'accent', 'dim'].includes(s.colorRole)) err(`${w}.colorRole`, 'must be text, accent or dim');
      if ('maxCandidates' in s && (!Number.isInteger(s.maxCandidates) || s.maxCandidates < 1 || s.maxCandidates > 5)) err(`${w}.maxCandidates`, 'must be an integer 1 to 5');
      if ('placement' in s) { if (!Array.isArray(s.placement)) err(`${w}.placement`, 'must be an array of fret numbers'); else s.placement.forEach((v, j) => { if (![0, 1, 2].includes(v)) err(`${w}.placement[${j}]`, 'a fret number is 0, 1 or 2 (top to bottom)'); else if (s.placement.indexOf(v) !== j) err(`${w}.placement[${j}]`, `duplicate fret ${v}`); }); }
      if ('gesture' in s && !['tap', 'flick-up', 'both'].includes(s.gesture)) err(`${w}.gesture`, 'must be tap, flick-up or both');
      if ('showOnLandscape' in s && typeof s.showOnLandscape !== 'boolean') err(`${w}.showOnLandscape`, 'must be true or false');
      if ('layout' in s && !['even', 'above-next-letter'].includes(s.layout)) err(`${w}.layout`, 'must be even or above-next-letter');
      if ('look' in s && !['plate', 'text'].includes(s.look)) err(`${w}.look`, 'must be plate or text');
      if ('keepStrip' in s && typeof s.keepStrip !== 'boolean') err(`${w}.keepStrip`, 'must be true or false');
      if ('replaceStrip' in s && typeof s.replaceStrip !== 'boolean') err(`${w}.replaceStrip`, 'must be true or false');
      if (typeof s.keepStrip === 'boolean' && typeof s.replaceStrip === 'boolean' && s.keepStrip === s.replaceStrip) err(`${w}.replaceStrip`, 'contradicts keepStrip (replaceStrip is the inverse of keepStrip: say one, or make them opposite)');
      if ('fromConfig' in s) {
        if (!isObj(s.fromConfig)) err(`${w}.fromConfig`, 'must be an object {surface field: config key}');
        else for (const [fld, key] of Object.entries(s.fromConfig)) {
          const fw = `${w}.fromConfig.${fld}`;
          if (!(fld in BINDABLE)) { err(fw, `cannot be driven by an option (one of: ${Object.keys(BINDABLE).join(', ')})`); continue; }
          if (typeof key !== 'string' || !KEY.test(key)) { err(fw, 'must be a config key'); continue; }
          const cf = fields.find((x) => x.key === key);
          if (!cf) err(fw, 'names a config field that does not exist');
          else if (cf.type !== BINDABLE[fld]) err(fw, `needs a ${BINDABLE[fld]} option ("${key}" is ${cf.type})`);
          else if (cf.type === 'choice' && BIND_VALUES[fld]) for (const v of cf.choices) if (!BIND_VALUES[fld].includes(v)) err(fw, `option value "${v}" is not valid for ${fld}`);
        }
      }
      if ('acceptSource' in s && s.acceptSource !== 'host') err(`${w}.acceptSource`, 'must be "host": the keyboard supplies the candidates, extensions never do');
    });
    if (surfCount && !perms.includes('suggestions:surface')) err('contributes.suggestionSurface', 'a suggestion surface needs the "suggestions:surface" permission');
    if (!themeCount && !tabs.length && !actions.length && !surfCount && !fields.length && !errs.length) err('contributes', 'declares nothing: add at least one contribution');
  }
  return { errors: errs, refs: files.refs, icon };
}

export function nameProblem(name, isDir) {
  const n = isDir ? name.slice(0, -1) : name;
  if (!n) return 'has an empty name';
  if (name.length > LIMITS.pathChars) return `has a path longer than ${LIMITS.pathChars} characters`;
  if (n.startsWith('/') || n.includes('\\') || n.includes(':') || /[\u0000-\u001f\u007f]/.test(n)) return 'is not a safe relative path';
  if (n.split('/').some((s) => s === '..' || s === '.' || s === '')) return 'uses a path traversal or empty segment';
  if (!isDir) { const parts = n.split('/').pop().split('.').slice(1).map((x) => x.toLowerCase()); if (parts.some((x) => FORBIDDEN_EXT.has(x))) return 'has a forbidden file type (no .dex/.so/.apk/.jar)'; }
  return null;
}

export function looksLikeCode(d) {
  if (d.length < 4) return false;
  return (d[0] === 0x7f && d[1] === 0x45 && d[2] === 0x4c && d[3] === 0x46) || (d[0] === 0x64 && d[1] === 0x65 && d[2] === 0x78 && d[3] === 0x0a) ||
    (d[0] === 0x50 && d[1] === 0x4b && d[2] === 3 && d[3] === 4) || (d[0] === 0xca && d[1] === 0xfe && d[2] === 0xba && d[3] === 0xbe);
}

export function validateFiles(files, opts = {}) {
  const errors = [];
  const mb = files.get('extension.json');
  if (!mb) return ['extension.json is missing at the package root'];
  if (mb.length > LIMITS.manifestBytes) return ['extension.json is larger than 256 KB'];
  let m; try { m = JSON.parse(dec(mb)); } catch { return ['extension.json is not valid JSON']; }
  const r = validateManifest(m, opts);
  if (Array.isArray(r)) return r;
  errors.push(...r.errors);
  for (const ref of r.refs) if (!files.has(ref)) errors.push(`${ref}: is referenced by the manifest but is not in the package`);
  if (r.icon && files.has(r.icon)) {
    const d = files.get(r.icon);
    if (d.length > LIMITS.iconBytes) errors.push('icon: is larger than 64 KB');
    if (d.length < 8 || d[0] !== 0x89 || d[1] !== 0x50 || d[2] !== 0x4e || d[3] !== 0x47) errors.push('icon: is not a PNG image');
  }
  for (const t of (m.contributes && m.contributes.theme) || []) if (t && t.file && files.has(t.file)) { try { if (JSON.parse(dec(files.get(t.file))).format !== 'clackpad-theme/1') throw 0; } catch { errors.push(`${t.file}: is not a clackpad-theme/1 JSON file`); } }
  let total = 0; for (const d of files.values()) total += d.length;
  if (total > LIMITS.unpackedBytes) errors.push('package unpacks to more than 16 MB');
  return errors;
}
