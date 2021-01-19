// UI session state
import * as Mdf from 'src/model-common'

// return copy of parameter view by key
export const paramView = (state) => (key) => {
  return state.paramViews.hasOwnProperty(key) ? Mdf._cloneDeep(state.paramViews[key]) : void 0
}

// count parameters view by model digest
export const paramViewCount = (state) => (modelDigest) => {
  const prefix = '/model/' + (modelDigest || '-') + '/'
  let n = 0
  for (const key in state.paramViews) {
    if (!state.paramViews.hasOwnProperty(key)) continue
    if (!key.startsWith(prefix)) continue
    if (state.paramViews[key]) n++
  }
  return n
}

// count updated parameters by model digest
export const paramViewUpdatedCount = (state) => (modelDigest) => {
  const prefix = '/model/' + (modelDigest || '-') + '/'
  let n = 0
  for (const key in state.paramViews) {
    if (!key.startsWith(prefix)) continue
    if (!state.paramViews.hasOwnProperty(key)) continue
    const pv = state.paramViews[key]
    if (pv.hasOwnProperty('edit') && pv.edit.hasOwnProperty('isUpdated') && !!pv.edit.isUpdated) n++
  }
  return n
}

// return copy of table view by key
export const tableView = (state) => (key) => {
  return state.tableViews?.[key] ? Mdf._cloneDeep(state.tableViews[key]) : void 0
}

// count tables view by model digest
export const tableViewCount = (state) => (modelDigest) => {
  const prefix = '/model/' + (modelDigest || '-') + '/'
  let n = 0
  for (const key in state.tableViews) {
    if (!key.startsWith(prefix)) continue
    if (!state.tableViews?.[key]) continue
    if (state.tableViews[key]) n++
  }
  return n
}
