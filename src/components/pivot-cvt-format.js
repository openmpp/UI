// pivot table value processing: formatters

import * as PcvtHlp from './pivot-cvt-helper'

// more-less options to control decimals for float number format or show "source" value without any formatting
/* eslint-disable no-multi-spaces */
export const moreLessDefault = () => ({
  isSrcValue: false, // if true then show "source" value, do not apply format(), this is final "more" state
  isSrcShow: false,  // if true then show "source value" as "more" button
  isDoMore: false,   // if true then "more" button enabled
  isDoLess: false    // if true then "less" button enabled
})
/* eslint-enable no-multi-spaces */

// default format: do not convert value, only validate if empty value allowed (if parameter nullable)
export const formatDefault = (options) => {
  let opts = Object.assign({}, moreLessDefault(), { isNullable: false, isSrcValue: true }, options)
  return {
    format: (val) => val, // disable format() value by default
    parse: (s) => s, // disable parse() value by default
    isValid: (s) => true, // disable validation by default
    options: () => opts,
    resetOptions: () => {},
    doMore: () => {},
    doLess: () => {}
  }
}

// format number as float
// options is a merge of formatNumber options (see below) and more-less options to control decimals
export const formatFloat = (options) => {
  let opts = Object.assign({}, formatNumber.makeOpts(options))

  // adjust format options and more-less options
  if (opts.maxDecimal < 0) opts.maxDecimal = 0
  if (opts.nDecimal > opts.maxDecimal) opts.nDecimal = opts.maxDecimal
  if (opts.nDecimal < 0) opts.nDecimal = -1

  const adjustMoreLess = () => {
    opts.isSrcValue = opts.nDecimal < 0
    opts.isSrcShow = opts.isSrcValue || opts.nDecimal >= opts.maxDecimal
    opts.isDoMore = !opts.isSrcValue
    opts.isDoLess = opts.isSrcValue || opts.nDecimal > 0
  }
  adjustMoreLess()

  // save default format options
  const defaultOpts = {
    nDecimal: opts.nDecimal,
    maxDecimal: opts.maxDecimal,
    isSrcValue: opts.isSrcValue,
    isSrcShow: opts.isSrcShow,
    isDoMore: opts.isDoMore,
    isDoLess: opts.isDoLess
  }

  return {
    format: (val) => {
      if (opts.isSrcValue) return val // return source value
      return formatNumber.format(val, opts)
    },
    parse: (s) => {
      if (s === '' || s === void 0) return void 0
      const v = parseFloat(s)
      return !isNaN(v) ? v : void 0
    },
    isValid: (s) => {
      if (s === '' || s === void 0) return opts.isNullable
      if (typeof s === typeof 1) return isFinite(s)
      if (typeof s === typeof 'string') return /^[-+]?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$/.test(s.trim())
      return false
    },
    options: () => opts,
    resetOptions: () => {
      Object.assign(opts, defaultOpts)
    },
    doMore: () => {
      if (!opts.isDoMore) return

      if (opts.nDecimal >= 0) {
        opts.nDecimal++
      }
      if (opts.nDecimal < 0 || opts.nDecimal > opts.maxDecimal) {
        opts.nDecimal = -1
      }
      adjustMoreLess()
    },
    doLess: () => {
      if (!opts.isDoLess) return

      if (opts.nDecimal < 0) {
        opts.nDecimal = opts.maxDecimal
      } else {
        if (opts.nDecimal > 0) opts.nDecimal--
      }
      adjustMoreLess()
    }
  }
}

// format number as integer
export const formatInt = (options) => {
  let opts = Object.assign({}, formatNumber.makeOpts(options), {nDecimal: 0, maxDecimal: 0}, moreOrLess.makeDefault())
  return {
    format: (val) => {
      if (opts.isSrcValue) return val // return source value
      return formatNumber.format(val, opts)
    },
    parse: (s) => {
      if (s === '' || s === void 0) return void 0
      const v = parseInt(s, 10)
      return !isNaN(v) ? v : void 0
    },
    isValid: (s) => {
      if (s === '' || s === void 0) return opts.isNullable
      if (typeof s === typeof 1) return Number.isInteger(s)
      if (typeof s === typeof 'string') return /^[-+]?[0-9]+$/.test(s.trim())
      return false
    },
    options: () => opts,
    resetOptions: () => {
      opts.nDecimal = 0
      opts.maxDecimal = 0
      moreOrLess.reset(opts)
    },
    doMore: () => { moreOrLess.doMore(opts) },
    doLess: () => { moreOrLess.doLess(opts) }
  }
}

// format enum value: return enum label by enum id
export const formatEnum = (options) => {
  let opts = Object.assign({},
    moreOrLess.makeDefault(),
    { labels: {} },
    options)

  return {
    format: (val) => {
      if (opts.isSrcValue) return val // return source value
      return (val !== void 0 && val !== null) ? opts.labels[val] || val : ''
    },
    parse: (s) => {
      if (s === '' || s === void 0) return void 0
      const v = parseInt(s, 10)
      return !isNaN(v) ? v : void 0
    },
    isValid: (s) => {
      if (s === '' || s === void 0) return opts.isNullable
      if (typeof s === typeof 1) {
        return opts.labels.hasOwnProperty(s)
      }
      if (typeof s === typeof 'string' && /^[-+]?[0-9]+$/.test(s)) {
        const v = parseInt(s, 10)
        return !isNaN(v) ? opts.labels.hasOwnProperty(v) : false
      }
      return false
    },
    options: () => opts,
    resetOptions: () => { moreOrLess.reset(opts) },
    doMore: () => { moreOrLess.doMore(opts) },
    doLess: () => { moreOrLess.doLess(opts) }
  }
}

// format boolean value
export const formatBool = (options) => {
  let opts = Object.assign({}, moreOrLess.makeDefault(), options)

  return {
    format: (val) => {
      if (opts.isSrcValue) return val // return source value
      return (val !== void 0 && val !== null) ? (val ? '\u2713' : 'x') || val : ''
    },
    parse: (s) => {
      return PcvtHlp.parseBool(s)
    },
    isValid: (s) => {
      if (s === '' || s === void 0) return opts.isNullable
      return (typeof PcvtHlp.parseBool(s)) === typeof true
    },
    options: () => opts,
    resetOptions: () => { moreOrLess.reset(opts) },
    doMore: () => { moreOrLess.doMore(opts) },
    doLess: () => { moreOrLess.doLess(opts) }
  }
}

// more-less options with binary state:
//  initial "less" => show formatted value
//  or "more" => show "source" value
/* eslint-disable no-multi-spaces */
const moreOrLess = {
  makeDefault: () => ({
    isNullable: false,  // if true then allow empty (NULL) value
    isSrcValue: false,  // if true then show "source" value, do not apply format(), this is final "more" state
    isSrcShow: true,    // if true then show "source value" as "more" button
    isDoMore: true,     // if true then "more" button enabled
    isDoLess: false     // if true then "less" button enabled
  }),
  reset: (opts) => {
    return Object.assign(opts, moreOrLess.makeDefault())
  },
  doMore: (opts) => {
    opts.isSrcValue = true
    opts.isSrcShow = true
    opts.isDoMore = false
    opts.isDoLess = true
  },
  doLess: (opts) => {
    opts.isSrcValue = false
    opts.isSrcShow = true
    opts.isDoMore = true
    opts.isDoLess = false
  }
}
/* eslint-enable no-multi-spaces */

// format number
/* eslint-disable no-multi-spaces */
const formatNumber = {
  makeOpts: (options) => {
    let opts = Object.assign({},
      {
        isNullable: false,  // if true then allow empty (NULL) value
        isLocale: false,    // if true then return toLocaleString()
        groupSep: '',       // if not empty then use as thousands group separator, ex: ',' = 1,234.5678
        groupLen: 3,        // grouping size, by default =3 (thousands), ex: 2 = 12,34.5678
        decimalSep: '.',    // decimals separator, ex: ',' = 1234,5678
        nDecimal: -1,       // if >= 0 then number of decimals else show all decimals, ex: 2 => 1234.56
        maxDecimal: 4       // max decimals to display, using toFixed(nDecimal) and nDecimal <= maxDecimal
      },
      options)
    return opts
  },

  format: (val, opts) => {
    if (typeof val !== typeof 1) {
      return val !== void 0 ? val : '' // invalid or undefined value
    }
    if (!opts) return val // no options: default output

    if (opts.isLocale) return val.toLocaleString() // localized numeric format

    // convert to numeric string, optionally with fixed decimals
    let src = opts.nDecimal >= 0 ? val.toFixed(opts.nDecimal) : val.toString()

    if (src.length <= 1) return src // empty value as string or single digit number

    // spit integer and decimals parts, optionally replace decimals separator
    let nD = src.search(/(\.|e|E)/)
    const left = nD > 0 ? src.substr(0, nD) : src
    const rest = nD >= 0
      ? (opts.decimalSep !== '.')
        ? src.substr(nD).replace('.', opts.decimalSep)
        : src.substr(nD)
      : ''

    // if only decimals
    // or no integer part digit grouping required then return numeric string
    let nL = left.length
    if (nL <= 0 || !opts.groupSep) return left + rest

    const isSign = left[0] === '-' || left[0] === '+'
    let isLast = false
    let sL = ''
    do {
      let n = nL - opts.groupLen
      isLast = n <= 0 || (isSign && n === 1)
      sL = (!isLast ? opts.groupSep + left.substr(n, opts.groupLen) : left.substr(0, nL)) + sL
      nL = n
    } while (!isLast)

    return sL + rest
  }
}
/* eslint-enable no-multi-spaces */
