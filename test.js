
const memdown = require('memdown')
const createStore = require('./')

require('../tradle-kv/test')({
  create: opts => createStore(opts, { db: memdown }),
  cleanup: function ({ path }) {}
})
