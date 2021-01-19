// current model and list of the models
import * as Mdf from 'src/model-common'

// set new value to model words list
export const wordList = ({ commit }, mw) => {
  commit('wordList', mw)
}

// set new value to list of model languages
export const langList = ({ commit }, ml) => {
  commit('langList', ml)
}

// set new value to current model, clear run list and workset list
export const theModel = ({ dispatch, commit, state }, model) => {
  const digest = Mdf.modelDigest(model)
  const storeDigest = Mdf.modelDigest(state.theModel)

  commit('theModel', model)
  commit('wordListOnNew', digest)
  commit('langListOnNew')
  commit('runTextListOnNew', digest)
  commit('worksetTextListOnNew', digest)

  // clear parameters view state if new model selected
  if (digest !== storeDigest) {
    dispatch('uiState/paramViewDeleteByModel', storeDigest, { root: true })
    dispatch('uiState/tableViewDeleteByModel', storeDigest, { root: true })
  }
  // clear selected run if new model selected
  if (Mdf.isLength(state.runTextList)) {
    if (state.runTextList[0].ModelDigest !== digest) {
      dispatch('uiState/runDigestSelected', '', { root: true })
    }
  }
  // clear selected workset if new model selected
  if (Mdf.isLength(state.worksetTextList)) {
    if (state.worksetTextList[0].ModelDigest !== digest) {
      dispatch('uiState/worksetNameSelected', '', { root: true })
    }
  }
}

// set new value to model list and clear current model
export const modelList = ({ dispatch, commit }, ml) => {
  dispatch('theModel', Mdf.emptyModel())
  commit('modelList', ml)
}

// update run text
export const runText = ({ dispatch, commit }, rt) => {
  commit('runText', rt)
  if (Mdf.isNotEmptyRunText(rt)) {
    dispatch('uiState/runDigestSelected', rt.RunDigest, { root: true })
  }
}

// update run status and update data-time, also update selected run
export const runTextStatusUpdate = ({ commit }, rp) => {
  commit('runTextStatusUpdate', rp)
}

// set new value to run list
export const runTextList = ({ dispatch, commit, state }, rl) => {
  // clear selected run if new model selected
  let isKeep = false
  if (Mdf.isLength(rl) && Mdf.isLength(state.runTextList)) {
    let dgNew = ''
    if (Mdf.isNotEmptyRunText(rl[0])) dgNew = (rl[0].ModelDigest || '')
    let dgOld = ''
    if (Mdf.isNotEmptyRunText(state.runTextList[0])) dgOld = (state.runTextList[0].ModelDigest || '')
    isKeep = dgNew !== '' && dgNew === dgOld
  }
  if (!isKeep) {
    dispatch('uiState/runDigestSelected', '', { root: true })
  }

  // update run list
  commit('runTextList', rl)
}

// update workset text
export const worksetText = ({ dispatch, commit }, wt) => {
  commit('worksetText', wt)
  if (Mdf.isNotEmptyWorksetText(wt)) {
    dispatch('uiState/worksetNameSelected', wt.Name, { root: true })
  }
}

// set current workset status: set readonly status and update date-time
export const worksetStatus = ({ commit }, ws) => {
  commit('worksetStatus', ws)
}

// set new value to workset list
export const worksetTextList = ({ dispatch, commit, state }, wl) => {
  // clear selected workset if new model selected
  let isKeep = false
  if (Mdf.isLength(wl) && Mdf.isLength(state.worksetTextList)) {
    let dgNew = ''
    if (Mdf.isNotEmptyWorksetText(wl[0])) dgNew = (wl[0].ModelDigest || '')
    let dgOld = ''
    if (Mdf.isNotEmptyWorksetText(state.worksetTextList[0])) dgOld = (state.worksetTextList[0].ModelDigest || '')
    isKeep = dgNew !== '' && dgNew === dgOld
  }
  if (!isKeep) {
    dispatch('uiState/worksetNameSelected', '', { root: true })
  }

  // update workset list
  commit('worksetTextList', wl)
}
