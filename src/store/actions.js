import * as Mdf from '@/modelCommon'
import { COMMIT } from './mutations'

// exported actions names
const DISPATCH = {
  UI_LANG: 'dispatchUiLang',
  WORD_LIST: 'dispatchWordList',
  MODEL_LIST: 'dispatchModelList',
  THE_MODEL: 'dispatchModel',
  EMPTY_MODEL: 'dispatchEmptyModel',
  EMPTY_MODEL_LIST: 'dispatchEmptyModelList',
  THE_RUN_TEXT: 'dispatchRunText',
  THE_RUN_TEXT_BY_IDX: 'dispatchRunTextByIdx',
  RUN_TEXT_LIST: 'dispatchRunTextList',
  EMPTY_RUN_TEXT_LIST: 'dispatchEmptyRunTextList',
  THE_WORKSET_TEXT: 'dispatchWorksetText',
  THE_WORKSET_TEXT_BY_IDX: 'dispatchWorksetTextByIdx',
  THE_WORKSET_STATUS: 'dispatchWorksetStatus',
  WORKSET_TEXT_LIST: 'dispatchWorksetTextList',
  EMPTY_WORKSET_TEXT_LIST: 'dispatchEmptyWorksetTextList',
  PARAM_VIEW: 'paramView',
  PARAM_VIEW_DELETE: 'paramViewDelete'
}

// actions: combine multiple mutations or async updates
const actions = {
  [DISPATCH.UI_LANG] ({ commit, dispatch }, lang) {
    commit(COMMIT.UI_LANG, lang)
    dispatch(DISPATCH.WORD_LIST, Mdf.emptyWordList())
  },

  // set new value to model words list
  [DISPATCH.WORD_LIST] ({ commit }, mw) {
    commit(COMMIT.WORD_LIST, mw)
  },

  // set new value to current model, clear run list and workset list
  [DISPATCH.THE_MODEL] ({ commit }, md) {
    let digest = Mdf.modelDigest(md)
    commit(COMMIT.THE_MODEL, md)
    commit(COMMIT.WORD_LIST_ON_NEW, digest)
    commit(COMMIT.RUN_TEXT_LIST_ON_NEW, digest)
    commit(COMMIT.THE_RUN_TEXT_ON_NEW, digest)
    commit(COMMIT.WORKSET_TEXT_LIST_ON_NEW, digest)
    commit(COMMIT.THE_WORKSET_TEXT_ON_NEW, digest)
  },

  // clear the model: set current model to empty value
  [DISPATCH.EMPTY_MODEL] ({ dispatch }) {
    dispatch(DISPATCH.THE_MODEL, Mdf.emptyModel())
  },

  // set new value to model list and clear current model
  [DISPATCH.MODEL_LIST] ({ commit, dispatch }, ml) {
    dispatch(DISPATCH.EMPTY_MODEL)
    commit(COMMIT.MODEL_LIST, ml)
  },

  // clear model list: set model list and current model to empty value
  [DISPATCH.EMPTY_MODEL_LIST] ({ dispatch }) {
    dispatch(DISPATCH.MODEL_LIST, [])
  },

  // set current run
  [DISPATCH.THE_RUN_TEXT] ({ commit }, rt) {
    commit(COMMIT.THE_RUN_TEXT, rt)
  },

  // set current run by index in run list or empty if index out of range
  [DISPATCH.THE_RUN_TEXT_BY_IDX] ({ commit }, idx) {
    commit(COMMIT.THE_RUN_TEXT_BY_IDX, idx)
  },

  // set new value to run list
  [DISPATCH.RUN_TEXT_LIST] ({ commit, dispatch }, rl) {
    commit(COMMIT.RUN_TEXT_LIST, rl)
    dispatch(DISPATCH.THE_RUN_TEXT_BY_IDX, 0)
  },

  // clear run list: set to empty value
  [DISPATCH.EMPTY_RUN_TEXT_LIST] ({ dispatch }) {
    dispatch(DISPATCH.RUN_TEXT_LIST, [])
  },

  // set current workset
  [DISPATCH.THE_WORKSET_TEXT] ({ commit }, wt) {
    commit(COMMIT.THE_WORKSET_TEXT, wt)
  },

  // set current workset by index in workset list or empty if index out of range
  [DISPATCH.THE_WORKSET_TEXT_BY_IDX] ({ commit }, idx) {
    commit(COMMIT.THE_WORKSET_TEXT_BY_IDX, idx)
  },

  // set current workset status: set readonly status and update date-time
  [DISPATCH.THE_WORKSET_STATUS] ({ commit }, ws) {
    commit(COMMIT.THE_WORKSET_STATUS, ws)
  },

  [DISPATCH.WORKSET_TEXT_LIST] ({ commit, dispatch }, wl) {
    commit(COMMIT.WORKSET_TEXT_LIST, wl)
    dispatch(DISPATCH.THE_WORKSET_TEXT_BY_IDX, 0)
  },

  // clear workset list: set to empty value
  [DISPATCH.EMPTY_WORKSET_TEXT_LIST] ({ dispatch }) {
    dispatch(DISPATCH.WORKSET_TEXT_LIST, [])
  },

  // insert or update parameter view by route key
  [DISPATCH.PARAM_VIEW] ({ commit }, pv) {
    commit(COMMIT.PARAM_VIEW, pv)
  },

  // delete parameter view by route key, if exist
  [DISPATCH.PARAM_VIEW_DELETE] ({ commit }, key) {
    commit(COMMIT.PARAM_VIEW_DELETE, key)
  }
}

export { DISPATCH, actions }
