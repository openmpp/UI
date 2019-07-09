// pivot table value processing: helper functions

export const PV_KEY_ITEM_SEP = String.fromCharCode(1) + '-'

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
