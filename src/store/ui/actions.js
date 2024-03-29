// UI session state
import * as Mdf from 'src/model-common'

// set new language to select model text metadata
export const uiLang = ({ dispatch, commit }, lang) => {
  commit('uiLang', lang)
  dispatch('model/wordList', Mdf.emptyWordList(), { root: true })
}

// set fast or full download: use accumulators or not
export const noAccDownload = ({ commit }, noAcc) => {
  commit('noAccDownload', noAcc)
}

// set fast or full download: use microdata or not
export const noMicrodataDownload = ({ commit }, noMd) => {
  commit('noMicrodataDownload', noMd)
}

// set tree label kind (parameter and table tree): name only, description only or both by default
export const treeLabelKind = ({ commit }, labelKind) => {
  commit('treeLabelKind', labelKind)
}

// save expanded state of model list tree
export const modelTreeExpandedKeys = ({ commit }, expandedKeys) => {
  commit('modelTreeExpandedKeys', expandedKeys)
}

// update or clear selected run digest
export const runDigestSelected = ({ commit }, modelView) => {
  commit('runDigestSelected', modelView)
}

// add digest to the list of runs to compare
export const addRunCompareDigest = ({ commit }, modelRunDigest) => {
  const mDgst = (typeof modelRunDigest?.digest === typeof 'string') ? modelRunDigest.digest : ''
  const rDgst = (typeof modelRunDigest?.runDigest === typeof 'string') ? modelRunDigest.runDigest : ''
  if (!mDgst || !rDgst) return

  commit('runCompareDigest', { isAdd: true, digest: mDgst, runDigest: rDgst })
}

// remove digest from the list of runs to compare
export const deleteRunCompareDigest = ({ commit }, modelRunDigest) => {
  const mDgst = (typeof modelRunDigest?.digest === typeof 'string') ? modelRunDigest.digest : ''
  const rDgst = (typeof modelRunDigest?.runDigest === typeof 'string') ? modelRunDigest.runDigest : ''
  if (!mDgst || !rDgst) return

  commit('runCompareDigest', { isAdd: false, digest: mDgst, runDigest: rDgst })
}

// update or clear list of runs digest to compare
export const runCompareDigestList = ({ commit }, modelView) => {
  commit('runCompareDigestList', modelView)
}

// update or clear selected workset name
export const worksetNameSelected = ({ commit }, modelView) => {
  commit('worksetNameSelected', modelView)
}

// replace tab items with new value
export const tabsView = ({ commit }, modelView) => {
  commit('tabsView', modelView)
}

// delete parameter views, table views and model tab list by model digest
export const viewDeleteByModel = ({ dispatch, commit }, modelDigest) => {
  dispatch('paramViewDeleteByModel', modelDigest)
  dispatch('tableViewDeleteByModel', modelDigest)
  commit('modelViewDelete', modelDigest)
}

// restore restore model view selection: run digest, workset name and task name by model digest
export const viewSelectedRestore = ({ dispatch, commit }, modelDigest) => {
  commit('viewSelectedRestore', modelDigest)
}

// insert or update parameter view by route key
export const paramView = ({ commit }, pv) => {
  commit('paramView', pv)
}

// delete parameter view by route key, if exist
export const paramViewDelete = ({ commit }, key) => {
  commit('paramViewDelete', key)
}

// delete parameter view by model digest
export const paramViewDeleteByModel = ({ commit }, modelDigest) => {
  commit('paramViewDeleteByModel', modelDigest)
}

// insert or replace table view by route key
export const tableView = ({ commit }, tv) => {
  commit('tableView', tv)
}

// delete table view by route key, if exist
export const tableViewDelete = ({ commit }, key) => {
  commit('tableViewDelete', key)
}

// delete table view by model digest
export const tableViewDeleteByModel = ({ commit }, modelDigest) => {
  commit('tableViewDeleteByModel', modelDigest)
}

// insert or replace microdata view by route key
export const microdataView = ({ commit }, mv) => {
  commit('microdataView', mv)
}

// delete microdata view by route key, if exist
export const microdataViewDelete = ({ commit }, key) => {
  commit('microdataViewDelete', key)
}

// delete microdata view by model digest
export const microdataViewDeleteByModel = ({ commit }, modelDigest) => {
  commit('microdataViewDeleteByModel', modelDigest)
}
