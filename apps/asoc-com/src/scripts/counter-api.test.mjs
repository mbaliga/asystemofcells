import { test } from 'node:test'
import assert from 'node:assert/strict'
import { api } from './counter-api.js'

test('natural Counter paths become the ?__p= form the deployed function answers', () => {
  assert.equal(api('/api/counter/orders'), '/api/counter/?__p=orders')
  assert.equal(api('/api/counter/catalog-state'), '/api/counter/?__p=catalog-state')
  assert.equal(api('/api/counter/orders/01ABC/model?t=x%2By'), '/api/counter/?__p=orders/01ABC/model&t=x%2By')
  assert.equal(api('/api/counter/orders/01ABC?t=x&v=1'), '/api/counter/?__p=orders/01ABC&t=x&v=1')
  assert.equal(api('/api/counter/owner/rebuild/'), '/api/counter/?__p=owner/rebuild')
  assert.equal(api('/other'), '/other')
})
