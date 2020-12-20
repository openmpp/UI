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

// insert, replace or update parameter view by route key (key must be non-empty string)
export const paramView = (state, pv) => {
  if (!pv || !pv.hasOwnProperty('key')) return
  if (typeof pv.key !== typeof 'string' || pv.key === '') return

  // insert new or replace existing parameter view
  if (pv.hasOwnProperty('view')) {
    if (pv.view !== void 0 && pv.view !== null) {
      state.paramViews[pv.key] = Mdf._cloneDeep(pv.view)
    }
    return
  }
  // else: update existing parameter view
  if (!state.paramViews.hasOwnProperty(pv.key)) return // parameter view not found
  const p = state.paramViews[pv.key]
  if (!p) return // parameter view not found

  if (pv.hasOwnProperty('rows')) {
    if (typeof pv.rows === typeof []) state.paramViews[pv.key].rows = Mdf._cloneDeep(pv.rows)
  }
  if (pv.hasOwnProperty('cols')) {
    if (typeof pv.cols === typeof []) state.paramViews[pv.key].cols = Mdf._cloneDeep(pv.cols)
  }
  if (pv.hasOwnProperty('others')) {
    if (typeof pv.others === typeof []) state.paramViews[pv.key].others = Mdf._cloneDeep(pv.others)
  }
  if (pv.hasOwnProperty('isRowColControls')) {
    if (typeof pv.isRowColControls === typeof true) state.paramViews[pv.key].isRowColControls = pv.isRowColControls
  }
  if (pv.hasOwnProperty('rowColMode')) {
    if (typeof pv.rowColMode === typeof 1) state.paramViews[pv.key].rowColMode = pv.rowColMode
  }
  if (pv.hasOwnProperty('edit')) {
    if (pv.edit !== void 0 && pv.edit !== null) state.paramViews[pv.key].edit = Mdf._cloneDeep(pv.edit)
  }
}

// delete parameter view by route key, if exist (key must be a string)
export const paramViewDelete = (state, key) => {
  if (typeof key === typeof 'string' && state.paramViews.hasOwnProperty[key]) delete state.paramViews[key]
}

// delete parameter view by prefix of route key (it must be a string), if prefix '' empty then delete all
export const paramViewDeleteByPrefix = (state, prefix) => {
  if (typeof prefix !== typeof 'string') return

  for (const key in state.paramViews) {
    if (!state.paramViews.hasOwnProperty(key)) continue
    if (prefix && !key.startsWith(prefix)) continue
    delete state.paramViews[key]
  }
}
