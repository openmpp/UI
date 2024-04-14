// UI session state
import * as Mdf from 'src/model-common'

// assign new value to current UI language
export const uiLang = (state, lang) => { state.uiLang = (lang || '') }

// set fast or full download: use accumulators or not
export const noAccDownload = (state, noAcc) => { state.noAccDownload = !!noAcc }

// set fast or full download: use microdata or not
export const noMicrodataDownload = (state, noMd) => { state.noMicrodataDownload = !!noMd }

// set tree label kind (parameter and table tree): name only, description only or both by default
export const treeLabelKind = (state, labelKind) => {
  state.treeLabelKind = (labelKind === 'name-only' || labelKind === 'descr-only') ? labelKind : ''
}

// save expanded state of model list tree
export const modelTreeExpandedKeys = (state, expandedKeys) => {
  state.modelTreeExpandedKeys = (!!expandedKeys && Array.isArray(expandedKeys)) ? Array.from(expandedKeys) : []
}

// assign new value selected run digest
export const runDigestSelected = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (typeof modelView?.runDigest === typeof 'string') {
    state.runDigestSelected = modelView.runDigest
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView() // create model view state if not exist
    state.modelView[mDgst].runDigest = modelView.runDigest
    // state.modelView[mDgst].digestCompareList = []
  }
}

// add or remove digest from the list of run digests to compare with base run
export const runCompareDigest = (state, amr) => {
  const mDgst = (typeof amr?.digest === typeof 'string') ? amr.digest : ''
  const rDgst = (typeof amr?.runDigest === typeof 'string') ? amr.runDigest : ''

  if (!mDgst || !rDgst || typeof amr?.isAdd !== typeof true) return
  if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView() // create model view state if not exist

  if (amr.isAdd) {
    if (!state.modelView[mDgst].digestCompareList.includes(rDgst)) state.modelView[mDgst].digestCompareList.push(rDgst)
  } else {
    const n = state.modelView[mDgst].digestCompareList.indexOf(rDgst)
    if (n >= 0) {
      state.modelView[mDgst].digestCompareList.splice(n, 1)
    }
  }
}

// assign new value to the list of runs digest to compare with base run
export const runCompareDigestList = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (Array.isArray(modelView?.digestCompareList)) {
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView() // create model view state if not exist
    state.modelView[mDgst].digestCompareList = modelView.digestCompareList
  }
}

// assign new value selected workset name
export const worksetNameSelected = (state, modelView) => {
  const mDgst = (typeof modelView?.digest === typeof 'string') ? modelView.digest : ''
  if (!mDgst) return

  if (typeof modelView?.worksetName === typeof 'string') {
    state.worksetNameSelected = modelView.worksetName
    if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView() // create model view state if not exist
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
      state.modelView[mDgst].digestCompareList = []
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

  if (!state.modelView[mDgst]) state.modelView[mDgst] = Mdf.emptyModelView() // create model view state if not exist

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
  if (typeof pv?.pageStart === typeof 1) {
    state.paramViews[pv.key].view.pageStart = pv.pageStart
  }
  if (typeof pv?.pageSize === typeof 1) {
    state.paramViews[pv.key].view.pageSize = pv.pageSize
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

// insert or replace table view by route key (key must be non-empty string)
export const tableView = (state, tv) => {
  if (!tv || !tv?.key) return
  if (typeof tv.key !== typeof 'string' || tv.key === '') return

  // insert new or replace existing table view
  if (tv?.view) {
    state.tableViews[tv.key] = Mdf._cloneDeep({
      view: tv.view,
      digest: tv?.digest || '',
      modelName: tv?.modelName || '',
      runDigest: tv?.runDigest || '',
      tableName: tv?.tableName || ''
    })
    return
  }
  // else: update existing output table view
  if (!state.tableViews?.[tv.key]?.view) return // output table view not found

  if (Array.isArray(tv?.rows)) {
    state.tableViews[tv.key].view.rows = Mdf._cloneDeep(tv.rows)
  }
  if (Array.isArray(tv?.cols)) {
    state.tableViews[tv.key].view.cols = Mdf._cloneDeep(tv.cols)
  }
  if (Array.isArray(tv?.others)) {
    state.tableViews[tv.key].view.others = Mdf._cloneDeep(tv.others)
  }
  if (typeof tv?.isRowColControls === typeof true) {
    state.tableViews[tv.key].view.isRowColControls = tv.isRowColControls
  }
  if (typeof tv?.rowColMode === typeof 1) {
    state.tableViews[tv.key].view.rowColMode = tv.rowColMode
  }
  if (typeof tv?.kind === typeof 1) {
    state.tableViews[tv.key].view.kind = tv.kind % 5 || 0 // table has only 5 possible view kinds
  }
  if (typeof tv?.calc === typeof 'string') {
    state.tableViews[tv.key].view.calc = tv.calc
  }
  if (typeof tv?.pageStart === typeof 1) {
    state.tableViews[tv.key].view.pageStart = tv.pageStart
  }
  if (typeof tv?.pageSize === typeof 1) {
    state.tableViews[tv.key].view.pageSize = tv.pageSize
  }
}

// delete table view by route key, if exist (key must be a string)
export const tableViewDelete = (state, key) => {
  if (typeof key === typeof 'string' && state.tableViews?.[key]) delete state.tableViews[key]
}

// delete table view by model digest
export const tableViewDeleteByModel = (state, modelDigest) => {
  const m = (typeof modelDigest === typeof 'string') ? modelDigest : '-'
  for (const key in state.tableViews) {
    if (state.tableViews?.[key]?.digest === m) delete state.tableViews[key]
  }
}

// insert or replace microdata view by route key (key must be non-empty string)
export const microdataView = (state, mv) => {
  if (!mv || !mv?.key) return
  if (typeof mv.key !== typeof 'string' || mv.key === '') return

  // insert new or replace existing microdata view
  if (mv?.view) {
    state.microdataViews[mv.key] = Mdf._cloneDeep({
      view: mv.view,
      digest: mv?.digest || '',
      modelName: mv?.modelName || '',
      runDigest: mv?.runDigest || '',
      entityName: mv?.entityName || ''
    })
    return
  }
  // else: update existing microdata view
  if (!state.microdataViews?.[mv.key]?.view) return // microdata view not found

  if (Array.isArray(mv?.rows)) {
    state.microdataViews[mv.key].view.rows = Mdf._cloneDeep(mv.rows)
  }
  if (Array.isArray(mv?.cols)) {
    state.microdataViews[mv.key].view.cols = Mdf._cloneDeep(mv.cols)
  }
  if (Array.isArray(mv?.others)) {
    state.microdataViews[mv.key].view.others = Mdf._cloneDeep(mv.others)
  }
  if (typeof mv?.isRowColControls === typeof true) {
    state.microdataViews[mv.key].view.isRowColControls = mv.isRowColControls
  }
  if (typeof mv?.rowColMode === typeof 1) {
    state.microdataViews[mv.key].view.rowColMode = mv.rowColMode
  }
  if (typeof mv?.pageStart === typeof 1) {
    state.microdataViews[mv.key].view.pageStart = mv.pageStart
  }
  if (typeof mv?.pageSize === typeof 1) {
    state.microdataViews[mv.key].view.pageSize = mv.pageSize
  }
  if (typeof mv?.aggrCalc === typeof 'string') {
    state.microdataViews[mv.key].view.aggrCalc = mv.aggrCalc
  }
  if (typeof mv?.cmpCalc === typeof 'string') {
    state.microdataViews[mv.key].view.cmpCalc = mv.cmpCalc
  }
  if (Array.isArray(mv?.groupBy)) {
    state.microdataViews[mv.key].view.groupBy = Mdf._cloneDeep(mv.groupBy)
  }
  if (Array.isArray(mv?.calcAttrs)) {
    state.microdataViews[mv.key].view.calcAttrs = Mdf._cloneDeep(mv.calcAttrs)
  }
  if (Array.isArray(mv?.calcEnums)) {
    state.microdataViews[mv.key].view.calcEnums = Mdf._cloneDeep(mv.calcEnums)
  }
}

// delete microdata view by route key, if exist (key must be a string)
export const microdataViewDelete = (state, key) => {
  if (typeof key === typeof 'string' && state.microdataViews?.[key]) delete state.microdataViews[key]
}

// delete microdata view by model digest
export const microdataViewDeleteByModel = (state, modelDigest) => {
  const m = (typeof modelDigest === typeof 'string') ? modelDigest : '-'
  for (const key in state.microdataViews) {
    if (state.microdataViews?.[key]?.digest === m) delete state.microdataViews[key]
  }
}
