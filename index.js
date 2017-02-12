const Promise = require('bluebird')
const co = Promise.coroutine
const collect = Promise.promisify(require('stream-collector'))
const levelup = require('levelup')
const extend = require('xtend')

module.exports = function persistWithLevelup ({ path }, levelOpts) {
  levelOpts = extend(levelOpts)
  if (!levelOpts.valueEncoding) {
    levelOpts.valueEncoding = 'json'
  }

  if (!levelOpts.keyEncoding) {
    levelOpts.keyEncoding = 'utf8'
  }

  let db = createDB()

  function createDB () {
    return Promise.promisifyAll(levelup(path, levelOpts))
  }

  function get (key) {
    return db.getAsync(key)
  }

  function put (key, value) {
    return db.putAsync(key, value)
  }

  function del (key) {
    return db.delAsync(key)
  }

  const clear = co(function* clear () {
    // yield close()
    // if (db.destroyAsync) {
    //   return db.destroyAsync()
    // }

    // TODO: think of a safe but more efficient solution
    const keys = yield collect(db.createKeyStream())
    const batch = keys.map(key => {
      return { key, type: 'del' }
    })

    return db.batch(batch)
  })

  function list () {
    return collect(db.createReadStream())
  }

  function batch (ops) {
    return db.batchAsync(ops)
  }

  function close () {
    return db.closeAsync()
  }

  return {
    get,
    put,
    del,
    list,
    batch,
    clear,
    close
  }
}
