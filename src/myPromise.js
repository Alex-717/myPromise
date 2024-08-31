
const STATUS = {
  'PENDING': 'pending',
  'FULLFILLED': 'fullfilled',
  'REJECTED': 'rejected'
}

function runMicroTask (task) {
  if (typeof process === 'object' && process.nextTick) {
    console.log('process')
    process.nextTick(task)
  } else if (typeof MutationObserver === 'function') {
    console.log('MutationObserver')
    const span = document.createElement('span')
    const observer = new MutationObserver(task)
    observer.observe(span, { childList: true })
    span.innerText = new Date().getTime()
  } else {
    setTimeout(task, 0)
  }
}

function isPromiseLike (target) {
  return !!(target && typeof target === 'object' && typeof target.then === 'function')
}

class MyPromise {

  constructor (excutor) {
    this.status = STATUS.PENDING
    this.value = null
    this.handleList = []
    try {
      excutor(this._resovle.bind(this), this._reject.bind(this))
    } catch (err) {
      console.error('err', err)
      this._reject(err)
    }
  }

  _changeStatus (status, value) {
    if (this.status !== STATUS.PENDING) return
    this.status = status
    this.value = value
    console.log(`${status}`, this.value)
    this._runList()
  }
  _resovle (data) {
    this._changeStatus(STATUS.FULLFILLED, data)
  }
  _reject (err) {
    this._changeStatus(STATUS.REJECTED, err)
  }
  _runOneHandler (handler) {
    runMicroTask(() => {
      const { status, handleFn, resolve, reject } = handler
      if (this.status !== status) return
      if (typeof handleFn !== 'function') {
        return status === STATUS.FULLFILLED ? resolve(this.value) : reject(this.value)
      }
      try {
        const result = handleFn(this.value)
        if (isPromiseLike(result)) {
          result.then(resolve, reject)
        } else {
          resolve(result)
        }
      } catch(err) {
        reject(err)
      }
    })
  }

  _runList () {
    if (this.status === STATUS.PENDING) return
    
    while (this.handleList[0]) {
      this._runOneHandler(this.handleList[0])
      this.handleList.shift()
    }
  }

  then (onFullFilled, onRejected) {
    return new Promise((resolve, reject) => {
      this.handleList.push({
        status: STATUS.FULLFILLED,
        handleFn: onFullFilled,
        resolve,
        reject
      })
      this.handleList.push({
        status: STATUS.REJECTED,
        handleFn: onRejected,
        resolve,
        reject
      })
      this._runList()
    })  
  }

  catch (onRejected) {
    return this.then(null, onRejected)
  }

  finally (cb) {
    return this.then((data) => {
      cb()
      return data
    }, (err => {
      cb()
      throw err
    }))
  }

  static resolve (value) {
    if (value instanceof MyPromise) {
      return value
    }
    return new MyPromise((resolve, reject) => {
      if (isPromiseLike(value)) {
        value.then(resolve, reject)
      } else {
        resolve(value)
      }
    })
  }

  static reject (value) {
    return new MyPromise((resolve, reject) => {
      reject(value)
    })
  }

  static all (pros) {
    return new MyPromise((resolve, reject) => {
      let count = 0
      let fullFilledCount = 0
      const result = []
      for (const pro of pros) {
        let i = count++
        MyPromise.resolve(pro).then(data => {
          result[i] = data
          if (fullFilledCount++ === count)
            resolve(result)
        }, reject)
      }
    })
  }

}

// const p = new MyPromise((resolve, reject) => {
//   resolve(122)
// })

Promise.all([]).then().catch(err => console.log(err))