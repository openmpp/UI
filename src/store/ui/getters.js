// UI session state
import * as Mdf from 'src/model-common'

// return copy of parameter view by key
export const paramView = (state) => (key) => {
  return state.paramViews?.[key]?.view ? Mdf._cloneDeep(state.paramViews[key].view) : undefined
}

// count parameters view by model digest
export const paramViewCount = (state) => (modelDigest) => {
  const prefix = '/model/' + (modelDigest || '-') + '/'
  let n = 0
  for (const key in state.paramViews) {
    if (!key.startsWith(prefix)) continue
    if (!state.paramViews.hasOwnProperty(key)) continue
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
    const pv = state.paramViews?.[key]?.view
    if (!!pv && pv.edit?.isUpdated && !!pv.edit.isUpdated) n++
  }
  return n
}

// return copy of table view by key
export const tableView = (state) => (key) => {
  return state.tableViews?.[key].view ? Mdf._cloneDeep(state.tableViews[key].view) : undefined
}
