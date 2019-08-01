// pivot table value processing: helper functions

/* eslint-disable no-multi-spaces */
// editor type
export const EDIT_STRING = 0  // input type text
export const EDIT_NUMBER = 1  // input type text for float or integer
export const EDIT_BOOL = 2    // checkbox for boolean values
export const EDIT_ENUM = 3    // select drop-down for enum [id, label] list

export const PV_KEY_ITEM_SEP = String.fromCharCode(1) + '-'
export const PV_KEY_SCALAR = 'SCALAR_KEY'
/* eslint-enable no-multi-spaces */

// make row, column or body value key as join of row or column dimension items
export const itemsToKey = (items) => items.join(PV_KEY_ITEM_SEP)

// split row, column or body value key as into row or column dimension items
export const keyToItems = (key) => (key !== void 0 && key !== '') ? key.split(PV_KEY_ITEM_SEP) : []

// "parse" value as boolean, return undefined if value cannot treated as boolean
export const parseBool = (val) => {
  switch (val) {
    case true:
    case 1:
    case -1:
      return true
    case false:
    case 0:
      return false
    default:
      if (typeof val === typeof 'string') {
        switch (val.toLocaleLowerCase()) {
          case 'true':
          case 't':
          case '1':
          case 'yes':
          case 'y':
            return true
          case 'false':
          case 'f':
          case '0':
          case 'no':
          case 'n':
            return false
        }
      }
  }
  return void 0
}

// parse tab separated values into array
// return ragged array of [rows][columns], row count and max column size
export const parseTsv = (src, rowLimit = -1, colLimit = -1) => {
  // string expected as source
  let ret = {
    rowSize: 0, colSize: 0, arr: []
  }
  if (!src || typeof src !== typeof 'string') return ret // source is empty or invalid type

  // lines separated by cr-lf
  let lines = src.split(/\r\n|\r|\n/)
  ret.rowSize = (lines.length || 0)
  if (ret.rowSize > 0 && lines[ret.rowSize - 1] === '') ret.rowSize-- // ignore last line if it is empty

  if (ret.rowSize < 1 || (rowLimit > 0 && ret.rowSize > rowLimit)) return ret // source is empty or exceeded max row limit

  // columns separated by tab
  ret.arr = Array(ret.rowSize)
  for (let k = 0; k < ret.rowSize; k++) {
    let la = lines[k].split('\t')
    let n = la.length || 0

    if (ret.colSize < n) ret.colSize = n
    if (colLimit > 0 && ret.colSize > colLimit) return ret // exceeded max column size limit

    ret.arr[k] = n > 0 ? la : ['']
  }
  return ret
}
