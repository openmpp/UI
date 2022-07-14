// db structures common functions: helpers
import cloneDeep from 'lodash/cloneDeep'

export const _cloneDeep = cloneDeep

// return true if argument hasOwnProperty length
const hasLength = (a) => { return a && a.hasOwnProperty('length') }

// return true if argument has length > 0
export const isLength = (a) => { return hasLength(a) && (a.length || 0) > 0 }

// return argument.length or zero if no length
export const lengthOf = (a) => { return hasLength(a) ? (a.length || 0) : 0 }

// return route path for parameter or output table page
// for example: /model/:digest/run/:runDigest/parameter/:parameterName
export const parameterRunPath = (model, runDigest, paramName) => {
  return '/model/' + encodeURIComponent(model || '-') +
    '/run/' + encodeURIComponent(runDigest || '-') +
    '/parameter/' + encodeURIComponent(paramName || '-')
}
export const parameterWorksetPath = (model, wsName, paramName) => {
  return '/model/' + encodeURIComponent(model || '-') +
    '/set/' + encodeURIComponent(wsName || '') +
    '/parameter/' + encodeURIComponent(paramName || '-')
}
export const tablePath = (model, runDigest, tableName) => {
  return '/model/' + encodeURIComponent(model || '-') +
    '/run/' + encodeURIComponent(runDigest || '-') +
    '/table/' + encodeURIComponent(tableName || '-')
}

// length of timestap string
export const TIME_STAMP_LEN = '1234_67_90_23_56_89_123'.length
export const TIME_STAMP_SEC_LEN = '1234_67_90_23_56_89'.length

// return date-time string: truncate milliseconds from timestamp
export const dtStr = (ts) => { return ((typeof ts === typeof 'string') ? (ts || '').substr(0, 19) : '') }

// format date-time string to timestamp string: 2021-07-16 13:40:53.882 into 2021_07_16_13_40_53_882
export const toUnderscoreTimeStamp = (ts) => {
  if (!ts || typeof ts !== typeof 'string') return ''
  return ts.replace(/[:\s-.]/g, '_')
}

// format timestamp string to date-time string: 2021_07_16_13_40_53_882 into 2021-07-16 13:40:53.882
export const fromUnderscoreTimeStamp = (ts) => {
  if (!ts || typeof ts !== typeof 'string' || (ts.length !== TIME_STAMP_LEN && ts.length !== TIME_STAMP_SEC_LEN)) return ''

  const a = Array.from(ts, (c, i) => {
    if (i === 4 && c === '_') return '-'
    if (i === 7 && c === '_') return '-'
    if (i === 10 && c === '_') return ' '
    if (i === 13 && c === '_') return ':'
    if (i === 16 && c === '_') return ':'
    if (i === 19 && c === '_') return '.'
    return c
  })
  return a.join('')
}

// retrun true if argument look like as date-time string: 1111_00_00_99_99_99_999
export const isUnderscoreTimeStamp = (ts) => {
  if (!ts || typeof ts !== typeof 'string' || (ts.length !== TIME_STAMP_LEN && ts.length !== TIME_STAMP_SEC_LEN)) return false

  for (let i = 0; i < ts.length; i++) {
    if (i === 4 || i === 7 || i === 10 || i === 13 || i === 16 || i === 19) {
      if (ts[i] !== '_') return false
    } else {
      if (ts[i] < '0' || ts[i] > '9') return false
    }
  }
  return true
}

// format date-time to timestamp string: YYYY-MM-DD hh:mm:ss.SSS
export const dtToTimeStamp = (dt) => {
  if (!dt || !(dt instanceof Date)) return ''
  const month = dt.getMonth() + 1
  const day = dt.getDate()
  const hour = dt.getHours()
  const minute = dt.getMinutes()
  const sec = dt.getSeconds()
  const ms = dt.getMilliseconds()
  //
  return dt.getFullYear().toString() + '-' +
    (month < 10 ? '0' + month.toString() : month.toString()) + '-' +
    (day < 10 ? '0' + day.toString() : day.toString()) + ' ' +
    (hour < 10 ? '0' + hour.toString() : hour.toString()) + ':' +
    (minute < 10 ? '0' + minute.toString() : minute.toString()) + ':' +
    (sec < 10 ? '0' + sec.toString() : sec.toString()) + '.' +
    ('000' + ms.toString()).slice(-3)
}

// format date-time to timestamp string: YYYY_MM_DD_hh_mm_ss_SSS
export const dtToUnderscoreTimeStamp = (dt) => {
  if (!dt || !(dt instanceof Date)) return ''
  const month = dt.getMonth() + 1
  const day = dt.getDate()
  const hour = dt.getHours()
  const minute = dt.getMinutes()
  const sec = dt.getSeconds()
  const ms = dt.getMilliseconds()
  //
  return dt.getFullYear().toString() + '_' +
    (month < 10 ? '0' + month.toString() : month.toString()) + '_' +
    (day < 10 ? '0' + day.toString() : day.toString()) + '_' +
    (hour < 10 ? '0' + hour.toString() : hour.toString()) + '_' +
    (minute < 10 ? '0' + minute.toString() : minute.toString()) + '_' +
    (sec < 10 ? '0' + sec.toString() : sec.toString()) + '_' +
    ('000' + ms.toString()).slice(-3)
}

// time to complete: hours, minutes, seconds
export const toIntervalStr = (startTs, stopTs) => {
  if ((startTs || '') === '' || (stopTs || '') === '') return ''

  const start = Date.parse(startTs)
  const stop = Date.parse(stopTs)
  if (start && stop) {
    const s = Math.floor((stop - start) / 1000) % 60
    const m = Math.floor((stop - start) / (60 * 1000)) % 60
    const h = Math.floor((stop - start) / (60 * 60 * 1000))

    return ((h > 0) ? h.toString() + ':' : '') +
      ('00' + m.toString()).slice(-2) + ':' +
      ('00' + s.toString()).slice(-2)
  }
  return ''
}

// convert size in bytes to KB, MB,... rounded value and unit name
export const fileSizeParts = (size) => {
  if (!size || typeof size !== typeof 1 || size < 0) return { val: '0', name: '' }

  if (size < 1024) {
    return { val: size.toFixed(0), name: 'Bytes' }
  }
  size /= 1024.0
  if (size < 1024) {
    return { val: size.toFixed(2), name: 'KB' }
  }
  size /= 1024.0
  if (size < 1024) {
    return { val: size.toFixed(2), name: 'MB' }
  }
  size /= 1024.0
  if (size < 1024) {
    return { val: size.toFixed(2), name: 'GB' }
  }
  size /= 1024.0
  return { val: size.toFixed(2), name: 'TB' }
}

// clean string input: replace special characters "'`$}{@\ with space and trim
export const cleanTextInput = (sValue) => {
  if (typeof sValue !== typeof 'string' || sValue === '' || sValue === void 0) return ''
  const s = sValue.replace(/["'`$}{@\\]/g, '\xa0').trim()
  return s || ''
}

// check if string eneterd and clean it to make compatible with file name input rules:
// replace special characters "'`:*?><|$}{@&^;/\ with underscore _ and trim
export const doFileNameClean = (fnValue) => {
  return (fnValue || '') ? { isEntered: true, name: cleanFileNameInput(fnValue) } : { isEntered: false, name: '' }
}

// invalid characters for file name, URL or dangerous for js
export const invalidFileNameChars = '"\'`:*?><|$}{@&^;/\\'

// clean file name input: replace special characters "'`:*?><|@#$%^&;,+=}{][/\ with underscore _ and trim
export const cleanFileNameInput = (fnValue) => {
  if (typeof fnValue !== typeof 'string' || fnValue === '' || fnValue === void 0) return ''
  const s = fnValue.replace(/["'`:*?><|$}{@&^;/\\]/g, '_').trim()
  return s || ''
}

// clean integer as non-negative input, ignore + or - sign
export const cleanIntNonNegativeInput = (sValue, nDefault = 0) => {
  if (sValue === '' || sValue === void 0) return nDefault
  const n = parseInt(sValue)
  return (!isNaN(n) && Number.isInteger(n)) ? n : nDefault
}

// clean float number input
export const cleanFloatInput = (sValue, fDefault = 0.0) => {
  if (sValue === '' || sValue === void 0) return fDefault
  const f = parseFloat(sValue)
  return !isNaN(f) ? f : fDefault
}
