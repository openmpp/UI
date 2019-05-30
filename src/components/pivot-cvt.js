// pivot table convertors, aggregation, formatters

// default process value: return source value as is
export const asIsPval = {
  init: () => ({ result: void 0 }),

  doNext: (val, state) => {
    state.result = val !== null ? val : void 0
    return state.result
  }
}

// as Float process value
export const asFloatPval = {
  init: () => ({ result: void 0 }),

  doNext: (val, state) => {
    let v = parseFloat(val)
    if (!isNaN(v)) state.result = v
    return state.result
  }
}

// as Int process value
export const asIntPval = {
  init: () => ({ result: void 0 }),

  doNext: (val, state) => {
    let v = parseInt(val, 10)
    if (!isNaN(v)) state.result = v
    return state.result
  }
}

// as Bool process value
export const asBoolPval = {
  init: () => ({ result: void 0 }),

  doNext: (val, state) => {
    switch (val) {
      case true:
      case 1:
      case -1:
        state.result = true
        break
      case false:
      case 0:
        state.result = false
        break
      default:
        if (typeof val === typeof 'string') {
          switch (val.toLocaleLowerCase()) {
            case 'true':
            case 't':
            case '1':
            case 'yes':
            case 'y':
              state.result = true
              break
            case 'false':
            case 'f':
            case '0':
            case 'no':
            case 'n':
              state.result = false
              break
          }
        }
    }
    return state.result
  }
}

// sum process value aggregation
export const sumPval = {
  init: () => ({ result: void 0 }),

  doNext: (val, state) => {
    let v = parseFloat(val)
    if (!isNaN(v)) state.result = (state.result || 0) + v
    return state.result
  }
}

// average process value aggregation
export const avgPval = {
  init: () => ({
    result: void 0,
    sum: void 0,
    count: void 0
  }),

  doNext: (val, state) => {
    let v = parseFloat(val)
    if (!isNaN(v)) {
      state.sum = (state.sum || 0) + v
      state.count = (state.count || 0) + 1
      state.result = state.sum / state.count
    }
    return state.result
  }
}
