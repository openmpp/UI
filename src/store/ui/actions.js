// UI session state
import * as Mdf from 'src/model-common'

// set new language to select model text metadata
export const uiLang = ({ dispatch, commit }, lang) => {
  commit('uiLang', lang)
  dispatch('model/wordList', Mdf.emptyWordList(), { root: true })
}

// update or clear selected run digest
export const runDigestSelected = ({ commit }, dg) => {
  commit('runDigestSelected', dg)
}

// update or clear selected workset name
export const worksetNameSelected = ({ commit }, name) => {
  commit('worksetNameSelected', name)
}

// insert or update parameter view by route key
export const paramView = ({ commit }, pv) => {
  commit('paramView', pv)
}

// delete parameter view by route key, if exist
export const paramViewDelete = ({ commit }, key) => {
  commit('paramViewDelete', key)
}

// delete parameter view by model prefix
export const paramViewDeleteByModel = ({ dispatch }, modelDigest) => {
  dispatch('paramViewDeleteByPrefix', '/model/' + (modelDigest || '-') + '/')
}

// delete parameter view by model digest and run digest prefix
export const paramViewDeleteByModelRun = ({ dispatch }, modelRun) => {
  const m = modelRun.hasOwnProperty('digest') ? (modelRun.digest || '-') : '-'
  const r = modelRun.hasOwnProperty('runDigest') ? (modelRun.runDigest || '-') : '-'
  dispatch(
    'paramViewDeleteByPrefix', '/model/' + m + '/run/' + r + '/parameter/'
  )
}

// delete parameter view by model digest and workset name prefix
export const paramViewDeleteByModelWorkset = ({ dispatch }, modelWorkset) => {
  const m = modelWorkset.hasOwnProperty('digest') ? (modelWorkset.digest || '-') : '-'
  const w = modelWorkset.hasOwnProperty('worksetName') ? (modelWorkset.worksetName || '-') : '-'
  dispatch(
    'paramViewDeleteByPrefix', '/model/' + m + '/set/' + w + '/parameter/'
  )
}

// delete parameter view by route prefix, if prefix '' empty then delete all
export const paramViewDeleteByPrefix = ({ commit }, prefix) => {
  commit('paramViewDeleteByPrefix', prefix)
}

// insert or replace table view by route key
export const tableView = ({ commit }, tv) => {
  commit('tableView', tv)
}

// delete table view by route key, if exist
export const tableViewDelete = ({ commit }, key) => {
  commit('tableViewDelete', key)
}

// delete table view by model prefix
export const tableViewDeleteByModel = ({ dispatch }, modelDigest) => {
  dispatch('tableViewDeleteByPrefix', '/model/' + (modelDigest || '-') + '/')
}

// delete table view by model digest and run digest prefix
export const tableViewDeleteByModelRun = ({ dispatch }, modelRun) => {
  const m = modelRun?.digest || '-'
  const r = modelRun?.runDigest || '-'
  dispatch(
    'tableViewDeleteByPrefix', '/model/' + m + '/run/' + r + '/parameter/'
  )
}

// delete table view by route prefix, if prefix '' empty then delete all
export const tableViewDeleteByPrefix = ({ commit }, prefix) => {
  commit('tableViewDeleteByPrefix', prefix)
}
