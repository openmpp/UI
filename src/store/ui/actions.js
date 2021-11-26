// UI session state
import * as Mdf from 'src/model-common'

// set new language to select model text metadata
export const uiLang = ({ dispatch, commit }, lang) => {
  commit('uiLang', lang)
  dispatch('model/wordList', Mdf.emptyWordList(), { root: true })
}

// update or clear selected run digest
export const runDigestSelected = ({ commit }, modelView) => {
  commit('runDigestSelected', modelView)
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

// delete parameter view by model digest and run digest
export const paramViewDeleteByModelRun = ({ commit }, modelRun) => {
  commit('paramViewDeleteByModelRun', modelRun)
}

// delete parameter view by model digest and workset name
export const paramViewDeleteByModelWorkset = ({ commit }, modelWorkset) => {
  commit('paramViewDeleteByModelWorkset', modelWorkset)
}

// delete parameter view by model name and parameter name
export const paramViewDeleteByModelParameterName = ({ commit }, modelNameParamName) => {
  commit('paramViewDeleteByModelParameterName', modelNameParamName)
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
  // commit('tableViewDeleteByModel', modelDigest)
}
