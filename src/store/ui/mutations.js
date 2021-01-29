// UI session state
import * as Mdf from 'src/model-common'

// assign new value to current UI language
export const uiLang = (state, lang) => { state.uiLang = (lang || '') }

// assign new value selected run digest
export const runDigestSelected = (state, dg) => {
  if (typeof dg === typeof 'string') state.runDigestSelected = dg
}

// assign new value selected workset name
export const worksetNameSelected = (state, name) => {
  if (typeof name === typeof 'string') state.worksetNameSelected = name
}

// replace tab items with new list by model digest
export const tabsView = (state, modelTabs) => {
  const m = (typeof modelTabs?.digest === typeof 'string') ? modelTabs.digest : ''
  if (!m || !Array.isArray(modelTabs?.tabs)) return

  tabsViewDeleteByModel(state, m) // remove existing tabs for the model

  for (const t of modelTabs.tabs) {
    if (typeof t?.kind === typeof 'string' && t?.routeParts?.digest === m) {
      state.tabsView.push({ kind: t.kind, routeParts: t.routeParts })
    }
  }
}

// remove all tab items (for example on model switch)
export const tabsViewDeleteByModel = (state, modelDigest) => {
  state.tabsView = state.tabsView.filter(t => t?.routeParts?.digest !== modelDigest)
}

// insert, replace or update parameter view by route key (key must be non-empty string)
export const paramView = (state, pv) => {
  if (!pv || !pv?.key) return
  if (typeof pv.key !== typeof 'string' || pv.key === '') return

  // insert new or replace existing parameter view
  if (pv?.view) {
    state.paramViews[pv.key] = Mdf._cloneDeep({
      view: pv.view,
      digest: pv?.digest || '',
      modelName: pv?.modelName || '',
      runDigest: pv?.runDigest || '',
      worksetName: pv?.worksetName || '',
      parameterName: pv?.parameterName || ''
    })
    return
  }
  // else: update existing parameter view
  if (!state.paramViews?.[pv.key]?.view) return // parameter view not found

  if (Array.isArray(pv?.rows)) {
    state.paramViews[pv.key].view.rows = Mdf._cloneDeep(pv.rows)
  }
  if (Array.isArray(pv?.cols)) {
    state.paramViews[pv.key].view.cols = Mdf._cloneDeep(pv.cols)
  }
  if (Array.isArray(pv?.others)) {
    state.paramViews[pv.key].view.others = Mdf._cloneDeep(pv.others)
  }
  if (typeof pv?.isRowColControls === typeof true) {
    state.paramViews[pv.key].view.isRowColControls = pv.isRowColControls
  }
  if (typeof pv?.rowColMode === typeof 1) {
    state.paramViews[pv.key].view.rowColMode = pv.rowColMode
  }
  if (pv?.edit) {
    state.paramViews[pv.key].view.edit = Mdf._cloneDeep(pv.edit)
  }
}

// delete parameter view by route key, if exist (key must be a string)
export const paramViewDelete = (state, key) => {
  if (typeof key === typeof 'string' && state.paramViews?.[key]) delete state.paramViews[key]
}

// delete parameter view by model digest
export const paramViewDeleteByModel = (state, modelDigest) => {
  const m = (typeof modelDigest === typeof 'string') ? modelDigest : '-'
  for (const key in state.paramViews) {
    if (state.paramViews?.[key]?.digest === m) delete state.paramViews[key]
  }
}

// delete parameter view by model digest and run digest
export const paramViewDeleteByModelRun = (state, modelRun) => {
  const m = (typeof modelRun?.digest === typeof 'string') ? modelRun.digest : '-'
  const r = (typeof modelRun?.runDigest === typeof 'string') ? modelRun.runDigest : '-'
  for (const key in state.paramViews) {
    if (state.paramViews?.[key]?.digest === m && state.paramViews?.[key]?.runDigest === r) delete state.paramViews[key]
  }
}

// delete parameter view by model digest and workset name
export const paramViewDeleteByModelWorkset = (state, modelWorkset) => {
  const m = (typeof modelWorkset?.digest === typeof 'string') ? modelWorkset.digest : '-'
  const w = (typeof modelWorkset?.worksetName === typeof 'string') ? modelWorkset.worksetName : '-'
  for (const key in state.paramViews) {
    if (state.paramViews?.[key]?.digest === m && state.paramViews?.[key]?.worksetName === w) delete state.paramViews[key]
  }
}

// delete parameter view by model name and parameter name
export const paramViewDeleteByModelParameterName = (state, modelNameParamName) => {
  const m = (typeof modelNameParamName?.modelName === typeof 'string') ? modelNameParamName.modelName : '-'
  const p = (typeof modelNameParamName?.parameterName === typeof 'string') ? modelNameParamName.parameterName : '-'
  for (const key in state.paramViews) {
    if (state.paramViews?.[key]?.modelName === m && state.paramViews?.[key]?.parameterName === p) delete state.paramViews[key]
  }
}

// insert or replace table view by route key (key must be non-empty string)
export const tableView = (state, tv) => {
  if (!tv || !tv?.key) return
  if (typeof tv.key !== typeof 'string' || tv.key === '') return

  // insert new or replace existing table view
  if (tv?.view) state.tableViews[tv.key] = Mdf._cloneDeep(tv.view)
}

// delete table view by route key, if exist (key must be a string)
export const tableViewDelete = (state, key) => {
  if (typeof key === typeof 'string' && state.tableViews?.[key]) delete state.tableViews[key]
}
