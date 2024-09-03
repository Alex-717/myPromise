
const STATUS = {
  'PENDING': 'pending',
  'FULLFILLED': 'fullfilled',
  'REJECTED': 'rejected'
}
class MyPromise {
  constructor (excutor) {
    this.status = STATUS.PENDING
    this.value = ''
    this.hanlderList = []
    try {
      excutor(this._resolve, this._reject)
    } catch (err) {
      console.log('err', err)
      this._reject(err)
    }
  }

  _resolve (data) {
    this._changeStatus(STATUS.FULLFILLED, data)
  }
  _reject (err) {
    this._changeStatus(STATUS.REJECTED, err)
  }
  _changeStatus (status, value) {
    if (this.status !== STATUS.PENDING) return
    this.status = status
    this.value = value
    this._runHandlers()
  }

  then (onFullFilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      this._pushHandler.push(STATUS.FULLFILLED, onFullFilled, resolve, reject)
      this._pushHandler.push(STATUS.REJECTED, onRejected, resolve, reject)
      this._runHandlers()
    })
  }
  _pushHandler (status, handler, resolve, reject) {
    this.hanlderList.push({
      status,
      handler,
      resolve,
      reject
    })
  }
  _runHandlers () {
    if (this.status === STATUS.PENDING) return
    
    const handlerWrapper = this.hanlderList[0]
    while (handlerWrapper) {
      this._runOneHandler(handlerWrapper)
      this.hanlderList.shift()
    }
  }
  _runOneHandler (handlerWrapper) {
    runMicroTask(() => {
      const { status, handler, resolve, reject } = handlerWrapper
      if (this.status !== status) return
      if (typeof handler !== 'function') {
        status === STATUS.FULLFILLED ? resolve(this.value) : reject(this.value)
        return 
      }
      try {
        const result = handler()
        if (isPromiseLike(result)) {
          result.then(resolve, reject)
        } else {
          resolve(result)
        }
      } catch (err) {
        console.log('runMicroTask err', err)
        reject(err)
      }
    })
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  finally (cb) {
    return this.then(data => {
      cb()
      return data
    }, err => {
      cb()
      throw err
    })
  }

  static resolve (data) {
    if (data instanceof MyPromise) 
      return data
    return new MyPromise((resolve, reject) => {
      if (isPromiseLike(data)) {
        data.then(resolve, reject)
      } else {
        resolve(data)
      }
    })
  }
  static reject (data) {
    return new MyPromise((resolve, reject) => {
      reject(data)
    })
  }

  static all (pros) {
    return new MyPromise((resolve, reject) => {
      const result = []
      let count = 0
      let fullFillNum = 0
      for (let p of pros) {
        let i = count++
        MyPromise.resolve(p).then(data => {
          result[i] = data
          if (++fullFillNum === count) {
            resolve(result)
          }
        }, reject)
      }
      if (count === 0) {
        resolve(result)
      }
    })
  }

  static allSettled (pros) {
    const newPros = []
    for (let p of pros) {
      // then会返回一个promise，p已决时，状态不管是fullfill还是reject，都会走到对应的回调。
      // then返回的promise的状态都是fullfill。后面交给MyPromise.all
      newPros.push(
        MyPromise.resolve(p).then((data) => {
          return {
            status: STATUS.FULLFILLED,
            value: data
          }
        }, (err) => {
          return {
            status: STATUS.REJECTED,
            reason: err
          }
        })
      )
    }
    return MyPromise.all(newPros)
  }

  static race (pros) {
    return new MyPromise((resolve, reject) => {
      for (let p of pros) {
        MyPromise.resolve(p).then(resolve, reject)
      }
    })
  }

  static any (pros) {
    return new MyPromise((resolve, reject) => {
      const errResults = []
      let count = 0
      let rejectCount = 0
      for (let p of pros) {
        let i = count++
        MyPromise.resolve(p).then(resolve, err => {
          errResults[i].push(err)
          if (rejectCount === count) {
            reject(errResults)
          }
        })
      }
      if (count === 0) {
        reject(new Error('参数需要是个可迭代对象'))
      }
    })
  }
}

function runMicroTask (task) {
  if (globalThis.process && globalThis.process.nextTick) {
    process.nextTick(task)
  } else if (globalThis.MutationObserver && typeof globalThis.MutationObserver === 'function') {
    const span = document.createElement('span')
    const ob = new MutationObserver(task)
    ob.observe(span, { childList: true })
    span.innerText = '1'
  } else {
    setTimeout(task, 0)
  }
}
function isPromiseLike (data) {
  return !!(data && typeof data.then === 'function' && typeof data.catch === 'function')
}