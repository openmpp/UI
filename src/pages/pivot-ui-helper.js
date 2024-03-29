// pivot table UI helper functions

import * as Pcvt from 'components/pivot-cvt'

/* eslint-disable no-multi-spaces */

export const SUB_ID_DIM = 'SubId' // sub-value id dminesion name

// kind of output table view
export const kind = {
  EXPR: 0,  // output table expression(s)
  ACC: 1,   // output table accumulator(s)
  ALL: 2,   // output table all-accumultors view
  CALC: 3,  // output table calculated measure view
  CMP: 4    // output table calculated measure view
}
/* eslint-enable no-multi-spaces */

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
// do not filter by skipDims dimensions, skipDims can be single name of [array of names]
export const equalFilterState = (fs, dims, skipDims) => {
  // check if all previous filter dimensions in the new list
  for (const p in fs) {
    // skip dimension filter: do not filter by sub-value id or by measure dimension
    if (skipDims) {
      if (typeof skipDims === typeof 'string' && p === skipDims) continue
      if (Array.isArray(skipDims) && skipDims.indexOf(p) >= 0) continue
    }

    let isFound = false
    for (let k = 0; !isFound && k < dims.length; k++) {
      isFound = dims[k].name === p
    }
    if (!isFound) return false
  }

  // check if all new dimensions in previous list and have same items selected
  for (const d of dims) {
    // skip dimension filter: do not filter by sub-value id or by measure dimension
    if (skipDims) {
      if (typeof skipDims === typeof 'string' && d.name === skipDims) continue
      if (Array.isArray(skipDims) && skipDims.indexOf(d.name) >= 0) continue
    }

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
// do not filter by skipDims dimensions, skipDims can be single name of [array of names]
export const makeSelectLayout = (name, otherFields, skipDims) => {
  const layout = {
    Name: name,
    Offset: 0,
    Size: 0,
    FilterById: []
  }

  // make filters for other dimensions to include selected value
  for (const f of otherFields) {
    // skip dimension filter: do not filter by sub-value id or by measure dimension
    if (skipDims) {
      if (typeof skipDims === typeof 'string' && f.name === skipDims) continue
      if (Array.isArray(skipDims) && skipDims.indexOf(f.name) >= 0) continue
    }

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
// all dimension items are packed into cell key ordered by dimension name
export const makePageForSave = (dimProp, keyPos, rank, subIdName, defaultSubId, isNullable, updated) => {
  // sub-id value is zero by default
  // if parameter has multiple sub-values
  // then sub-id also can be a single value from filter or packed into cell key
  const subIdField = {
    isConst: true,
    srcPos: 0,
    value: defaultSubId || 0
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
        f.options = f.enums.filter(v => v.label.toLowerCase().indexOf(vlc) >= 0)
      }
    }
  )
}

// return calculation function or comparison expression, for example: MEAN => OM_AVG or return empty '' string on error
export const toCalcFnc = (fncSrc, eSrc) => {
  switch (fncSrc) {
    case 'MEAN':
      return 'OM_AVG(' + eSrc + ')'
    case 'COUNT':
      return 'OM_COUNT(' + eSrc + ')'
    case 'SUM':
      return 'OM_SUM(' + eSrc + ')'
    case 'MAX':
      return 'OM_MAX(' + eSrc + ')'
    case 'MIN':
      return 'OM_MIN(' + eSrc + ')'
    case 'VAR':
      return 'OM_VAR(' + eSrc + ')'
    case 'SD':
      return 'OM_SD(' + eSrc + ')'
    case 'SE':
      return 'OM_SE(' + eSrc + ')'
    case 'CV':
      return 'OM_CV(' + eSrc + ')'
  }
  return ''
}

// return comparison expression, for example: DIFF => expr0[variant] - expr0[base] or return empty '' string on error
export const toCompareFnc = (fncSrc, eSrc) => {
  switch (fncSrc) {
    case 'DIFF':
      return eSrc + '[variant] - ' + eSrc + '[base]'
    case 'RATIO':
      return eSrc + '[variant] / ' + eSrc + '[base]'
    case 'PERCENT':
      return '100.0 * ' + eSrc + '[variant] / ' + eSrc + '[base]'
  }
  return ''
}

// return csv calculation name by source function name, ex: MEAN => avg or return empty '' string on error
export const toCsvFnc = (src) => {
  switch (src) {
    case 'MEAN':
      return 'avg'
    case 'COUNT':
      return 'count'
    case 'SUM':
      return 'sum'
    case 'MAX':
      return 'max'
    case 'MIN':
      return 'min'
    case 'VAR':
      return 'var'
    case 'SD':
      return 'sd'
    case 'SE':
      return 'se'
    case 'CV':
      return 'cv'
    case 'DIFF':
      return 'diff'
    case 'RATIO':
      return 'ratio'
    case 'PERCENT':
      return 'percent'
  }
  return ''
}
