// pivot table value processing

export * from './pivot-cvt-process'
export * from './pivot-cvt-format'

export const PV_RC_KEY_SEP = '|' + String.fromCharCode(2) + '|'
export const PV_KEY_ITEM_SEP = String.fromCharCode(1) + '-'

// make row or column key as join of row or column dimension items
export const itemsKey = (items) => items.join(PV_KEY_ITEM_SEP)

// make cell key as join of row and column keys
export const cellKey = (row, col) => itemsKey(row) + PV_RC_KEY_SEP + itemsKey(col)

// make cell key as join of row and column keys
export const cellKeyJoin = (rowKey, colKey) => rowKey + PV_RC_KEY_SEP + colKey
