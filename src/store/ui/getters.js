// UI session state
import * as Mdf from 'src/model-common'

// return selection part of model view by model digest
export const modelViewSelected = (state) => (modelDigest) => {
  return (typeof modelDigest !== typeof 'string' || !state.modelView[modelDigest])
    ? Mdf.emptyModelView()
    : {
        runDigest: state.modelView[modelDigest]?.runDigest || '',
        runCompare: state.modelView[modelDigest]?.runCompare || '',
        worksetName: state.modelView[modelDigest]?.worksetName || '',
        taskName: state.modelView[modelDigest]?.taskName || ''
      }
}

// return copy tab items by model digest
export const tabsView = (state) => (modelDigest) => {
  return (typeof modelDigest !== typeof 'string' || !state.modelView[modelDigest] || !Array.isArray(state?.modelView[modelDigest]?.tabs))
    ? []
    : Mdf._cloneDeep(state.modelView[modelDigest].tabs)
}

// return copy of parameter view by key
export const paramView = (state) => (key) => {
  return state.paramViews?.[key]?.view ? Mdf._cloneDeep(state.paramViews[key].view) : undefined
}

// count parameters view by model digest
export const paramViewCount = (state) => (modelDigest) => {
  const m = (typeof modelDigest === typeof 'string') ? modelDigest : '-'
  let n = 0
  for (const key in state.paramViews) {
    if (state.paramViews?.[key]?.digest === m) n++
  }
  return n
}

// count updated parameters by model digest
export const paramViewUpdatedCount = (state) => (modelDigest) => {
  const m = (typeof modelDigest === typeof 'string') ? modelDigest : '-'
  let n = 0
  for (const key in state.paramViews) {
    if (!state.paramViews?.[key]?.digest === m) continue
    const pv = state.paramViews?.[key]?.view
    if (!!pv && pv.edit?.isUpdated && !!pv.edit.isUpdated) n++
  }
  return n
}

// return copy of table view by key
export const tableView = (state) => (key) => {
  return state.tableViews?.[key].view ? Mdf._cloneDeep(state.tableViews[key].view) : undefined
}
