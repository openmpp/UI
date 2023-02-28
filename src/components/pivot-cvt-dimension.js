// pivot table record processing: dimension field read, filter, sort, span

// make dimensions field selectors to read, filter and sort dimension fields
//  read dimension items from input record
//  check if item is in dropdown filter values
//  comparator to sort items in the order of dimension enums
export const dimField = (field, isOnRow = false, isOnCol = false) => {
  //
  const selectedIdsIndex = {}
  for (let k = 0; k < field.selection.length; k++) {
    selectedIdsIndex[field.selection[k].value] = k
  }
  const isSingle = field.selection.length === 1
  const singleKey = isSingle ? field.selection[0].value : void 0

  const enumIdsIndex = {}
  for (let k = 0; k < field.enums.length; k++) {
    enumIdsIndex[field.enums[k].value] = k
  }

  /* eslint-disable no-multi-spaces */
  return {
    isRow: isOnRow,   // if true then this is row dimension field
    isCol: isOnCol,   // if true then this is column dimension field
    name: field.name, // dimension field name
    //
    read: field.read,                                   // read field item function to return dimension item from source record
    filter: (v) => selectedIdsIndex.hasOwnProperty(v),  // return true if field item is selected by dimension filters
    //
    keyPos: 0,                                  // position of field item in body cell key
    isCellKey: isOnRow || isOnCol || isSingle,  // use field item as body cell key
    isSingleKey: isSingle,                      // if true then only single item selected
    singleKey: isSingle ? singleKey : void 0,   // if only single item selected then use it as body cell key
    //
    // default comparator to sort dimension in same order as original dimension enums
    compareEnumIdByIndex: (left, right) => {
      const nL = enumIdsIndex.hasOwnProperty(left) ? enumIdsIndex[left] : -1
      const nR = enumIdsIndex.hasOwnProperty(right) ? enumIdsIndex[right] : -1
      if (nL >= 0 && nR >= 0) {
        return nL - nR
      }
      if (nL >= 0 && nR < 0) return -1
      if (nL < 0 && nR >= 0) return 1
      return left < right ? -1 : (left > right ? 1 : 0)
    }
  }
  /* eslint-enable no-multi-spaces */
}

// compartor to sort row (or column) keys
// each row (or column) consist of multiple dimensions
// row (column) key is array of dimension items
//  keyLen is number of row dimensions (or column diamnsions)
//  cmp is compartor function to return negtive, zero or positive as result of items comaprison
export const compareKeys = (keyLen, cmp) => {
  return (leftKey, rightKey) => {
    for (let k = 0; k < keyLen; k++) {
      const v = cmp[k](leftKey[k], rightKey[k])
      if (v !== 0) return v
    }
    return 0
  }
}

// calculate span of each iytem for rows or columns
export const itemSpans = (keyLen, itemArr) => {
  if (!itemArr || itemArr.length < 1) return {} // no items: no rows or columns

  const prev = Array(keyLen).fill('')
  const idx = Array(keyLen).fill(0)
  const itSpan = {}

  for (let i = 0; i < itemArr.length; i++) {
    for (let j = 0; j < keyLen; j++) {
      if (itemArr[i][j] === prev[j]) { // if value same as previous then increase span
        itSpan[idx[j] * keyLen + j]++
        continue
      }
      // else new value: new span of all fields at this field and after
      for (let k = j; k < keyLen; k++) {
        prev[k] = itemArr[i][k]
        idx[k] = i
        itSpan[i * keyLen + k] = 1
      }
      break // next line: done with current fields - new span strated
    }
  }

  return itSpan
}
