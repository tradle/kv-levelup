const Promise = require('bluebird')
const co = Promise.coroutine
const test = require('tape')
const createPromiseQueue = require('../promise-queue')

test('promise queue', co(function* (t) {
  const q = createPromiseQueue()
  let a, b
  q.push(() => Promise.resolve())
  q.push(() => resolveIn(50).then(() => {
    t.equal(b, undefined)
    a = 'a'
  }))

  q.push(() => resolveIn(50).then(() => {
    t.equal(a, 'a')
    b = 'b'
  }))

  yield q.finish()
  t.equal(a, 'a')
  t.equal(b, 'b')
  t.end()
}))

function resolveIn (millis, result) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(result)
    }, millis)
  })
}
