// db structures common functions: helpers
import cloneDeep from 'lodash/cloneDeep'

export const _cloneDeep = cloneDeep

export const ROUTE_KEY_SEP = '::'

// return date-time string: truncate timestamp
export const dtStr = (ts) => { return (ts || '').substr(0, 19) }

// return true if argument hasOwnProperty length
export const hasLength = (arr) => { return arr && arr.hasOwnProperty('length') }

// return true if argument has length > 0
export const isLength = (arr) => { return hasLength(arr) && (arr.length || 0) > 0 }

// return argument.length or zero if no length
export const lengthOf = (arr) => { return isLength(arr) ? arr.length : 0 }

// return route key (or part of it), for example: modelOne::p-::ageSex::set::Default::
export const routeJoin = (arr) => { return isLength(arr) ? arr.join(ROUTE_KEY_SEP) + ROUTE_KEY_SEP : '' }

export const runListRouteKey = (model) => { return routeJoin([model, 'run-list']) }
export const worksetListRouteKey = (model) => { return routeJoin([model, 'set-list']) }
export const paramRunListRouteKey = (model) => { return routeJoin([model, 'parameter-run-list']) }
export const paramSetListRouteKey = (model) => { return routeJoin([model, 'parameter-set-list']) }
export const tableListRouteKey = (model) => { return routeJoin([model, 'table-list']) }
export const paramRouteKey = (model, paramName, runOrSet, runSetKey) => { return routeJoin([model, 'p-', paramName, runOrSet, runSetKey]) }
export const tableRouteKey = (model, tableName, runDigest) => { return routeJoin([model, 't-', tableName, runDigest]) }
export const newRunModelRouteKey = (model) => { return routeJoin([model, 'new-run-model']) }
export const runLogRouteKey = (model, runStamp) => { return routeJoin([model, 'log-', runStamp]) }

// format date-time to timestamp string: YYYY-MM-DD hh:mm:ss.SSS
export const dtToTimeStamp = (dt) => {
  if (!dt || !(dt instanceof Date)) return ''
  let month = dt.getMonth() + 1
  let day = dt.getDate()
  let hour = dt.getHours()
  let minute = dt.getMinutes()
  let sec = dt.getSeconds()
  let ms = dt.getMilliseconds()
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
  let month = dt.getMonth() + 1
  let day = dt.getDate()
  let hour = dt.getHours()
  let minute = dt.getMinutes()
  let sec = dt.getSeconds()
  let ms = dt.getMilliseconds()
  //
  return dt.getFullYear().toString() + '_' +
    (month < 10 ? '0' + month.toString() : month.toString()) + '_' +
    (day < 10 ? '0' + day.toString() : day.toString()) + '_' +
    (hour < 10 ? '0' + hour.toString() : hour.toString()) + '_' +
    (minute < 10 ? '0' + minute.toString() : minute.toString()) + '_' +
    (sec < 10 ? '0' + sec.toString() : sec.toString()) + '_' +
    ('000' + ms.toString()).slice(-3)
}

// time to complete: days, hours, minutes, seconds
export const toIntervalStr = (startTs, stopTs) => {
  if ((startTs || '') === '' || (stopTs || '') === '') return ''

  let start = Date.parse(startTs)
  let stop = Date.parse(stopTs)
  if (start && stop) {
    let s = Math.floor((stop - start) / 1000) % 60
    let m = Math.floor((stop - start) / (60 * 1000)) % 60
    let h = Math.floor((stop - start) / (60 * 60 * 1000)) % 24
    let d = Math.floor((stop - start) / (24 * 60 * 60 * 1000))

    return ((d > 0) ? d.toString() + 'd ' : '') +
      ('00' + h.toString()).slice(-2) + ':' +
      ('00' + m.toString()).slice(-2) + ':' +
      ('00' + s.toString()).slice(-2)
  }
  return ''
}
