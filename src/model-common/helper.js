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
  return '/model/' + (model || '-') + '/run/' + (runDigest || '-') + '/parameter/' + (paramName || '-')
}
export const parameterWorksetPath = (model, wsName, paramName) => {
  return '/model/' + (model || '-') + '/set/' + (wsName || '') + '/parameter/' + (paramName || '-')
}
export const tablePath = (model, runDigest, tableName) => {
  return '/model/' + (model || '-') + '/run/' + (runDigest || '-') + '/table/' + (tableName || '-')
}

// return date-time string: truncate milliseconds from timestamp
export const dtStr = (ts) => { return ((typeof ts === typeof 'string') ? (ts || '').substr(0, 19) : '') }

// format date-time string to timestamp string: 2021-07-16 13:40:53.882 2021_07_16_13_40_53_882
export const toUnderscoreTimeStamp = (ts) => {
  if (!ts || typeof ts !== typeof 'string') return ''
  return ts.replace(/[:\s-.]/g, '_')
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
  if (sValue === '' || sValue === void 0) return ''
  const s = sValue.replace(/["'`$}{@\\]/g, '\xa0').trim()
  return s || ''
}

// check if string eneterd and clean it to make compatible with file name input rules:
// replace special characters "'`$}{@><:|?*&^;/\ with underscore _ and trim
export const doFileNameClean = (fnValue) => {
  return (fnValue || '') ? { isEntered: true, name: cleanFileNameInput(fnValue) } : { isEntered: false, name: '' }
}

// clean file name input: replace special characters "'`$}{@><:|?*&^;/\ with underscore _ and trim
export const cleanFileNameInput = (fnValue) => {
  if (typeof fnValue !== typeof 'string' || fnValue === '' || fnValue === void 0) return ''
  const s = fnValue.replace(/["'`$}{@><:|?*&^;/\\]/g, '_').trim()
  return s || ''
}
