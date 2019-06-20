// pivot table UI helper functions

// return function to produce multi-select label
export const makeSelLabel = (isMulti, label) => {
  if (!isMulti) {
    return (selection) => (selection.length > 0 ? selection[0].text : 'Select ' + label + '\u2026')
  }
  // multiple selection
  return (selection) => {
    switch (selection.length) {
      case 0: return 'Select ' + label + '\u2026'
      case 1: return selection[0].text
    }
    return label + ' (' + selection.length.toString() + ')'
  }
}

// make filter state: selection in other dimensions
export const makeFilterState = (dims, skipDimName) => {
  let fs = {}

  for (const d of dims) {
    if (d.name === skipDimName) continue // do not filter by "measure" dimension

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
