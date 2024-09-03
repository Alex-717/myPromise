
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
  
  }
  static reject (data) {

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
  static allSettled () {

  }
  static race () {

  }
  static any () {

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