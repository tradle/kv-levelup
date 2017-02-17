const Promise = require('bluebird')
const co = Promise.coroutine

module.exports = function promiseQueue () {
  const tasks = []
  let waiters = []
  let pending

  function push (task) {
    return new Promise((resolve, reject) => {
      tasks.push({ task, resolve, reject })
      processQueue()
    })
  }

  const processQueue = co(function* () {
    if (pending || !tasks.length) return

    pending = next()
    try {
      yield pending
    } finally {
      pending = null
      waiters = waiters.filter(waiter => {
        if (--waiter.togo === 0) {
          waiter.resolve()
          return false
        }

        return true
      })

      processQueue()
    }
  })

  const next = co(function* next () {
    const { task, resolve, reject } = tasks.shift()
    let result
    try {
      result = yield task()
    } catch (err) {
      return reject(err)
    }

    resolve(result)
  })

  function finish () {
    return new Promise(resolve => {
      const togo = tasks.length + (pending ? 1 : 0)
      if (!togo) return resolve()

      waiters.push({ togo, resolve })
    })
  }

  const api = {
    push,
    finish
  }

  Object.defineProperty(api, 'length', {
    get: function () {
      return tasks.length
    }
  })

  return api
}
