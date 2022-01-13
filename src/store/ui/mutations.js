// UI session state
import * as Mdf from 'src/model-common'

// assign new value to current UI language
export const uiLang = (state, lang) => { state.uiLang = (lang || '') }

// set fast or full download: use accumulators or not
export const noAccDownload = (state, noAcc) => { state.noAccDownload = !!noAcc }

// set tree label kind (parameter and table tree): name only, description only or both by default
export const treeLabelKind = (state, labelKind) => {
  state.treeLabelKind = (labelKind === 'name-only' || labelKind === 'descr-only') ? labelKind : ''
}

// assign new value selected run digest
export const runDigestSelected = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (typeof modelView?.runDigest === typeof 'string') {
    state.runDigestSelected = modelView.runDigest
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView()
    state.modelView[mDgst].runDigest = modelView.runDigest
    // state.modelView[mDgst].runCompare = ''
  }
}

// assign new value to run digest to compare with base run
export const runDigestCompare = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (typeof modelView?.runCompare === typeof 'string') {
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView()
    state.modelView[mDgst].runCompare = modelView.runCompare
  }
}

// assign new value selected workset name
export const worksetNameSelected = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (typeof modelView?.worksetName === typeof 'string') {
    state.worksetNameSelected = modelView.worksetName
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView()
    state.modelView[mDgst].worksetName = modelView.worksetName
  }
}

// clear model view by digest
export const modelViewDelete = (state, modelDigest) => {
  const mDgst = (typeof modelDigest === typeof 'string') ? modelDigest : ''
  if (!mDgst) return

  if (state.modelView[mDgst]) {
    if ((state.runDigestSelected || '') !== '' && (state.modelView[mDgst]?.runDigest || '') === state.runDigestSelected) {
      state.runDigestSelected = ''
      state.modelView[mDgst].runCompare = ''
    }
    if ((state.worksetNameSelected || '') !== '' && (state.modelView[mDgst]?.worksetName || '') === state.worksetNameSelected) {
      state.worksetNameSelected = ''
    }
    state.modelView[mDgst] = Mdf.emptyModelView()
  }
}

// restore restore model view selection: run digest, workset name and task name by model digest
export const viewSelectedRestore = (state, modelDigest) => {
  const mDgst = (typeof modelDigest === typeof 'string') ? modelDigest : ''
  if (!mDgst || !state.modelView[mDgst]) return

  state.runDigestSelected = state.modelView[mDgst]?.runDigest || ''
  state.worksetNameSelected = state.modelView[mDgst]?.worksetName || ''
  state.taskNameSelected = state.modelView[mDgst]?.taskName || ''
}

// replace tab items with new list by model digest
export const tabsView = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst || !Array.isArray(modelView?.tabs)) return

  if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView()

  state.modelView[mDgst].tabs = []
  for (const t of modelView.tabs) {
    if (typeof t?.kind === typeof 'string' && t?.routeParts?.digest === mDgst) {
      state.modelView[mDgst].tabs.push({ kind: t.kind, routeParts: t.routeParts })
    }
  }
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
