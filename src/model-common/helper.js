// db structures common functions: helpers
import cloneDeep from 'lodash/cloneDeep'

export const _cloneDeep = cloneDeep

// return true if argument hasOwnProperty length
export const hasLength = (a) => { return a && a.hasOwnProperty('length') }

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

// return date-time string: truncate timestamp
export const dtStr = (ts) => { return ((typeof ts === typeof 'string') ? (ts || '').substr(0, 19) : '') }

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
