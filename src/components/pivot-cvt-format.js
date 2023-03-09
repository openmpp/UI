// pivot table value processing: formatters

import * as PcvtHlp from './pivot-cvt-helper'

export const maxDecimalDefault = 4 // by default use 4 decimals max to format expressions and accumulators

// more-less options to control decimals for float number format or show "source" value without any formatting
/* eslint-disable no-multi-spaces */
export const moreLessDefault = () => ({
  isRawUse: false,   // if true then show "raw value" button
  isRawValue: false, // if true then display "raw" value, do not apply format()
  isMoreLess: false, // if true then show more and less buttons
  isDoMore: false,   // if true then "more" button enabled
  isDoLess: false    // if true then "less" button enabled
})
/* eslint-enable no-multi-spaces */

// default format: do not convert value, only validate if empty value allowed (if parameter nullable)
export const formatDefault = (options) => {
  const opts = Object.assign({}, moreLessDefault(), { isNullable: false, isRawValue: true }, options)
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
  const opts = Object.assign({},
    moreLessDefault(),
    formatNumber.makeOpts(options),
    { isRawUse: true, isMoreLess: true })

  // adjust format options and more-less options
  if (opts.maxDecimal < 0) opts.maxDecimal = 0
  if (opts.nDecimal < 0) opts.nDecimal = 0
  if (opts.nDecimal > opts.maxDecimal) opts.nDecimal = opts.maxDecimal

  opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
  opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0

  // save default format options
  const defaultOpts = {
    nDecimal: opts.nDecimal,
    maxDecimal: opts.maxDecimal,
    isRawValue: opts.isRawValue,
    isDoMore: opts.isDoMore,
    isDoLess: opts.isDoLess
  }

  return {
    format: (val) => {
      if (opts.isRawValue) return val // return source value
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
    doRawValue: () => {
      opts.isRawValue = !opts.isRawValue
      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0
    },
    doMore: () => {
      if (!opts.isDoMore) return

      if (opts.nDecimal < opts.maxDecimal) opts.nDecimal++

      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0
    },
    doLess: () => {
      if (!opts.isDoLess) return

      if (opts.nDecimal > 0) opts.nDecimal--

      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0
    }
  }
}

// format number as float using multiple formats defined by key, e.g. different number decimals
// if isByKey option is true and itemsFormat is not empty object then caller can use format.format(val, fmtKey)
// if itemsFormat[fmtKey] exist then it must have isRawValue, nDecimal, maxDecimal properties
// otherwise formatFloat is used
export const formatFloatByKey = (options) => {
  const floatFmt = formatFloat(options)
  const opts = floatFmt.options()

  // check if formats by key enabled
  opts.isByKey = opts?.isByKey || false
  opts.itemsFormat = opts?.itemsFormat || {}
  if (!(opts?.itemsFormat instanceof Object)) opts.itemsFormat = {}

  let n = 0
  for (const fmtKey in opts.itemsFormat) {
    if (opts.itemsFormat[fmtKey] instanceof Object) {
      n++
      const fmt = opts.itemsFormat[fmtKey]

      fmt.isRawValue = fmt?.isRawValue || false
      if (fmt.maxDecimal < 0) fmt.maxDecimal = 0
      if (fmt.nDecimal < 0) fmt.nDecimal = 0
      if (fmt.nDecimal > fmt.maxDecimal) fmt.nDecimal = fmt.maxDecimal
    }
  }
  if (n <= 0) opts.isByKey = false // there are no format items

  // save default format options
  const defaultOpts = {
    nDecimal: opts.nDecimal,
    maxDecimal: opts.maxDecimal,
    isRawValue: opts.isRawValue,
    isDoMore: opts.isDoMore,
    isDoLess: opts.isDoLess,
    isByKey: opts.isByKey,
    itemsFormat: {}
  }
  for (const fmtKey in opts.itemsFormat) {
    defaultOpts.itemsFormat[fmtKey] = Object.assign({}, opts.itemsFormat[fmtKey])
  }

  return {
    byKey: (isByKey) => { opts.isByKey = isByKey }, // set or clear format by key option
    format: (val, fmtKey) => {
      if (typeof fmtKey === typeof void 0 || !opts.isByKey || typeof opts?.itemsFormat[fmtKey] === typeof void 0) {
        return floatFmt.format(val)
      }
      const fo = Object.assign({}, opts, opts?.itemsFormat[fmtKey])

      if (fo.isRawValue) return val // return source value
      return formatNumber.format(val, fo)
    },
    parse: (s) => {
      return floatFmt.parse(s)
    },
    isValid: (s, fmtKey) => {
      if (typeof fmtKey === typeof void 0 || !opts.isByKey || typeof opts?.itemsFormat[fmtKey] === typeof void 0) {
        return floatFmt.isValid(s)
      }
      if (s === '' || s === void 0) {
        const isNable = opts?.itemsFormat[fmtKey]?.isNullable
        return (typeof isNable !== typeof void 0) ? isNable : opts.isNullable
      }
      return floatFmt.isValid(s)
    },
    options: () => opts,
    resetOptions: () => {
      Object.assign(opts, defaultOpts)
      for (const fmtKey in defaultOpts.itemsFormat) {
        opts.itemsFormat[fmtKey] = Object.assign({}, defaultOpts.itemsFormat[fmtKey])
      }
    },
    doRawValue: () => {
      opts.isRawValue = !opts.isRawValue
      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0
      for (const fmtKey in opts.itemsFormat) {
        opts.itemsFormat[fmtKey].isRawValue = opts.isRawValue // apply to each format by key items
      }
    },
    doMore: () => {
      if (!opts.isDoMore) return

      if (opts.nDecimal < opts.maxDecimal) opts.nDecimal++

      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0

      for (const fmtKey in opts.itemsFormat) {
        const fo = opts.itemsFormat[fmtKey]
        if (fo.nDecimal < fo.maxDecimal) fo.nDecimal++ // increase decimals until by key options less than max
      }
    },
    doLess: () => {
      if (!opts.isDoLess) return

      if (opts.nDecimal > 0) opts.nDecimal--

      opts.isDoMore = !opts.isRawValue && opts.nDecimal < opts.maxDecimal
      opts.isDoLess = !opts.isRawValue && opts.nDecimal > 0

      for (const fmtKey in opts.itemsFormat) {
        const fo = opts.itemsFormat[fmtKey]
        if (fo.nDecimal > 0) fo.nDecimal-- // decrease decimals for eack by key item
      }
    }
  }
}

// format number as integer
export const formatInt = (options) => {
  const opts = Object.assign({},
    moreLessDefault(),
    formatNumber.makeOpts(options),
    { nDecimal: 0, maxDecimal: 0, isRawUse: true, isMoreLess: false }
  )
  return {
    format: (val) => {
      if (opts.isRawValue) return val // return source value
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
      opts.isRawValue = false
    },
    doRawValue: () => { opts.isRawValue = !opts.isRawValue }
  }
}

// format enum value: return enum label by enum id
export const formatEnum = (options) => {
  const opts = Object.assign({},
    moreLessDefault(),
    { enums: [], isRawUse: true, isNullable: false },
    options)

  const labels = {} // enums as map of id to label
  for (const e of opts.enums) {
    labels[e.value] = e.label
  }

  return {
    getEnums: () => opts.enums, // return enum [value, label] for select dropdown
    // return enum id by enum label or void 0 if not found
    enumIdByLabel: (label) => {
      if (label === void 0 || label === '' || typeof label !== typeof 'string') return void 0 // invalid or empty label
      for (const e of opts.enums) {
        if (e.label === label) return e.value
      }
      return void 0 // not found
    },
    format: (val) => {
      if (opts.isRawValue) return val // return source value
      return (val !== void 0 && val !== null) ? labels[val] || val : ''
    },
    parse: (s) => {
      if (s === '' || s === void 0) return void 0
      const v = parseInt(s, 10)
      return !isNaN(v) ? v : void 0
    },
    isValid: (s) => {
      if (s === '' || s === void 0) return opts.isNullable
      if (typeof s === typeof 1) {
        return labels.hasOwnProperty(s)
      }
      if (typeof s === typeof 'string' && /^[-+]?[0-9]+$/.test(s)) {
        const v = parseInt(s, 10)
        return !isNaN(v) ? labels.hasOwnProperty(v) : false
      }
      return false
    },
    options: () => opts,
    resetOptions: () => { opts.isRawValue = false },
    doRawValue: () => { opts.isRawValue = !opts.isRawValue }
  }
}

// format boolean value
export const formatBool = (options) => {
  const opts = Object.assign({},
    moreLessDefault(),
    { isRawUse: true, isNullable: false },
    options)
  return {
    format: (val) => {
      if (opts.isRawValue) return val // return source value
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
    resetOptions: () => { opts.isRawValue = false },
    doRawValue: () => { opts.isRawValue = !opts.isRawValue }
  }
}

// format number
/* eslint-disable no-multi-spaces */
const formatNumber = {
  makeOpts: (options) => {
    const opts = Object.assign({},
      {
        isNullable: false,            // if true then allow empty (NULL) value
        isRawValue: false,            // if true then display "raw" value, do not apply format()
        locale: '',                   // locale name, if defined then return toLocaleString()
        nDecimal: maxDecimalDefault,  // number of decimals, ex: 2 => 1234.56
        maxDecimal: maxDecimalDefault // max decimals to display, using toFixed(nDecimal) and nDecimal <= maxDecimal
      },
      options)
    return opts
  },

  format: (val, opts) => {
    if (typeof val !== typeof 1) {
      return val !== void 0 ? val : '' // invalid or undefined value
    }
    if (!opts) return val // no options: default output

    // if locale defined then use built-in locale conversion
    if (opts.locale) {
      return opts.isRawValue
        ? val.toString()
        : val.toLocaleString(opts.locale, {  minimumFractionDigits: opts.nDecimal, maximumFractionDigits: opts.nDecimal })
    }
    // else use default numeric formating, example: 1,234.5678
    const groupSep = ','   // thousands group separator
    const groupLen = 3     // grouping size
    const decimalSep = '.' // decimals separator

    // convert to numeric string, optionally with fixed decimals
    const src = (!opts.isRawValue && opts.nDecimal >= 0) ? val.toFixed(opts.nDecimal) : val.toString()

    if (src.length <= 1) return src // empty value as string or single digit number

    // spit integer and decimals parts, optionally replace decimals separator
    const nD = src.search(/(\.|e|E)/)
    const left = nD > 0 ? src.substr(0, nD) : src
    const rest = nD >= 0
      ? (decimalSep !== '.')
          ? src.substr(nD).replace('.', decimalSep)
          : src.substr(nD)
      : ''

    // if only decimals
    // or no integer part digit grouping required then return numeric string
    let nL = left.length
    if (nL <= 0 || !groupSep) return left + rest

    const isSign = left[0] === '-' || left[0] === '+'
    let isLast = false
    let sL = ''
    do {
      const n = nL - groupLen
      isLast = n <= 0 || (isSign && n === 1)
      sL = (!isLast ? groupSep + left.substr(n, groupLen) : left.substr(0, nL)) + sL
      nL = n
    } while (!isLast)

    return sL + rest
  }
}
/* eslint-enable no-multi-spaces */
