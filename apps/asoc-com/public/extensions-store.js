// Progressive enhancement for /extensions/: filters hide cards, nothing else.
// No network requests, no storage, no analytics. Without this file every card stays visible.
(function () {
  var box = document.getElementById('ext-filters')
  var grid = document.getElementById('ext-grid')
  if (!box || !grid) return
  var cards = Array.prototype.slice.call(grid.children)
  var el = {
    q: document.getElementById('f-q'),
    app: document.getElementById('f-app'),
    category: document.getElementById('f-category'),
    status: document.getElementById('f-status'),
    low: document.getElementById('f-low'),
    clear: document.getElementById('f-clear'),
    count: document.getElementById('ext-count'),
    empty: document.getElementById('ext-empty'),
  }
  box.hidden = false

  function setSelect(sel, v) {
    var ok = false
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === v) ok = true
    sel.value = ok ? v : ''
  }
  function readUrl() {
    var p = new URLSearchParams(location.search)
    el.q.value = p.get('q') || ''
    setSelect(el.app, p.get('app') || '')
    setSelect(el.category, p.get('category') || '')
    setSelect(el.status, p.get('status') || '')
    el.low.checked = p.get('low') === '1'
  }
  function writeUrl() {
    var p = new URLSearchParams()
    if (el.q.value.trim()) p.set('q', el.q.value.trim())
    if (el.app.value) p.set('app', el.app.value)
    if (el.category.value) p.set('category', el.category.value)
    if (el.status.value) p.set('status', el.status.value)
    if (el.low.checked) p.set('low', '1')
    var s = p.toString()
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')) } catch (e) {}
  }
  function apply() {
    var terms = el.q.value.toLowerCase().split(/\s+/).filter(Boolean)
    var shown = 0
    cards.forEach(function (c) {
      var d = c.dataset
      var ok =
        (!el.app.value || d.app === el.app.value) &&
        (!el.category.value || d.category === el.category.value) &&
        (!el.status.value || d.status === el.status.value) &&
        (!el.low.checked || d.risk === 'low') &&
        terms.every(function (t) { return (d.search || '').indexOf(t) !== -1 })
      c.hidden = !ok
      if (ok) shown++
    })
    el.count.textContent = 'Showing ' + shown + ' of ' + cards.length + (cards.length === 1 ? ' extension.' : ' extensions.')
    el.empty.hidden = shown !== 0
    grid.hidden = shown === 0
  }
  function onChange() { writeUrl(); apply() }

  ;[el.q, el.app, el.category, el.status, el.low].forEach(function (n) {
    n.addEventListener('input', onChange)
    n.addEventListener('change', onChange)
  })
  el.clear.addEventListener('click', function () {
    el.q.value = ''; el.app.value = ''; el.category.value = ''; el.status.value = ''; el.low.checked = false
    onChange(); el.q.focus()
  })
  window.addEventListener('popstate', function () { readUrl(); apply() })
  readUrl()
  apply()
})()
