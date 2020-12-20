import * as Mdf from '@/modelCommon'
import { COMMIT } from './mutations'

// exported actions names
const DISPATCH = {
  CONFIG: 'dispatchConfig',
  UI_LANG: 'dispatchUiLang',
  WORD_LIST: 'dispatchWordList',
  MODEL_LIST: 'dispatchModelList',
  THE_MODEL: 'dispatchModel',
  EMPTY_MODEL: 'dispatchEmptyModel',
  EMPTY_MODEL_LIST: 'dispatchEmptyModelList',
  RUN_TEXT: 'dispatchRunText',
  RUN_TEXT_STATUS_UPDATE: 'dispatchRunTextStatusUpdate',
  RUN_TEXT_LIST: 'dispatchRunTextList',
  EMPTY_RUN_TEXT_LIST: 'dispatchEmptyRunTextList',
  WORKSET_TEXT: 'dispatchWorksetText',
  WORKSET_STATUS: 'dispatchWorksetStatus',
  WORKSET_TEXT_LIST: 'dispatchWorksetTextList',
  EMPTY_WORKSET_TEXT_LIST: 'dispatchEmptyWorksetTextList',
  THE_SELECTED: 'dispatchTheSelected',
  PARAM_VIEW: 'dispatchParamView',
  PARAM_VIEW_DELETE: 'dispatchParamViewDelete',
  PARAM_VIEW_DELETE_BY_PREFIX: 'dispatchParamViewDeleteByPrefix'
}

// actions: combine multiple mutations or async updates
const actions = {
  // set new value to server config
  [DISPATCH.CONFIG] ({ commit }, cfg) {
    commit(COMMIT.CONFIG, cfg)
  },

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
    commit(COMMIT.WORKSET_TEXT_LIST_ON_NEW, digest)
    commit(COMMIT.THE_SELECTED_ON_NEW, digest)
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

  // update run text
  [DISPATCH.RUN_TEXT] ({ commit, dispatch }, rt) {
    commit(COMMIT.RUN_TEXT, rt)
    dispatch(DISPATCH.THE_SELECTED, { ModelDigest: rt.ModelDigest, run: rt })
  },

  // update run status and update data-time, also update selected run
  [DISPATCH.RUN_TEXT_STATUS_UPDATE] ({ commit }, rp) {
    commit(COMMIT.RUN_TEXT_STATUS_UPDATE, rp)
  },

  // set new value to run list
  [DISPATCH.RUN_TEXT_LIST] ({ commit, dispatch }, rl) {
    commit(COMMIT.RUN_TEXT_LIST, rl)
  },

  // clear run list: set to empty value
  [DISPATCH.EMPTY_RUN_TEXT_LIST] ({ dispatch }) {
    dispatch(DISPATCH.RUN_TEXT_LIST, [])
  },

  // update workset text
  [DISPATCH.WORKSET_TEXT] ({ commit, dispatch }, wt) {
    commit(COMMIT.WORKSET_TEXT, wt)
    dispatch(DISPATCH.THE_SELECTED, { ModelDigest: wt.ModelDigest, ws: wt })
  },

  // set current workset status: set readonly status and update date-time
  [DISPATCH.WORKSET_STATUS] ({ commit }, ws) {
    commit(COMMIT.WORKSET_STATUS, ws)
  },

  [DISPATCH.WORKSET_TEXT_LIST] ({ commit, dispatch }, wl) {
    commit(COMMIT.WORKSET_TEXT_LIST, wl)
  },

  // clear workset list: set to empty value
  [DISPATCH.EMPTY_WORKSET_TEXT_LIST] ({ dispatch }) {
    dispatch(DISPATCH.WORKSET_TEXT_LIST, [])
  },

  // update or clear current selection of model run or workset
  // payload must have sel.ModelDigest property
  // if sel.ModelDigest empty '' string then clear current selection
  [DISPATCH.THE_SELECTED] ({ commit }, sel) {
    commit(COMMIT.THE_SELECTED, sel)
  },

  // insert or update parameter view by route key
  [DISPATCH.PARAM_VIEW] ({ commit }, pv) {
    commit(COMMIT.PARAM_VIEW, pv)
  },

  // delete parameter view by route key, if exist
  [DISPATCH.PARAM_VIEW_DELETE] ({ commit }, key) {
    commit(COMMIT.PARAM_VIEW_DELETE, key)
  },

  // delete parameter view by model prefix, if prefix '' empty then delete all
  [DISPATCH.PARAM_VIEW_DELETE_BY_PREFIX] ({ commit }, prefix) {
    commit(COMMIT.PARAM_VIEW_DELETE_BY_PREFIX, prefix)
  }
}

export { DISPATCH, actions }
