const levelup = require('levelup')
const nativedown = require('leveldown')
const memdown = require('memdown')
const debug = require('debug')('tradle:kv:levelup')
const Promise = require('bluebird')
const co = Promise.coroutine
const collect = Promise.promisify(require('stream-collector'))
const shallowClone = require('xtend')
const shallowExtend = require('xtend/mutable')
const createPromiseQueue = require('./promise-queue')
const LEVEL_OPTS = {
  keyEncoding: 'utf8',
  valueEncoding: 'json'
}

module.exports = function createStore (opts={}) {
  const { path, leveldown=nativedown } = opts
  Promise.promisifyAll(leveldown)

  let db = createDB(path)
  const api = {}
  const blockingOps = createPromiseQueue()
  const wait = co(function* () {
    while (blockingOps.length) {
      yield blockingOps.finish()
    }
  })

  ;['get', 'put', 'del', 'batch', 'close'].forEach(method => {
    api[method] = co(function* (...args) {
      yield wait()
      debug(method)
      // created by Promise.promisifyAll
      return db[method + 'Async'](...args)
    })
  })

  const destroy = leveldown.destroy && co(function* destroy () {
    debug('destroying')
    yield api.close()
    yield leveldown.destroyAsync(path)
    db = createDB(path)
    return
  })

  const clear = co(function* clear () {
    debug('clearing')
    if (destroy) {
      return api.destroy()
    }

    // TODO: think of a safe but more efficient solution
    const keys = yield collect(db.createReadStream({ values: false }))
    const batch = keys.map(key => {
      return { key, type: 'del' }
    })

    return db.batch(batch)
  })

  const list = co(function* list () {
    return collect(db.createReadStream())
  })

  api.set = api.put
  api.list = list
  api.clear = () => blockingOps.push(clear)
  api.destroy = () => blockingOps.push(destroy)
  api.stream = db.createReadStream.bind(db)
  return api

  function createDB (path) {
    const levelOpts = shallowExtend({
      db: leveldown
    }, LEVEL_OPTS)

    const db = levelup(path, levelOpts)
    return Promise.promisifyAll(db)
  }
}
