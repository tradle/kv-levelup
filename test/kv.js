
const memdown = require('memdown')
const createStore = require('../')

const test = require('@tradle/kv/test')

test({
  create: opts => createStore(opts, { db: memdown }),
  cleanup: function ({ path }) {}
})
