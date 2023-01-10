// pivot table UI helper functions

import * as Pcvt from 'components/pivot-cvt'

// make filter state: selection in other dimensions
export const makeFilterState = (dims) => {
  const fs = {}

  for (const d of dims) {
    fs[d.name] = []
    for (const e of d.selection) {
      fs[d.name].push(e.value)
    }
  }
  return fs
}

// compare filter state and return true if it is the same
export const equalFilterState = (fs, dims, skipDimName) => {
  // check if all previous filter dimensions in the new list
  for (const p in fs) {
    if (p === skipDimName) continue // do not filter by "measure" dimension

    let isFound = false
    for (let k = 0; !isFound && k < dims.length; k++) {
      isFound = dims[k].name === p
    }
    if (!isFound) return false
  }

  // check if all new dimensions in previous list and have same items selected
  for (const d of dims) {
    if (d.name === skipDimName) continue // do not filter by "measure" dimension

    if (!fs.hasOwnProperty(d.name)) return false
    if (fs[d.name].length !== d.selection.length) return false
    for (const e of d.selection) {
      if (!fs[d.name].includes(e.value)) return false
    }
  }
  return true // identical filters
}

// return page layout to read parameter data
// filter by other dimension(s) selected values
export const makeSelectLayout = (paramName, otherFields, skipDimName) => {
  const layout = {
    Name: paramName,
    Offset: 0,
    Size: 0,
    FilterById: []
  }

  // make filters for other dimensions to include selected value
  for (const f of otherFields) {
    if (f.name === skipDimName) continue // do not filter by "measure" dimension

    const flt = {
      Name: f.name,
      Op: 'IN_AUTO',
      EnumIds: []
    }
    for (const e of f.selection) {
      flt.EnumIds.push(e.value)
    }
    layout.FilterById.push(flt)
  }
  return layout
}

// prepare page of parameter data for save
// all dimension items are packed ino cell key ordered by dimension name
export const makePageForSave = (dimProp, keyPos, rank, subIdName, isNullable, updated) => {
  // sub-id value is zero by default
  // if parameter has multiple sub-values
  // then sub-id also can be a single value from filter or packed into cell key
  const subIdField = {
    isConst: true,
    srcPos: 0,
    value: 0
  }

  // rows and columns: cell key contain items ordered by dimension names
  // for each dimension find source and destination position
  const keyDims = []
  for (let k = 0; k < keyPos.length; k++) {
    // sub-id dimension
    if (keyPos[k].name === subIdName) {
      subIdField.isConst = false
      subIdField.srcPos = keyPos[k].pos
      continue
    }
    // regular dimensions
    for (let j = 0; j < dimProp.length; j++) {
      if (keyPos[k].name === dimProp[j].name) {
        keyDims.push({
          name: keyPos[k].name,
          srcPos: keyPos[k].pos,
          dstPos: j
        })
        break
      }
    }
  }

  // for each updated cell find dimension items from cell key or from filter value
  const pv = []
  for (const bkey in updated) {
    // get dimension items from filter values and split cell key into dimension items
    const items = Pcvt.keyToItems(bkey)
    const di = Array(rank)

    for (const dk of keyDims) {
      di[dk.dstPos] = parseInt(items[dk.srcPos], 10)
    }

    // get sub-value id from cell key, from filter value or use default zero value
    // get cell value, for enum-based parameters expected to be enum id
    const nSub = !subIdField.isConst ? parseInt(items[subIdField.srcPos], 10) : subIdField.value
    const v = updated[bkey]

    pv.push({
      DimIds: di,
      IsNull: isNullable && ((v || '') === ''),
      Value: v,
      SubId: nSub
    })
  }
  return pv
}

// filter handler: update options list on user input
export const makeFilter = (f) => (val, update, abort) => {
  update(
    () => {
      if (!val) {
        f.options = f.enums
      } else {
        const vlc = val.toLowerCase()
        f.options = f.enums.filter(v => v.label.toLowerCase().indexOf(vlc) > -1)
      }
    }
  )
}
